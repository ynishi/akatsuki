import type { EdgeFunctionResponse } from '@/types'
import { PrivateStorageService } from './PrivateStorageService'

/**
 * WASM execution options
 */
export interface WasmExecutionOptions {
  functionName: string
  args?: unknown[]
  timeoutMs?: number
  memoryLimitBytes?: number
}

/**
 * WASM execution result
 */
export interface WasmExecutionResult {
  result: unknown
  executionTimeMs: number
  memoryUsedBytes: number | null
}

/**
 * WASM Runtime Service
 * Browser-based WASM execution with safety guarantees
 *
 * Key responsibilities:
 * 1. Memory management (prevent leaks)
 * 2. Timeout control (prevent infinite loops)
 * 3. Error handling (safe recovery)
 * 4. Performance measurement
 *
 * @example
 * import { WasmRuntimeService } from '@/services/WasmRuntimeService'
 *
 * // Load WASM module
 * const module = await WasmRuntimeService.loadModule(wasmBytes, 'cache-key')
 *
 * // Instantiate
 * const instance = await WasmRuntimeService.instantiate(module)
 *
 * // Execute function
 * const { data, error } = await WasmRuntimeService.execute(instance, {
 *   functionName: 'add',
 *   args: [1, 2],
 *   timeoutMs: 5000
 * })
 */
export class WasmRuntimeService {
  // Module cache (avoid recompiling the same WASM)
  private static moduleCache = new Map<string, WebAssembly.Module>()

  // Instance cache (reusable instances)
  private static instanceCache = new Map<string, WebAssembly.Instance>()

