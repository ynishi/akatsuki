import { supabase } from '../lib/supabase'
import { AIModel, type AIModelDatabaseRecord } from '../models/AIModel'

/**
 * AIモデルリポジトリ
 * Supabase ai_models テーブルからモデル情報を取得
 */

interface FindByFiltersOptions {
  provider?: string
  isBasic?: boolean
  supportsImageInput?: boolean
  supportsImageOutput?: boolean
  supportsStreaming?: boolean
  supportsFunctionCalling?: boolean
  supportsJson?: boolean
  activeOnly?: boolean
}

export class AIModelRepository {
  /**
   * 全モデルを取得
   */
  static async findAll(activeOnly = false): Promise<AIModel[]> {
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

    return (data as AIModelDatabaseRecord[]).map((record) => AIModel.fromDatabase(record))
  }

  /**
   * IDでモデルを検索
   */
  static async findById(id: string): Promise<AIModel | null> {
    const { data, error } = await supabase
      .from('ai_models')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(`Failed to fetch AI model: ${error.message}`)
    }

    return AIModel.fromDatabase(data as AIModelDatabaseRecord)
  }

  /**
   * プロバイダーでフィルタ
   */
  static async findByProvider(provider: string, activeOnly = false): Promise<AIModel[]> {
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

    return (data as AIModelDatabaseRecord[]).map((record) => AIModel.fromDatabase(record))
  }

  /**
   * Tierでフィルタ
   */
  static async findByTier(isBasic: boolean, activeOnly = false): Promise<AIModel[]> {
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

    return (data as AIModelDatabaseRecord[]).map((record) => AIModel.fromDatabase(record))
  }

  /**
   * 複数条件でフィルタリング
   */
  static async findByFilters(filters: FindByFiltersOptions = {}): Promise<AIModel[]> {
    let query = supabase
      .from('ai_models')
      .select('*')
      .order('sort_order', { ascending: true })

    // 各フィルター条件を適用
    if (filters.provider) query = query.eq('provider', filters.provider)
    if (filters.isBasic !== undefined) query = query.eq('is_basic', filters.isBasic)
    if (filters.supportsImageInput) query = query.eq('supports_image_input', true)
    if (filters.supportsImageOutput) query = query.eq('supports_image_output', true)
    if (filters.supportsStreaming) query = query.eq('supports_streaming', true)
    if (filters.supportsFunctionCalling) query = query.eq('supports_function_calling', true)
    if (filters.supportsJson) query = query.eq('supports_json', true)
    if (filters.activeOnly) query = query.eq('is_active', true)

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch AI models: ${error.message}`)
    }

    return (data as AIModelDatabaseRecord[]).map((record) => AIModel.fromDatabase(record))
  }

  /**
   * 利用可能なプロバイダー一覧を取得
   */
  static async getProviders(): Promise<string[]> {
    const { data, error } = await supabase
      .from('ai_models')
      .select('provider')
      .eq('is_active', true)

    if (error) {
      throw new Error(`Failed to fetch providers: ${error.message}`)
    }

    // 重複を除去してソート
    const providers = [...new Set(data.map((record: { provider: string }) => record.provider))]
    return providers.sort()
  }

  /**
   * モデルを作成
   */
  static async create(model: AIModel): Promise<AIModel> {
    const { data, error } = await supabase
      .from('ai_models')
      .insert(model.toDatabase())
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create AI model: ${error.message}`)
    }

    return AIModel.fromDatabase(data as AIModelDatabaseRecord)
  }

  /**
   * モデルを更新
   */
  static async update(id: string, updates: Partial<ReturnType<AIModel['toDatabase']>>): Promise<AIModel> {
    const { data, error } = await supabase
      .from('ai_models')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update AI model: ${error.message}`)
    }

    return AIModel.fromDatabase(data as AIModelDatabaseRecord)
  }

  /**
   * モデルを削除
   */
  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('ai_models')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete AI model: ${error.message}`)
    }
  }
}
