/**
 * KnowledgeFile Repository (Edge Functions版)
 * knowledge_files table data access layer
 *
 * Manages the relationship between files (Supabase Storage) and
 * File Search stores (RAG providers)
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
    file_id: string // files.id (UUID) - Supabase Storage reference
    store_id: string // file_search_stores.id (UUID)
    provider_file_name: string // Provider-specific file identifier (e.g., "corpora/xxx/documents/xxx")
    indexing_status?: 'pending' | 'processing' | 'completed' | 'failed'
    error_message?: string
    metadata?: Record<string, any>
  }): Promise<any> {
    const { data, error } = await this.supabase
      .from('knowledge_files')
      .insert({
        ...record,
        indexing_status: record.indexing_status || 'pending',
      })
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
      .select(`
        *,
        files:file_id (
          id,
          file_name,
          file_size,
          mime_type,
          storage_path,
          created_at
        )
      `)
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
      .select(`
        *,
        files:file_id (
          id,
          file_name,
          file_size,
          mime_type,
          storage_path,
          created_at,
          owner_id
        )
      `)
      .eq('files.owner_id', userId)
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
   * Provider File NameでKnowledge Fileを取得
   * @param providerFileName - Provider-specific file identifier
   * @returns Knowledge Fileレコード or null
   */
  async findByProviderFileName(providerFileName: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('knowledge_files')
      .select('*')
      .eq('provider_file_name', providerFileName)
      .single()

    if (error) {
      if (this.isNotFoundError(error)) {
        return null
      }
      console.error('[KnowledgeFileRepository] findByProviderFileName error:', error)
      throw new Error(`Failed to fetch knowledge file by provider_file_name: ${error.message}`)
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
   * Indexing statusを更新
   * @param knowledgeFileId - knowledge_files.id (UUID)
   * @param status - Indexing status
   * @param errorMessage - Error message (optional)
   * @returns 更新されたレコード
   */
  async updateIndexingStatus(
    knowledgeFileId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    errorMessage?: string
  ): Promise<any> {
    const { data, error } = await this.supabase
      .from('knowledge_files')
      .update({
        indexing_status: status,
        error_message: errorMessage || null,
      })
      .eq('id', knowledgeFileId)
      .select()
      .single()

    if (error) {
      console.error('[KnowledgeFileRepository] updateIndexingStatus error:', error)
      throw new Error(`Failed to update indexing status: ${error.message}`)
    }

    return data
  }

  /**
   * Knowledge Fileを物理削除
   *
   * ⚠️ WARNING: 物理削除前に以下を実行すること
   * 1. Provider側のDocumentも削除
   * 2. Supabase Storage上のファイル削除（必要に応じて）
   *
   * @param knowledgeFileId - knowledge_files.id (UUID)
   */
  async delete(knowledgeFileId: string): Promise<void> {
    const { error } = await this.supabase
      .from('knowledge_files')
      .delete()
      .eq('id', knowledgeFileId)

    if (error) {
      console.error('[KnowledgeFileRepository] delete error:', error)
      throw new Error(`Failed to delete knowledge file: ${error.message}`)
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
      .select('id, files:file_id(owner_id)')
      .eq('id', knowledgeFileId)
      .single()

    if (error || !data) {
      return false
    }

    // @ts-ignore: Type inference issue with nested join
    return data.files?.owner_id === userId
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
      .select(`
        *,
        files:file_id (
          id,
          file_name,
          file_size,
          mime_type,
          storage_path
        )
      `)
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
