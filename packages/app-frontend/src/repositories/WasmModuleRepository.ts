import { supabase } from '@/lib/supabase'
import { WasmModule, WasmModuleDatabase } from '@/models/WasmModule'
import type { RepositoryResponse } from '@/types'

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
      const message = error instanceof Error ? error.message : String(error)
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
}
