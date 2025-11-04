import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Listen to system events in real-time via Supabase Realtime
 *
 * @param {string|string[]} eventTypes - Event type(s) to listen to (e.g., 'image.generated', ['quota.exceeded', 'quota.warning'])
 * @param {function} onEvent - Callback when event occurs: (event) => void
 * @param {Object} options - Additional options
 * @param {boolean} options.enabled - Enable/disable listener (default: true)
 * @param {string} options.userId - Filter by user ID (default: current user)
 * @param {string} options.status - Filter by status (default: all)
 *
 * @returns {Array<Object>} Array of received events
 *
 * @example
 * const events = useEventListener('image.generated', (event) => {
 *   console.log('Image generated:', event.payload.imageId)
 * })
 *
 * @example
 * const events = useEventListener(['quota.exceeded', 'quota.warning'], (event) => {
 *   if (event.event_type === 'quota.exceeded') {
 *     alert('Quota exceeded!')
 *   }
 * }, { enabled: isSubscribed })
 */
export function useEventListener(eventTypes, onEvent, options = {}) {
  const [events, setEvents] = useState([])
  const { enabled = true, userId, status } = options

  const types = Array.isArray(eventTypes) ? eventTypes : [eventTypes]

  useEffect(() => {
    if (!enabled) return

    const channel = supabase
      .channel('system_events_listener')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_events',
        },
        (payload) => {
          const event = payload.new

          // Filter by event type
          if (types.length > 0 && types[0] !== '*' && !types.includes(event.event_type)) {
            return
          }

          // Filter by user ID
          if (userId && event.user_id !== userId) {
            return
          }

          // Filter by status
          if (status && event.status !== status) {
            return
          }

          // Add to events list
          setEvents((prev) => [event, ...prev])

          // Call callback
          onEvent?.(event)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, types.join(','), userId, status, onEvent])

  return events
}

/**
 * Listen to image generation events
 *
 * @param {function} onComplete - Callback when image is generated: (payload) => void
 * @param {Object} options
 * @param {boolean} options.enabled
 * @param {boolean} options.onlyMine - Only listen to current user's events (default: true)
 *
 * @example
 * useImageGenerationEvents((payload) => {
 *   toast.success(`Image generated: ${payload.imageId}`)
 *   refetchImages()
 * })
 */
export function useImageGenerationEvents(onComplete, options = {}) {
  const { enabled = true, onlyMine = true } = options
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    if (onlyMine) {
      supabase.auth.getUser().then(({ data }) => {
        setCurrentUser(data.user)
      })
    }
  }, [onlyMine])

  return useEventListener(
    'image.generated',
    useCallback(
      (event) => {
        if (onlyMine && currentUser && event.payload.userId !== currentUser.id) {
          return
        }
        onComplete?.(event.payload)
      },
      [onComplete, onlyMine, currentUser]
    ),
    { enabled }
  )
}

/**
 * Listen to quota-related events
 *
 * @param {function} onUpdate - Callback when quota event occurs: (event) => void
 * @param {Object} options
 * @param {boolean} options.enabled
 *
 * @example
 * useQuotaEvents((event) => {
 *   if (event.event_type === 'quota.exceeded') {
 *     toast.error('Quota exceeded!')
 *   } else if (event.event_type === 'quota.warning') {
 *     toast.warning(`Only ${event.payload.remaining} requests left!`)
 *   }
 * })
 */
export function useQuotaEvents(onUpdate, options = {}) {
  const { enabled = true } = options
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user)
    })
  }, [])

  return useEventListener(
    ['quota.exceeded', 'quota.warning', 'quota.updated'],
    useCallback(
      (event) => {
        // Only notify for current user's quota events
        if (currentUser && event.payload.userId === currentUser.id) {
          onUpdate?.(event)
        }
      },
      [onUpdate, currentUser]
    ),
    { enabled }
  )
}

/**
 * Listen to all events (Admin only)
 *
 * @param {function} onEvent - Callback for any event: (event) => void
 * @param {Object} options
 * @param {boolean} options.enabled
 * @param {number} options.maxEvents - Max events to keep in memory (default: 50)
 *
 * @example
 * const recentEvents = useAllEvents((event) => {
 *   console.log('Event:', event.event_type, event.payload)
 * }, { maxEvents: 100 })
 */
export function useAllEvents(onEvent, options = {}) {
  const { enabled = true, maxEvents = 50 } = options
  const [events, setEvents] = useState([])

  useEffect(() => {
    if (!enabled) return

    const channel = supabase
      .channel('all_events_listener')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_events',
        },
        (payload) => {
          const event = payload.new

          setEvents((prev) => {
            const updated = [event, ...prev]
            return updated.slice(0, maxEvents)
          })

          onEvent?.(event)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [enabled, maxEvents, onEvent])

  return events
}
