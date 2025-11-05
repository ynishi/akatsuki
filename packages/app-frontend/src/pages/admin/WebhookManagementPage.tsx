import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Switch } from '../../components/ui/switch'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import { Eye, EyeOff, Copy, RefreshCw, FileText, TestTube } from 'lucide-react'

interface Webhook {
  id: string
  name: string
  provider: string
  description: string
  secret_key: string
  signature_header: string
  signature_algorithm: string
  handler_name: string
  event_type_prefix: string
  is_active: boolean
  received_count: number
  failed_count: number
  last_received_at: string | null
  created_at: string
  updated_at: string
}

export function WebhookManagementPage() {
  const navigate = useNavigate()
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadWebhooks()
  }, [])

  const loadWebhooks = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setWebhooks(data || [])
    } catch (error: any) {
      console.error('Webhook読み込みエラー:', error)
      toast.error(`エラー: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateSecretKey = async (webhookId: string, newSecretKey: string) => {
    if (!newSecretKey.trim()) {
      toast.error('Secret Keyを入力してください')
      return
    }

    try {
      const { error } = await supabase
        .from('webhooks')
        .update({ secret_key: newSecretKey })
        .eq('id', webhookId)

      if (error) throw error

      toast.success('Secret Key を更新しました')
      loadWebhooks()
    } catch (error: any) {
      console.error('更新エラー:', error)
      toast.error(`エラー: ${error.message}`)
    }
  }

  const handleToggleActive = async (webhookId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('webhooks')
        .update({ is_active: !currentStatus })
        .eq('id', webhookId)

      if (error) throw error

      toast.success(currentStatus ? '無効化しました' : '有効化しました')
      loadWebhooks()
    } catch (error: any) {
      console.error('更新エラー:', error)
      toast.error(`エラー: ${error.message}`)
    }
  }

  const getWebhookUrl = (webhookName: string) => {
    // @ts-ignore - Vite environment variable
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    return `${supabaseUrl}/functions/v1/webhook-receiver?name=${webhookName}`
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('クリップボードにコピーしました')
  }

  const toggleSecretVisibility = (webhookId: string) => {
    setVisibleSecrets(prev => ({ ...prev, [webhookId]: !prev[webhookId] }))
  }

  const getProviderBadgeColor = (provider: string) => {
    switch (provider) {
      case 'github':
        return 'bg-gray-800 text-white'
      case 'stripe':
        return 'bg-purple-600 text-white'
      case 'slack':
        return 'bg-green-600 text-white'
      default:
        return 'bg-blue-600 text-white'
    }
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
          <h1 className="text-3xl font-bold">Webhook管理</h1>
          <p className="text-gray-600">外部サービスからのWebhook受信設定を管理</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/webhooks/logs')}>
            <FileText className="w-4 h-4 mr-2" />
            受信ログ
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/webhooks/test')}>
            <TestTube className="w-4 h-4 mr-2" />
            テストツール
          </Button>
        </div>
      </div>

      {/* Webhooks List */}
      <div className="grid gap-4">
        {webhooks.map((webhook) => (
          <Card key={webhook.id} className={!webhook.is_active ? 'opacity-60' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle>{webhook.name}</CardTitle>
                  <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
                    {webhook.is_active ? '有効' : '無効'}
                  </Badge>
                  <Badge className={getProviderBadgeColor(webhook.provider)}>
                    {webhook.provider}
                  </Badge>
                </div>
                <Switch
                  checked={webhook.is_active}
                  onCheckedChange={() => handleToggleActive(webhook.id, webhook.is_active)}
                />
              </div>
              <CardDescription>{webhook.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Webhook URL */}
              <div>
                <Label className="text-sm font-semibold">Webhook URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={getWebhookUrl(webhook.name)}
                    readOnly
                    className="font-mono text-xs bg-gray-50"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(getWebhookUrl(webhook.name))}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Secret Key */}
              <div>
                <Label className="text-sm font-semibold">Secret Key</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type={visibleSecrets[webhook.id] ? 'text' : 'password'}
                    defaultValue={webhook.secret_key}
                    placeholder="シークレットキーを入力"
                    className="font-mono text-sm"
                    onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                      if (e.target.value !== webhook.secret_key) {
                        handleUpdateSecretKey(webhook.id, e.target.value)
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleSecretVisibility(webhook.id)}
                  >
                    {visibleSecrets[webhook.id] ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(webhook.secret_key)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                {webhook.secret_key === 'CHANGE_ME_AFTER_DEPLOYMENT' && (
                  <p className="text-xs text-orange-600 mt-1">
                    ⚠️ デフォルト値です。実際のシークレットキーに変更してください
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-600">受信回数</p>
                  <p className="text-2xl font-bold text-green-600">{webhook.received_count}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">失敗回数</p>
                  <p className="text-2xl font-bold text-red-600">{webhook.failed_count}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">最終受信</p>
                  <p className="text-sm">
                    {webhook.last_received_at
                      ? new Date(webhook.last_received_at).toLocaleString('ja-JP')
                      : '未受信'
                    }
                  </p>
                </div>
              </div>

              {/* Technical Details */}
              <div className="text-xs text-gray-600 space-y-1 pt-4 border-t">
                <p><strong>Handler:</strong> <code className="bg-gray-100 px-1 py-0.5 rounded">{webhook.handler_name}</code></p>
                <p><strong>Event Prefix:</strong> <code className="bg-gray-100 px-1 py-0.5 rounded">{webhook.event_type_prefix}</code></p>
                <p><strong>Signature Header:</strong> <code className="bg-gray-100 px-1 py-0.5 rounded">{webhook.signature_header}</code></p>
                <p><strong>Algorithm:</strong> <code className="bg-gray-100 px-1 py-0.5 rounded">{webhook.signature_algorithm}</code></p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {webhooks.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <p>Webhookが登録されていません</p>
            <p className="text-sm mt-2">Migrationで初期Webhookを作成してください</p>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm">💡 使い方</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ol className="list-decimal list-inside space-y-1">
            <li>各WebhookのSecret Keyを更新してください（デフォルト値から変更）</li>
            <li>Webhook URLをコピーして外部サービスに設定してください</li>
            <li>外部サービスからWebhookを送信してテストしてください</li>
            <li>受信回数・失敗回数を確認して正常動作を確認してください</li>
          </ol>
          <p className="text-xs text-gray-600 mt-4">
            新しいWebhookを追加する場合は、Migrationで定義を追加し、<code className="bg-white px-1 py-0.5 rounded">handlers.ts</code>にハンドラーを実装してください。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
