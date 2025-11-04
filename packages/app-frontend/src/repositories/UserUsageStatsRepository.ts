import { supabase } from '../lib/supabase'

/**
 * Database record types for usage statistics
 */
export interface UserMonthlyStatsDatabaseRecord {
  user_id: string
  month: string // YYYY-MM format
  total_calls: number
  successful_calls: number
  failed_calls: number
  total_tokens_used: number
  created_at: string
  updated_at: string
}

export interface LLMCallLogDatabaseRecord {
  id: string
  user_id: string
  provider: string
  model: string
  input_tokens: number | null
  output_tokens: number | null
  total_tokens: number | null
  success: boolean
  error_message: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface TokenUsage {
  totalTokens: number
  inputTokens: number
  outputTokens: number
}

export interface CallLogsQueryOptions {
  limit?: number
  provider?: string | null
  successOnly?: boolean
}

/**
 * UserUsageStats Repository
 * Access layer for usage statistics views
 *
 * Provides aggregated statistics from llm_call_logs
 *
 * リポジトリパターンの利点:
 * - データアクセスロジックを一箇所に集約
 * - テストが容易（モックしやすい）
 * - Supabaseクライアントの実装詳細を隠蔽
 */
export class UserUsageStatsRepository {
  /**
   * Get monthly statistics for a user
   */
  static async getMonthlyStats(userId: string, limit = 12): Promise<UserMonthlyStatsDatabaseRecord[]> {
    const { data, error } = await supabase
      .from('user_monthly_stats')
      .select('*')
      .eq('user_id', userId)
      .order('month', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Monthly stats fetch error:', error)
      throw error
    }

    return (data || []) as UserMonthlyStatsDatabaseRecord[]
  }

  /**
   * Get current month's statistics
   */
  static async getCurrentMonthStats(userId: string): Promise<UserMonthlyStatsDatabaseRecord | null> {
    const currentMonth = new Date().toISOString().slice(0, 10).slice(0, 7) // YYYY-MM

    const { data, error } = await supabase
      .from('user_monthly_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('month', currentMonth)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Current month stats fetch error:', error)
      throw error
    }

    return data as UserMonthlyStatsDatabaseRecord
  }

  /**
   * Get detailed call logs for a user
   */
  static async getCallLogs(
    userId: string,
    { limit = 100, provider = null, successOnly = false }: CallLogsQueryOptions = {}
  ): Promise<LLMCallLogDatabaseRecord[]> {
    let query = supabase
      .from('llm_call_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (provider) {
      query = query.eq('provider', provider)
    }

    if (successOnly) {
      query = query.eq('success', true)
    }

    const { data, error } = await query

    if (error) {
      console.error('Call logs fetch error:', error)
      throw error
    }

    return (data || []) as LLMCallLogDatabaseRecord[]
  }

  /**
   * Get total token usage for current month
   */
  static async getCurrentMonthTokenUsage(userId: string): Promise<TokenUsage> {
    const stats = await this.getCurrentMonthStats(userId)

    if (!stats) {
      return {
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
      }
    }

    return {
      totalTokens: stats.total_tokens_used || 0,
      inputTokens: 0, // Not aggregated in view, would need separate query
      outputTokens: 0, // Not aggregated in view, would need separate query
    }
  }

  /**
   * Get provider breakdown for current month
   * @returns Provider usage breakdown
   */
  static async getProviderBreakdown(userId: string): Promise<Record<string, number>> {
    const currentMonth = new Date().toISOString().slice(0, 7)

    const { data, error } = await supabase
      .from('llm_call_logs')
      .select('provider')
      .eq('user_id', userId)
      .gte('created_at', `${currentMonth}-01`)
      .lt('created_at', `${currentMonth}-32`) // Next month start

    if (error) {
      console.error('Provider breakdown fetch error:', error)
      throw error
    }

    // Count by provider
    const breakdown: Record<string, number> = {}
    data.forEach((log: { provider: string }) => {
      breakdown[log.provider] = (breakdown[log.provider] || 0) + 1
    })

    return breakdown
  }
}
