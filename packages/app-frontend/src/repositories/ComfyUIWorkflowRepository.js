/**
 * ComfyUI Workflow Repository
 *
 * ComfyUIワークフロー定義を管理するRepository。
 * - Admin権限でワークフローを作成・更新
 * - 全ユーザーがアクティブなワークフローを読み取り可能
 */

import { supabase } from '../lib/supabase'

/**
 * ComfyUI Workflow Repository
 */
export class ComfyUIWorkflowRepository {
  /**
   * IDでワークフローを取得
   * @param {string} id - ワークフローID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  static async getById(id) {
    const { data, error } = await supabase
      .from('comfyui_workflows')
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
   * デフォルトワークフローを取得
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  static async getDefault() {
    const { data, error } = await supabase
      .from('comfyui_workflows')
      .select('*')
      .eq('is_default', true)
      .eq('is_active', true)
      .maybeSingle()

    if (error) return { data: null, error }
    return { data, error: null }
  }

  /**
   * タグで検索
   * @param {string[]} tags - 検索タグ配列
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  static async findByTags(tags) {
    const { data, error } = await supabase
      .from('comfyui_workflows')
      .select('*')
      .contains('tags', tags)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) return { data: [], error }
    return { data: data || [], error: null }
  }

  /**
   * 名前で検索（部分一致）
   * @param {string} name - 検索ワード
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  static async findByName(name) {
    const { data, error } = await supabase
      .from('comfyui_workflows')
      .select('*')
      .ilike('name', `%${name}%`)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) return { data: [], error }
    return { data: data || [], error: null }
  }

  /**
   * 全アクティブワークフローを取得
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  static async getAll() {
    const { data, error } = await supabase
      .from('comfyui_workflows')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) return { data: [], error }
    return { data: data || [], error: null }
  }

  /**
   * ワークフローを作成（Admin権限必要）
   * @param {Object} workflow - ワークフローデータ
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  static async create(workflow) {
    const { data, error } = await supabase
      .from('comfyui_workflows')
      .insert(workflow)
      .select()
      .single()

    if (error) return { data: null, error }
    return { data, error: null }
  }

  /**
   * ワークフローを更新（Admin権限必要）
   * @param {string} id - ワークフローID
   * @param {Object} updates - 更新データ
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  static async update(id, updates) {
    const { data, error } = await supabase
      .from('comfyui_workflows')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return { data: null, error }
    return { data, error: null }
  }

  /**
   * ワークフローを無効化（論理削除）（Admin権限必要）
   * @param {string} id - ワークフローID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  static async deactivate(id) {
    return this.update(id, { is_active: false })
  }

  /**
   * ワークフローを削除（物理削除）（Admin権限必要）
   * 通常はdeactivateを使用することを推奨
   * @param {string} id - ワークフローID
   * @returns {Promise<{error: Error|null}>}
   */
  static async delete(id) {
    const { error } = await supabase
      .from('comfyui_workflows')
      .delete()
      .eq('id', id)

    return { error }
  }
}
