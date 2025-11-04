import { useState, useEffect } from 'react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { EventRepository } from '../../repositories'
import { useAllEvents } from '../../hooks/useEventListener'
import { useAuth } from '../../contexts/AuthContext'

export function EventMonitorPage() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [statistics, setStatistics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [eventTypeFilter, setEventTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Real-time event listener
  const liveEvents = useAllEvents((event) => {
    console.log('New event:', event)
  }, { maxEvents: 100 })

  // Load initial events and statistics
  const loadData = async () => {
    try {
      setLoading(true)
      const [eventsData, statsData] = await Promise.all([
        EventRepository.getAll({ limit: 100 }),
        EventRepository.getStatistics(),
      ])
      setEvents(eventsData)
      setStatistics(statsData)
    } catch (error) {
      console.error('Failed to load data:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Merge live events with loaded events
  const allEvents = [...liveEvents, ...events].reduce((acc, event) => {
    if (!acc.find((e) => e.id === event.id)) {
      acc.push(event)
    }
    return acc
  }, [])

  // Filter events
  const filteredEvents = allEvents.filter((event) => {
    const matchesType = eventTypeFilter === 'all' || event.event_type === eventTypeFilter
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter
    const matchesSearch =
      !searchQuery ||
      event.event_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(event.payload).toLowerCase().includes(searchQuery.toLowerCase())

    return matchesType && matchesStatus && matchesSearch
  })

  // Get unique event types
  const eventTypes = [...new Set(allEvents.map((e) => e.event_type))]

  // Get status badge variant
  const getStatusBadge = (status) => {
    const variants = {
      pending: 'secondary',
      processing: 'default',
      completed: 'outline',
      failed: 'destructive',
      cancelled: 'secondary',
    }
    return variants[status] || 'outline'
  }

  // Retry failed event
  const handleRetry = async (eventId) => {
    try {
      await EventRepository.retry(eventId)
      alert('Event queued for retry!')
      await loadData()
    } catch (error) {
      console.error('Failed to retry:', error)
      alert(`Error: ${error.message}`)
    }
  }

  // Delete event
  const handleDelete = async (eventId) => {
    if (!confirm('Delete this event?')) return

    try {
      await EventRepository.delete(eventId)
      await loadData()
    } catch (error) {
      console.error('Failed to delete:', error)
      alert(`Error: ${error.message}`)
    }
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please log in to access the admin panel.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-transparent bg-clip-text">
              🔴 Event Monitor
            </h1>
            <p className="text-gray-600 mt-2">Real-time system event monitoring</p>
          </div>
          <Button variant="gradient" onClick={loadData} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>

        {/* Statistics */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{statistics.total || 0}</div>
                <p className="text-xs text-gray-600">Total Events</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-600">{statistics.pending || 0}</div>
                <p className="text-xs text-gray-600">Pending</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">{statistics.processing || 0}</div>
                <p className="text-xs text-gray-600">Processing</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{statistics.completed || 0}</div>
                <p className="text-xs text-gray-600">Completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">{statistics.failed || 0}</div>
                <p className="text-xs text-gray-600">Failed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{statistics.last24h || 0}</div>
                <p className="text-xs text-gray-600">Last 24h</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {eventTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Events List */}
        <Card>
          <CardHeader>
            <CardTitle>Events ({filteredEvents.length})</CardTitle>
            <CardDescription>
              🔴 Live updates • {liveEvents.length} new events received
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No events found</div>
            ) : (
              <div className="space-y-2">
                {filteredEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadge(event.status)}>{event.status}</Badge>
                        <span className="font-semibold">{event.event_type}</span>
                        <span className="text-sm text-gray-500">
                          {new Date(event.created_at).toLocaleString()}
                        </span>
                        {event.retry_count > 0 && (
                          <Badge variant="outline">Retry: {event.retry_count}</Badge>
                        )}
                      </div>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(event.payload, null, 2)}
                      </pre>
                      {event.error_message && (
                        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                          Error: {event.error_message}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {event.status === 'failed' && (
                        <Button size="sm" variant="outline" onClick={() => handleRetry(event.id)}>
                          Retry
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(event.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  )
}
