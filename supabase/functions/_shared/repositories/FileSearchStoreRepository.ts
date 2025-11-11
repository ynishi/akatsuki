/**
 * FileSearchStore Repository (Edge Functions版)
 * file_search_stores table data access layer
 *
 * File Search API (Gemini等) のCorpus（Knowledge Base）を管理
 */

import { BaseRepository } from '../repository.ts'

/**
 * FileSearchStoreRepository
 * File Search Store（Corpus）の作成・取得・削除
 */
export class FileSearchStoreRepository extends BaseRepository {
  /**
   * Store を作成
   * @param record - Storeレコード
   * @returns 作成されたレコード
   */
  async create(record: {
    user_id: string
    name: string // File Search API corpus name (e.g., "corpora/xxx")
    display_name: string | null
    provider?: string // 'gemini' | 'openai' | 'pinecone' | ...
  }): Promise<any> {
    const { data, error } = await this.supabase
      .from('file_search_stores')
      .insert({
        user_id: record.user_id,
        name: record.name,
        display_name: record.display_name,
        provider: record.provider || 'gemini',
      })
      .select()
      .single()

    if (error) {
      console.error('[FileSearchStoreRepository] create error:', error)
      throw new Error(`Failed to create file search store: ${error.message}`)
    }

    return data
  }

  /**
   * IDでStoreを取得
   * @param storeId - file_search_stores.id (UUID)
   * @returns Storeレコード or null
   */
  async findById(storeId: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('file_search_stores')
      .select('*')
      .eq('id', storeId)
      .single()

    if (error) {
      if (this.isNotFoundError(error)) {
        return null
      }
      console.error('[FileSearchStoreRepository] findById error:', error)
      throw new Error(`Failed to fetch file search store: ${error.message}`)
    }

    return data
  }

  /**
   * ユーザーIDでStore一覧を取得
   * @param userId - auth.users.id
   * @param limit - 取得件数（デフォルト: 100）
   * @returns Store配列
   */
  async findAllByUserId(userId: string, limit = 100): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('file_search_stores')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[FileSearchStoreRepository] findAllByUserId error:', error)
      throw new Error(`Failed to fetch file search stores: ${error.message}`)
    }

    return data || []
  }

  /**
   * Corpus名でStoreを取得
   * @param name - File Search API corpus name (e.g., "corpora/xxx")
   * @returns Storeレコード or null
   */
  async findByName(name: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('file_search_stores')
      .select('*')
      .eq('name', name)
      .single()

    if (error) {
      if (this.isNotFoundError(error)) {
        return null
      }
      console.error('[FileSearchStoreRepository] findByName error:', error)
      throw new Error(`Failed to fetch file search store by name: ${error.message}`)
    }

    return data
  }

  /**
   * プロバイダー別でStore一覧を取得
   * @param userId - auth.users.id
   * @param provider - プロバイダー名 ('gemini' | 'openai' | ...)
   * @param limit - 取得件数（デフォルト: 100）
   * @returns Store配列
   */
  async findByProvider(userId: string, provider: string, limit = 100): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('file_search_stores')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', provider)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[FileSearchStoreRepository] findByProvider error:', error)
      throw new Error(`Failed to fetch file search stores by provider: ${error.message}`)
    }

    return data || []
  }

  /**
   * Storeの表示名を更新
   * @param storeId - file_search_stores.id (UUID)
   * @param displayName - 新しい表示名
   * @returns 更新されたレコード
   */
  async updateDisplayName(storeId: string, displayName: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('file_search_stores')
      .update({ display_name: displayName })
      .eq('id', storeId)
      .select()
      .single()

    if (error) {
      console.error('[FileSearchStoreRepository] updateDisplayName error:', error)
      throw new Error(`Failed to update store display name: ${error.message}`)
    }

    return data
  }

  /**
   * Storeを削除（論理削除）
   * 物理削除ではなく、is_deleted フラグを立てる
   *
   * NOTE: 物理削除する場合は、先にFile Search API側のCorpusも削除すること
   *
   * @param storeId - file_search_stores.id (UUID)
   * @returns 削除されたレコード
   */
  async softDelete(storeId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('file_search_stores')
      .update({ is_deleted: true })
      .eq('id', storeId)
      .select()
      .single()

    if (error) {
      console.error('[FileSearchStoreRepository] softDelete error:', error)
      throw new Error(`Failed to soft delete file search store: ${error.message}`)
    }

    return data
  }

  /**
   * Storeを物理削除
   *
   * ⚠️ WARNING: 物理削除前に File Search API 側の Corpus も削除すること
   *
   * @param storeId - file_search_stores.id (UUID)
   */
  async hardDelete(storeId: string): Promise<void> {
    const { error } = await this.supabase
      .from('file_search_stores')
      .delete()
      .eq('id', storeId)

    if (error) {
      console.error('[FileSearchStoreRepository] hardDelete error:', error)
      throw new Error(`Failed to hard delete file search store: ${error.message}`)
    }
  }

  /**
   * ユーザーIDとStore IDで権限チェック
   * @param storeId - file_search_stores.id (UUID)
   * @param userId - auth.users.id
   * @returns Store が存在し、ユーザーが所有している場合 true
   */
  async checkOwnership(storeId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('file_search_stores')
      .select('id')
      .eq('id', storeId)
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      return false
    }

    return true
  }

  /**
   * Storeに紐づくファイル数を取得
   * @param storeId - file_search_stores.id (UUID)
   * @returns ファイル数
   */
  async countFiles(storeId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('knowledge_files')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId)

    if (error) {
      console.error('[FileSearchStoreRepository] countFiles error:', error)
      throw new Error(`Failed to count files in store: ${error.message}`)
    }

    return count || 0
  }
}
