import { supabase } from '@/lib/supabase'
import { WasmModule, WasmModuleDatabase } from '@/models/WasmModule'

/**
 * Repository response type
 */
export interface RepositoryResponse<T> {
  data: T | null
  error: Error | null
}

/**
 * WasmModule Repository
 * CRUD operations for wasm_modules table
 *
 * @example
 * import { WasmModuleRepository } from '@/repositories/WasmModuleRepository'
 *
 * // List all modules
 * const { data, error } = await WasmModuleRepository.list()
 *
 * // Get by ID
 * const { data, error } = await WasmModuleRepository.getById('module-id')
 *
 * // Create module
 * const { data, error } = await WasmModuleRepository.create({ ... })
 */
export class WasmModuleRepository {
  /**
   * List modules (own modules + public modules)
   */
  static async list(): Promise<RepositoryResponse<WasmModule[]>> {
    try {
      const { data, error } = await supabase
        .from('wasm_modules')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error

      const modules = (data || []).map((row) => WasmModule.fromDatabase(row as WasmModuleDatabase))

      return { data: modules, error: null }
    } catch (error) {
      console.error('[WasmModuleRepository] list error:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`Failed to fetch modules: ${message}`) }
    }
  }

  /**
   * List own modules
   */
  static async listOwn(): Promise<RepositoryResponse<WasmModule[]>> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Authentication required')

      const { data, error } = await supabase
        .from('wasm_modules')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const modules = (data || []).map((row) => WasmModule.fromDatabase(row as WasmModuleDatabase))

      return { data: modules, error: null }
    } catch (error) {
      console.error('[WasmModuleRepository] listOwn error:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`Failed to fetch own modules: ${message}`) }
    }
  }

