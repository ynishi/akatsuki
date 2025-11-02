/**
 * ComfyUI Model Repository
 *
 * ComfyUIモデル（チェックポイント）情報を管理するRepository。
 * - 全ユーザーがアクティブなモデルを読み取り可能
 * - Admin権限でモデル情報を更新
 * - カテゴリ・タグでの検索機能
 */

import { supabase } from '../lib/supabase'

/**
 * ComfyUI Model Repository
 */
export class ComfyUIModelRepository {
  /**
   * IDでモデルを取得
   * @param {string} id - モデルID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  static async getById(id) {
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

    return { data, error: null }
  }

  /**
   * ファイル名でモデルを取得
   * @param {string} filename - モデルファイル名
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  static async getByFilename(filename) {
    const { data, error } = await supabase
      .from('comfyui_models')
      .select('*')
      .eq('filename', filename)
      .eq('is_active', true)
      .maybeSingle()

    if (error) return { data: null, error }
    return { data, error: null }
  }

  /**
   * 全アクティブモデルを取得（sort_order順）
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  static async getAll() {
    const { data, error } = await supabase
      .from('comfyui_models')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('display_name', { ascending: true })

    if (error) return { data: [], error }
    return { data: data || [], error: null }
  }

  /**
   * カテゴリでモデルを取得
   * @param {string} category - カテゴリ名
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  static async getByCategory(category) {
    const { data, error } = await supabase
      .from('comfyui_models')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('display_name', { ascending: true })

    if (error) return { data: [], error }
    return { data: data || [], error: null }
  }

  /**
   * おすすめ（featured）モデルを取得
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  static async getFeatured() {
    const { data, error } = await supabase
      .from('comfyui_models')
      .select('*')
      .eq('is_featured', true)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) return { data: [], error }
    return { data: data || [], error: null }
  }

  /**
   * 人気モデルを取得（使用回数順）
   * @param {number} limit - 取得件数（デフォルト: 10）
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  static async getPopular(limit = 10) {
    const { data, error } = await supabase
      .from('comfyui_models')
      .select('*')
      .eq('is_active', true)
      .order('usage_count', { ascending: false })
      .limit(limit)

    if (error) return { data: [], error }
    return { data: data || [], error: null }
  }

  /**
   * タグで検索
   * @param {string[]} tags - 検索タグ配列
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  static async findByTags(tags) {
    const { data, error } = await supabase
      .from('comfyui_models')
      .select('*')
      .contains('tags', tags)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) return { data: [], error }
    return { data: data || [], error: null }
  }

  /**
   * 名前で検索（部分一致）
   * @param {string} query - 検索ワード
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  static async search(query) {
    const { data, error } = await supabase
      .from('comfyui_models')
      .select('*')
      .or(`filename.ilike.%${query}%,display_name.ilike.%${query}%,description.ilike.%${query}%`)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) return { data: [], error }
    return { data: data || [], error: null }
  }

  /**
   * カテゴリ別の集計を取得
   * @returns {Promise<{data: Object, error: Error|null}>}
   */
  static async getCategoryCounts() {
    const { data, error } = await supabase
      .from('comfyui_models')
      .select('category')
      .eq('is_active', true)

    if (error) return { data: {}, error }

    // カテゴリごとにカウント
    const counts = {}
    data.forEach(row => {
      const cat = row.category || 'other'
      counts[cat] = (counts[cat] || 0) + 1
    })

    return { data: counts, error: null }
  }

  /**
   * モデル使用カウントをインクリメント（Admin権限必要）
   * @param {string} filename - モデルファイル名
   * @returns {Promise<{error: Error|null}>}
   */
  static async incrementUsageCount(filename) {
    // RPC呼び出しでアトミックにインクリメント
    const { error } = await supabase.rpc('increment_model_usage', {
      model_filename: filename
    })

    return { error }
  }

  /**
   * モデルを作成（Admin権限必要）
   * @param {Object} model - モデルデータ
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  static async create(model) {
    const { data, error } = await supabase
      .from('comfyui_models')
      .insert(model)
      .select()
      .single()

    if (error) return { data: null, error }
    return { data, error: null }
  }

  /**
   * モデルを更新（Admin権限必要）
   * @param {string} id - モデルID
   * @param {Object} updates - 更新データ
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  static async update(id, updates) {
    const { data, error } = await supabase
      .from('comfyui_models')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return { data: null, error }
    return { data, error: null }
  }

  /**
   * モデルを無効化（論理削除）（Admin権限必要）
   * @param {string} id - モデルID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  static async deactivate(id) {
    return this.update(id, { is_active: false })
  }

  /**
   * モデルを削除（物理削除）（Admin権限必要）
   * 通常はdeactivateを使用することを推奨
   * @param {string} id - モデルID
   * @returns {Promise<{error: Error|null}>}
   */
  static async delete(id) {
    const { error } = await supabase
      .from('comfyui_models')
      .delete()
      .eq('id', id)

    return { error }
  }

  /**
   * 複数モデルを一括Upsert（同期用、Admin権限必要）
   * @param {Array<Object>} models - モデルデータ配列
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  static async upsertMany(models) {
    const { data, error } = await supabase
      .from('comfyui_models')
      .upsert(models, { onConflict: 'filename' })
      .select()

    if (error) return { data: [], error }
    return { data: data || [], error: null }
  }
}