  /**
   * Load WASM module from binary (with caching)
   *
   * @param wasmBytes - WASM binary (ArrayBuffer)
   * @param cacheKey - Cache key (file_id etc.)
   * @returns WebAssembly.Module
   */
  static async loadModule(wasmBytes: ArrayBuffer, cacheKey?: string): Promise<WebAssembly.Module> {
    try {
      // Check cache
      if (cacheKey && this.moduleCache.has(cacheKey)) {
        console.log('[WasmRuntimeService] Module loaded from cache:', cacheKey)
        return this.moduleCache.get(cacheKey)!
      }

      console.log('[WasmRuntimeService] Compiling WASM module...')
      const startTime = performance.now()

      // Compile WASM
      const module = await WebAssembly.compile(wasmBytes)

      const compileTime = performance.now() - startTime
      console.log(`[WasmRuntimeService] Module compiled in ${compileTime.toFixed(2)}ms`)

      // Save to cache
      if (cacheKey) {
        this.moduleCache.set(cacheKey, module)
      }

      return module
    } catch (error) {
      console.error('[WasmRuntimeService] Module compilation failed:', error)
      throw new Error(
        `WASM module compilation failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Instantiate WASM module
   *
   * @param module - WebAssembly.Module
   * @param imports - Import object (if needed)
   * @returns WebAssembly.Instance
   */
  static async instantiate(
    module: WebAssembly.Module,
    imports?: WebAssembly.Imports
  ): Promise<WebAssembly.Instance> {
    try {
      console.log('[WasmRuntimeService] Instantiating WASM module...')
      const startTime = performance.now()

      const instance = await WebAssembly.instantiate(module, imports || {})

      const instantiateTime = performance.now() - startTime
      console.log(`[WasmRuntimeService] Module instantiated in ${instantiateTime.toFixed(2)}ms`)

      return instance
    } catch (error) {
      console.error('[WasmRuntimeService] Module instantiation failed:', error)
      throw new Error(
        `WASM module instantiation failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Execute WASM function (with timeout & error handling)
   *
   * @param instance - WebAssembly.Instance
   * @param options - Execution options
   * @returns Execution result
   *
   * @throws Timeout, execution error
   */
  static async execute(
    instance: WebAssembly.Instance,
    options: WasmExecutionOptions
  ): Promise<EdgeFunctionResponse<WasmExecutionResult>> {
    const { functionName, args = [], timeoutMs = 5000 } = options

    try {
      // Check if function exists
      const exports = instance.exports as Record<string, unknown>
      if (typeof exports[functionName] !== 'function') {
        throw new Error(`Function "${functionName}" not found`)
      }

      const func = exports[functionName] as (...args: unknown[]) => unknown

      console.log('[WasmRuntimeService] Executing function:', functionName, 'with args:', args)

      // Execute with timeout control
      const startTime = performance.now()
      let timeoutId: number | null = null
      let didTimeout = false

      const executionPromise = new Promise((resolve, reject) => {
        // Timeout timer
        timeoutId = window.setTimeout(() => {
          didTimeout = true
          reject(new Error(`Execution timed out (${timeoutMs}ms)`))
        }, timeoutMs)

        try {
          // Execute WASM function
          const result = func(...args)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })

      // Wait for execution
      const result = await executionPromise

      // Clear timeout timer
      if (timeoutId !== null && !didTimeout) {
        clearTimeout(timeoutId)
      }

      const executionTimeMs = Math.round(performance.now() - startTime)

      console.log(`[WasmRuntimeService] Execution completed in ${executionTimeMs}ms`)

      // Get memory usage (if memory export exists)
      let memoryUsedBytes: number | null = null
      if (exports.memory && exports.memory instanceof WebAssembly.Memory) {
        memoryUsedBytes = exports.memory.buffer.byteLength
      }

      return {
        data: {
          result,
          executionTimeMs,
          memoryUsedBytes,
        },
        error: null,
      }
    } catch (error) {
      console.error('[WasmRuntimeService] Execution failed:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`WASM execution failed: ${message}`) }
    }
  }

  /**
   * Execute WASM from file (one-stop API)
   *
   * @param fileId - files table ID
   * @param options - Execution options
   * @returns Execution result
   */
  static async executeFromFile(
    fileId: string,
    options: WasmExecutionOptions
  ): Promise<EdgeFunctionResponse<WasmExecutionResult>> {
    try {
      console.log('[WasmRuntimeService] Fetching WASM file:', fileId)

      // Download WASM file from Private Storage
      const { data: downloadData, error: downloadError } = await PrivateStorageService.download(fileId)
      if (downloadError || !downloadData) {
        throw downloadError || new Error('Failed to download WASM file')
      }

      // Get file data as ArrayBuffer
      const wasmBytes = await downloadData.blob.arrayBuffer()

      console.log('[WasmRuntimeService] WASM file downloaded, size:', wasmBytes.byteLength, 'bytes')

      // Load module (with caching)
      const module = await this.loadModule(wasmBytes, fileId)

      // Instantiate
      const instance = await this.instantiate(module)

      // Execute
      return await this.execute(instance, options)
    } catch (error) {
      console.error('[WasmRuntimeService] executeFromFile failed:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`Failed to execute from file: ${message}`) }
    }
  }

  /**
   * Clear module cache
   */
  static clearCache(cacheKey?: string): void {
    if (cacheKey) {
      this.moduleCache.delete(cacheKey)
      this.instanceCache.delete(cacheKey)
      console.log('[WasmRuntimeService] Cache cleared for key:', cacheKey)
    } else {
      this.moduleCache.clear()
      this.instanceCache.clear()
      console.log('[WasmRuntimeService] All cache cleared')
    }
  }

  /**
   * Get exported functions list
   *
   * @param instance - WebAssembly.Instance
   * @returns Function names array
   */
  static getExportedFunctions(instance: WebAssembly.Instance): string[] {
    const exports = instance.exports as Record<string, unknown>
    return Object.keys(exports).filter((key) => typeof exports[key] === 'function')
  }

  /**
   * Get memory information
   *
   * @param instance - WebAssembly.Instance
   * @returns Memory info
   */
  static getMemoryInfo(instance: WebAssembly.Instance): {
    currentBytes: number
    currentPages: number
    maxPages: number | null
  } | null {
    const exports = instance.exports as Record<string, unknown>
    if (!exports.memory || !(exports.memory instanceof WebAssembly.Memory)) {
      return null
    }

    const memory = exports.memory
    const currentBytes = memory.buffer.byteLength
    const currentPages = currentBytes / (64 * 1024) // 1 page = 64KB

    return {
      currentBytes,
      currentPages,
      maxPages: null, // WebAssembly.Memory doesn't expose max info
    }
  }

  /**
   * Validate WASM module
   *
   * @param wasmBytes - WASM binary
   * @returns Validation result
   */
  static async validateModule(wasmBytes: ArrayBuffer): Promise<{ valid: boolean; error?: string }> {
    try {
      // Try to compile
      await WebAssembly.compile(wasmBytes)
      return { valid: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { valid: false, error: message }
    }
  }

  /**
   * Get module info without instantiating
   *
   * @param wasmBytes - WASM binary
   * @returns Module info
   */
  static async getModuleInfo(wasmBytes: ArrayBuffer): Promise<{
    valid: boolean
    exportedFunctions?: string[]
    error?: string
  }> {
    try {
      const module = await WebAssembly.compile(wasmBytes)
      const instance = await WebAssembly.instantiate(module)
      const exportedFunctions = this.getExportedFunctions(instance)

      return {
        valid: true,
        exportedFunctions,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { valid: false, error: message }
    }
  }
}