  /**
   * Get module by ID
   */
  static async getById(id: string): Promise<RepositoryResponse<WasmModule>> {
    try {
      const { data, error } = await supabase.from('wasm_modules').select('*').eq('id', id).single()

      if (error) throw error
      if (!data) throw new Error('Module not found')

      const module = WasmModule.fromDatabase(data as WasmModuleDatabase)

      return { data: module, error: null }
    } catch (error) {
      console.error('[WasmModuleRepository] getById error:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`Failed to fetch module: ${message}`) }
    }
  }

  /**
   * Create module
   */
  static async create(
    moduleData: Omit<WasmModuleDatabase, 'id' | 'created_at' | 'updated_at'>
  ): Promise<RepositoryResponse<WasmModule>> {
    try {
      const { data, error } = await supabase.from('wasm_modules').insert(moduleData).select().single()

      if (error) throw error
      if (!data) throw new Error('Failed to create module')

      const module = WasmModule.fromDatabase(data as WasmModuleDatabase)

      return { data: module, error: null }
    } catch (error) {
      console.error('[WasmModuleRepository] create error:', error)

      // Handle specific PostgreSQL errors with user-friendly messages
      if (error && typeof error === 'object' && 'code' in error) {
        const pgError = error as { code: string; message: string }

        // 23505: unique_violation
        if (pgError.code === '23505') {
          return {
            data: null,
            error: new Error('A module with this name and version already exists. Please use a different name or version.')
          }
        }

        // 23503: foreign_key_violation
        if (pgError.code === '23503') {
          return {
            data: null,
            error: new Error('Referenced file not found. Please try uploading again.')
          }
        }
      }

      // Generic error handling
      const message = error instanceof Error
        ? error.message
        : (error && typeof error === 'object' && 'message' in error)
          ? String(error.message)
          : JSON.stringify(error)
      return { data: null, error: new Error(`Failed to create module: ${message}`) }
    }
  }

  /**
   * Update module
   */
  static async update(
    id: string,
    updates: Partial<WasmModuleDatabase>
  ): Promise<RepositoryResponse<WasmModule>> {
    try {
      const { data, error } = await supabase.from('wasm_modules').update(updates).eq('id', id).select().single()

      if (error) throw error
      if (!data) throw new Error('Module not found')

      const module = WasmModule.fromDatabase(data as WasmModuleDatabase)

      return { data: module, error: null }
    } catch (error) {
      console.error('[WasmModuleRepository] update error:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`Failed to update module: ${message}`) }
    }
  }

  /**
   * Delete module
   */
  static async delete(id: string): Promise<RepositoryResponse<void>> {
    try {
      const { error } = await supabase.from('wasm_modules').delete().eq('id', id)

      if (error) throw error

      return { data: undefined, error: null }
    } catch (error) {
      console.error('[WasmModuleRepository] delete error:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`Failed to delete module: ${message}`) }
    }
  }

  /**
   * Search modules by name
   */
  static async searchByName(query: string): Promise<RepositoryResponse<WasmModule[]>> {
    try {
      const { data, error } = await supabase
        .from('wasm_modules')
        .select('*')
        .eq('status', 'active')
        .ilike('module_name', `%${query}%`)
        .order('created_at', { ascending: false })

      if (error) throw error

      const modules = (data || []).map((row) => WasmModule.fromDatabase(row as WasmModuleDatabase))

      return { data: modules, error: null }
    } catch (error) {
      console.error('[WasmModuleRepository] searchByName error:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`Failed to search modules: ${message}`) }
    }
  }

  /**
   * List public modules
   */
  static async listPublic(): Promise<RepositoryResponse<WasmModule[]>> {
    try {
      const { data, error } = await supabase
        .from('wasm_modules')
        .select('*')
        .eq('is_public', true)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error

      const modules = (data || []).map((row) => WasmModule.fromDatabase(row as WasmModuleDatabase))

      return { data: modules, error: null }
    } catch (error) {
      console.error('[WasmModuleRepository] listPublic error:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`Failed to fetch public modules: ${message}`) }
    }
  }

  /**
   * List modules by owner type (system/admin/user)
   */
  static async listByOwnerType(
    ownerType: 'system' | 'admin' | 'user'
  ): Promise<RepositoryResponse<WasmModule[]>> {
    try {
      const { data, error } = await supabase
        .from('wasm_modules')
        .select('*')
        .eq('owner_type', ownerType)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error

      const modules = (data || []).map((row) => WasmModule.fromDatabase(row as WasmModuleDatabase))

      return { data: modules, error: null }
    } catch (error) {
      console.error('[WasmModuleRepository] listByOwnerType error:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`Failed to fetch ${ownerType} modules: ${message}`) }
    }
  }

  /**
   * List system modules (available to all users)
   */
  static async listSystemModules(): Promise<RepositoryResponse<WasmModule[]>> {
    return this.listByOwnerType('system')
  }

  /**
   * List admin modules (admin only)
   */
  static async listAdminModules(): Promise<RepositoryResponse<WasmModule[]>> {
    return this.listByOwnerType('admin')
  }

  /**
   * List user modules (with optional user ID filter)
   */
  static async listUserModules(userId?: string): Promise<RepositoryResponse<WasmModule[]>> {
    try {
      let query = supabase
        .from('wasm_modules')
        .select('*')
        .eq('owner_type', 'user')
        .eq('status', 'active')

      if (userId) {
        query = query.eq('owner_id', userId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      const modules = (data || []).map((row) => WasmModule.fromDatabase(row as WasmModuleDatabase))

      return { data: modules, error: null }
    } catch (error) {
      console.error('[WasmModuleRepository] listUserModules error:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`Failed to fetch user modules: ${message}`) }
    }
  }

  /**
   * List executable modules (system + own user modules + public user modules)
   */
  static async listExecutable(): Promise<RepositoryResponse<WasmModule[]>> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Authentication required')

      // Fetch system modules + user's own modules + public modules
      const { data, error } = await supabase
        .from('wasm_modules')
        .select('*')
        .eq('status', 'active')
        .or(`owner_type.eq.system,owner_id.eq.${user.id},is_public.eq.true`)
        .order('owner_type', { ascending: true }) // system first, then user
        .order('created_at', { ascending: false })

      if (error) throw error

      const modules = (data || []).map((row) => WasmModule.fromDatabase(row as WasmModuleDatabase))

      return { data: modules, error: null }
    } catch (error) {
      console.error('[WasmModuleRepository] listExecutable error:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`Failed to fetch executable modules: ${message}`) }
    }
  }

  /**
   * List all modules (for admin UI)
   */
  static async listAll(): Promise<RepositoryResponse<WasmModule[]>> {
    try {
      const { data, error } = await supabase
        .from('wasm_modules')
        .select('*')
        .order('owner_type', { ascending: true }) // system, admin, user
        .order('created_at', { ascending: false })

      if (error) throw error

      const modules = (data || []).map((row) => WasmModule.fromDatabase(row as WasmModuleDatabase))

      return { data: modules, error: null }
    } catch (error) {
      console.error('[WasmModuleRepository] listAll error:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`Failed to fetch all modules: ${message}`) }
    }
  }
}
