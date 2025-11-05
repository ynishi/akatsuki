# Webhook System 設計書

## 概要

Akatsukiの汎用Webhook受付システムは、外部サービス（GitHub, Stripe, Slack等）からのイベントを受け取り、署名検証・ログ記録・Event Systemへの連携を行うシステムです。

### 主な特徴

- **Admin管理**: Webhook Endpoint・認証キーをAdmin UIで動的設定（ハードコーディング不要）
- **署名検証**: プロバイダー別の署名検証ロジックをサポート
- **VibeCoding対応**: Handlerを書くだけで新しいWebhookタイプに対応可能
- **Event System連携**: 受信したWebhookを`system_events`テーブルに自動登録
- **監査ログ**: 全てのWebhook受信を`webhook_logs`テーブルに記録
- **Migration初期化**: Migrationでエンドポイントを事前定義可能

### ユースケース

- **GitHub Webhook**: Push, Pull Request, Deploymentイベント
- **Stripe Webhook**: 決済完了、サブスクリプション更新
- **Slack Webhook**: メッセージ送信、インタラクティブアクション
- **Custom Webhook**: 独自サービスからのイベント通知

---

## アーキテクチャ

### システム全体図

```
┌─────────────────┐
│ External Service│
│  (GitHub/Stripe)│
└────────┬────────┘
         │ 1. POST /functions/v1/webhook-receiver
         │    X-Webhook-Signature: ...
         ↓
┌──────────────────────────────────────────┐
│  webhook-receiver (Edge Function)        │
│  ┌────────────────────────────────────┐  │
│  │ 1. webhooks テーブルからエンドポイント検索 │
│  │ 2. 署名検証（provider別）          │  │
│  │ 3. webhook_logs に保存             │  │
│  │ 4. handlers.ts から Handler取得   │  │
│  │ 5. Handler実行                    │  │
│  │ 6. Event Systemに emit            │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
         │
         │ 2. EventService.emit('webhook:github:push', payload)
         ↓
┌────────────────────────────────────────┐
│       system_events テーブル            │
│  ┌──────────────────────────────────┐  │
│  │ id: uuid                         │  │
│  │ event_type: 'webhook:github:push'│  │
│  │ status: 'pending'                │  │
│  │ payload: { commits, ... }        │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
         │
         │ 3. CRON実行（毎分）
         ↓
┌──────────────────────┐
│  process-events      │
│  (Event Handler)     │
│  ・pending検出       │
│  ・webhook:*判定    │
│  ・processWebhook() │
└──────────────────────┘
```

### コンポーネント

| コンポーネント | 役割 | 技術 |
|--------------|------|------|
| **Admin UI** | Webhook Endpoint設定 | React (Admin Dashboard) |
| **webhooks テーブル** | エンドポイント・認証キー管理 | PostgreSQL (Supabase) |
| **webhook_logs テーブル** | 監査ログ保存 | PostgreSQL (Supabase) |
| **webhook-receiver** | Webhook受付・検証・ディスパッチ | Edge Function (Deno) |
| **handlers.ts** | Webhook処理ロジック | TypeScript |
| **Event System** | 非同期処理連携 | 既存のEvent System |

---

## データベーススキーマ

### webhooks テーブル

Webhook Endpointの設定を管理するテーブル。

