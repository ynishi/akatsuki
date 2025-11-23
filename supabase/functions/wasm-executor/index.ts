// WASM Executor Edge Function
// Dynamically loads and executes WASM modules from Storage

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createAkatsukiHandler } from '../_shared/handler.ts'
import { ErrorCodes } from '../_shared/api_types.ts'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'
import { WasmLoader } from './wasm_loader.ts'
import { WasmSandbox } from './wasm_sandbox.ts'

// ============================================================================
// Input Schema
// ============================================================================

const InputSchema = z.object({
  moduleId: z.string().uuid({
    message: 'moduleId must be a valid UUID',
  }),
  functionName: z.string().min(1, {
    message: 'functionName is required',
  }),
  args: z.array(z.any()).optional().default([]),
  timeoutMs: z.number().min(100).max(30000).optional(),
})

type Input = z.infer<typeof InputSchema>

// ============================================================================
// Output Type
// ============================================================================

interface Output {
  result: unknown
  executionTimeMs: number
  memoryUsedBytes: number | null
  cacheHit: boolean
  module: {
    id: string
    name: string
    version: string
    ownerType: string
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if user has permission to execute the WASM module
 */
function checkExecutionPermission(wasmModule: any, user: any): boolean {
  // System modules: accessible by all authenticated users
  if (wasmModule.owner_type === 'system') {
    return true
  }

  // Admin modules: accessible only by admins
  if (wasmModule.owner_type === 'admin') {
    // Check if user is admin (assumes user metadata has is_admin field)
    return user.user_metadata?.is_admin === true || user.role === 'admin'
  }

  // User modules: check ownership, public flag, or allowed users
  if (wasmModule.owner_type === 'user') {
    // Owner can always execute
    if (wasmModule.owner_id === user.id) {
      return true
    }

    // Public modules can be executed by anyone
    if (wasmModule.is_public === true) {
      return true
    }

    // Check if user is in allowed_users list
    if (wasmModule.allowed_users && Array.isArray(wasmModule.allowed_users)) {
      return wasmModule.allowed_users.includes(user.id)
    }
  }

  return false
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req) => {
  return createAkatsukiHandler<Input, Output>(req, {
    inputSchema: InputSchema,
    requireAuth: true,

    logic: async ({ input, userClient, adminClient, repos }) => {
      const { moduleId, functionName, args, timeoutMs } = input

      console.log(`[wasm-executor] Executing module ${moduleId}, function ${functionName}`)

      // 1. Get authenticated user
      const { data: { user }, error: userError } = await userClient.auth.getUser()
      if (userError || !user) {
        throw Object.assign(
          new Error('Unauthorized'),
          { code: ErrorCodes.UNAUTHORIZED, status: 401 }
        )
      }

      // 2. Fetch WASM module metadata (using adminClient to bypass RLS for validation)
      const { data: wasmModule, error: moduleError } = await adminClient
        .from('wasm_modules')
        .select('*')
        .eq('id', moduleId)
        .single()

      if (moduleError || !wasmModule) {
        console.error(`[wasm-executor] Module not found: ${moduleId}`, moduleError)
        throw Object.assign(
          new Error(`WASM module not found: ${moduleId}`),
          { code: ErrorCodes.NOT_FOUND, status: 404 }
        )
      }

      // Check if module is active
      if (wasmModule.status !== 'active') {
        throw Object.assign(
          new Error(`WASM module is not active (status: ${wasmModule.status})`),
          { code: ErrorCodes.BAD_REQUEST, status: 400 }
        )
      }

      // 3. Check execution permission
      const canExecute = checkExecutionPermission(wasmModule, user)
      if (!canExecute) {
        console.warn(`[wasm-executor] Permission denied for user ${user.id} on module ${moduleId}`)
        throw Object.assign(
          new Error('Permission denied to execute this module'),
          { code: ErrorCodes.FORBIDDEN, status: 403 }
        )
      }

      console.log(`[wasm-executor] Permission granted for user ${user.id}`)

      // 4. Load WASM module (with LRU cache)
      const loadStartTime = performance.now()
      const { instance, cacheHit } = await WasmLoader.load(
        moduleId,
        wasmModule.file_id,
        adminClient
      )
      const loadTime = Math.round(performance.now() - loadStartTime)

      console.log(`[wasm-executor] Module loaded in ${loadTime}ms (cache hit: ${cacheHit})`)

      // 5. Execute WASM function in sandbox
      const execStartTime = performance.now()
      const result = await WasmSandbox.execute(instance, {
        functionName,
        args,
        timeoutMs: timeoutMs || wasmModule.timeout_ms,
        maxMemoryBytes: wasmModule.max_memory_pages
          ? wasmModule.max_memory_pages * 64 * 1024
          : undefined,
      })
      const executionTimeMs = Math.round(performance.now() - execStartTime)

      console.log(`[wasm-executor] Function executed in ${executionTimeMs}ms`)

      // 6. Get memory usage
      const memoryUsedBytes = WasmSandbox.getMemoryUsage(instance)

      // 7. Record execution history (using adminClient to bypass RLS)
      try {
        await adminClient.from('wasm_executions').insert({
          module_id: moduleId,
          executor_id: user.id,
          function_name: functionName,
          input_params: { args },
          output_result: result,
          execution_time_ms: executionTimeMs,
          memory_used_bytes: memoryUsedBytes,
          status: 'success',
          error_message: null,
        })
      } catch (historyError) {
        // Don't fail the request if history logging fails
        console.error('[wasm-executor] Failed to record execution history:', historyError)
      }

      // 8. Return result
      return {
        result,
        executionTimeMs,
        memoryUsedBytes,
        cacheHit,
        module: {
          id: wasmModule.id,
          name: wasmModule.module_name,
          version: wasmModule.version,
          ownerType: wasmModule.owner_type,
        },
      }
    },

    // Error handler: log failed executions
    onError: async (error, { input, adminClient }) => {
      console.error('[wasm-executor] Execution failed:', error)

      if (input?.moduleId && adminClient) {
        try {
          const { data: { user } } = await adminClient.auth.getUser()
          if (user) {
            await adminClient.from('wasm_executions').insert({
              module_id: input.moduleId,
              executor_id: user.id,
              function_name: input.functionName || 'unknown',
              input_params: { args: input.args || [] },
              output_result: null,
              execution_time_ms: 0,
              memory_used_bytes: null,
              status: 'error',
              error_message: error.message || String(error),
            })
          }
        } catch (historyError) {
          console.error('[wasm-executor] Failed to record error history:', historyError)
        }
      }
    },
  })
})
