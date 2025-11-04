import { supabase } from '../lib/supabase'

/**
 * Database record types for events
 */
export type EventStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface SystemEventDatabaseRecord {
  id: string
  event_type: string
  user_id: string | null
  status: EventStatus
  payload: Record<string, unknown> | null
  error_message: string | null
  retry_count: number
  scheduled_at: string | null
  created_at: string
  updated_at: string
}

export interface EventHandlerDatabaseRecord {
  id: string
  event_type: string
  handler_name: string
  is_active: boolean
  config: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface EventFilters {
  eventType?: string
  status?: EventStatus
  userId?: string
  fromDate?: Date
  toDate?: Date
  limit?: number
  offset?: number
}

export interface EventStatistics {
  total: number
  pending: number
  processing: number
  completed: number
  failed: number
  last24h: number
  byType: Record<string, number>
}

/**
 * Event Repository
 * Admin-level CRUD operations for system events
 *
 * リポジトリパターンの利点:
 * - データアクセスロジックを一箇所に集約
 * - テストが容易（モックしやすい）
 * - Supabaseクライアントの実装詳細を隠蔽
 */
export class EventRepository {
  /**
   * Get all events (Admin only)
   */
  static async getAll(filters: EventFilters = {}): Promise<SystemEventDatabaseRecord[]> {
    let query = supabase.from('system_events').select('*').order('created_at', { ascending: false })

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

    return (data || []) as SystemEventDatabaseRecord[]
  }

  /**
   * Get event statistics (Admin only)
   */
  static async getStatistics(): Promise<EventStatistics> {
    const { data, error } = await supabase.rpc('get_event_statistics')

    if (error) {
      console.error('Failed to get statistics:', error)
      // Fallback to manual calculation if RPC doesn't exist
      return this.calculateStatisticsManually()
    }

    return data as EventStatistics
  }

  /**
   * Fallback statistics calculation
   * @private
   */
  private static async calculateStatisticsManually(): Promise<EventStatistics> {
    const { data: events } = await supabase.from('system_events').select('status, event_type, created_at')

    if (!events)
      return {
        total: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        last24h: 0,
        byType: {},
      }

    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    return {
      total: events.length,
      pending: events.filter((e: { status: string }) => e.status === 'pending').length,
      processing: events.filter((e: { status: string }) => e.status === 'processing').length,
      completed: events.filter((e: { status: string }) => e.status === 'completed').length,
      failed: events.filter((e: { status: string }) => e.status === 'failed').length,
      last24h: events.filter((e: { created_at: string }) => new Date(e.created_at) > last24h).length,
      byType: events.reduce(
        (acc: Record<string, number>, e: { event_type: string }) => {
          acc[e.event_type] = (acc[e.event_type] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      ),
    }
  }

  /**
   * Retry failed event
   */
  static async retry(eventId: string): Promise<SystemEventDatabaseRecord> {
    const { data, error } = await supabase
      .from('system_events')
      .update({
        status: 'pending' as EventStatus,
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

    return data as SystemEventDatabaseRecord
  }

  /**
   * Delete event (Admin only)
   */
  static async delete(eventId: string): Promise<void> {
    const { error } = await supabase.from('system_events').delete().eq('id', eventId)

    if (error) {
      console.error('Failed to delete event:', error)
      throw error
    }
  }

  /**
   * Delete old completed events (Admin only)
   * @returns Number of deleted events
   */
  static async deleteOldEvents(olderThanDays = 30): Promise<number> {
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
   */
  static async getHandlers(): Promise<EventHandlerDatabaseRecord[]> {
    const { data, error } = await supabase.from('event_handlers').select('*').order('event_type')

    if (error) {
      console.error('Failed to get handlers:', error)
      throw error
    }

    return (data || []) as EventHandlerDatabaseRecord[]
  }

  /**
   * Update event handler
   */
  static async updateHandler(
    handlerId: string,
    updates: Partial<EventHandlerDatabaseRecord>
  ): Promise<EventHandlerDatabaseRecord> {
    const { data, error } = await supabase.from('event_handlers').update(updates).eq('id', handlerId).select().single()

    if (error) {
      console.error('Failed to update handler:', error)
      throw error
    }

    return data as EventHandlerDatabaseRecord
  }

  /**
   * Toggle handler active status
   */
  static async toggleHandler(handlerId: string, isActive: boolean): Promise<EventHandlerDatabaseRecord> {
    return this.updateHandler(handlerId, { is_active: isActive })
  }

  /**
   * Create new event handler
   */
  static async createHandler(handler: Partial<EventHandlerDatabaseRecord>): Promise<EventHandlerDatabaseRecord> {
    const { data, error } = await supabase.from('event_handlers').insert(handler).select().single()

    if (error) {
      console.error('Failed to create handler:', error)
      throw error
    }

    return data as EventHandlerDatabaseRecord
  }
}
