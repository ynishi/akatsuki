/**
 * KnowledgeFile Repository (Edge Functions版)
 * knowledge_files table data access layer
 *
 * File Search API (Gemini等) にアップロードされたファイルを管理
 */

import { BaseRepository } from '../repository.ts'

/**
 * KnowledgeFileRepository
 * Knowledge File の作成・取得・削除
 */
export class KnowledgeFileRepository extends BaseRepository {
  /**
   * Knowledge File を作成
   * @param record - Knowledge Fileレコード
   * @returns 作成されたレコード
   */
  async create(record: {
    store_id: string // file_search_stores.id (UUID)
    file_id: string // files.id (UUID)
    gemini_file_name: string // File Search API file name (e.g., "corpora/xxx/documents/xxx")
    user_id: string // auth.users.id
  }): Promise<any> {
    const { data, error } = await this.supabase
      .from('knowledge_files')
      .insert(record)
      .select()
      .single()

    if (error) {
      console.error('[KnowledgeFileRepository] create error:', error)
      throw new Error(`Failed to create knowledge file: ${error.message}`)
    }

    return data
  }

  /**
   * IDでKnowledge Fileを取得
   * @param knowledgeFileId - knowledge_files.id (UUID)
   * @returns Knowledge Fileレコード or null
   */
  async findById(knowledgeFileId: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('knowledge_files')
      .select('*')
      .eq('id', knowledgeFileId)
      .single()

    if (error) {
      if (this.isNotFoundError(error)) {
        return null
      }
      console.error('[KnowledgeFileRepository] findById error:', error)
      throw new Error(`Failed to fetch knowledge file: ${error.message}`)
    }

    return data
  }

