// WASM Sandbox Executor
// Provides safe execution of WASM functions with timeout and memory limits

// ============================================================================
// Types
// ============================================================================

export interface ExecuteOptions {
  functionName: string
  args: unknown[]
  timeoutMs: number
  maxMemoryBytes?: number
}

// ============================================================================
// WASM Sandbox
// ============================================================================

export class WasmSandbox {
  /**
   * Execute WASM function with timeout protection
   *
   * @param instance - WebAssembly.Instance
   * @param options - Execution options (function name, args, timeout, memory limit)
   * @returns Function result
   * @throws Error if function not found, timeout, or execution error
   */
  static async execute(
    instance: WebAssembly.Instance,
    options: ExecuteOptions
  ): Promise<unknown> {
    const { functionName, args, timeoutMs, maxMemoryBytes } = options

    // 1. Validate function exists
    const exports = instance.exports as Record<string, unknown>
    if (typeof exports[functionName] !== 'function') {
      const availableFunctions = Object.keys(exports)
        .filter(key => typeof exports[key] === 'function')
        .join(', ')
      throw new Error(
        `Function "${functionName}" not found in WASM module. ` +
        `Available functions: ${availableFunctions || 'none'}`
      )
    }

    const func = exports[functionName] as CallableFunction

    // 2. Check memory limit (if specified)
    if (maxMemoryBytes) {
      const currentMemory = this.getMemoryUsage(instance)
      if (currentMemory && currentMemory > maxMemoryBytes) {
        throw new Error(
          `Memory limit exceeded: ${currentMemory} bytes > ${maxMemoryBytes} bytes`
        )
      }
    }

    // 3. Execute with timeout protection
    console.log(`[WasmSandbox] Executing ${functionName} with timeout ${timeoutMs}ms`)

    let timeoutId: number | null = null
    let didTimeout = false

    const executionPromise = new Promise((resolve, reject) => {
      // Set timeout
      timeoutId = setTimeout(() => {
        didTimeout = true
        reject(new Error(`Execution timeout after ${timeoutMs}ms`))
      }, timeoutMs)

      try {
        // Execute WASM function
        const result = func(...args)
        resolve(result)
      } catch (error) {
        reject(error)
      }
    })

    try {
      const result = await executionPromise
      console.log(`[WasmSandbox] Execution completed successfully`)
      return result
    } catch (error) {
      if (didTimeout) {
        console.error(`[WasmSandbox] Execution timed out after ${timeoutMs}ms`)
      } else {
        console.error(`[WasmSandbox] Execution failed:`, error)
      }
      throw error
    } finally {
      // Clear timeout
      if (timeoutId !== null && !didTimeout) {
        clearTimeout(timeoutId)
      }
    }
  }

  /**
   * Get current memory usage of WASM instance
   *
   * @param instance - WebAssembly.Instance
   * @returns Memory usage in bytes, or null if no memory export
   */
  static getMemoryUsage(instance: WebAssembly.Instance): number | null {
    const exports = instance.exports as Record<string, unknown>

    if (exports.memory && exports.memory instanceof WebAssembly.Memory) {
      return exports.memory.buffer.byteLength
    }

    return null
  }

  /**
   * Get list of exported functions
   *
   * @param instance - WebAssembly.Instance
   * @returns Array of function names
   */
  static getExportedFunctions(instance: WebAssembly.Instance): string[] {
    const exports = instance.exports as Record<string, unknown>
    return Object.keys(exports).filter(key => typeof exports[key] === 'function')
  }

  /**
   * Get memory information (current and max pages)
   *
   * @param instance - WebAssembly.Instance
   * @returns Memory info or null
   */
  static getMemoryInfo(instance: WebAssembly.Instance): {
    currentBytes: number
    currentPages: number
    pageSize: number
  } | null {
    const exports = instance.exports as Record<string, unknown>

    if (!exports.memory || !(exports.memory instanceof WebAssembly.Memory)) {
      return null
    }

    const memory = exports.memory
    const currentBytes = memory.buffer.byteLength
    const pageSize = 64 * 1024 // 64KB per page
    const currentPages = currentBytes / pageSize

    return {
      currentBytes,
      currentPages,
      pageSize,
    }
  }

  /**
   * Validate WASM instance has required exports
   *
   * @param instance - WebAssembly.Instance
   * @param requiredFunctions - Array of required function names
   * @throws Error if any required function is missing
   */
  static validateExports(instance: WebAssembly.Instance, requiredFunctions: string[]): void {
    const exports = instance.exports as Record<string, unknown>
    const missingFunctions: string[] = []

    for (const funcName of requiredFunctions) {
      if (typeof exports[funcName] !== 'function') {
        missingFunctions.push(funcName)
      }
    }

    if (missingFunctions.length > 0) {
      throw new Error(
        `Missing required functions: ${missingFunctions.join(', ')}. ` +
        `Available: ${this.getExportedFunctions(instance).join(', ')}`
      )
    }
  }
}
