import { useState, useEffect } from 'react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import { Send, Copy, Loader2, CheckCircle, XCircle } from 'lucide-react'

interface Webhook {
  id: string
  name: string
  provider: string
  secret_key: string
  signature_header: string
  signature_algorithm: string
}

export function WebhookTestPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [selectedWebhook, setSelectedWebhook] = useState<string>('')
  const [payload, setPayload] = useState<string>('{\n  "test": true,\n  "message": "Hello from Webhook Test Tool"\n}')
  const [customHeaders, setCustomHeaders] = useState<string>('{}')
  const [sending, setSending] = useState(false)
  const [response, setResponse] = useState<any>(null)
  const [responseStatus, setResponseStatus] = useState<number | null>(null)

  useEffect(() => {
    loadWebhooks()
  }, [])

  const loadWebhooks = async () => {
    try {
      const { data, error } = await supabase
        .from('webhooks')
        .select('id, name, provider, secret_key, signature_header, signature_algorithm')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setWebhooks(data || [])

      if (data && data.length > 0 && !selectedWebhook) {
        setSelectedWebhook(data[0].name)
      }
    } catch (error: any) {
      console.error('Webhook読み込みエラー:', error)
      toast.error(`エラー: ${error.message}`)
    }
  }

  const getWebhookUrl = (webhookName: string) => {
    // @ts-ignore - Vite environment variable
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    return `${supabaseUrl}/functions/v1/webhook-receiver?name=${webhookName}`
  }

  const generateSignature = async (payload: string, secret: string, algorithm: string): Promise<string> => {
    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    const messageData = encoder.encode(payload)

    let hashAlgorithm = 'SHA-256'
    if (algorithm.toLowerCase().includes('sha1')) {
      hashAlgorithm = 'SHA-1'
    } else if (algorithm.toLowerCase().includes('sha512')) {
      hashAlgorithm = 'SHA-512'
    }

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: hashAlgorithm },
      false,
      ['sign']
    )

    const signature = await crypto.subtle.sign('HMAC', key, messageData)
    const hashArray = Array.from(new Uint8Array(signature))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    return hashHex
  }

  const handleSendWebhook = async () => {
    if (!selectedWebhook) {
      toast.error('Webhookを選択してください')
      return
    }

    const webhook = webhooks.find(w => w.name === selectedWebhook)
    if (!webhook) {
      toast.error('Webhookが見つかりません')
      return
    }

    // Validate JSON
    try {
      JSON.parse(payload)
    } catch {
      toast.error('ペイロードが正しいJSON形式ではありません')
      return
    }

    setSending(true)
    setResponse(null)
    setResponseStatus(null)

    try {
      // Generate signature
      const signature = await generateSignature(payload, webhook.secret_key, webhook.signature_algorithm)

      // Parse custom headers
      let headers: Record<string, string> = {}
      try {
        headers = JSON.parse(customHeaders)
      } catch {
        console.warn('Custom headers are not valid JSON, ignoring')
      }

      // Prepare headers
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers,
      }

      // Add signature header based on provider
      if (webhook.provider === 'github') {
        requestHeaders[webhook.signature_header] = `sha256=${signature}`
      } else if (webhook.provider === 'stripe') {
        // Stripe uses timestamp + signature
        const timestamp = Math.floor(Date.now() / 1000)
        requestHeaders[webhook.signature_header] = `t=${timestamp},v1=${signature}`
      } else {
        requestHeaders[webhook.signature_header] = signature
      }

      console.log('[webhook-test] Sending request:', {
        url: getWebhookUrl(webhook.name),
        headers: requestHeaders,
      })

      // Send request
      const res = await fetch(getWebhookUrl(webhook.name), {
        method: 'POST',
        headers: requestHeaders,
        body: payload,
      })

      const responseData = await res.json()
      setResponse(responseData)
      setResponseStatus(res.status)

      if (res.ok) {
        toast.success('Webhook送信成功！')
      } else {
        toast.error(`Webhook送信失敗: ${res.status}`)
      }
    } catch (error: any) {
      console.error('Webhook送信エラー:', error)
      toast.error(`エラー: ${error.message}`)
      setResponse({ error: error.message })
      setResponseStatus(500)
    } finally {
      setSending(false)
    }
  }

  const loadSamplePayload = () => {
    const webhook = webhooks.find(w => w.name === selectedWebhook)
    if (!webhook) return

    let sample = {}

    switch (webhook.provider) {
      case 'github':
        sample = {
          ref: 'refs/heads/main',
          repository: {
            full_name: 'username/repo',
          },
          commits: [
            {
              id: 'abc123',
              message: 'Test commit',
              author: { name: 'Test User' },
            },
          ],
          pusher: { name: 'Test User' },
        }
        break

      case 'stripe':
        sample = {
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_test123',
              amount: 2000,
              currency: 'jpy',
              customer: 'cus_test123',
            },
          },
        }
        break

      case 'slack':
        sample = {
          type: 'interactive_message',
          user: { id: 'U123456' },
          actions: [{ name: 'test_action', value: 'test' }],
          response_url: 'https://hooks.slack.com/test',
        }
        break

      default:
        sample = {
          test: true,
          message: 'Custom webhook test',
          timestamp: new Date().toISOString(),
        }
    }

    setPayload(JSON.stringify(sample, null, 2))
    toast.success('サンプルペイロードを読み込みました')
  }

  const copySignatureHelper = async () => {
    const webhook = webhooks.find(w => w.name === selectedWebhook)
    if (!webhook) return

    try {
      const signature = await generateSignature(payload, webhook.secret_key, webhook.signature_algorithm)
      let signatureText = signature

      if (webhook.provider === 'github') {
        signatureText = `sha256=${signature}`
      } else if (webhook.provider === 'stripe') {
        const timestamp = Math.floor(Date.now() / 1000)
        signatureText = `t=${timestamp},v1=${signature}`
      }

      navigator.clipboard.writeText(signatureText)
      toast.success('署名をクリップボードにコピーしました')
    } catch (error: any) {
      toast.error(`エラー: ${error.message}`)
    }
  }

  const currentWebhook = webhooks.find(w => w.name === selectedWebhook)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Webhook テストツール</h1>
        <p className="text-gray-600">署名付きWebhookリクエストを送信してテスト</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Request */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>リクエスト設定</CardTitle>
              <CardDescription>Webhookエンドポイントとペイロードを設定</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Webhook Selection */}
              <div>
                <Label>Webhook</Label>
                <Select value={selectedWebhook} onValueChange={setSelectedWebhook}>
                  <SelectTrigger>
                    <SelectValue placeholder="Webhookを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {webhooks.map((webhook) => (
                      <SelectItem key={webhook.name} value={webhook.name}>
                        {webhook.name} ({webhook.provider})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Webhook URL */}
              {currentWebhook && (
                <div>
                  <Label className="text-xs">エンドポイントURL</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={getWebhookUrl(currentWebhook.name)}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(getWebhookUrl(currentWebhook.name))
                        toast.success('URLをコピーしました')
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Payload */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>ペイロード（JSON）</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadSamplePayload}
                  >
                    サンプル読み込み
                  </Button>
                </div>
                <Textarea
                  value={payload}
                  onChange={(e) => setPayload(e.target.value)}
                  className="font-mono text-xs h-64"
                  placeholder='{"key": "value"}'
                />
              </div>

              {/* Custom Headers */}
              <div>
                <Label className="text-xs">カスタムヘッダー（JSON、オプション）</Label>
                <Textarea
                  value={customHeaders}
                  onChange={(e) => setCustomHeaders(e.target.value)}
                  className="font-mono text-xs h-20"
                  placeholder='{"X-Custom-Header": "value"}'
                />
              </div>

              {/* Send Button */}
              <div className="flex gap-2">
                <Button
                  onClick={handleSendWebhook}
                  disabled={sending || !selectedWebhook}
                  className="flex-1"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      送信中...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Webhook送信
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={copySignatureHelper}
                  disabled={!selectedWebhook}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  署名コピー
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Webhook Info */}
          {currentWebhook && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-sm">署名情報</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <strong>Provider:</strong> {currentWebhook.provider}
                </div>
                <div>
                  <strong>Signature Header:</strong>{' '}
                  <code className="bg-white px-1 py-0.5 rounded text-xs">
                    {currentWebhook.signature_header}
                  </code>
                </div>
                <div>
                  <strong>Algorithm:</strong>{' '}
                  <code className="bg-white px-1 py-0.5 rounded text-xs">
                    {currentWebhook.signature_algorithm}
                  </code>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  署名は自動生成され、リクエストヘッダーに追加されます
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Response */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>レスポンス</CardTitle>
                  <CardDescription>Webhookエンドポイントからのレスポンス</CardDescription>
                </div>
                {responseStatus !== null && (
                  <div className="flex items-center gap-2">
                    {responseStatus >= 200 && responseStatus < 300 ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <Badge
                      className={
                        responseStatus >= 200 && responseStatus < 300
                          ? 'bg-green-600 text-white'
                          : 'bg-red-600 text-white'
                      }
                    >
                      {responseStatus}
                    </Badge>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {response ? (
                <div>
                  <Label className="text-xs mb-2 block">レスポンスボディ</Label>
                  <pre className="p-4 bg-gray-50 border rounded text-xs overflow-x-auto max-h-[500px]">
                    {JSON.stringify(response, null, 2)}
                  </pre>

                  {response.webhook_log_id && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm font-semibold text-green-800">
                        ✅ Webhook受信成功
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Log ID: <code>{response.webhook_log_id}</code>
                      </p>
                      {response.system_event_id && (
                        <p className="text-xs text-gray-600">
                          Event ID: <code>{response.system_event_id}</code>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Send className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Webhookを送信するとレスポンスが表示されます</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="bg-purple-50 border-purple-200">
            <CardHeader>
              <CardTitle className="text-sm">💡 使い方のヒント</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <ul className="list-disc list-inside space-y-1">
                <li>「サンプル読み込み」でプロバイダー別のサンプルペイロードを取得</li>
                <li>署名は自動生成されるため、手動設定は不要</li>
                <li>「署名コピー」で署名のみをコピー可能（デバッグ用）</li>
                <li>カスタムヘッダーで追加のヘッダーを設定可能</li>
                <li>レスポンスで webhook_log_id が返却されれば成功</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
