import { supabase } from '../lib/supabase'
import type { ComfyUIModelDatabaseRecord } from '../models/ComfyUIModel'
import type { PostgrestError } from '@supabase/supabase-js'

/**
 * ComfyUIModelRepository のレスポンス型
 */
interface RepositoryResponse<T> {
  data: T
  error: PostgrestError | null
}

interface SingleRepositoryResponse<T> {
  data: T | null
  error: PostgrestError | null
}

/**
 * ComfyUI Model Repository
 *
 * ComfyUIモデル（チェックポイント）情報を管理するRepository。
 * - 全ユーザーがアクティブなモデルを読み取り可能
 * - Admin権限でモデル情報を更新
 * - カテゴリ・タグでの検索機能
 *
 * リポジトリパターンの利点:
 * - データアクセスロジックを一箇所に集約
 * - テストが容易（モックしやすい）
 * - Supabaseクライアントの実装詳細を隠蔽
 *
 * 使用例:
 * ```typescript
 * import { ComfyUIModelRepository } from '../repositories/ComfyUIModelRepository'
 * import { ComfyUIModel } from '../models/ComfyUIModel'
 *
 * // 1. Repository でデータ取得
 * const { data, error } = await ComfyUIModelRepository.getById(id)
 *
 * // 2. Model でドメインオブジェクトに変換
 * if (data) {
 *   const model = ComfyUIModel.fromDatabase(data)
 * }
 * ```
 */
