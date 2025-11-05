import { useState, useEffect } from 'react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import { RefreshCw, Eye, Filter, X } from 'lucide-react'

interface WebhookLog {
  id: string
  webhook_id: string | null
  webhook_name: string
  request_method: string
  request_headers: Record<string, string>
  request_body: any
  source_ip: string | null
  status: 'success' | 'signature_failed' | 'handler_failed' | 'not_found'
  error_message: string | null
  processing_time_ms: number | null
  system_event_id: string | null
  received_at: string
}

export function WebhookLogsPage() {
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Filters
  const [webhookNameFilter, setWebhookNameFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [limit, setLimit] = useState<number>(50)

  // Available webhook names for filter
  const [webhookNames, setWebhookNames] = useState<string[]>([])

  useEffect(() => {
    loadLogs()
    loadWebhookNames()
  }, [webhookNameFilter, statusFilter, limit])

  const loadLogs = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('webhook_logs')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(limit)

      if (webhookNameFilter !== 'all') {
        query = query.eq('webhook_name', webhookNameFilter)
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error
      setLogs(data || [])
    } catch (error: any) {
      console.error('Webhook Logs読み込みエラー:', error)
      toast.error(`エラー: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const loadWebhookNames = async () => {
    try {
      const { data, error } = await supabase
        .from('webhooks')
        .select('name')
        .order('name')

      if (error) throw error

      const names = data?.map(w => w.name) || []
      setWebhookNames(names)
    } catch (error: any) {
      console.error('Webhook名読み込みエラー:', error)
    }
  }

  const handleShowDetail = (log: WebhookLog) => {
    setSelectedLog(log)
    setShowDetailModal(true)
  }

  const getStatusBadge = (status: WebhookLog['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-600 text-white">Success</Badge>
      case 'signature_failed':
        return <Badge className="bg-red-600 text-white">Signature Failed</Badge>
      case 'handler_failed':
        return <Badge className="bg-orange-600 text-white">Handler Failed</Badge>
      case 'not_found':
        return <Badge className="bg-gray-600 text-white">Not Found</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const clearFilters = () => {
    setWebhookNameFilter('all')
    setStatusFilter('all')
    setSearchQuery('')
  }

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      log.webhook_name.toLowerCase().includes(query) ||
      log.id.toLowerCase().includes(query) ||
      log.error_message?.toLowerCase().includes(query) ||
      JSON.stringify(log.request_body).toLowerCase().includes(query)
    )
  })

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>読み込み中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Webhook受信ログ</h1>
          <p className="text-gray-600">全てのWebhook受信履歴を確認</p>
        </div>
        <Button onClick={loadLogs} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          再読み込み
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">フィルター</CardTitle>
            <Button onClick={clearFilters} variant="ghost" size="sm">
              <X className="w-4 h-4 mr-1" />
              クリア
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Webhook Name Filter */}
            <div>
              <Label className="text-xs">Webhook</Label>
              <Select value={webhookNameFilter} onValueChange={setWebhookNameFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="全て" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全て</SelectItem>
                  {webhookNames.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div>
              <Label className="text-xs">ステータス</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="全て" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全て</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="signature_failed">Signature Failed</SelectItem>
                  <SelectItem value="handler_failed">Handler Failed</SelectItem>
                  <SelectItem value="not_found">Not Found</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Limit */}
            <div>
              <Label className="text-xs">表示件数</Label>
              <Select value={limit.toString()} onValueChange={(v) => setLimit(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20件</SelectItem>
                  <SelectItem value="50">50件</SelectItem>
                  <SelectItem value="100">100件</SelectItem>
                  <SelectItem value="200">200件</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div>
              <Label className="text-xs">検索</Label>
              <Input
                placeholder="ID, Webhook名, エラーメッセージ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">総受信数</p>
            <p className="text-3xl font-bold">{filteredLogs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">成功</p>
            <p className="text-3xl font-bold text-green-600">
              {filteredLogs.filter(l => l.status === 'success').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">失敗</p>
            <p className="text-3xl font-bold text-red-600">
              {filteredLogs.filter(l => l.status !== 'success').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">平均処理時間</p>
            <p className="text-3xl font-bold text-blue-600">
              {Math.round(
                filteredLogs
                  .filter(l => l.processing_time_ms)
                  .reduce((sum, l) => sum + (l.processing_time_ms || 0), 0) /
                  filteredLogs.filter(l => l.processing_time_ms).length || 0
              )}
              <span className="text-sm text-gray-500 ml-1">ms</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>受信ログ一覧</CardTitle>
          <CardDescription>{filteredLogs.length}件のログ</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition"
                onClick={() => handleShowDetail(log)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                      {log.webhook_name}
                    </code>
                    {getStatusBadge(log.status)}
                    {log.system_event_id && (
                      <Badge variant="outline" className="text-xs">
                        Event Created
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    {log.processing_time_ms && (
                      <span>{log.processing_time_ms}ms</span>
                    )}
                    <span>{new Date(log.received_at).toLocaleString('ja-JP')}</span>
                  </div>
                </div>

                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">ID:</span>
                    <code className="text-xs bg-gray-100 px-1 rounded">
                      {log.id.substring(0, 8)}...
                    </code>
                  </div>

                  {log.error_message && (
                    <div className="text-red-600 text-xs mt-2 p-2 bg-red-50 rounded">
                      <strong>Error:</strong> {log.error_message}
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleShowDetail(log)
                    }}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    詳細
                  </Button>
                </div>
              </div>
            ))}

            {filteredLogs.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p>ログが見つかりません</p>
                <p className="text-sm mt-2">フィルターを変更してください</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Webhook受信ログ詳細</DialogTitle>
            <DialogDescription>
              {selectedLog?.webhook_name} - {selectedLog?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              {/* Status */}
              <div>
                <Label className="text-sm font-semibold">ステータス</Label>
                <div className="mt-1">{getStatusBadge(selectedLog.status)}</div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">受信日時</Label>
                  <p className="text-sm mt-1">
                    {new Date(selectedLog.received_at).toLocaleString('ja-JP')}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">処理時間</Label>
                  <p className="text-sm mt-1">
                    {selectedLog.processing_time_ms || 0} ms
                  </p>
                </div>
              </div>

              {/* Error Message */}
              {selectedLog.error_message && (
                <div>
                  <Label className="text-sm font-semibold text-red-600">エラーメッセージ</Label>
                  <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded text-sm">
                    {selectedLog.error_message}
                  </div>
                </div>
              )}

              {/* System Event ID */}
              {selectedLog.system_event_id && (
                <div>
                  <Label className="text-sm font-semibold">作成されたイベント</Label>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded block mt-1">
                    {selectedLog.system_event_id}
                  </code>
                </div>
              )}

              {/* Request Headers */}
              <div>
                <Label className="text-sm font-semibold">リクエストヘッダー</Label>
                <pre className="mt-1 p-3 bg-gray-50 border rounded text-xs overflow-x-auto">
                  {JSON.stringify(selectedLog.request_headers, null, 2)}
                </pre>
              </div>

              {/* Request Body */}
              <div>
                <Label className="text-sm font-semibold">リクエストボディ</Label>
                <pre className="mt-1 p-3 bg-gray-50 border rounded text-xs overflow-x-auto max-h-96">
                  {JSON.stringify(selectedLog.request_body, null, 2)}
                </pre>
              </div>

              {/* Source IP */}
              {selectedLog.source_ip && (
                <div>
                  <Label className="text-sm font-semibold">送信元IP</Label>
                  <p className="text-sm mt-1">{selectedLog.source_ip}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
