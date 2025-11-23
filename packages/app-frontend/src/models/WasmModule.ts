/**
 * WasmModule Model
 * WASM module domain model
 */

/**
 * Database format (snake_case)
 */
export interface WasmModuleDatabase {
  id: string
  owner_id: string
  owner_type: 'system' | 'admin' | 'user'
  file_id: string
  module_name: string
  description: string | null
  version: string
  wasm_size_bytes: number
  exported_functions: string[]
  memory_pages: number
  max_memory_pages: number | null
  timeout_ms: number
  max_execution_time_ms: number
  is_public: boolean
  allowed_users: string[]
  status: 'uploading' | 'active' | 'disabled' | 'error'
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

/**
 * Application format (camelCase)
 */
export class WasmModule {
  constructor(
    public id: string,
    public ownerId: string,
    public ownerType: 'system' | 'admin' | 'user',
    public fileId: string,
    public moduleName: string,
    public description: string | null,
    public version: string,
    public wasmSizeBytes: number,
    public exportedFunctions: string[],
    public memoryPages: number,
    public maxMemoryPages: number | null,
    public timeoutMs: number,
    public maxExecutionTimeMs: number,
    public isPublic: boolean,
    public allowedUsers: string[],
    public status: 'uploading' | 'active' | 'disabled' | 'error',
    public metadata: Record<string, unknown>,
    public createdAt: Date,
    public updatedAt: Date
  ) {}

  /**
   * Convert from database format to application format
   */
  static fromDatabase(data: WasmModuleDatabase): WasmModule {
    return new WasmModule(
      data.id,
      data.owner_id,
      data.owner_type,
      data.file_id,
      data.module_name,
      data.description,
      data.version,
      data.wasm_size_bytes,
      data.exported_functions,
      data.memory_pages,
      data.max_memory_pages,
      data.timeout_ms,
      data.max_execution_time_ms,
      data.is_public,
      data.allowed_users,
      data.status,
      data.metadata,
      new Date(data.created_at),
      new Date(data.updated_at)
    )
  }

  /**
   * Convert from application format to database format
   */
  toDatabase(): Omit<WasmModuleDatabase, 'id' | 'created_at' | 'updated_at'> {
    return {
      owner_id: this.ownerId,
      owner_type: this.ownerType,
      file_id: this.fileId,
      module_name: this.moduleName,
      description: this.description,
      version: this.version,
      wasm_size_bytes: this.wasmSizeBytes,
      exported_functions: this.exportedFunctions,
      memory_pages: this.memoryPages,
      max_memory_pages: this.maxMemoryPages,
      timeout_ms: this.timeoutMs,
      max_execution_time_ms: this.maxExecutionTimeMs,
      is_public: this.isPublic,
      allowed_users: this.allowedUsers,
      status: this.status,
      metadata: this.metadata,
    }
  }

  /**
   * Check if user can execute this module
   */
  canExecute(userId: string, isAdmin: boolean = false): boolean {
    // System modules: accessible by all authenticated users
    if (this.ownerType === 'system' && this.status === 'active') return true

    // Admin modules: accessible only by admins
    if (this.ownerType === 'admin') return isAdmin

    // User modules: check ownership, public flag, or allowed users
    if (this.ownerType === 'user') {
      // Owner can always execute
      if (this.ownerId === userId) return true

      // Public modules can be executed by anyone
      if (this.isPublic && this.status === 'active') return true

      // Check if user is in allowed list
      if (this.allowedUsers.includes(userId)) return true
    }

    return false
  }

  /**
   * Check if this is a system module
   */
  get isSystem(): boolean {
    return this.ownerType === 'system'
  }

  /**
   * Check if this is an admin module
   */
  get isAdminOnly(): boolean {
    return this.ownerType === 'admin'
  }

  /**
   * Check if this is a user module
   */
  get isUserModule(): boolean {
    return this.ownerType === 'user'
  }

  /**
   * Get owner type badge color
   */
  get ownerTypeBadgeColor(): string {
    switch (this.ownerType) {
      case 'system':
        return 'blue'
      case 'admin':
        return 'red'
      case 'user':
        return 'green'
      default:
        return 'gray'
    }
  }

  /**
   * Get owner type display name
   */
  get ownerTypeDisplayName(): string {
    switch (this.ownerType) {
      case 'system':
        return 'System'
      case 'admin':
        return 'Admin'
      case 'user':
        return 'User'
      default:
        return 'Unknown'
    }
  }

  /**
   * Format size to human-readable format
   */
  get formattedSize(): string {
    const kb = this.wasmSizeBytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    const mb = kb / 1024
    return `${mb.toFixed(2)} MB`
  }

  /**
   * Get memory information
   */
  get memoryInfo(): string {
    const initialMB = (this.memoryPages * 64) / 1024
    if (this.maxMemoryPages === null) {
      return `Initial: ${initialMB.toFixed(1)} MB (unlimited)`
    }
    const maxMB = (this.maxMemoryPages * 64) / 1024
    return `Initial: ${initialMB.toFixed(1)} MB, Max: ${maxMB.toFixed(1)} MB`
  }

  /**
   * Check if module is executable
   */
  get isExecutable(): boolean {
    return this.status === 'active' && this.exportedFunctions.length > 0
  }

  /**
   * Get status badge color
   */
  get statusColor(): string {
    switch (this.status) {
      case 'active':
        return 'green'
      case 'uploading':
        return 'blue'
      case 'disabled':
        return 'gray'
      case 'error':
        return 'red'
      default:
        return 'gray'
    }
  }
}