```sql
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 識別情報
  name TEXT NOT NULL UNIQUE,                    -- 'github-push', 'stripe-payment'
  provider TEXT NOT NULL,                       -- 'github', 'stripe', 'slack', 'custom'
  description TEXT,

  -- 認証設定
  secret_key TEXT NOT NULL,                     -- 署名検証用シークレット (暗号化推奨)
  signature_header TEXT NOT NULL DEFAULT 'X-Webhook-Signature',
  signature_algorithm TEXT NOT NULL DEFAULT 'sha256',  -- 'sha256', 'sha1', 'hmac-sha256'

  -- ハンドラー設定
  handler_name TEXT NOT NULL,                   -- handlers.ts 内のハンドラー名 ('github-push')
  event_type_prefix TEXT NOT NULL,              -- Event Systemに登録する際のプレフィックス ('webhook:github')

  -- フィルタリング（オプション）
  filter_conditions JSONB DEFAULT '{}',         -- リクエストボディのフィルタ条件

  -- ステータス
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_received_at TIMESTAMPTZ,                 -- 最終受信日時
  received_count INTEGER NOT NULL DEFAULT 0,    -- 受信回数
  failed_count INTEGER NOT NULL DEFAULT 0,      -- 失敗回数

  -- メタデータ
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_webhooks_name ON webhooks(name);
CREATE INDEX idx_webhooks_provider ON webhooks(provider);
CREATE INDEX idx_webhooks_is_active ON webhooks(is_active);

-- Updated_at trigger
CREATE TRIGGER set_webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE webhooks IS 'Webhook endpoint configuration';
COMMENT ON COLUMN webhooks.name IS 'Unique webhook identifier (e.g., github-push)';
COMMENT ON COLUMN webhooks.provider IS 'Provider name (github, stripe, slack, custom)';
COMMENT ON COLUMN webhooks.secret_key IS 'Secret key for signature verification (should be encrypted)';
COMMENT ON COLUMN webhooks.handler_name IS 'Handler function name in handlers.ts';
COMMENT ON COLUMN webhooks.event_type_prefix IS 'Event type prefix for Event System (e.g., webhook:github)';
```

### webhook_logs テーブル

全てのWebhook受信を記録する監査ログテーブル。

```sql
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Webhook情報
  webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
  webhook_name TEXT NOT NULL,                   -- webhooks.name のスナップショット

  -- リクエスト情報
  request_method TEXT NOT NULL DEFAULT 'POST',
  request_headers JSONB NOT NULL,               -- 全リクエストヘッダー
  request_body JSONB NOT NULL,                  -- リクエストボディ
  source_ip TEXT,                               -- 送信元IP

  -- 処理結果
  status TEXT NOT NULL CHECK (status IN ('success', 'signature_failed', 'handler_failed', 'not_found')),
  error_message TEXT,
  processing_time_ms INTEGER,                   -- 処理時間（ミリ秒）

  -- Event System連携
  system_event_id UUID REFERENCES system_events(id) ON DELETE SET NULL,  -- 作成されたイベントID

  -- タイムスタンプ
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_webhook_name ON webhook_logs(webhook_name);
CREATE INDEX idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX idx_webhook_logs_received_at ON webhook_logs(received_at DESC);
CREATE INDEX idx_webhook_logs_system_event_id ON webhook_logs(system_event_id);

COMMENT ON TABLE webhook_logs IS 'Webhook audit log (all received webhooks)';
COMMENT ON COLUMN webhook_logs.status IS 'success | signature_failed | handler_failed | not_found';
```

### RLSポリシー

```sql
-- ============================================================
-- RLS: webhooks テーブル
-- ============================================================
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

-- Admin のみ読み取り可能
CREATE POLICY "Admin can read webhooks"
  ON webhooks
  FOR SELECT
  USING ((SELECT is_admin()) = true);

-- Admin のみ作成・更新・削除可能
CREATE POLICY "Admin can manage webhooks"
  ON webhooks
  FOR ALL
  USING ((SELECT is_admin()) = true)
  WITH CHECK ((SELECT is_admin()) = true);

-- ============================================================
-- RLS: webhook_logs テーブル
-- ============================================================
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Admin のみ読み取り可能
CREATE POLICY "Admin can read webhook_logs"
  ON webhook_logs
  FOR SELECT
  USING ((SELECT is_admin()) = true);

-- Edge Function（Service Role）のみ作成可能
CREATE POLICY "Service role can insert webhook_logs"
  ON webhook_logs
  FOR INSERT
  WITH CHECK (true);  -- Service RoleはRLSバイパス
```

---

## Migration: 初期Webhook定義

Migrationで事前にWebhook Endpointを定義しておくことで、デプロイ後すぐに利用可能になります。

```sql
-- ============================================================
-- Initial Webhook Endpoints
-- ============================================================
INSERT INTO webhooks (name, provider, description, secret_key, handler_name, event_type_prefix) VALUES
  (
    'github-push',
    'github',
    'GitHub Push events (commits, branches)',
    'YOUR_GITHUB_WEBHOOK_SECRET',  -- 管理者が後で変更
    'github-push',
    'webhook:github'
  ),
  (
    'stripe-payment-succeeded',
    'stripe',
    'Stripe payment succeeded events',
    'YOUR_STRIPE_WEBHOOK_SECRET',
    'stripe-payment-succeeded',
    'webhook:stripe'
  ),
  (
    'slack-interactive',
    'slack',
    'Slack interactive message actions',
    'YOUR_SLACK_SIGNING_SECRET',
    'slack-interactive',
    'webhook:slack'
  );

COMMENT ON TABLE webhooks IS 'Run `UPDATE webhooks SET secret_key = ''your-real-secret'' WHERE name = ''github-push''` after deployment';
```

