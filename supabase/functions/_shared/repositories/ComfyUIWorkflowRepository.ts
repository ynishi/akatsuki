/**
 * ComfyUI Workflow Repository
 *
 * ComfyUIワークフロー定義を管理するRepository。
 * - Admin権限でワークフローを作成・更新
 * - 全ユーザーがアクティブなワークフローを読み取り可能
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * ComfyUIワークフロー型
 */
export interface ComfyUIWorkflow {
  id: string
  name: string
  description?: string
  workflow_json: Record<string, any>
  default_params?: Record<string, any>
  is_active: boolean
  is_default: boolean
  tags?: string[]
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
}

/**
 * ComfyUI Workflow Repository
 */
export class ComfyUIWorkflowRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * IDでワークフローを取得
   * @param id - ワークフローID
   * @returns ワークフロー（見つからない場合はnull）
   */
  async getById(id: string): Promise<ComfyUIWorkflow | null> {
    const { data, error } = await this.supabase
      .from('comfyui_workflows')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null
      }
      throw error
    }

    return data
  }

  /**
   * デフォルトワークフローを取得
   * @returns デフォルトワークフロー（設定されていない場合はnull）
   */
  async getDefault(): Promise<ComfyUIWorkflow | null> {
    const { data, error } = await this.supabase
      .from('comfyui_workflows')
      .select('*')
      .eq('is_default', true)
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw error
    return data
  }

  /**
   * タグで検索
   * @param tags - 検索タグ配列
   * @returns マッチするワークフロー配列
   */
  async findByTags(tags: string[]): Promise<ComfyUIWorkflow[]> {
    const { data, error } = await this.supabase
      .from('comfyui_workflows')
      .select('*')
      .contains('tags', tags)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * 名前で検索（部分一致）
   * @param name - 検索ワード
   * @returns マッチするワークフロー配列
   */
  async findByName(name: string): Promise<ComfyUIWorkflow[]> {
    const { data, error } = await this.supabase
      .from('comfyui_workflows')
      .select('*')
      .ilike('name', `%${name}%`)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * 全アクティブワークフローを取得
   * @returns 全ワークフロー配列
   */
  async getAll(): Promise<ComfyUIWorkflow[]> {
    const { data, error } = await this.supabase
      .from('comfyui_workflows')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * ワークフローを作成（Admin権限必要）
   * @param workflow - ワークフローデータ
   * @returns 作成されたワークフロー
   */
  async create(
    workflow: Omit<
      ComfyUIWorkflow,
      'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'
    >
  ): Promise<ComfyUIWorkflow> {
    const { data, error } = await this.supabase
      .from('comfyui_workflows')
      .insert(workflow)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * ワークフローを更新（Admin権限必要）
   * @param id - ワークフローID
   * @param updates - 更新データ
   * @returns 更新されたワークフロー
   */
  async update(
    id: string,
    updates: Partial<
      Omit<ComfyUIWorkflow, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>
    >
  ): Promise<ComfyUIWorkflow> {
    const { data, error } = await this.supabase
      .from('comfyui_workflows')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * ワークフローを無効化（論理削除）（Admin権限必要）
   * @param id - ワークフローID
   * @returns 無効化されたワークフロー
   */
  async deactivate(id: string): Promise<ComfyUIWorkflow> {
    return this.update(id, { is_active: false })
  }

  /**
   * ワークフローを削除（物理削除）（Admin権限必要）
   * 通常はdeactivateを使用することを推奨
   * @param id - ワークフローID
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('comfyui_workflows')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}
