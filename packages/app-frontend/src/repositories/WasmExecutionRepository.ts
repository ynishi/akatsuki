import { supabase } from '@/lib/supabase'
import { WasmExecution, WasmExecutionDatabase } from '@/models/WasmExecution'

/**
 * Repository response type
 */
export interface RepositoryResponse<T> {
  data: T | null
  error: Error | null
}

/**
 * WasmExecution Repository
 * CRUD operations for wasm_executions table
 *
 * @example
 * import { WasmExecutionRepository } from '@/repositories/WasmExecutionRepository'
 *
 * // Create execution record
 * const { data, error } = await WasmExecutionRepository.create({ ... })
 *
 * // List executions by module
 * const { data, error } = await WasmExecutionRepository.listByModule('module-id')
 *
 * // Get statistics
 * const { data, error } = await WasmExecutionRepository.getStats('module-id')
 */
export class WasmExecutionRepository {
  /**
   * Create execution record
   */
  static async create(
    executionData: Omit<WasmExecutionDatabase, 'id' | 'executed_at'>
  ): Promise<RepositoryResponse<WasmExecution>> {
    try {
      const { data, error } = await supabase.from('wasm_executions').insert(executionData).select().single()

      if (error) throw error
      if (!data) throw new Error('Failed to create execution record')

      const execution = WasmExecution.fromDatabase(data as WasmExecutionDatabase)

      return { data: execution, error: null }
    } catch (error) {
      console.error('[WasmExecutionRepository] create error:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`Failed to create execution record: ${message}`) }
    }
  }

  /**
   * List executions by module ID
   */
  static async listByModule(moduleId: string, limit = 100): Promise<RepositoryResponse<WasmExecution[]>> {
    try {
      const { data, error } = await supabase
        .from('wasm_executions')
        .select('*')
        .eq('module_id', moduleId)
        .order('executed_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      const executions = (data || []).map((row) => WasmExecution.fromDatabase(row as WasmExecutionDatabase))

      return { data: executions, error: null }
    } catch (error) {
      console.error('[WasmExecutionRepository] listByModule error:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`Failed to fetch executions: ${message}`) }
    }
  }

  /**
   * List own executions
   */
  static async listOwn(limit = 100): Promise<RepositoryResponse<WasmExecution[]>> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Authentication required')

      const { data, error } = await supabase
        .from('wasm_executions')
        .select('*')
        .eq('executor_id', user.id)
        .order('executed_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      const executions = (data || []).map((row) => WasmExecution.fromDatabase(row as WasmExecutionDatabase))

      return { data: executions, error: null }
    } catch (error) {
      console.error('[WasmExecutionRepository] listOwn error:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`Failed to fetch own executions: ${message}`) }
    }
  }

  /**
   * Get execution by ID
   */
  static async getById(id: string): Promise<RepositoryResponse<WasmExecution>> {
    try {
      const { data, error } = await supabase.from('wasm_executions').select('*').eq('id', id).single()

      if (error) throw error
      if (!data) throw new Error('Execution not found')

      const execution = WasmExecution.fromDatabase(data as WasmExecutionDatabase)

      return { data: execution, error: null }
    } catch (error) {
      console.error('[WasmExecutionRepository] getById error:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`Failed to fetch execution: ${message}`) }
    }
  }

  /**
   * Get module statistics
   */
  static async getStats(
    moduleId: string
  ): Promise<
    RepositoryResponse<{
      totalExecutions: number
      successRate: number
      avgExecutionTime: number
      errorCount: number
      timeoutCount: number
    }>
  > {
    try {
      const { data, error } = await supabase
        .from('wasm_executions')
        .select('status, execution_time_ms')
        .eq('module_id', moduleId)

      if (error) throw error

      const executions = data || []
      const totalExecutions = executions.length
      const successCount = executions.filter((e) => e.status === 'success').length
      const errorCount = executions.filter((e) => e.status === 'error').length
      const timeoutCount = executions.filter((e) => e.status === 'timeout').length
      const successRate = totalExecutions > 0 ? (successCount / totalExecutions) * 100 : 0

      const avgExecutionTime =
        totalExecutions > 0 ? executions.reduce((sum, e) => sum + e.execution_time_ms, 0) / totalExecutions : 0

      return {
        data: {
          totalExecutions,
          successRate,
          avgExecutionTime,
          errorCount,
          timeoutCount,
        },
        error: null,
      }
    } catch (error) {
      console.error('[WasmExecutionRepository] getStats error:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`Failed to fetch statistics: ${message}`) }
    }
  }

  /**
   * List recent executions across all modules
   */
  static async listRecent(limit = 50): Promise<RepositoryResponse<WasmExecution[]>> {
    try {
      const { data, error } = await supabase
        .from('wasm_executions')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      const executions = (data || []).map((row) => WasmExecution.fromDatabase(row as WasmExecutionDatabase))

      return { data: executions, error: null }
    } catch (error) {
      console.error('[WasmExecutionRepository] listRecent error:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`Failed to fetch recent executions: ${message}`) }
    }
  }

  /**
   * List failed executions for debugging
   */
  static async listFailed(moduleId?: string, limit = 50): Promise<RepositoryResponse<WasmExecution[]>> {
    try {
      let query = supabase.from('wasm_executions').select('*').in('status', ['error', 'timeout'])

      if (moduleId) {
        query = query.eq('module_id', moduleId)
      }

      const { data, error } = await query.order('executed_at', { ascending: false }).limit(limit)

      if (error) throw error

      const executions = (data || []).map((row) => WasmExecution.fromDatabase(row as WasmExecutionDatabase))

      return { data: executions, error: null }
    } catch (error) {
      console.error('[WasmExecutionRepository] listFailed error:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`Failed to fetch failed executions: ${message}`) }
    }
  }
}