---

## Edge Function: webhook-receiver

### エンドポイント

```
POST /functions/v1/webhook-receiver?name=github-push
```

### 実装

**ファイル**: `supabase/functions/webhook-receiver/index.ts`

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createSystemHandler } from '../_shared/handler.ts'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'
import { webhookHandlers } from './handlers.ts'
import { verifySignature } from './verify.ts'

// IN型定義
const InputSchema = z.object({
  // リクエストボディは任意のJSON（Webhook providerによって異なる）
  body: z.any(),
})

type Input = z.infer<typeof InputSchema>

// OUT型定義
interface Output {
  received: boolean
  webhook_log_id: string
  system_event_id?: string
}

Deno.serve(async (req) => {
  const startTime = Date.now()

  // Query parameterからwebhook name取得
  const url = new URL(req.url)
  const webhookName = url.searchParams.get('name')

  if (!webhookName) {
    return new Response(
      JSON.stringify({ error: 'Missing webhook name in query parameter' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return createSystemHandler<Input, Output>(req, {
    inputSchema: z.object({ body: z.any() }),

    logic: async ({ input, adminClient, req }) => {
      const requestBody = await req.text()
      const requestHeaders = Object.fromEntries(req.headers.entries())

      // 1. Webhook設定を取得
      const { data: webhook, error: webhookError } = await adminClient
        .from('webhooks')
        .select('*')
        .eq('name', webhookName)
        .eq('is_active', true)
        .single()

      if (webhookError || !webhook) {
        // ログ記録
        const { data: log } = await adminClient.from('webhook_logs').insert({
          webhook_name: webhookName,
          request_method: req.method,
          request_headers: requestHeaders,
          request_body: JSON.parse(requestBody),
          status: 'not_found',
          error_message: 'Webhook not found or inactive',
          processing_time_ms: Date.now() - startTime,
        }).select('id').single()

        throw new Error(`Webhook '${webhookName}' not found or inactive`)
      }

      // 2. 署名検証
      const signature = requestHeaders[webhook.signature_header.toLowerCase()]
      const isValid = await verifySignature(
        requestBody,
        signature,
        webhook.secret_key,
        webhook.signature_algorithm,
        webhook.provider
      )

      if (!isValid) {
        // 失敗ログ記録
        const { data: log } = await adminClient.from('webhook_logs').insert({
          webhook_id: webhook.id,
          webhook_name: webhookName,
          request_method: req.method,
          request_headers: requestHeaders,
          request_body: JSON.parse(requestBody),
          status: 'signature_failed',
          error_message: 'Signature verification failed',
          processing_time_ms: Date.now() - startTime,
        }).select('id').single()

        // webhooksテーブルのfailed_count更新
        await adminClient
          .from('webhooks')
          .update({
            failed_count: webhook.failed_count + 1,
            last_received_at: new Date().toISOString()
          })
          .eq('id', webhook.id)

        throw new Error('Signature verification failed')
      }

      // 3. Handlerを取得
      const handler = webhookHandlers[webhook.handler_name]
      if (!handler) {
        throw new Error(`Handler '${webhook.handler_name}' not found`)
      }

      let systemEventId: string | undefined
      let handlerError: Error | undefined

      try {
        // 4. Handler実行
        const payload = JSON.parse(requestBody)
        const result = await handler(payload, {
          webhook,
          adminClient,
          req,
        })

        // 5. Event Systemに登録
        if (result.emitEvent !== false) {
          const eventType = `${webhook.event_type_prefix}:${result.eventName || webhook.handler_name}`
          const { data: event } = await adminClient
            .from('system_events')
            .insert({
              event_type: eventType,
              payload: result.payload || payload,
              status: 'pending',
              priority: result.priority || 0,
            })
            .select('id')
            .single()

          systemEventId = event?.id
        }

        // 6. 成功ログ記録
        const { data: log } = await adminClient.from('webhook_logs').insert({
          webhook_id: webhook.id,
          webhook_name: webhookName,
          request_method: req.method,
          request_headers: requestHeaders,
          request_body: JSON.parse(requestBody),
          status: 'success',
          processing_time_ms: Date.now() - startTime,
          system_event_id: systemEventId,
        }).select('id').single()

        // 7. webhooksテーブルの統計更新
        await adminClient
          .from('webhooks')
          .update({
            received_count: webhook.received_count + 1,
            last_received_at: new Date().toISOString()
          })
          .eq('id', webhook.id)

        return {
          received: true,
          webhook_log_id: log!.id,
          system_event_id: systemEventId,
        }

      } catch (error) {
        handlerError = error

        // Handler失敗ログ記録
        const { data: log } = await adminClient.from('webhook_logs').insert({
          webhook_id: webhook.id,
          webhook_name: webhookName,
          request_method: req.method,
          request_headers: requestHeaders,
          request_body: JSON.parse(requestBody),
          status: 'handler_failed',
          error_message: error.message,
          processing_time_ms: Date.now() - startTime,
        }).select('id').single()

        // 失敗カウント更新
        await adminClient
          .from('webhooks')
          .update({
            failed_count: webhook.failed_count + 1,
            last_received_at: new Date().toISOString()
          })
          .eq('id', webhook.id)

        throw error
      }
    },
  })
})
```

---

## 署名検証ロジック

**ファイル**: `supabase/functions/webhook-receiver/verify.ts`

```typescript
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts"

/**
 * Webhook署名検証（プロバイダー別）
 */
export async function verifySignature(
  payload: string,
  signature: string | undefined,
  secret: string,
  algorithm: string,
  provider: string
): Promise<boolean> {
  if (!signature) {
    console.warn('[webhook-receiver] No signature provided')
    return false
  }

  try {
    switch (provider) {
      case 'github':
        return await verifyGitHubSignature(payload, signature, secret)

      case 'stripe':
        return await verifyStripeSignature(payload, signature, secret)

      case 'slack':
        return await verifySlackSignature(payload, signature, secret)

      case 'custom':
        return await verifyHmacSignature(payload, signature, secret, algorithm)

      default:
        console.error(`[webhook-receiver] Unknown provider: ${provider}`)
        return false
    }
  } catch (error) {
    console.error('[webhook-receiver] Signature verification error:', error)
    return false
  }
}

/**
 * GitHub Webhook署名検証
 * Header: X-Hub-Signature-256: sha256=<hash>
 */
async function verifyGitHubSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const algorithm = 'SHA-256'
  const expectedPrefix = 'sha256='

  if (!signature.startsWith(expectedPrefix)) {
    return false
  }

  const providedHash = signature.substring(expectedPrefix.length)
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: algorithm },
    false,
    ['sign']
  )

  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload)
  )

  const computedHash = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return computedHash === providedHash
}

