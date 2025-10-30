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
}
