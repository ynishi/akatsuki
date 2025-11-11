import { supabase } from '../lib/supabase'
import type { FileSearchStoreDatabaseRecord } from '../models/FileSearchStore'

/**
 * FileSearchStore Repository
 * file_search_stores テーブルへのデータアクセスを管理
 *
 * 使用例:
 * ```typescript
 * import { FileSearchStoreRepository } from '../repositories/FileSearchStoreRepository'
 * import { FileSearchStore } from '../models/FileSearchStore'
 *
 * // 1. Repository でデータ取得
 * const data = await FileSearchStoreRepository.findByUserId(userId)
 *
 * // 2. Model でドメインオブジェクトに変換
 * const stores = data.map(FileSearchStore.fromDatabase)
 * ```
 */
export class FileSearchStoreRepository {
  /**
   * ユーザーIDでStoreを全て取得
   */
  static async findByUserId(userId: string): Promise<FileSearchStoreDatabaseRecord[]> {
    const { data, error } = await supabase
      .from('file_search_stores')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Store取得エラー:', error)
      throw error
    }

    return data as FileSearchStoreDatabaseRecord[]
  }

  /**
   * Store IDで単一のStoreを取得
   */
  static async findById(id: string): Promise<FileSearchStoreDatabaseRecord | null> {
    const { data, error } = await supabase
      .from('file_search_stores')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // レコードが見つからない場合はnullを返す
        return null
      }
      console.error('Store取得エラー:', error)
      throw error
    }

    return data as FileSearchStoreDatabaseRecord
  }

  /**
   * Gemini API corpus nameでStoreを取得
   */
  static async findByName(name: string): Promise<FileSearchStoreDatabaseRecord | null> {
    const { data, error } = await supabase
      .from('file_search_stores')
      .select('*')
      .eq('name', name)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Store取得エラー:', error)
      throw error
    }

    return data as FileSearchStoreDatabaseRecord
  }

  /**
   * 新規Storeを作成
   */
  static async create(storeData: {
    name: string
    display_name?: string | null
    user_id: string
  }): Promise<FileSearchStoreDatabaseRecord> {
    const { data, error } = await supabase
      .from('file_search_stores')
      .insert(storeData)
      .select()
      .single()

    if (error) {
      console.error('Store作成エラー:', error)
      throw error
    }

    return data as FileSearchStoreDatabaseRecord
  }

  /**
   * Storeを更新
   */
  static async update(
    id: string,
    updates: {
      display_name?: string | null
    }
  ): Promise<FileSearchStoreDatabaseRecord> {
    const { data, error } = await supabase
      .from('file_search_stores')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Store更新エラー:', error)
      throw error
    }

    return data as FileSearchStoreDatabaseRecord
  }

  /**
   * Storeを削除
   */
  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('file_search_stores')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Store削除エラー:', error)
      throw error
    }
  }
}