export class ComfyUIModelRepository {
  /**
   * IDでモデルを取得
   */
  static async getById(id: string): Promise<SingleRepositoryResponse<ComfyUIModelDatabaseRecord>> {
    const { data, error } = await supabase
      .from('comfyui_models')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return { data: null, error: null }
      }
      return { data: null, error }
    }

    return { data: data as ComfyUIModelDatabaseRecord, error: null }
  }

  /**
   * ファイル名でモデルを取得
   */
  static async getByFilename(filename: string): Promise<SingleRepositoryResponse<ComfyUIModelDatabaseRecord>> {
    const { data, error } = await supabase
      .from('comfyui_models')
      .select('*')
      .eq('filename', filename)
      .eq('is_active', true)
      .maybeSingle()

    if (error) return { data: null, error }
    return { data: data as ComfyUIModelDatabaseRecord | null, error: null }
  }

  /**
   * 全アクティブモデルを取得（sort_order順）
   */
  static async getAll(): Promise<RepositoryResponse<ComfyUIModelDatabaseRecord[]>> {
    const { data, error } = await supabase
      .from('comfyui_models')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('display_name', { ascending: true })

    if (error) return { data: [], error }
    return { data: (data || []) as ComfyUIModelDatabaseRecord[], error: null }
  }

  /**
   * カテゴリでモデルを取得
   */
  static async getByCategory(category: string): Promise<RepositoryResponse<ComfyUIModelDatabaseRecord[]>> {
    const { data, error } = await supabase
      .from('comfyui_models')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('display_name', { ascending: true })

    if (error) return { data: [], error }
    return { data: (data || []) as ComfyUIModelDatabaseRecord[], error: null }
  }

  /**
   * おすすめ（featured）モデルを取得
   */
  static async getFeatured(): Promise<RepositoryResponse<ComfyUIModelDatabaseRecord[]>> {
    const { data, error } = await supabase
      .from('comfyui_models')
      .select('*')
      .eq('is_featured', true)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) return { data: [], error }
    return { data: (data || []) as ComfyUIModelDatabaseRecord[], error: null }
  }

  /**
   * 人気モデルを取得（使用回数順）
   */
  static async getPopular(limit = 10): Promise<RepositoryResponse<ComfyUIModelDatabaseRecord[]>> {
    const { data, error } = await supabase
      .from('comfyui_models')
      .select('*')
      .eq('is_active', true)
      .order('usage_count', { ascending: false })
      .limit(limit)

    if (error) return { data: [], error }
    return { data: (data || []) as ComfyUIModelDatabaseRecord[], error: null }
  }

  /**
   * タグで検索
   */
  static async findByTags(tags: string[]): Promise<RepositoryResponse<ComfyUIModelDatabaseRecord[]>> {
    const { data, error } = await supabase
      .from('comfyui_models')
      .select('*')
      .contains('tags', tags)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) return { data: [], error }
    return { data: (data || []) as ComfyUIModelDatabaseRecord[], error: null }
  }

  /**
   * 名前で検索（部分一致）
   */
  static async search(query: string): Promise<RepositoryResponse<ComfyUIModelDatabaseRecord[]>> {
    const { data, error } = await supabase
      .from('comfyui_models')
      .select('*')
      .or(`filename.ilike.%${query}%,display_name.ilike.%${query}%,description.ilike.%${query}%`)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) return { data: [], error }
    return { data: (data || []) as ComfyUIModelDatabaseRecord[], error: null }
  }

  /**
   * カテゴリ別の集計を取得
   */
  static async getCategoryCounts(): Promise<RepositoryResponse<Record<string, number>>> {
    const { data, error } = await supabase
      .from('comfyui_models')
      .select('category')
      .eq('is_active', true)

    if (error) return { data: {}, error }

    // カテゴリごとにカウント
    const counts: Record<string, number> = {}
    data.forEach((row: { category: string | null }) => {
      const cat = row.category || 'other'
      counts[cat] = (counts[cat] || 0) + 1
    })

    return { data: counts, error: null }
  }

  /**
   * モデル使用カウントをインクリメント（Admin権限必要）
   */
  static async incrementUsageCount(filename: string): Promise<{ error: PostgrestError | null }> {
    // RPC呼び出しでアトミックにインクリメント
    const { error } = await supabase.rpc('increment_model_usage', {
      model_filename: filename,
    })

    return { error }
  }

  /**
   * モデルを作成（Admin権限必要）
   */
  static async create(
    model: Partial<ComfyUIModelDatabaseRecord>
  ): Promise<SingleRepositoryResponse<ComfyUIModelDatabaseRecord>> {
    const { data, error } = await supabase
      .from('comfyui_models')
      .insert(model)
      .select()
      .single()

    if (error) return { data: null, error }
    return { data: data as ComfyUIModelDatabaseRecord, error: null }
  }

  /**
   * モデルを更新（Admin権限必要）
   */
  static async update(
    id: string,
    updates: Partial<ComfyUIModelDatabaseRecord>
  ): Promise<SingleRepositoryResponse<ComfyUIModelDatabaseRecord>> {
    const { data, error } = await supabase
      .from('comfyui_models')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return { data: null, error }
    return { data: data as ComfyUIModelDatabaseRecord, error: null }
  }

  /**
   * モデルを無効化（論理削除）（Admin権限必要）
   */
  static async deactivate(id: string): Promise<SingleRepositoryResponse<ComfyUIModelDatabaseRecord>> {
    return this.update(id, { is_active: false } as Partial<ComfyUIModelDatabaseRecord>)
  }

  /**
   * モデルを削除（物理削除）（Admin権限必要）
   * 通常はdeactivateを使用することを推奨
   */
  static async delete(id: string): Promise<{ error: PostgrestError | null }> {
    const { error } = await supabase.from('comfyui_models').delete().eq('id', id)

    return { error }
  }

  /**
   * 複数モデルを一括Upsert（同期用、Admin権限必要）
   */
  static async upsertMany(
    models: Partial<ComfyUIModelDatabaseRecord>[]
  ): Promise<RepositoryResponse<ComfyUIModelDatabaseRecord[]>> {
    const { data, error } = await supabase
      .from('comfyui_models')
      .upsert(models, { onConflict: 'filename' })
      .select()

    if (error) return { data: [], error }
    return { data: (data || []) as ComfyUIModelDatabaseRecord[], error: null }
  }
}
