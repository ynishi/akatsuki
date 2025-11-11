import { supabase } from '../lib/supabase'
import type { KnowledgeFileDatabaseRecord } from '../models/KnowledgeFile'

/**
 * KnowledgeFile Repository
 * knowledge_files テーブルへのデータアクセスを管理
 *
 * 使用例:
 * ```typescript
 * import { KnowledgeFileRepository } from '../repositories/KnowledgeFileRepository'
 * import { KnowledgeFile } from '../models/KnowledgeFile'
 *
 * // 1. Repository でデータ取得（files テーブルと JOIN）
 * const data = await KnowledgeFileRepository.findByStoreIdWithFiles(storeId)
 *
 * // 2. Model でドメインオブジェクトに変換
 * const files = data.map(KnowledgeFile.fromDatabase)
 * ```
 */
export class KnowledgeFileRepository {
  /**
   * Store IDでファイルを全て取得（files テーブルと JOIN）
   */
  static async findByStoreIdWithFiles(storeId: string): Promise<KnowledgeFileDatabaseRecord[]> {
    const { data, error } = await supabase
      .from('knowledge_files')
      .select(
        `
        *,
        file:files(
          file_name,
          file_size,
          mime_type,
          storage_path,
          bucket_name,
          metadata
        )
      `
      )
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Knowledge File取得エラー:', error)
      throw error
    }

    return data as unknown as KnowledgeFileDatabaseRecord[]
  }

  /**
   * Store IDでファイルを全て取得（JOINなし）
   */
  static async findByStoreId(storeId: string): Promise<KnowledgeFileDatabaseRecord[]> {
    const { data, error } = await supabase
      .from('knowledge_files')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Knowledge File取得エラー:', error)
      throw error
    }

    return data as KnowledgeFileDatabaseRecord[]
  }

  /**
   * Knowledge File IDで単一のファイルを取得（files テーブルと JOIN）
   */
  static async findByIdWithFile(id: string): Promise<KnowledgeFileDatabaseRecord | null> {
    const { data, error } = await supabase
      .from('knowledge_files')
      .select(
        `
        *,
        file:files(
          file_name,
          file_size,
          mime_type,
          storage_path,
          bucket_name,
          metadata
        )
      `
      )
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Knowledge File取得エラー:', error)
      throw error
    }

    return data as unknown as KnowledgeFileDatabaseRecord
  }

  /**
   * 新規Knowledge Fileを作成
   */
  static async create(fileData: {
    store_id: string
    file_id: string
    gemini_file_name: string
    user_id: string
  }): Promise<KnowledgeFileDatabaseRecord> {
    const { data, error } = await supabase
      .from('knowledge_files')
      .insert(fileData)
      .select()
      .single()

    if (error) {
      console.error('Knowledge File作成エラー:', error)
      throw error
    }

    return data as KnowledgeFileDatabaseRecord
  }

  /**
   * Knowledge Fileを削除
   */
  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('knowledge_files')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Knowledge File削除エラー:', error)
      throw error
    }
  }

  /**
   * file_idでKnowledge Fileを取得
   */
  static async findByFileId(fileId: string): Promise<KnowledgeFileDatabaseRecord | null> {
    const { data, error } = await supabase
      .from('knowledge_files')
      .select('*')
      .eq('file_id', fileId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Knowledge File取得エラー:', error)
      throw error
    }

    return data as KnowledgeFileDatabaseRecord
  }
}