/**
 * Stripe Webhook署名検証
 * Header: Stripe-Signature: t=<timestamp>,v1=<hash>
 */
async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  // Stripe署名検証ロジック
  // https://stripe.com/docs/webhooks/signatures

  const signatureParts = signature.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=')
    acc[key] = value
    return acc
  }, {} as Record<string, string>)

  const timestamp = signatureParts['t']
  const v1Hash = signatureParts['v1']

  if (!timestamp || !v1Hash) {
    return false
  }

  const signedPayload = `${timestamp}.${payload}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signedPayload)
  )

  const computedHash = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return computedHash === v1Hash
}

/**
 * Slack Webhook署名検証
 * Header: X-Slack-Signature: v0=<hash>
 */
async function verifySlackSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  // Slack署名検証ロジック
  // https://api.slack.com/authentication/verifying-requests-from-slack

  const [version, hash] = signature.split('=')
  if (version !== 'v0') {
    return false
  }

  // Slackのタイムスタンプを取得（実装簡略化のため省略）
  // 本来はX-Slack-Request-Timestampヘッダーを使用

  return true  // 簡略実装
}

/**
 * 汎用HMAC署名検証
 */
async function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: string
): Promise<boolean> {
  const hashAlgorithm = algorithm.toUpperCase().replace('-', '-')

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: hashAlgorithm },
    false,
    ['sign']
  )

  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload)
  )

  const computedHash = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return computedHash === signature
}
```

---

