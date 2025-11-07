import { supabase } from '../lib/supabase'

/**
 * Event emission options
 */
export interface EventEmitOptions {
  priority?: number
  scheduledAt?: Date | string
  userId?: string
  maxRetries?: number
}

/**
 * Event filter options
 */
export interface EventFilters {
  eventType?: string
  status?: string
  limit?: number
}

/**
 * Batch event
 */
export interface BatchEvent {
  eventType: string
  payload?: Record<string, unknown>
  options?: EventEmitOptions
}

/**
 * System event record
 */
export interface SystemEvent {
  id: string
  event_type: string
  payload: Record<string, unknown>
  priority: number
  scheduled_at: string
  user_id: string | null
  max_retries: number
  status: string
  created_at: string
  [key: string]: unknown
}

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
   * @param eventType - Event type (e.g., 'image.generated', 'quota.exceeded')
   * @param payload - Event data
   * @param options - Additional options
   * @returns Created event
   */
  static async emit(
    eventType: string,
    payload: Record<string, unknown> = {},
    options: EventEmitOptions = {}
  ): Promise<SystemEvent> {
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

      return data as SystemEvent
    } catch (error) {
      console.error('EventService.emit error:', error)
      throw error
    }
  }

  /**
   * Emit multiple events at once
   * @param events - Array of events to emit
   * @returns Created events
   */
  static async emitBatch(events: BatchEvent[]): Promise<SystemEvent[]> {
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

      const { data, error } = await supabase.from('system_events').insert(records).select()

      if (error) {
        console.error('Failed to emit batch events:', error)
        throw error
      }

      return data as SystemEvent[]
    } catch (error) {
      console.error('EventService.emitBatch error:', error)
      throw error
    }
  }

  /**
   * Cancel a pending event
   * @param eventId - Event ID
   */
  static async cancel(eventId: string): Promise<void> {
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
   * @param eventId - Event ID
   * @returns Event or null if not found
   */
  static async get(eventId: string): Promise<SystemEvent | null> {
    const { data, error } = await supabase.from('system_events').select('*').eq('id', eventId).single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('Failed to get event:', error)
      throw error
    }

    return data as SystemEvent
  }

  /**
   * Get events for current user
   * @param filters - Filter options
   * @returns Array of events
   */
  static async getMyEvents(filters: EventFilters = {}): Promise<SystemEvent[]> {
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

    return (data as SystemEvent[]) || []
  }
}
