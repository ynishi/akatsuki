import { supabase } from '../lib/supabase'

/**
 * UserQuota Repository
 * user_quotas table data access layer
 *
 * Manages monthly LLM API usage quotas per user
 */
export class UserQuotaRepository {
  /**
   * Get current month's quota for a user
   * @param {string} userId - auth.users.id
   * @returns {Promise<Object|null>}
   */
  static async findCurrentMonthQuota(userId) {
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

    const { data, error } = await supabase
      .from('user_quotas')
      .select('*')
      .eq('user_id', userId)
      .eq('current_month', currentMonth)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No record found - return null (will be auto-created on first API call)
        return null
      }
      console.error('Quota fetch error:', error)
      throw error
    }

    return data
  }

  /**
   * Get quota for a specific month
   * @param {string} userId - auth.users.id
   * @param {string} month - Format: YYYY-MM
   * @returns {Promise<Object|null>}
   */
  static async findByMonth(userId, month) {
    const { data, error } = await supabase
      .from('user_quotas')
      .select('*')
      .eq('user_id', userId)
      .eq('current_month', month)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Quota fetch error:', error)
      throw error
    }

    return data
  }

  /**
   * Get all quotas for a user (history)
   * @param {string} userId - auth.users.id
   * @param {number} limit - Number of months to fetch
   * @returns {Promise<Array>}
   */
  static async findAllByUserId(userId, limit = 12) {
    const { data, error } = await supabase
      .from('user_quotas')
      .select('*')
      .eq('user_id', userId)
      .order('current_month', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Quota history fetch error:', error)
      throw error
    }

    return data || []
  }

  /**
   * Get current usage view (using user_current_usage view)
   * @param {string} userId - auth.users.id
   * @returns {Promise<Object|null>}
   */
  static async getCurrentUsage(userId) {
    const { data, error } = await supabase
      .from('user_current_usage')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Current usage fetch error:', error)
      throw error
    }

    return data
  }

  /**
   * Check if user has remaining quota
   * @param {string} userId - auth.users.id
   * @returns {Promise<{hasQuota: boolean, remaining: number, limit: number}>}
   */
  static async checkQuotaAvailability(userId) {
    const usage = await this.getCurrentUsage(userId)

    if (!usage) {
      // No quota record - will be created on first API call
      return {
        hasQuota: true,
        remaining: 100, // default free plan
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
   * Update plan type
   * Note: This should typically be done via backend/admin, not client-side
   * @param {string} userId - auth.users.id
   * @param {string} planType - 'free' | 'pro' | 'enterprise'
   * @returns {Promise<Object>}
   */
  static async updatePlanType(userId, planType) {
    const currentMonth = new Date().toISOString().slice(0, 7)

    const { data, error } = await supabase
      .from('user_quotas')
      .update({ plan_type: planType })
      .eq('user_id', userId)
      .eq('current_month', currentMonth)
      .select()
      .single()

    if (error) {
      console.error('Plan update error:', error)
      throw error
    }

    return data
  }

  // ========== Admin Methods ==========

  /**
   * Get all users with their current quota (Admin only)
   * @returns {Promise<Array>}
   */
  static async getAllUsersWithQuota() {
    const currentMonth = new Date().toISOString().slice(0, 7)

    // RPC関数を使ってauth.usersのemailを含むquota情報を取得
    const { data, error } = await supabase
      .rpc('get_users_with_quotas', { target_month: currentMonth })

    if (error) {
      console.error('Get users with quotas error:', error)
      throw error
    }

    // データを整形（userオブジェクトにemailを含める）
    return (data || []).map(row => ({
      id: row.quota_id,
      user_id: row.user_id,
      plan_type: row.plan_type,
      monthly_request_limit: row.monthly_request_limit,
      current_month: row.current_month,
      requests_used: row.requests_used,
      created_at: row.created_at,
      updated_at: row.updated_at,
      user: {
        id: row.user_id,
        email: row.email,
      }
    }))
  }

  /**
   * Update quota limit (Admin only)
   * @param {string} userId - auth.users.id
   * @param {number} newLimit - New monthly limit
   * @returns {Promise<Object>}
   */
  static async updateQuotaLimit(userId, newLimit) {
    const currentMonth = new Date().toISOString().slice(0, 7)

    const { data, error } = await supabase
      .from('user_quotas')
      .update({ monthly_request_limit: newLimit })
      .eq('user_id', userId)
      .eq('current_month', currentMonth)
      .select()
      .single()

    if (error) {
      console.error('Update quota limit error:', error)
      throw error
    }

    return data
  }

  /**
   * Reset usage count for a user (Admin only)
   * @param {string} userId - auth.users.id
   * @returns {Promise<Object>}
   */
  static async resetUsageCount(userId) {
    const currentMonth = new Date().toISOString().slice(0, 7)

    const { data, error } = await supabase
      .from('user_quotas')
      .update({ requests_used: 0 })
      .eq('user_id', userId)
      .eq('current_month', currentMonth)
      .select()
      .single()

    if (error) {
      console.error('Reset usage error:', error)
      throw error
    }

    return data
  }

  /**
   * Create or update quota for a user (Admin only)
   * @param {string} userId - auth.users.id
   * @param {Object} quotaData - Quota configuration
   * @returns {Promise<Object>}
   */
  static async upsertQuota(userId, quotaData) {
    const currentMonth = new Date().toISOString().slice(0, 7)

    const { data, error } = await supabase
      .from('user_quotas')
      .upsert({
        user_id: userId,
        current_month: currentMonth,
        ...quotaData,
      }, {
        onConflict: 'user_id,current_month'
      })
      .select()
      .single()

    if (error) {
      console.error('Upsert quota error:', error)
      throw error
    }

    return data
  }
}
