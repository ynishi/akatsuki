import { supabase } from '../lib/supabase'

/**
 * Event Repository
 * Admin-level CRUD operations for system events
 */
export class EventRepository {
  /**
   * Get all events (Admin only)
   * @param {Object} filters
   * @param {string} filters.eventType - Filter by event type
   * @param {string} filters.status - Filter by status
   * @param {string} filters.userId - Filter by user ID
   * @param {Date} filters.fromDate - Events created after this date
   * @param {Date} filters.toDate - Events created before this date
   * @param {number} filters.limit - Max results (default: 100)
   * @param {number} filters.offset - Offset for pagination
   * @returns {Promise<Array>}
   */
  static async getAll(filters = {}) {
    let query = supabase
      .from('system_events')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters.eventType) {
      query = query.eq('event_type', filters.eventType)
    }

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.userId) {
      query = query.eq('user_id', filters.userId)
    }

    if (filters.fromDate) {
      query = query.gte('created_at', new Date(filters.fromDate).toISOString())
    }

    if (filters.toDate) {
      query = query.lte('created_at', new Date(filters.toDate).toISOString())
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 100) - 1)
    } else {
      query = query.limit(filters.limit || 100)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to get events:', error)
      throw error
    }

    return data || []
  }

  /**
   * Get event statistics (Admin only)
   * @returns {Promise<Object>}
   */
  static async getStatistics() {
    const { data, error } = await supabase.rpc('get_event_statistics')

    if (error) {
      console.error('Failed to get statistics:', error)
      // Fallback to manual calculation if RPC doesn't exist
      return this.calculateStatisticsManually()
    }

    return data
  }

  /**
   * Fallback statistics calculation
   * @private
   */
  static async calculateStatisticsManually() {
    const { data: events } = await supabase
      .from('system_events')
      .select('status, event_type, created_at')

    if (!events) return {}

    const now = new Date()
    const last24h = new Date(now - 24 * 60 * 60 * 1000)

    return {
      total: events.length,
      pending: events.filter(e => e.status === 'pending').length,
      processing: events.filter(e => e.status === 'processing').length,
      completed: events.filter(e => e.status === 'completed').length,
      failed: events.filter(e => e.status === 'failed').length,
      last24h: events.filter(e => new Date(e.created_at) > last24h).length,
      byType: events.reduce((acc, e) => {
        acc[e.event_type] = (acc[e.event_type] || 0) + 1
        return acc
      }, {}),
    }
  }

  /**
   * Retry failed event
   * @param {string} eventId
   * @returns {Promise<Object>}
   */
  static async retry(eventId) {
    const { data, error } = await supabase
      .from('system_events')
      .update({
        status: 'pending',
        retry_count: 0,
        error_message: null,
        scheduled_at: new Date().toISOString(),
      })
      .eq('id', eventId)
      .select()
      .single()

    if (error) {
      console.error('Failed to retry event:', error)
      throw error
    }

    return data
  }

  /**
   * Delete event (Admin only)
   * @param {string} eventId
   * @returns {Promise<void>}
   */
  static async delete(eventId) {
    const { error } = await supabase
      .from('system_events')
      .delete()
      .eq('id', eventId)

    if (error) {
      console.error('Failed to delete event:', error)
      throw error
    }
  }

  /**
   * Delete old completed events (Admin only)
   * @param {number} olderThanDays - Delete events older than N days (default: 30)
   * @returns {Promise<number>} Number of deleted events
   */
  static async deleteOldEvents(olderThanDays = 30) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    const { data, error } = await supabase
      .from('system_events')
      .delete()
      .eq('status', 'completed')
      .lt('created_at', cutoffDate.toISOString())
      .select('id')

    if (error) {
      console.error('Failed to delete old events:', error)
      throw error
    }

    return data?.length || 0
  }

  // ========== Event Handlers Management ==========

  /**
   * Get all event handlers
   * @returns {Promise<Array>}
   */
  static async getHandlers() {
    const { data, error } = await supabase
      .from('event_handlers')
      .select('*')
      .order('event_type')

    if (error) {
      console.error('Failed to get handlers:', error)
      throw error
    }

    return data || []
  }

  /**
   * Update event handler
   * @param {string} handlerId
   * @param {Object} updates
   * @returns {Promise<Object>}
   */
  static async updateHandler(handlerId, updates) {
    const { data, error } = await supabase
      .from('event_handlers')
      .update(updates)
      .eq('id', handlerId)
      .select()
      .single()

    if (error) {
      console.error('Failed to update handler:', error)
      throw error
    }

    return data
  }

  /**
   * Toggle handler active status
   * @param {string} handlerId
   * @param {boolean} isActive
   * @returns {Promise<Object>}
   */
  static async toggleHandler(handlerId, isActive) {
    return this.updateHandler(handlerId, { is_active: isActive })
  }

  /**
   * Create new event handler
   * @param {Object} handler
   * @returns {Promise<Object>}
   */
  static async createHandler(handler) {
    const { data, error } = await supabase
      .from('event_handlers')
      .insert(handler)
      .select()
      .single()

    if (error) {
      console.error('Failed to create handler:', error)
      throw error
    }

    return data
  }
}
