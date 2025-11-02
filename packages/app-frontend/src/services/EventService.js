import { supabase } from '../lib/supabase'

/**
 * Event Service
 * Lightweight event emission for async job processing
 *
 * Events are stored in system_events table and:
 * 1. Immediately broadcast via Realtime to frontend listeners
 * 2. Processed asynchronously by Cron + Edge Functions
 *
 * @example
 * // Emit event
 * await EventService.emit('image.generated', {
 *   imageId: '...',
 *   imageUrl: '...',
 *   userId: user.id
 * })
 *
 * // Emit with options
 * await EventService.emit('quota.warning', { remaining: 10 }, {
 *   priority: 10,
 *   scheduledAt: new Date(Date.now() + 60000) // 1 minute delay
 * })
 */
export class EventService {
  /**
   * Emit system event
   * @param {string} eventType - Event type (e.g., 'image.generated', 'quota.exceeded')
   * @param {Object} payload - Event data
   * @param {Object} options - Additional options
   * @param {number} options.priority - Event priority (higher = processed first)
   * @param {Date|string} options.scheduledAt - When to process (default: now)
   * @param {string} options.userId - User ID (auto-detected if not provided)
   * @param {number} options.maxRetries - Max retry attempts (default: 3)
   * @returns {Promise<Object>} Created event
   */
  static async emit(eventType, payload = {}, options = {}) {
    try {
      // Get current user if not provided
      const userId = options.userId || (await supabase.auth.getUser()).data.user?.id || null

      const { data, error } = await supabase
        .from('system_events')
        .insert({
          event_type: eventType,
          payload,
          priority: options.priority || 0,
          scheduled_at: options.scheduledAt
            ? new Date(options.scheduledAt).toISOString()
            : new Date().toISOString(),
          user_id: userId,
          max_retries: options.maxRetries !== undefined ? options.maxRetries : 3,
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to emit event:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('EventService.emit error:', error)
      throw error
    }
  }

  /**
   * Emit multiple events at once
   * @param {Array<{eventType: string, payload: Object, options?: Object}>} events
   * @returns {Promise<Array<Object>>}
   */
  static async emitBatch(events) {
    try {
      const user = (await supabase.auth.getUser()).data.user
      const userId = user?.id || null

      const records = events.map(({ eventType, payload = {}, options = {} }) => ({
        event_type: eventType,
        payload,
        priority: options.priority || 0,
        scheduled_at: options.scheduledAt
          ? new Date(options.scheduledAt).toISOString()
          : new Date().toISOString(),
        user_id: options.userId || userId,
        max_retries: options.maxRetries !== undefined ? options.maxRetries : 3,
      }))

      const { data, error } = await supabase
        .from('system_events')
        .insert(records)
        .select()

      if (error) {
        console.error('Failed to emit batch events:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('EventService.emitBatch error:', error)
      throw error
    }
  }

  /**
   * Cancel a pending event
   * @param {string} eventId - Event ID
   * @returns {Promise<void>}
   */
  static async cancel(eventId) {
    const { error } = await supabase
      .from('system_events')
      .update({ status: 'cancelled' })
      .eq('id', eventId)
      .eq('status', 'pending')

    if (error) {
      console.error('Failed to cancel event:', error)
      throw error
    }
  }

  /**
   * Get event by ID
   * @param {string} eventId
   * @returns {Promise<Object|null>}
   */
  static async get(eventId) {
    const { data, error } = await supabase
      .from('system_events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('Failed to get event:', error)
      throw error
    }

    return data
  }

  /**
   * Get events for current user
   * @param {Object} filters
   * @param {string} filters.eventType - Filter by event type
   * @param {string} filters.status - Filter by status
   * @param {number} filters.limit - Max results (default: 50)
   * @returns {Promise<Array<Object>>}
   */
  static async getMyEvents(filters = {}) {
    let query = supabase
      .from('system_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(filters.limit || 50)

    if (filters.eventType) {
      query = query.eq('event_type', filters.eventType)
    }

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to get events:', error)
      throw error
    }

    return data || []
  }
}
