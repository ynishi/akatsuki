/**
 * ApiKey Model
 * For Public API Gateway authentication
 *
 * VibeCoding Standard:
 * - fromDatabase/toDatabase conversion
 * - RLS supported (owner_id based)
 */

export type ApiKeyOperation = 'list' | 'get' | 'create' | 'update' | 'delete'

export interface ApiKeyData {
  id?: string | null
  name: string
  description?: string | null
  keyPrefix: string
  entityName: string
  tableName: string
  allowedOperations: ApiKeyOperation[]
  rateLimitPerMinute?: number
  rateLimitPerDay?: number
  requestCount?: number
  lastUsedAt?: string | null
  ownerId: string
  createdAt?: string | null
  updatedAt?: string | null
  expiresAt?: string | null
  isActive?: boolean
}

export interface ApiKeyDatabaseRecord {
  id: string
  name: string
  description: string | null
  key_prefix: string
  key_hash: string
  entity_name: string
  table_name: string
  allowed_operations: string[]
  rate_limit_per_minute: number
  rate_limit_per_day: number
  request_count: number
  last_used_at: string | null
  owner_id: string
  created_at: string
  updated_at: string
  expires_at: string | null
  is_active: boolean
}

export interface ApiKeyCreateInput {
  name: string
  description?: string
  entityName: string
  tableName: string
  allowedOperations?: ApiKeyOperation[]
  rateLimitPerMinute?: number
  rateLimitPerDay?: number
  expiresAt?: string | null
}

export interface ApiKeyCreateResult {
  apiKey: ApiKey
  fullKey: string // Only returned once at creation
}

export class ApiKey {
  id: string | null
  name: string
  description: string | null
  keyPrefix: string
  entityName: string
  tableName: string
  allowedOperations: ApiKeyOperation[]
  rateLimitPerMinute: number
  rateLimitPerDay: number
  requestCount: number
  lastUsedAt: string | null
  ownerId: string
  createdAt: string | null
  updatedAt: string | null
  expiresAt: string | null
  isActive: boolean

  constructor({
    id = null,
    name,
    description = null,
    keyPrefix,
    entityName,
    tableName,
    allowedOperations = ['list', 'get'],
    rateLimitPerMinute = 60,
    rateLimitPerDay = 10000,
    requestCount = 0,
    lastUsedAt = null,
    ownerId,
    createdAt = null,
    updatedAt = null,
    expiresAt = null,
    isActive = true,
  }: ApiKeyData) {
    this.id = id
    this.name = name
    this.description = description
    this.keyPrefix = keyPrefix
    this.entityName = entityName
    this.tableName = tableName
    this.allowedOperations = allowedOperations
    this.rateLimitPerMinute = rateLimitPerMinute
    this.rateLimitPerDay = rateLimitPerDay
    this.requestCount = requestCount
    this.lastUsedAt = lastUsedAt
    this.ownerId = ownerId
    this.createdAt = createdAt
    this.updatedAt = updatedAt
    this.expiresAt = expiresAt
    this.isActive = isActive
  }

  /**
   * Convert database record to Model instance
   */
  static fromDatabase(data: ApiKeyDatabaseRecord): ApiKey {
    return new ApiKey({
      id: data.id,
      name: data.name,
      description: data.description,
      keyPrefix: data.key_prefix,
      entityName: data.entity_name,
      tableName: data.table_name,
      allowedOperations: data.allowed_operations as ApiKeyOperation[],
      rateLimitPerMinute: data.rate_limit_per_minute,
      rateLimitPerDay: data.rate_limit_per_day,
      requestCount: data.request_count,
      lastUsedAt: data.last_used_at,
      ownerId: data.owner_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      expiresAt: data.expires_at,
      isActive: data.is_active,
    })
  }

  /**
   * Check if key is expired
   */
  isExpired(): boolean {
    if (!this.expiresAt) return false
    return new Date(this.expiresAt) < new Date()
  }

  /**
   * Check if key can perform operation
   */
  canPerform(operation: ApiKeyOperation): boolean {
    return this.allowedOperations.includes(operation)
  }

  /**
   * Get display status
   */
  getStatus(): 'active' | 'inactive' | 'expired' {
    if (!this.isActive) return 'inactive'
    if (this.isExpired()) return 'expired'
    return 'active'
  }

  /**
   * Format last used time
   */
  getLastUsedDisplay(): string {
    if (!this.lastUsedAt) return 'Never'
    return new Date(this.lastUsedAt).toLocaleString()
  }
}
