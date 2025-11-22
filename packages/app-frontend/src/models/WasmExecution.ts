/**
 * WasmExecution Model
 * WASM execution history domain model
 */

/**
 * Database format (snake_case)
 */
export interface WasmExecutionDatabase {
  id: string
  module_id: string
  executor_id: string
  function_name: string
  input_params: Record<string, unknown>
  output_result: unknown | null
  execution_time_ms: number
  memory_used_bytes: number | null
  status: 'success' | 'error' | 'timeout'
  error_message: string | null
  executed_at: string
}

/**
 * Application format (camelCase)
 */
export class WasmExecution {
  constructor(
    public id: string,
    public moduleId: string,
    public executorId: string,
    public functionName: string,
    public inputParams: Record<string, unknown>,
    public outputResult: unknown | null,
    public executionTimeMs: number,
    public memoryUsedBytes: number | null,
    public status: 'success' | 'error' | 'timeout',
    public errorMessage: string | null,
    public executedAt: Date
  ) {}

  /**
   * Convert from database format to application format
   */
  static fromDatabase(data: WasmExecutionDatabase): WasmExecution {
    return new WasmExecution(
      data.id,
      data.module_id,
      data.executor_id,
      data.function_name,
      data.input_params,
      data.output_result,
      data.execution_time_ms,
      data.memory_used_bytes,
      data.status,
      data.error_message,
      new Date(data.executed_at)
    )
  }

  /**
   * Convert from application format to database format
   */
  toDatabase(): Omit<WasmExecutionDatabase, 'id' | 'executed_at'> {
    return {
      module_id: this.moduleId,
      executor_id: this.executorId,
      function_name: this.functionName,
      input_params: this.inputParams,
      output_result: this.outputResult,
      execution_time_ms: this.executionTimeMs,
      memory_used_bytes: this.memoryUsedBytes,
      status: this.status,
      error_message: this.errorMessage,
    }
  }

  /**
   * Check if execution was successful
   */
  get isSuccess(): boolean {
    return this.status === 'success'
  }

  /**
   * Get performance rating
   */
  get performanceRating(): 'fast' | 'normal' | 'slow' {
    if (this.executionTimeMs < 100) return 'fast'
    if (this.executionTimeMs < 1000) return 'normal'
    return 'slow'
  }

  /**
   * Format execution time to human-readable format
   */
  get formattedExecutionTime(): string {
    if (this.executionTimeMs < 1000) return `${this.executionTimeMs} ms`
    return `${(this.executionTimeMs / 1000).toFixed(2)} s`
  }

  /**
   * Format memory used to human-readable format
   */
  get formattedMemoryUsed(): string | null {
    if (this.memoryUsedBytes === null) return null
    const kb = this.memoryUsedBytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    const mb = kb / 1024
    return `${mb.toFixed(2)} MB`
  }

  /**
   * Get status badge color
   */
  get statusColor(): string {
    switch (this.status) {
      case 'success':
        return 'green'
      case 'error':
        return 'red'
      case 'timeout':
        return 'orange'
      default:
        return 'gray'
    }
  }

  /**
   * Get performance color
   */
  get performanceColor(): string {
    switch (this.performanceRating) {
      case 'fast':
        return 'green'
      case 'normal':
        return 'blue'
      case 'slow':
        return 'orange'
      default:
        return 'gray'
    }
  }

  /**
   * Format executed at to relative time
   */
  get relativeTime(): string {
    const now = new Date()
    const diff = now.getTime() - this.executedAt.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return `${seconds}s ago`
  }
}
