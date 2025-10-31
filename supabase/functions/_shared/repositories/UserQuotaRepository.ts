/**
 * UserQuota Repository (Edge Functions版)
 * user_quotas table data access layer
 *
 * フロントエンドのUserQuotaRepository.jsを参考に、Edge Functions用に再実装
 */

import { BaseRepository } from '../repository.ts'

/**
 * UserQuotaRepository
 * 月間LLM APIクォータ管理
 */
export class UserQuotaRepository extends BaseRepository {
  /**
   * 現在月のクォータを取得
   * @param userId - auth.users.id
   * @returns クォータレコード or null
   */
  async findCurrentMonthQuota(userId: string): Promise<any | null> {
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

    const { data, error } = await this.supabase
      .from('user_quotas')
      .select('*')
      .eq('user_id', userId)
      .eq('current_month', currentMonth)
      .single()

    if (error) {
      if (this.isNotFoundError(error)) {
        return null
      }
      console.error('[UserQuotaRepository] findCurrentMonthQuota error:', error)
      throw new Error(`Failed to fetch current month quota: ${error.message}`)
    }

    return data
  }

  /**
   * 特定月のクォータを取得
   * @param userId - auth.users.id
   * @param month - Format: YYYY-MM
   * @returns クォータレコード or null
   */
  async findByMonth(userId: string, month: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('user_quotas')
      .select('*')
      .eq('user_id', userId)
      .eq('current_month', month)
      .single()

    if (error) {
      if (this.isNotFoundError(error)) {
        return null
      }
      console.error('[UserQuotaRepository] findByMonth error:', error)
      throw new Error(`Failed to fetch quota for month ${month}: ${error.message}`)
    }

    return data
  }

  /**
   * ユーザーの全クォータ履歴を取得
   * @param userId - auth.users.id
   * @param limit - 取得件数
   * @returns クォータ配列
   */
  async findAllByUserId(userId: string, limit = 12): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('user_quotas')
      .select('*')
      .eq('user_id', userId)
      .order('current_month', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[UserQuotaRepository] findAllByUserId error:', error)
      throw new Error(`Failed to fetch quota history: ${error.message}`)
    }

    return data || []
  }

  /**
   * 現在の使用状況を取得（user_current_usage view使用）
   * @param userId - auth.users.id
   * @returns 使用状況 or null
   */
  async getCurrentUsage(userId: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('user_current_usage')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (this.isNotFoundError(error)) {
        return null
      }
      console.error('[UserQuotaRepository] getCurrentUsage error:', error)
      throw new Error(`Failed to fetch current usage: ${error.message}`)
    }

    return data
  }

  /**
   * クォータ残量をチェック
   * @param userId - auth.users.id
   * @returns クォータ可否情報
   */
  async checkQuotaAvailability(userId: string): Promise<{
    hasQuota: boolean
    remaining: number
    limit: number
  }> {
    const usage = await this.getCurrentUsage(userId)

    if (!usage) {
      // クォータレコード未作成 - 初回API呼び出し時に作成される
      return {
        hasQuota: true,
        remaining: 100, // デフォルトfreeプラン
        limit: 100,
      }
    }

    return {
      hasQuota: usage.remaining_requests > 0,
      remaining: usage.remaining_requests,
      limit: usage.monthly_request_limit,
    }
  }

  /**
   * クォータレコードを作成
   * @param record - クォータレコード
   * @returns 作成されたレコード
   */
  async create(record: {
    user_id: string
    plan_type: string
    monthly_request_limit: number
    current_month: string
    requests_used: number
  }): Promise<any> {
    const { data, error } = await this.supabase
      .from('user_quotas')
      .insert(record)
      .select()
      .single()

    if (error) {
      console.error('[UserQuotaRepository] create error:', error)
      throw new Error(`Failed to create quota record: ${error.message}`)
    }

    return data
  }

  /**
   * 使用回数をインクリメント
   * @param quotaId - クォータレコードID
   * @returns 更新されたレコード
   */
  async incrementUsage(quotaId: string): Promise<any> {
    // RPC関数を使う場合（より安全）
    const { data, error } = await this.supabase.rpc('increment_quota_usage', {
      quota_id: quotaId,
    })

    if (error) {
      console.error('[UserQuotaRepository] incrementUsage error:', error)
      // フォールバック: 直接UPDATE
      return await this.incrementUsageDirect(quotaId)
    }

    return data
  }

  /**
   * 使用回数を直接インクリメント（フォールバック用）
   * @param quotaId - クォータレコードID
   */
  private async incrementUsageDirect(quotaId: string): Promise<any> {
    // 現在の値を取得
    const { data: current, error: fetchError } = await this.supabase
      .from('user_quotas')
      .select('requests_used')
      .eq('id', quotaId)
      .single()

    if (fetchError) {
      throw new Error(`Failed to fetch current usage: ${fetchError.message}`)
    }

    // インクリメント
    const { data, error } = await this.supabase
      .from('user_quotas')
      .update({ requests_used: current.requests_used + 1 })
      .eq('id', quotaId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to increment usage: ${error.message}`)
    }

    return data
  }

  /**
   * プランタイプを更新
   * @param userId - auth.users.id
   * @param planType - 'free' | 'pro' | 'enterprise'
   * @returns 更新されたレコード
   */
  async updatePlanType(userId: string, planType: string): Promise<any> {
    const currentMonth = new Date().toISOString().slice(0, 7)

    const { data, error } = await this.supabase
      .from('user_quotas')
      .update({ plan_type: planType })
      .eq('user_id', userId)
      .eq('current_month', currentMonth)
      .select()
      .single()

    if (error) {
      console.error('[UserQuotaRepository] updatePlanType error:', error)
      throw new Error(`Failed to update plan type: ${error.message}`)
    }

    return data
  }
}
