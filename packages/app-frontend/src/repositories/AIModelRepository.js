import { supabase } from '../lib/supabaseClient'
import { AIModel } from '../models/AIModel'

/**
 * AIモデルリポジトリ
 * Supabase ai_models テーブルからモデル情報を取得
 */
export class AIModelRepository {
  /**
   * 全モデルを取得
   * @param {boolean} activeOnly - 有効なモデルのみ取得
   * @returns {Promise<AIModel[]>}
   */
  static async findAll(activeOnly = false) {
    let query = supabase
      .from('ai_models')
      .select('*')
      .order('sort_order', { ascending: true })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch AI models: ${error.message}`)
    }

    return data.map((record) => AIModel.fromDatabase(record))
  }

  /**
   * IDでモデルを検索
   * @param {string} id
   * @returns {Promise<AIModel|null>}
   */
  static async findById(id) {
    const { data, error } = await supabase
      .from('ai_models')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(`Failed to fetch AI model: ${error.message}`)
    }

    return AIModel.fromDatabase(data)
  }

  /**
   * プロバイダーでフィルタ
   * @param {string} provider
   * @param {boolean} activeOnly
   * @returns {Promise<AIModel[]>}
   */
  static async findByProvider(provider, activeOnly = false) {
    let query = supabase
      .from('ai_models')
      .select('*')
      .eq('provider', provider)
      .order('sort_order', { ascending: true })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch AI models: ${error.message}`)
    }

    return data.map((record) => AIModel.fromDatabase(record))
  }

  /**
   * Tierでフィルタ
   * @param {boolean} isBasic - true: Basic, false: Advanced
   * @param {boolean} activeOnly
   * @returns {Promise<AIModel[]>}
   */
  static async findByTier(isBasic, activeOnly = false) {
    let query = supabase
      .from('ai_models')
      .select('*')
      .eq('is_basic', isBasic)
      .order('sort_order', { ascending: true })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch AI models: ${error.message}`)
    }

    return data.map((record) => AIModel.fromDatabase(record))
  }

  /**
   * Basicモデルのみ取得
   * @param {boolean} activeOnly
   * @returns {Promise<AIModel[]>}
   */
  static async findBasicModels(activeOnly = false) {
    return this.findByTier(true, activeOnly)
  }

  /**
   * Advancedモデルのみ取得
   * @param {boolean} activeOnly
   * @returns {Promise<AIModel[]>}
   */
  static async findAdvancedModels(activeOnly = false) {
    return this.findByTier(false, activeOnly)
  }

  /**
   * 複合条件で検索
   * @param {Object} filters
   * @param {string} [filters.provider]
   * @param {boolean} [filters.isBasic]
   * @param {boolean} [filters.supportsImageInput]
   * @param {boolean} [filters.supportsImageOutput]
   * @param {boolean} [filters.supportsStreaming]
   * @param {boolean} [filters.supportsFunctionCalling]
   * @param {boolean} [filters.supportsJson]
   * @param {boolean} [filters.activeOnly]
   * @returns {Promise<AIModel[]>}
   */
  static async findByFilters(filters = {}) {
    let query = supabase
      .from('ai_models')
      .select('*')
      .order('sort_order', { ascending: true })

    if (filters.provider) {
      query = query.eq('provider', filters.provider)
    }

    if (filters.isBasic !== undefined) {
      query = query.eq('is_basic', filters.isBasic)
    }

    if (filters.supportsImageInput !== undefined) {
      query = query.eq('supports_image_input', filters.supportsImageInput)
    }

    if (filters.supportsImageOutput !== undefined) {
      query = query.eq('supports_image_output', filters.supportsImageOutput)
    }

    if (filters.supportsStreaming !== undefined) {
      query = query.eq('supports_streaming', filters.supportsStreaming)
    }

    if (filters.supportsFunctionCalling !== undefined) {
      query = query.eq('supports_function_calling', filters.supportsFunctionCalling)
    }

    if (filters.supportsJson !== undefined) {
      query = query.eq('supports_json', filters.supportsJson)
    }

    if (filters.activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch AI models: ${error.message}`)
    }

    return data.map((record) => AIModel.fromDatabase(record))
  }

  /**
   * プロバイダー一覧を取得
   * @returns {Promise<string[]>}
   */
  static async getProviders() {
    const { data, error } = await supabase
      .from('ai_models')
      .select('provider')
      .eq('is_active', true)

    if (error) {
      throw new Error(`Failed to fetch providers: ${error.message}`)
    }

    return [...new Set(data.map((record) => record.provider))]
  }

  /**
   * モデルを作成
   * @param {AIModel} model
   * @returns {Promise<AIModel>}
   */
  static async create(model) {
    const { data, error} = await supabase
      .from('ai_models')
      .insert(model.toDatabase())
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create AI model: ${error.message}`)
    }

    return AIModel.fromDatabase(data)
  }

  /**
   * モデルを更新
   * @param {string} id
   * @param {Partial<AIModel>} updates
   * @returns {Promise<AIModel>}
   */
  static async update(id, updates) {
    const { data, error } = await supabase
      .from('ai_models')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update AI model: ${error.message}`)
    }

    return AIModel.fromDatabase(data)
  }

  /**
   * モデルを削除
   * @param {string} id
   * @returns {Promise<void>}
   */
  static async delete(id) {
    const { error } = await supabase
      .from('ai_models')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete AI model: ${error.message}`)
    }
  }
}
