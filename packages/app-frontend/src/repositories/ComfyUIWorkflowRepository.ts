import { supabase } from '../lib/supabase'
import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Database record type for comfyui_workflows table
 */
export interface ComfyUIWorkflowDatabaseRecord {
  id: string
  name: string
  description: string | null
  workflow_definition: Record<string, unknown> // JSON workflow structure
  tags: string[]
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Repository response types
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
 * ComfyUI Workflow Repository
 *
 * ComfyUIワークフロー定義を管理するRepository。
 * - Admin権限でワークフローを作成・更新
 * - 全ユーザーがアクティブなワークフローを読み取り可能
 *
 * リポジトリパターンの利点:
 * - データアクセスロジックを一箇所に集約
 * - テストが容易（モックしやすい）
 * - Supabaseクライアントの実装詳細を隠蔽
 */
export class ComfyUIWorkflowRepository {
  /**
   * IDでワークフローを取得
   */
  static async getById(id: string): Promise<SingleRepositoryResponse<ComfyUIWorkflowDatabaseRecord>> {
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

    return { data: data as ComfyUIWorkflowDatabaseRecord, error: null }
  }

  /**
   * デフォルトワークフローを取得
   */
  static async getDefault(): Promise<SingleRepositoryResponse<ComfyUIWorkflowDatabaseRecord>> {
    const { data, error } = await supabase
      .from('comfyui_workflows')
      .select('*')
      .eq('is_default', true)
      .eq('is_active', true)
      .maybeSingle()

    if (error) return { data: null, error }
    return { data: data as ComfyUIWorkflowDatabaseRecord | null, error: null }
  }

  /**
   * タグで検索
   */
  static async findByTags(tags: string[]): Promise<RepositoryResponse<ComfyUIWorkflowDatabaseRecord[]>> {
    const { data, error } = await supabase
      .from('comfyui_workflows')
      .select('*')
      .contains('tags', tags)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) return { data: [], error }
    return { data: (data || []) as ComfyUIWorkflowDatabaseRecord[], error: null }
  }

  /**
   * 名前で検索（部分一致）
   */
  static async findByName(name: string): Promise<RepositoryResponse<ComfyUIWorkflowDatabaseRecord[]>> {
    const { data, error } = await supabase
      .from('comfyui_workflows')
      .select('*')
      .ilike('name', `%${name}%`)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) return { data: [], error }
    return { data: (data || []) as ComfyUIWorkflowDatabaseRecord[], error: null }
  }

  /**
   * 全アクティブワークフローを取得
   */
  static async getAll(): Promise<RepositoryResponse<ComfyUIWorkflowDatabaseRecord[]>> {
    const { data, error } = await supabase
      .from('comfyui_workflows')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) return { data: [], error }
    return { data: (data || []) as ComfyUIWorkflowDatabaseRecord[], error: null }
  }

  /**
   * ワークフローを作成（Admin権限必要）
   */
  static async create(
    workflow: Partial<ComfyUIWorkflowDatabaseRecord>
  ): Promise<SingleRepositoryResponse<ComfyUIWorkflowDatabaseRecord>> {
    const { data, error } = await supabase.from('comfyui_workflows').insert(workflow).select().single()

    if (error) return { data: null, error }
    return { data: data as ComfyUIWorkflowDatabaseRecord, error: null }
  }

  /**
   * ワークフローを更新（Admin権限必要）
   */
  static async update(
    id: string,
    updates: Partial<ComfyUIWorkflowDatabaseRecord>
  ): Promise<SingleRepositoryResponse<ComfyUIWorkflowDatabaseRecord>> {
    const { data, error } = await supabase.from('comfyui_workflows').update(updates).eq('id', id).select().single()

    if (error) return { data: null, error }
    return { data: data as ComfyUIWorkflowDatabaseRecord, error: null }
  }

  /**
   * ワークフローを無効化（論理削除）（Admin権限必要）
   */
  static async deactivate(id: string): Promise<SingleRepositoryResponse<ComfyUIWorkflowDatabaseRecord>> {
    return this.update(id, { is_active: false } as Partial<ComfyUIWorkflowDatabaseRecord>)
  }

  /**
   * ワークフローを削除（物理削除）（Admin権限必要）
   * 通常はdeactivateを使用することを推奨
   */
  static async delete(id: string): Promise<{ error: PostgrestError | null }> {
    const { error } = await supabase.from('comfyui_workflows').delete().eq('id', id)

    return { error }
  }
}
