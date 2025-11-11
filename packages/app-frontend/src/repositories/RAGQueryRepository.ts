import { supabase } from '../lib/supabase'
import type { RAGQueryDatabaseRecord } from '../models/RAGQuery'

/**
 * RAGQuery Repository
 * rag_queries テーブルへのデータアクセスを管理
 *
 * 使用例:
 * ```typescript
 * import { RAGQueryRepository } from '../repositories/RAGQueryRepository'
 * import { RAGQuery } from '../models/RAGQuery'
 *
 * // 1. Repository でデータ取得
 * const data = await RAGQueryRepository.findByStoreId(storeId, { limit: 10 })
 *
 * // 2. Model でドメインオブジェクトに変換
 * const queries = data.map(RAGQuery.fromDatabase)
 * ```
 */
export class RAGQueryRepository {
  /**
   * Store IDでクエリ履歴を取得
   */
  static async findByStoreId(
    storeId: string,
    options: {
      limit?: number
      offset?: number
    } = {}
  ): Promise<RAGQueryDatabaseRecord[]> {
    const { limit = 50, offset = 0 } = options

    let query = supabase
      .from('rag_queries')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error('RAG Query取得エラー:', error)
      throw error
    }

    return data as RAGQueryDatabaseRecord[]
  }

  /**
   * ユーザーIDでクエリ履歴を取得
   */
  static async findByUserId(
    userId: string,
    options: {
      limit?: number
      offset?: number
    } = {}
  ): Promise<RAGQueryDatabaseRecord[]> {
    const { limit = 50, offset = 0 } = options

    const { data, error } = await supabase
      .from('rag_queries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('RAG Query取得エラー:', error)
      throw error
    }

    return data as RAGQueryDatabaseRecord[]
  }

  /**
   * Query IDで単一のクエリを取得
   */
  static async findById(id: string): Promise<RAGQueryDatabaseRecord | null> {
    const { data, error } = await supabase
      .from('rag_queries')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('RAG Query取得エラー:', error)
      throw error
    }

    return data as RAGQueryDatabaseRecord
  }

  /**
   * 新規クエリを作成
   */
  static async create(queryData: {
    store_id?: string | null
    query: string
    response?: string | null
    grounding_metadata?: Record<string, unknown> | null
    user_id: string
  }): Promise<RAGQueryDatabaseRecord> {
    const { data, error } = await supabase
      .from('rag_queries')
      .insert(queryData)
      .select()
      .single()

    if (error) {
      console.error('RAG Query作成エラー:', error)
      throw error
    }

    return data as RAGQueryDatabaseRecord
  }

  /**
   * クエリを削除
   */
  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('rag_queries')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('RAG Query削除エラー:', error)
      throw error
    }
  }

  /**
   * Store IDの全クエリ履歴を削除
   */
  static async deleteByStoreId(storeId: string): Promise<void> {
    const { error } = await supabase
      .from('rag_queries')
      .delete()
      .eq('store_id', storeId)

    if (error) {
      console.error('RAG Query削除エラー:', error)
      throw error
    }
  }
}
