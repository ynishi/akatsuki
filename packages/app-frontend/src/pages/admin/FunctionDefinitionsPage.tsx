import { useState, useEffect } from 'react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Switch } from '../../components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import { RefreshCw, Plus, Edit, Trash2, Eye, PlayCircle } from 'lucide-react'

interface FunctionDefinition {
  id: string
  user_id: string | null
  name: string
  description: string
  parameters_schema: Record<string, any>
  target_event_type: string
  is_enabled: boolean
  is_global: boolean
  created_at: string
  updated_at: string
}

export function FunctionDefinitionsPage() {
  const [functions, setFunctions] = useState<FunctionDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedFunction, setSelectedFunction] = useState<FunctionDefinition | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formSchema, setFormSchema] = useState('{\n  "type": "object",\n  "properties": {},\n  "required": []\n}')
  const [formEventType, setFormEventType] = useState('job:')
  const [formEnabled, setFormEnabled] = useState(true)
  const [formGlobal, setFormGlobal] = useState(false)

  useEffect(() => {
    loadFunctions()
  }, [])

  const loadFunctions = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('function_call_definitions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setFunctions(data || [])
    } catch (error: any) {
      console.error('Function定義読み込みエラー:', error)
      toast.error(`エラー: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormName('')
    setFormDescription('')
    setFormSchema('{\n  "type": "object",\n  "properties": {},\n  "required": []\n}')
    setFormEventType('job:')
    setFormEnabled(true)
    setFormGlobal(false)
  }

  const handleCreate = async () => {
    try {
      // Validate JSON Schema
      const schema = JSON.parse(formSchema)

      const { error } = await supabase
        .from('function_call_definitions')
        .insert({
          name: formName,
          description: formDescription,
          parameters_schema: schema,
          target_event_type: formEventType,
          is_enabled: formEnabled,
          is_global: formGlobal,
        })

      if (error) throw error

      toast.success('Function定義を作成しました')
      setShowCreateModal(false)
      resetForm()
      loadFunctions()
    } catch (error: any) {
      console.error('作成エラー:', error)
      toast.error(`エラー: ${error.message}`)
    }
  }

  const handleEdit = async () => {
    if (!selectedFunction) return

    try {
      // Validate JSON Schema
      const schema = JSON.parse(formSchema)

      const { error } = await supabase
        .from('function_call_definitions')
        .update({
          name: formName,
          description: formDescription,
          parameters_schema: schema,
          target_event_type: formEventType,
          is_enabled: formEnabled,
          is_global: formGlobal,
        })
        .eq('id', selectedFunction.id)

      if (error) throw error

      toast.success('Function定義を更新しました')
      setShowEditModal(false)
      setSelectedFunction(null)
      resetForm()
      loadFunctions()
    } catch (error: any) {
      console.error('更新エラー:', error)
      toast.error(`エラー: ${error.message}`)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Function定義 "${name}" を削除しますか？`)) return

    try {
      const { error } = await supabase
        .from('function_call_definitions')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Function定義を削除しました')
      loadFunctions()
    } catch (error: any) {
      console.error('削除エラー:', error)
      toast.error(`エラー: ${error.message}`)
    }
  }

  const openCreateModal = () => {
    resetForm()
    setShowCreateModal(true)
  }

  const openEditModal = (func: FunctionDefinition) => {
    setSelectedFunction(func)
    setFormName(func.name)
    setFormDescription(func.description)
    setFormSchema(JSON.stringify(func.parameters_schema, null, 2))
    setFormEventType(func.target_event_type)
    setFormEnabled(func.is_enabled)
    setFormGlobal(func.is_global)
    setShowEditModal(true)
  }

  const openDetailModal = (func: FunctionDefinition) => {
    setSelectedFunction(func)
    setShowDetailModal(true)
  }

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
          <h1 className="text-3xl font-bold">Function 定義管理</h1>
          <p className="text-gray-600">LLM Function Callingのスキーマ定義を管理</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadFunctions} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            再読み込み
          </Button>
          <Button onClick={openCreateModal} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            新規作成
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm">💡 Function Call システムについて</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Function定義は、LLMに注入されるスキーマです。実際の実行ロジックは別途実装します。
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
            <li><strong>target_event_type:</strong> system_eventsに登録されるイベント種別（例: job:send_webhook）</li>
            <li><strong>parameters_schema:</strong> JSON Schema形式でパラメータを定義</li>
            <li><strong>is_global:</strong> 全ユーザーで利用可能にする場合はON</li>
            <li><strong>実行ロジック:</strong> Job Handler / Webhook (Out) / 独自実装で処理</li>
          </ul>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">総定義数</p>
            <p className="text-3xl font-bold">{functions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">有効</p>
            <p className="text-3xl font-bold text-green-600">
              {functions.filter(f => f.is_enabled).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">グローバル</p>
            <p className="text-3xl font-bold text-blue-600">
              {functions.filter(f => f.is_global).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">無効</p>
            <p className="text-3xl font-bold text-gray-600">
              {functions.filter(f => !f.is_enabled).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Functions List */}
      <Card>
        <CardHeader>
          <CardTitle>Function定義一覧</CardTitle>
          <CardDescription>{functions.length}件の定義</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {functions.map((func) => (
              <div
                key={func.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <code className="text-lg bg-gray-100 px-3 py-1 rounded font-mono font-semibold">
                      {func.name}
                    </code>
                    {func.is_enabled ? (
                      <Badge className="bg-green-600 text-white">有効</Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500">無効</Badge>
                    )}
                    {func.is_global && (
                      <Badge className="bg-blue-600 text-white">Global</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDetailModal(func)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(func)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(func.id, func.name)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-2">{func.description}</p>

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <PlayCircle className="w-3 h-3" />
                    {func.target_event_type}
                  </span>
                  <span>作成: {new Date(func.created_at).toLocaleString('ja-JP')}</span>
                </div>
              </div>
            ))}

            {functions.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p>Function定義がありません</p>
                <p className="text-sm mt-2">「新規作成」ボタンから追加してください</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Function定義 新規作成</DialogTitle>
            <DialogDescription>
              LLMが呼び出せるFunction定義を作成します
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Function名 *</Label>
              <Input
                placeholder="send_webhook"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                英数字とアンダースコアのみ（例: send_webhook, query_database）
              </p>
            </div>

            <div>
              <Label>説明 *</Label>
              <Textarea
                placeholder="Send HTTP webhook to an external service"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div>
              <Label>Parameters Schema (JSON Schema) *</Label>
              <Textarea
                placeholder='{"type": "object", "properties": {...}}'
                value={formSchema}
                onChange={(e) => setFormSchema(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                JSON Schema形式でパラメータを定義
              </p>
            </div>

            <div>
              <Label>Target Event Type *</Label>
              <Input
                placeholder="job:send_webhook"
                value={formEventType}
                onChange={(e) => setFormEventType(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                system_eventsに登録されるイベント種別（例: job:send_webhook）
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formEnabled}
                  onCheckedChange={setFormEnabled}
                />
                <Label>有効</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formGlobal}
                  onCheckedChange={setFormGlobal}
                />
                <Label>グローバル（全ユーザー利用可能）</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              キャンセル
            </Button>
            <Button onClick={handleCreate}>作成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Function定義 編集</DialogTitle>
            <DialogDescription>
              {selectedFunction?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Function名 *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div>
              <Label>説明 *</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div>
              <Label>Parameters Schema (JSON Schema) *</Label>
              <Textarea
                value={formSchema}
                onChange={(e) => setFormSchema(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            <div>
              <Label>Target Event Type *</Label>
              <Input
                value={formEventType}
                onChange={(e) => setFormEventType(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formEnabled}
                  onCheckedChange={setFormEnabled}
                />
                <Label>有効</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formGlobal}
                  onCheckedChange={setFormGlobal}
                />
                <Label>グローバル</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              キャンセル
            </Button>
            <Button onClick={handleEdit}>更新</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Function定義 詳細</DialogTitle>
            <DialogDescription>
              {selectedFunction?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedFunction && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold">Function名</Label>
                <code className="block mt-1 p-2 bg-gray-100 rounded">
                  {selectedFunction.name}
                </code>
              </div>

              <div>
                <Label className="text-sm font-semibold">説明</Label>
                <p className="text-sm mt-1">{selectedFunction.description}</p>
              </div>

              <div>
                <Label className="text-sm font-semibold">Target Event Type</Label>
                <code className="block mt-1 p-2 bg-gray-100 rounded">
                  {selectedFunction.target_event_type}
                </code>
              </div>

              <div>
                <Label className="text-sm font-semibold">Parameters Schema</Label>
                <pre className="mt-1 p-3 bg-gray-50 border rounded text-xs overflow-x-auto">
                  {JSON.stringify(selectedFunction.parameters_schema, null, 2)}
                </pre>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">ステータス</Label>
                  <p className="text-sm mt-1">
                    {selectedFunction.is_enabled ? (
                      <Badge className="bg-green-600 text-white">有効</Badge>
                    ) : (
                      <Badge variant="outline">無効</Badge>
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">スコープ</Label>
                  <p className="text-sm mt-1">
                    {selectedFunction.is_global ? (
                      <Badge className="bg-blue-600 text-white">Global</Badge>
                    ) : (
                      <Badge variant="outline">User</Badge>
                    )}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">作成日時</Label>
                  <p className="text-sm mt-1">
                    {new Date(selectedFunction.created_at).toLocaleString('ja-JP')}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">更新日時</Label>
                  <p className="text-sm mt-1">
                    {new Date(selectedFunction.updated_at).toLocaleString('ja-JP')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