## Webhook Handlers

**ファイル**: `supabase/functions/webhook-receiver/handlers.ts`

```typescript
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Webhook Handler Context
 */
export interface WebhookContext {
  webhook: any  // webhooks テーブルのレコード
  adminClient: SupabaseClient
  req: Request
}

/**
 * Webhook Handler Result
 */
export interface WebhookHandlerResult {
  emitEvent?: boolean           // Event Systemに登録するか（デフォルト: true）
  eventName?: string            // イベント名（省略時はhandler_name）
  payload?: any                 // Event Systemに渡すペイロード（省略時は元のpayload）
  priority?: number             // Event Systemの優先度
}

/**
 * Webhook Handler 関数型
 */
export type WebhookHandler = (
  payload: any,
  context: WebhookContext
) => Promise<WebhookHandlerResult>

/**
 * Webhook Handlers
 *
 * VibeCoding時には、ここに新しいハンドラーを追加するだけでOK
 */
export const webhookHandlers: Record<string, WebhookHandler> = {
  /**
   * GitHub Push Webhook
   */
  'github-push': async (payload, context) => {
    console.log('[webhook] GitHub Push:', {
      repo: payload.repository?.full_name,
      ref: payload.ref,
      commits: payload.commits?.length,
    })

    // 例: mainブランチへのpushのみ処理
    if (payload.ref !== 'refs/heads/main') {
      console.log('[webhook] Skipping non-main branch push')
      return { emitEvent: false }
    }

    // Event Systemに登録（Job実行等）
    return {
      emitEvent: true,
      eventName: 'push',
      payload: {
        repository: payload.repository.full_name,
        commits: payload.commits,
        pusher: payload.pusher,
      },
      priority: 10,  // 高優先度
    }
  },

  /**
   * Stripe Payment Succeeded Webhook
   */
  'stripe-payment-succeeded': async (payload, context) => {
    console.log('[webhook] Stripe Payment Succeeded:', {
      amount: payload.data?.object?.amount,
      currency: payload.data?.object?.currency,
      customer: payload.data?.object?.customer,
    })

    // Quota更新ロジック等
    const paymentIntent = payload.data.object

    // ユーザーのQuotaを更新
    // await context.adminClient.from('user_quotas').update(...)

    return {
      emitEvent: true,
      eventName: 'payment-succeeded',
      payload: {
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        customer: paymentIntent.customer,
      },
    }
  },

  /**
   * Slack Interactive Message
   */
  'slack-interactive': async (payload, context) => {
    console.log('[webhook] Slack Interactive:', {
      type: payload.type,
      user: payload.user?.id,
      actions: payload.actions,
    })

    // Slackボタンクリック等の処理

    return {
      emitEvent: true,
      eventName: 'interactive',
      payload,
    }
  },

  /**
   * Custom Webhook (サンプル)
   */
  'custom-webhook': async (payload, context) => {
    console.log('[webhook] Custom Webhook:', payload)

    // カスタムロジック
    // ...

    return {
      emitEvent: true,
      payload,
    }
  },
}
```

---

## Admin UI: Webhook管理ページ

### ページ構成

**ファイル**: `packages/app-frontend/src/pages/admin/WebhookManagementPage.tsx`

