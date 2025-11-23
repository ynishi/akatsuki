import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { WasmModuleRepository } from '@/repositories/WasmModuleRepository'
import { WasmExecutionRepository } from '@/repositories/WasmExecutionRepository'
import { WasmRuntimeService, type WasmExecutionResult } from '@/services/WasmRuntimeService'
import { supabase } from '@/lib/supabase'

/**
 * WASM execution parameters
 */
interface ExecuteWasmParams {
  moduleId: string
  functionName: string
  args?: unknown[]
  timeoutMs?: number
}

/**
 * useWasmModule Hook
 * WASM module management and execution
 *
 * @example
 * import { useWasmModule } from '@/hooks/useWasmModule'
 *
 * function MyComponent() {
 *   const { modules, executeAsync, isExecuting } = useWasmModule()
 *
 *   const handleExecute = async () => {
 *     const result = await executeAsync({
 *       moduleId: 'module-id',
 *       functionName: 'add',
 *       args: [1, 2]
 *     })
 *     console.log(result.result) // 3
 *   }
 * }
 */
export function useWasmModule() {
  const queryClient = useQueryClient()

  // List modules (own + public)
  const {
    data: modules,
    isLoading: isLoadingModules,
    error: modulesError,
    refetch: refetchModules,
  } = useQuery({
    queryKey: ['wasm-modules'],
    queryFn: async () => {
      const { data, error } = await WasmModuleRepository.list()
      if (error) throw error
      return data
    },
  })

  // List own modules
  const {
    data: ownModules,
    isLoading: isLoadingOwnModules,
    error: ownModulesError,
    refetch: refetchOwnModules,
  } = useQuery({
    queryKey: ['wasm-modules', 'own'],
    queryFn: async () => {
      const { data, error } = await WasmModuleRepository.listOwn()
      if (error) throw error
      return data
    },
  })

  // Delete module
  const deleteMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      const { error } = await WasmModuleRepository.delete(moduleId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wasm-modules'] })
    },
  })

  // Execute WASM
  const executeMutation = useMutation({
    mutationFn: async (params: ExecuteWasmParams): Promise<WasmExecutionResult> => {
      const { moduleId, functionName, args, timeoutMs } = params

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Authentication required')

      // Get module
      const { data: module, error: moduleError } = await WasmModuleRepository.getById(moduleId)
      if (moduleError || !module) throw moduleError || new Error('Module not found')

      // Execute from file
      const { data: result, error: executeError } = await WasmRuntimeService.executeFromFile(module.fileId, {
        functionName,
        args,
        timeoutMs: timeoutMs || module.timeoutMs,
      })

      if (executeError || !result) throw executeError || new Error('Execution failed')

      // Record execution
      await WasmExecutionRepository.create({
        module_id: moduleId,
        executor_id: user.id,
        function_name: functionName,
        input_params: args ? { args } : {},
        output_result: result.result,
        execution_time_ms: result.executionTimeMs,
        memory_used_bytes: result.memoryUsedBytes,
        status: 'success',
        error_message: null,
      })

      return result
    },
    onError: async (error, params) => {
      // Record error execution
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        await WasmExecutionRepository.create({
          module_id: params.moduleId,
          executor_id: user.id,
          function_name: params.functionName,
          input_params: params.args ? { args: params.args } : {},
          output_result: null,
          execution_time_ms: 0,
          memory_used_bytes: null,
          status: error.message.includes('timeout') ? 'timeout' : 'error',
          error_message: error instanceof Error ? error.message : String(error),
        })
      }
    },
  })

  return {
    // Module list
    modules,
    ownModules,
    isLoadingModules,
    isLoadingOwnModules,
    modulesError,
    ownModulesError,
    refetchModules,
    refetchOwnModules,

    // Delete module
    deleteModule: deleteMutation.mutate,
    deleteModuleAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,

    // Execute WASM
    execute: executeMutation.mutate,
    executeAsync: executeMutation.mutateAsync,
    isExecuting: executeMutation.isPending,
    executionError: executeMutation.error,
    executionResult: executeMutation.data,
  }
}

/**
 * useWasmExecutionHistory Hook
 * Get execution history
 *
 * @example
 * import { useWasmExecutionHistory } from '@/hooks/useWasmModule'
 *
 * function MyComponent() {
 *   const { executions, isLoading } = useWasmExecutionHistory('module-id')
 * }
 */
export function useWasmExecutionHistory(moduleId?: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: moduleId ? ['wasm-executions', moduleId] : ['wasm-executions', 'own'],
    queryFn: async () => {
      if (moduleId) {
        const { data, error } = await WasmExecutionRepository.listByModule(moduleId)
        if (error) throw error
        return data
      } else {
        const { data, error } = await WasmExecutionRepository.listOwn()
        if (error) throw error
        return data
      }
    },
  })

  return {
    executions: data,
    isLoading,
    error,
    refetch,
  }
}

/**
 * useWasmModuleStats Hook
 * Get module statistics
 *
 * @example
 * import { useWasmModuleStats } from '@/hooks/useWasmModule'
 *
 * function MyComponent() {
 *   const { stats, isLoading } = useWasmModuleStats('module-id')
 * }
 */
export function useWasmModuleStats(moduleId: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['wasm-module-stats', moduleId],
    queryFn: async () => {
      const { data, error } = await WasmExecutionRepository.getStats(moduleId)
      if (error) throw error
      return data
    },
  })

  return {
    stats: data,
    isLoading,
    error,
    refetch,
  }
}
