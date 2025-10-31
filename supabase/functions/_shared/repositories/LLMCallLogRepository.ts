/**
 * LLMCallLog Repository (Edge Functions版)
 * llm_call_logs table data access layer
 *
 * LLM API呼び出しのログを記録
 */

import { BaseRepository } from '../repository.ts'

/**
 * LLMCallLogRepository
 * LLM呼び出しログの記録・取得
 */
export class LLMCallLogRepository extends BaseRepository {
  /**
   * ログレコードを作成
   * @param record - ログレコード
   * @returns 作成されたレコード
   */
  async create(record: {
    user_id: string
    provider: string
    model_id: string
    input_tokens?: number
    output_tokens?: number
    total_tokens?: number
    request_type: string
    success: boolean
    error_message?: string
  }): Promise<any> {
    const { data, error } = await this.supabase
      .from('llm_call_logs')
      .insert(record)
      .select()
      .single()

    if (error) {
      console.error('[LLMCallLogRepository] create error:', error)
      // ログ記録の失敗はクリティカルではないため、エラーをスローせず警告のみ
      console.warn('[LLMCallLogRepository] Failed to log LLM call, continuing...')
      return null
    }

    return data
  }

  /**
   * ユーザーのログ履歴を取得
   * @param userId - auth.users.id
   * @param limit - 取得件数
   * @returns ログ配列
   */
  async findByUserId(userId: string, limit = 100): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('llm_call_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[LLMCallLogRepository] findByUserId error:', error)
      throw new Error(`Failed to fetch LLM call logs: ${error.message}`)
    }

    return data || []
  }

  /**
   * ユーザーの成功したログのみを取得
   * @param userId - auth.users.id
   * @param limit - 取得件数
   * @returns ログ配列
   */
  async findSuccessfulByUserId(userId: string, limit = 100): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('llm_call_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('success', true)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[LLMCallLogRepository] findSuccessfulByUserId error:', error)
      throw new Error(`Failed to fetch successful LLM call logs: ${error.message}`)
    }

    return data || []
  }

  /**
   * ユーザーの失敗したログのみを取得
   * @param userId - auth.users.id
   * @param limit - 取得件数
   * @returns ログ配列
   */
  async findFailedByUserId(userId: string, limit = 100): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('llm_call_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('success', false)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[LLMCallLogRepository] findFailedByUserId error:', error)
      throw new Error(`Failed to fetch failed LLM call logs: ${error.message}`)
    }

    return data || []
  }

  /**
   * 特定期間のログを取得
   * @param userId - auth.users.id
   * @param startDate - 開始日時（ISO形式）
   * @param endDate - 終了日時（ISO形式）
   * @returns ログ配列
   */
  async findByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('llm_call_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[LLMCallLogRepository] findByDateRange error:', error)
      throw new Error(`Failed to fetch LLM call logs by date range: ${error.message}`)
    }

    return data || []
  }

  /**
   * プロバイダー別のログを取得
   * @param userId - auth.users.id
   * @param provider - プロバイダー名
   * @param limit - 取得件数
   * @returns ログ配列
   */
  async findByProvider(userId: string, provider: string, limit = 100): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('llm_call_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', provider)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[LLMCallLogRepository] findByProvider error:', error)
      throw new Error(`Failed to fetch LLM call logs by provider: ${error.message}`)
    }

    return data || []
  }
}