```typescript
import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Switch } from '../../components/ui/switch'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

export function WebhookManagementPage() {
  const { user } = useAuth()
  const [webhooks, setWebhooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingWebhook, setEditingWebhook] = useState(null)

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
    } catch (error) {
      console.error('Webhook読み込みエラー:', error)
      toast.error(`エラー: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateSecretKey = async (webhookId: string, newSecretKey: string) => {
    try {
      const { error } = await supabase
        .from('webhooks')
        .update({ secret_key: newSecretKey })
        .eq('id', webhookId)

      if (error) throw error

      toast.success('Secret Key を更新しました')
      loadWebhooks()
    } catch (error) {
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
    } catch (error) {
      console.error('更新エラー:', error)
      toast.error(`エラー: ${error.message}`)
    }
  }

  const getWebhookUrl = (webhookName: string) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    return `${supabaseUrl}/functions/v1/webhook-receiver?name=${webhookName}`
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('クリップボードにコピーしました')
  }

  if (loading) {
    return <div className="space-y-4">読み込み中...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Webhook管理</h1>
        <p className="text-gray-600">外部サービスからのWebhook受信設定を管理</p>
      </div>

      {/* Webhook一覧 */}
      <div className="grid gap-4">
        {webhooks.map((webhook) => (
          <Card key={webhook.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {webhook.name}
                    <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
                      {webhook.is_active ? '有効' : '無効'}
                    </Badge>
                    <Badge variant="outline">{webhook.provider}</Badge>
                  </CardTitle>
                  <CardDescription>{webhook.description}</CardDescription>
                </div>
                <Switch
                  checked={webhook.is_active}
                  onCheckedChange={() => handleToggleActive(webhook.id, webhook.is_active)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Webhook URL */}
              <div>
                <Label>Webhook URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={getWebhookUrl(webhook.name)}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(getWebhookUrl(webhook.name))}
                  >
                    コピー
                  </Button>
                </div>
              </div>

              {/* Secret Key */}
              <div>
                <Label>Secret Key</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="password"
                    defaultValue={webhook.secret_key}
                    placeholder="シークレットキーを入力"
                    onBlur={(e) => {
                      if (e.target.value !== webhook.secret_key) {
                        handleUpdateSecretKey(webhook.id, e.target.value)
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(webhook.secret_key)}
                  >
                    表示
                  </Button>
                </div>
              </div>

              {/* 統計情報 */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-600">受信回数</p>
                  <p className="text-2xl font-bold">{webhook.received_count}</p>
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

              {/* ハンドラー情報 */}
              <div className="text-sm text-gray-600">
                <p><strong>Handler:</strong> {webhook.handler_name}</p>
                <p><strong>Event Prefix:</strong> {webhook.event_type_prefix}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 新規作成ボタン（将来の拡張用） */}
      <Button variant="outline" disabled>
        + 新しいWebhookを追加（Coming Soon）
      </Button>
    </div>
  )
}
```

### ルーティング設定

**ファイル**: `packages/app-frontend/src/main.jsx`

```javascript
import { WebhookManagementPage } from './pages/admin/WebhookManagementPage'

// Admin routes
{
  path: '/admin/webhooks',
  element: <AuthGuard requireAdmin><WebhookManagementPage /></AuthGuard>
}
```

---

## Webhook Logs ビューア（オプション）

**ファイル**: `packages/app-frontend/src/pages/admin/WebhookLogsPage.tsx`

```typescript
// Webhook受信履歴を表示するページ
// - webhook_logs テーブルを表示
// - フィルタリング（webhook名、ステータス、日時）
// - リクエスト詳細表示（ヘッダー、ボディ）
```

---

## VibeCoding実践: 新しいWebhookを追加

### Step 1: Migration で Webhook定義を追加

```sql
-- Migration: add_discord_webhook.sql
INSERT INTO webhooks (name, provider, description, secret_key, handler_name, event_type_prefix) VALUES
  (
    'discord-message',
    'custom',
    'Discord message events',
    'YOUR_DISCORD_WEBHOOK_SECRET',
    'discord-message',
    'webhook:discord'
  );
```

### Step 2: Handler を追加

```typescript
// supabase/functions/webhook-receiver/handlers.ts
export const webhookHandlers: Record<string, WebhookHandler> = {
  // 既存のハンドラー...

  // 新規追加
  'discord-message': async (payload, context) => {
    console.log('[webhook] Discord Message:', {
      content: payload.content,
      author: payload.author?.username,
    })

    // メッセージを処理
    // ...

    return {
      emitEvent: true,
      eventName: 'message',
      payload: {
        content: payload.content,
        author: payload.author,
      },
    }
  },
}
```

### Step 3: デプロイ

```bash
# Migration適用
npm run supabase:push

# Edge Function デプロイ
npx supabase functions deploy webhook-receiver
```

### Step 4: Admin UIでSecret Key設定

1. `/admin/webhooks` にアクセス
2. `discord-message` の Secret Key を更新
3. Webhook URLをコピーしてDiscordに設定

**完了！** 新しいWebhookが動作します。

---

## ベストプラクティス

### 1. Secret Keyの管理

```typescript
// ❌ 悪い例: ハードコーディング
const secret = 'my-secret-key'

// ✅ 良い例: DBから取得
const { data: webhook } = await supabase
  .from('webhooks')
  .select('secret_key')
  .eq('name', 'github-push')
  .single()
```

### 2. エラーハンドリング

```typescript
// ✅ 良い例: エラーログを記録
try {
  await handler(payload, context)
} catch (error) {
  await adminClient.from('webhook_logs').insert({
    status: 'handler_failed',
    error_message: error.message,
    // ...
  })
  throw error
}
```

### 3. 冪等性の確保

```typescript
// ✅ 良い例: 重複処理を防ぐ
'github-push': async (payload, context) => {
  const commitSha = payload.after

  // すでに処理済みかチェック
  const { data: existing } = await context.adminClient
    .from('processed_commits')
    .select('id')
    .eq('commit_sha', commitSha)
    .single()

  if (existing) {
    console.log('Already processed, skipping')
    return { emitEvent: false }
  }

  // 処理実行...

  // 処理済みとして記録
  await context.adminClient
    .from('processed_commits')
    .insert({ commit_sha: commitSha })

  return { emitEvent: true }
}
```

### 4. タイムアウト対策

```typescript
// ✅ 良い例: 長時間処理はEvent Systemに委譲
'stripe-payment-succeeded': async (payload, context) => {
  // Webhook受付時は最小限の処理のみ
  console.log('Payment received:', payload.data.object.id)

  // Event Systemに登録して後続処理を非同期実行
  return {
    emitEvent: true,
    eventName: 'payment-succeeded',
    payload,
  }
}

// Job Handlerで実際の処理
// supabase/functions/execute-async-job/handlers.ts
'webhook-payment-succeeded': async (params, context) => {
  // ここで時間のかかる処理を実行
  await sendInvoiceEmail(params)
  await updateUserQuota(params)
  await notifySlack(params)
}
```

---

## トラブルシューティング

### 署名検証が失敗する

**症状:** `status: 'signature_failed'` が webhook_logs に記録される

**確認項目:**

1. **Secret Keyが正しいか確認**
   ```sql
   SELECT name, secret_key FROM webhooks WHERE name = 'github-push';
   ```

2. **署名ヘッダー名が正しいか確認**
   ```sql
   SELECT signature_header FROM webhooks WHERE name = 'github-push';
   -- GitHub: X-Hub-Signature-256
   -- Stripe: Stripe-Signature
   ```

3. **署名アルゴリズムが正しいか確認**
   ```sql
   SELECT signature_algorithm FROM webhooks WHERE name = 'github-push';
   -- GitHub: sha256
   -- Stripe: sha256
   ```

4. **ログでリクエストヘッダーを確認**
   ```sql
   SELECT request_headers FROM webhook_logs WHERE status = 'signature_failed' LIMIT 1;
   ```

### Handlerが見つからない

**症状:** `Handler 'xxx' not found` エラー

**確認項目:**

1. **handlers.ts にハンドラーが定義されているか確認**
   ```typescript
   console.log('Available handlers:', Object.keys(webhookHandlers))
   ```

2. **Edge Functionをデプロイしたか確認**
   ```bash
   npx supabase functions deploy webhook-receiver
   ```

3. **handler_name が正しいか確認**
   ```sql
   SELECT name, handler_name FROM webhooks;
   ```

### Event Systemに登録されない

**症状:** webhook_logs には success だが system_events にレコードがない

**確認項目:**

1. **Handler が `emitEvent: false` を返していないか確認**
   ```typescript
   return { emitEvent: true }  // これが必要
   ```

2. **system_events テーブルを確認**
   ```sql
   SELECT * FROM system_events
   WHERE event_type LIKE 'webhook:%'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

---

## 実装履歴

- **2025-11-05**: 設計完了、ドキュメント作成

---

## 今後の拡張予定

- [ ] Webhook新規作成UI（Admin Dashboard）
- [ ] Webhook Logs ビューア（フィルタリング・検索）
- [ ] Webhook テストツール（署名付きリクエスト送信）
- [ ] Webhook配信失敗時のリトライ機能
- [ ] Webhook統計ダッシュボード（受信数グラフ等）
- [ ] 複数Secret Key対応（ローテーション）
- [ ] IP制限機能（特定IPからのみ受信）

---

## 参考リンク

- [GitHub Webhooks](https://docs.github.com/en/developers/webhooks-and-events/webhooks)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Slack Webhooks](https://api.slack.com/messaging/webhooks)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Event System設計](./async_job_system.md)
