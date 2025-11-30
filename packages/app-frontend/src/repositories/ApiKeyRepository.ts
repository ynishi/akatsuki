/**
 * ApiKey Repository
 * Direct Supabase access for API Key management
 *
 * VibeCoding Standard:
 * - Uses userClient for RLS-protected operations
 * - Handles API Key generation client-side
 */

import { supabase } from '../lib/supabase'
import { ApiKey, type ApiKeyDatabaseRecord, type ApiKeyCreateInput, type ApiKeyOperation } from '../models/ApiKey'

export class ApiKeyRepository {
  private client = supabase

  /**
   * List all API keys for current user
   */
  async list(): Promise<ApiKey[]> {
    const { data, error } = await this.client
      .from('api_keys')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data as ApiKeyDatabaseRecord[]).map(ApiKey.fromDatabase)
  }

  /**
   * Get API key by ID
   */
  async get(id: string): Promise<ApiKey | null> {
    const { data, error } = await this.client
      .from('api_keys')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }
    return ApiKey.fromDatabase(data as ApiKeyDatabaseRecord)
  }

  /**
   * Create new API key
   * Returns both the ApiKey model and the full key (shown once)
   */
  async create(input: ApiKeyCreateInput, userId: string): Promise<{ apiKey: ApiKey; fullKey: string }> {
    // Generate API key client-side
    const { fullKey, prefix, hash } = await this.generateApiKey()

    const { data, error } = await this.client
      .from('api_keys')
      .insert({
        name: input.name,
        description: input.description || null,
        key_prefix: prefix,
        key_hash: hash,
        entity_name: input.entityName,
        table_name: input.tableName,
        allowed_operations: input.allowedOperations || ['list', 'get'],
        rate_limit_per_minute: input.rateLimitPerMinute || 60,
        rate_limit_per_day: input.rateLimitPerDay || 10000,
        expires_at: input.expiresAt || null,
        owner_id: userId,
      })
      .select()
      .single()

    if (error) throw error
    return {
      apiKey: ApiKey.fromDatabase(data as ApiKeyDatabaseRecord),
      fullKey,
    }
  }

  /**
   * Update API key
   */
  async update(
    id: string,
    updates: {
      name?: string
      description?: string | null
      allowedOperations?: ApiKeyOperation[]
      rateLimitPerMinute?: number
      rateLimitPerDay?: number
      expiresAt?: string | null
      isActive?: boolean
    }
  ): Promise<ApiKey> {
    const dbUpdates: Record<string, unknown> = {}

    if (updates.name !== undefined) dbUpdates.name = updates.name
    if (updates.description !== undefined) dbUpdates.description = updates.description
    if (updates.allowedOperations !== undefined) dbUpdates.allowed_operations = updates.allowedOperations
    if (updates.rateLimitPerMinute !== undefined) dbUpdates.rate_limit_per_minute = updates.rateLimitPerMinute
    if (updates.rateLimitPerDay !== undefined) dbUpdates.rate_limit_per_day = updates.rateLimitPerDay
    if (updates.expiresAt !== undefined) dbUpdates.expires_at = updates.expiresAt
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive

    const { data, error } = await this.client
      .from('api_keys')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return ApiKey.fromDatabase(data as ApiKeyDatabaseRecord)
  }

  /**
   * Toggle API key active status
   */
  async toggleActive(id: string): Promise<ApiKey> {
    // First get current status
    const current = await this.get(id)
    if (!current) throw new Error('API key not found')

    return this.update(id, { isActive: !current.isActive })
  }

  /**
   * Delete API key
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from('api_keys')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  /**
   * List API keys for specific entity
   */
  async listByEntity(entityName: string): Promise<ApiKey[]> {
    const { data, error } = await this.client
      .from('api_keys')
      .select('*')
      .eq('entity_name', entityName)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data as ApiKeyDatabaseRecord[]).map(ApiKey.fromDatabase)
  }

  // ==========================================================================
  // Private helpers
  // ==========================================================================

  /**
   * Generate a new API key
   * Format: ak_{prefix}_{random}
   */
  private async generateApiKey(): Promise<{
    fullKey: string
    prefix: string
    hash: string
  }> {
    // Generate 24 random bytes -> 32 char base64url
    const randomBytes = new Uint8Array(24)
    crypto.getRandomValues(randomBytes)
    const randomPart = this.base64UrlEncode(randomBytes)

    // First 6 chars as prefix
    const prefixPart = randomPart.slice(0, 6)
    const prefix = `ak_${prefixPart}`
    const fullKey = `${prefix}_${randomPart}`

    // SHA-256 hash
    const hash = await this.sha256(fullKey)

    return { fullKey, prefix, hash }
  }

  private base64UrlEncode(bytes: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...bytes))
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }

  private async sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }
}

// Export singleton
export const apiKeyRepository = new ApiKeyRepository()