  /**
   * Store IDでKnowledge File一覧を取得
   * @param storeId - file_search_stores.id (UUID)
   * @param limit - 取得件数（デフォルト: 100）
   * @returns Knowledge File配列
   */
  async findAllByStoreId(storeId: string, limit = 100): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('knowledge_files')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[KnowledgeFileRepository] findAllByStoreId error:', error)
      throw new Error(`Failed to fetch knowledge files: ${error.message}`)
    }

    return data || []
  }

  /**
   * ユーザーIDでKnowledge File一覧を取得
   * @param userId - auth.users.id
   * @param limit - 取得件数（デフォルト: 100）
   * @returns Knowledge File配列
   */
  async findAllByUserId(userId: string, limit = 100): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('knowledge_files')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[KnowledgeFileRepository] findAllByUserId error:', error)
      throw new Error(`Failed to fetch knowledge files by user: ${error.message}`)
    }

    return data || []
  }

  /**
   * File IDでKnowledge Fileを取得
   * @param fileId - files.id (UUID)
   * @returns Knowledge Fileレコード or null
   */
  async findByFileId(fileId: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('knowledge_files')
      .select('*')
      .eq('file_id', fileId)
      .single()

    if (error) {
      if (this.isNotFoundError(error)) {
        return null
      }
      console.error('[KnowledgeFileRepository] findByFileId error:', error)
      throw new Error(`Failed to fetch knowledge file by file_id: ${error.message}`)
    }

    return data
  }

  /**
   * Gemini File NameでKnowledge Fileを取得
   * @param geminiFileName - File Search API file name (e.g., "corpora/xxx/documents/xxx")
   * @returns Knowledge Fileレコード or null
   */
  async findByGeminiFileName(geminiFileName: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('knowledge_files')
      .select('*')
      .eq('gemini_file_name', geminiFileName)
      .single()

    if (error) {
      if (this.isNotFoundError(error)) {
        return null
      }
      console.error('[KnowledgeFileRepository] findByGeminiFileName error:', error)
      throw new Error(`Failed to fetch knowledge file by gemini_file_name: ${error.message}`)
    }

    return data
  }

  /**
   * Store IDとFile IDでKnowledge Fileを取得
   * @param storeId - file_search_stores.id (UUID)
   * @param fileId - files.id (UUID)
   * @returns Knowledge Fileレコード or null
   */
  async findByStoreAndFile(storeId: string, fileId: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('knowledge_files')
      .select('*')
      .eq('store_id', storeId)
      .eq('file_id', fileId)
      .single()

    if (error) {
      if (this.isNotFoundError(error)) {
        return null
      }
      console.error('[KnowledgeFileRepository] findByStoreAndFile error:', error)
      throw new Error(`Failed to fetch knowledge file: ${error.message}`)
    }

    return data
  }

  /**
   * Knowledge Fileを削除（論理削除）
   * 物理削除ではなく、is_deleted フラグを立てる
   *
   * NOTE: 物理削除する場合は、先にFile Search API側のDocumentも削除すること
   *
   * @param knowledgeFileId - knowledge_files.id (UUID)
   * @returns 削除されたレコード
   */
  async softDelete(knowledgeFileId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('knowledge_files')
      .update({ is_deleted: true })
      .eq('id', knowledgeFileId)
      .select()
      .single()

    if (error) {
      console.error('[KnowledgeFileRepository] softDelete error:', error)
      throw new Error(`Failed to soft delete knowledge file: ${error.message}`)
    }

    return data
  }

  /**
   * Knowledge Fileを物理削除
   *
   * ⚠️ WARNING: 物理削除前に File Search API 側の Document も削除すること
   *
   * @param knowledgeFileId - knowledge_files.id (UUID)
   */
  async hardDelete(knowledgeFileId: string): Promise<void> {
    const { error } = await this.supabase
      .from('knowledge_files')
      .delete()
      .eq('id', knowledgeFileId)

    if (error) {
      console.error('[KnowledgeFileRepository] hardDelete error:', error)
      throw new Error(`Failed to hard delete knowledge file: ${error.message}`)
    }
  }

  /**
   * ユーザーIDとKnowledge File IDで権限チェック
   * @param knowledgeFileId - knowledge_files.id (UUID)
   * @param userId - auth.users.id
   * @returns Knowledge File が存在し、ユーザーが所有している場合 true
   */
  async checkOwnership(knowledgeFileId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('knowledge_files')
      .select('id')
      .eq('id', knowledgeFileId)
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      return false
    }

    return true
  }

  /**
   * Store内のファイル数を取得
   * @param storeId - file_search_stores.id (UUID)
   * @returns ファイル数
   */
  async countByStoreId(storeId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('knowledge_files')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId)

    if (error) {
      console.error('[KnowledgeFileRepository] countByStoreId error:', error)
      throw new Error(`Failed to count knowledge files: ${error.message}`)
    }

    return count || 0
  }

  /**
   * 複数Store IDでKnowledge File一覧を取得（RAG Chat用）
   * @param storeIds - file_search_stores.id[] (UUID[])
   * @param limit - 取得件数（デフォルト: 1000）
   * @returns Knowledge File配列
   */
  async findAllByStoreIds(storeIds: string[], limit = 1000): Promise<any[]> {
    if (!storeIds || storeIds.length === 0) {
      return []
    }

    const { data, error } = await this.supabase
      .from('knowledge_files')
      .select('*')
      .in('store_id', storeIds)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[KnowledgeFileRepository] findAllByStoreIds error:', error)
      throw new Error(`Failed to fetch knowledge files by store IDs: ${error.message}`)
    }

    return data || []
  }

  /**
   * Store IDとFile名で重複チェック
   * 同じStoreに同じFile名が既にアップロードされているかチェック
   *
   * @param storeId - file_search_stores.id (UUID)
   * @param fileName - ファイル名
   * @returns 重複している場合 true
   */
  async isDuplicate(storeId: string, fileName: string): Promise<boolean> {
    // files テーブルと JOIN して file_name で検索
    const { data, error } = await this.supabase
      .from('knowledge_files')
      .select('id, files!inner(file_name)')
      .eq('store_id', storeId)
      .eq('files.file_name', fileName)
      .single()

    if (error) {
      if (this.isNotFoundError(error)) {
        return false // 重複なし
      }
      console.error('[KnowledgeFileRepository] isDuplicate error:', error)
      throw new Error(`Failed to check duplicate file: ${error.message}`)
    }

    return !!data // データが存在すれば重複
  }
}
