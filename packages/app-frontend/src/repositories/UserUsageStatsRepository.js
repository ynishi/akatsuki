import { supabase } from '../lib/supabase'

/**
 * UserUsageStats Repository
 * Access layer for usage statistics views
 *
 * Provides aggregated statistics from llm_call_logs
 */
export class UserUsageStatsRepository {
  /**
   * Get monthly statistics for a user
   * @param {string} userId - auth.users.id
   * @param {number} limit - Number of months to fetch
   * @returns {Promise<Array>}
   */
  static async getMonthlyStats(userId, limit = 12) {
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

    return data || []
  }

  /**
   * Get current month's statistics
   * @param {string} userId - auth.users.id
   * @returns {Promise<Object|null>}
   */
  static async getCurrentMonthStats(userId) {
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

    return data
  }

  /**
   * Get detailed call logs for a user
   * @param {string} userId - auth.users.id
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of records to fetch
   * @param {string} options.provider - Filter by provider
   * @param {boolean} options.successOnly - Only fetch successful calls
   * @returns {Promise<Array>}
   */
  static async getCallLogs(
    userId,
    { limit = 100, provider = null, successOnly = false } = {}
  ) {
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

    return data || []
  }

  /**
   * Get total token usage for current month
   * @param {string} userId - auth.users.id
   * @returns {Promise<{totalTokens: number, inputTokens: number, outputTokens: number}>}
   */
  static async getCurrentMonthTokenUsage(userId) {
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
   * @param {string} userId - auth.users.id
   * @returns {Promise<Object>} Provider usage breakdown
   */
  static async getProviderBreakdown(userId) {
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
    const breakdown = {}
    data.forEach((log) => {
      breakdown[log.provider] = (breakdown[log.provider] || 0) + 1
    })

    return breakdown
  }
}
