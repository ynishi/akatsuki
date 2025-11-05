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
import { RefreshCw, Eye, X, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface FunctionCallLog {
  id: string
  llm_call_log_id: string | null
  user_id: string | null
  function_name: string
  function_arguments: Record<string, any>
  execution_type: 'sync' | 'async'
  status: 'pending' | 'executing' | 'success' | 'failed'
  result: any
  error_message: string | null
  system_event_id: string | null
  execution_time_ms: number | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export function FunctionCallLogsPage() {
  const [logs, setLogs] = useState<FunctionCallLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<FunctionCallLog | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Filters
  const [functionNameFilter, setFunctionNameFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [executionTypeFilter, setExecutionTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [limit, setLimit] = useState<number>(50)

  // Available function names for filter
  const [functionNames, setFunctionNames] = useState<string[]>([])

  useEffect(() => {
    loadLogs()
    loadFunctionNames()
  }, [functionNameFilter, statusFilter, executionTypeFilter, limit])

  const loadLogs = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('function_call_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (functionNameFilter !== 'all') {
        query = query.eq('function_name', functionNameFilter)
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      if (executionTypeFilter !== 'all') {
        query = query.eq('execution_type', executionTypeFilter)
      }

      const { data, error } = await query

      if (error) throw error
      setLogs(data || [])
    } catch (error: any) {
      console.error('Function Call Logs読み込みエラー:', error)
      toast.error(`エラー: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const loadFunctionNames = async () => {
    try {
      const { data, error } = await supabase
        .from('function_call_logs')
        .select('function_name')
        .order('function_name')

      if (error) throw error

      // Unique function names
      const names = Array.from(new Set(data?.map(l => l.function_name) || []))
      setFunctionNames(names)
    } catch (error: any) {
      console.error('Function名読み込みエラー:', error)
    }
  }

  const handleShowDetail = (log: FunctionCallLog) => {
    setSelectedLog(log)
    setShowDetailModal(true)
  }

  const getStatusBadge = (status: FunctionCallLog['status']) => {
    switch (status) {
      case 'success':
        return (
          <Badge className="bg-green-600 text-white">
            <CheckCircle className="w-3 h-3 mr-1" />
            Success
          </Badge>
        )
      case 'failed':
        return (
          <Badge className="bg-red-600 text-white">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        )
      case 'executing':
        return (
          <Badge className="bg-blue-600 text-white">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Executing
          </Badge>
        )
      case 'pending':
        return (
          <Badge className="bg-gray-600 text-white">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getExecutionTypeBadge = (type: FunctionCallLog['execution_type']) => {
    switch (type) {
      case 'sync':
        return <Badge variant="outline" className="bg-blue-50">Sync</Badge>
      case 'async':
        return <Badge variant="outline" className="bg-purple-50">Async</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const clearFilters = () => {
    setFunctionNameFilter('all')
    setStatusFilter('all')
    setExecutionTypeFilter('all')
    setSearchQuery('')
  }

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      log.function_name.toLowerCase().includes(query) ||
      log.id.toLowerCase().includes(query) ||
      log.error_message?.toLowerCase().includes(query) ||
      JSON.stringify(log.function_arguments).toLowerCase().includes(query) ||
      JSON.stringify(log.result).toLowerCase().includes(query)
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
          <h1 className="text-3xl font-bold">Function Call ログ</h1>
          <p className="text-gray-600">LLMによるFunction Call実行履歴を確認</p>
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Function Name Filter */}
            <div>
              <Label className="text-xs">Function</Label>
              <Select value={functionNameFilter} onValueChange={setFunctionNameFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="全て" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全て</SelectItem>
                  {functionNames.map(name => (
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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="executing">Executing</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Execution Type Filter */}
            <div>
              <Label className="text-xs">実行タイプ</Label>
              <Select value={executionTypeFilter} onValueChange={setExecutionTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="全て" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全て</SelectItem>
                  <SelectItem value="sync">Sync</SelectItem>
                  <SelectItem value="async">Async</SelectItem>
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
                placeholder="ID, Function名, エラー..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">総実行数</p>
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
              {filteredLogs.filter(l => l.status === 'failed').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">実行中</p>
            <p className="text-3xl font-bold text-blue-600">
              {filteredLogs.filter(l => l.status === 'executing' || l.status === 'pending').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">平均実行時間</p>
            <p className="text-3xl font-bold text-purple-600">
              {Math.round(
                filteredLogs
                  .filter(l => l.execution_time_ms)
                  .reduce((sum, l) => sum + (l.execution_time_ms || 0), 0) /
                  filteredLogs.filter(l => l.execution_time_ms).length || 0
              )}
              <span className="text-sm text-gray-500 ml-1">ms</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>実行ログ一覧</CardTitle>
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
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono font-semibold">
                      {log.function_name}
                    </code>
                    {getStatusBadge(log.status)}
                    {getExecutionTypeBadge(log.execution_type)}
                    {log.system_event_id && (
                      <Badge variant="outline" className="text-xs">
                        Job: {log.system_event_id.substring(0, 8)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    {log.execution_time_ms && (
                      <span className="font-mono">{log.execution_time_ms}ms</span>
                    )}
                    <span>{new Date(log.created_at).toLocaleString('ja-JP')}</span>
                  </div>
                </div>

                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">ID:</span>
                    <code className="text-xs bg-gray-100 px-1 rounded">
                      {log.id.substring(0, 8)}...
                    </code>
                  </div>

                  {log.llm_call_log_id && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">LLM Call:</span>
                      <code className="text-xs bg-blue-50 px-1 rounded">
                        {log.llm_call_log_id.substring(0, 8)}...
                      </code>
                    </div>
                  )}

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
            <DialogTitle>Function Call ログ詳細</DialogTitle>
            <DialogDescription>
              {selectedLog?.function_name} - {selectedLog?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              {/* Status & Type */}
              <div className="flex gap-4">
                <div>
                  <Label className="text-sm font-semibold">ステータス</Label>
                  <div className="mt-1">{getStatusBadge(selectedLog.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-semibold">実行タイプ</Label>
                  <div className="mt-1">{getExecutionTypeBadge(selectedLog.execution_type)}</div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">作成日時</Label>
                  <p className="text-sm mt-1">
                    {new Date(selectedLog.created_at).toLocaleString('ja-JP')}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">実行時間</Label>
                  <p className="text-sm mt-1">
                    {selectedLog.execution_time_ms || 0} ms
                  </p>
                </div>
              </div>

              {selectedLog.started_at && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold">開始時刻</Label>
                    <p className="text-sm mt-1">
                      {new Date(selectedLog.started_at).toLocaleString('ja-JP')}
                    </p>
                  </div>
                  {selectedLog.completed_at && (
                    <div>
                      <Label className="text-sm font-semibold">完了時刻</Label>
                      <p className="text-sm mt-1">
                        {new Date(selectedLog.completed_at).toLocaleString('ja-JP')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* LLM Call Link */}
              {selectedLog.llm_call_log_id && (
                <div>
                  <Label className="text-sm font-semibold">関連LLM Call</Label>
                  <code className="text-xs bg-blue-50 px-2 py-1 rounded block mt-1">
                    {selectedLog.llm_call_log_id}
                  </code>
                </div>
              )}

              {/* System Event Link */}
              {selectedLog.system_event_id && (
                <div>
                  <Label className="text-sm font-semibold">作成されたJob Event</Label>
                  <code className="text-xs bg-purple-50 px-2 py-1 rounded block mt-1">
                    {selectedLog.system_event_id}
                  </code>
                </div>
              )}

              {/* Error Message */}
              {selectedLog.error_message && (
                <div>
                  <Label className="text-sm font-semibold text-red-600">エラーメッセージ</Label>
                  <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded text-sm">
                    {selectedLog.error_message}
                  </div>
                </div>
              )}

              {/* Function Arguments */}
              <div>
                <Label className="text-sm font-semibold">Function Arguments</Label>
                <pre className="mt-1 p-3 bg-gray-50 border rounded text-xs overflow-x-auto">
                  {JSON.stringify(selectedLog.function_arguments, null, 2)}
                </pre>
              </div>

              {/* Result */}
              {selectedLog.result && (
                <div>
                  <Label className="text-sm font-semibold">Result</Label>
                  <pre className="mt-1 p-3 bg-gray-50 border rounded text-xs overflow-x-auto max-h-96">
                    {JSON.stringify(selectedLog.result, null, 2)}
                  </pre>
                </div>
              )}

              {/* User ID */}
              {selectedLog.user_id && (
                <div>
                  <Label className="text-sm font-semibold">User ID</Label>
                  <p className="text-sm mt-1 font-mono">{selectedLog.user_id}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm">💡 Function Call システムについて</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Function Callは、LLM（OpenAI/Anthropic/Gemini）がシステムの機能を自律的に呼び出せる仕組みです。
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
            <li><strong>Sync実行:</strong> 即座に実行され、結果がLLMに返されます（例: query_database）</li>
            <li><strong>Async実行:</strong> Job Systemで非同期実行され、Job IDが返されます（例: generate_image）</li>
            <li><strong>監査ログ:</strong> 全ての実行が記録され、エラー追跡やデバッグに利用できます</li>
            <li><strong>LLM連携:</strong> llm_call_logs と紐付いており、会話の文脈を追跡できます</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
