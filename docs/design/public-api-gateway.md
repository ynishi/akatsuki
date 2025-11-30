# Public API Gateway 設計書

## 1. 概要

HEADLESS API Generatorで生成したCRUD APIを、API Key認証で外部公開するためのGateway機能。

**ユースケース:**
- VibeCodingで作ったAPIを外部サービスに公開
- モバイルアプリ向けAPI提供
- サードパーティ連携

**設計方針:**
- Supabase Edge Functionsのみで完結（Shuttle不要）
- 既存の`cdn-gateway`パターンを踏襲
- Cold Start問題は「Buzzったら自前実装」で割り切り

---

## 2. アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│  External Client                                            │
│  - Mobile App / Third-party Service                         │
│  - Header: X-API-Key: ak_xxxxxxxxxxxxxxxx                   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  api-gateway (Edge Function)                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. X-API-Key 検証                                    │   │
│  │ 2. api_keys テーブル照合                             │   │
│  │ 3. Rate Limit チェック                               │   │
│  │ 4. Permission チェック (allowed_operations)          │   │
│  │ 5. → 対象 {entity}-crud へ Proxy                    │   │
│  │ 6. 統計更新 (non-blocking)                          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  {entity}-crud (Edge Function)                              │
│  - createAkatsukiHandler (既存)                             │
│  - service_role 認証でDB操作                                │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase Database                                          │
│  - RLS: service_role はバイパス                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. データベース設計

### 3.1 api_keys テーブル

```sql
CREATE TABLE api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 識別子
  name text NOT NULL,                    -- API Key名 (管理用)
  description text,                      -- 説明
  key_prefix text NOT NULL,              -- プレフィックス (ak_xxxxxx) 表示用
  key_hash text NOT NULL UNIQUE,         -- SHA-256ハッシュ (検証用)

  -- 対象エンティティ
  entity_name text NOT NULL,             -- 対象Entity (e.g., "Article")
  table_name text NOT NULL,              -- 対象テーブル (e.g., "articles")

  -- 権限
  allowed_operations text[] NOT NULL     -- 許可操作 ['list', 'get', 'create', 'update', 'delete']
    DEFAULT ARRAY['list', 'get'],

  -- Rate Limiting
  rate_limit_per_minute integer DEFAULT 60,
  rate_limit_per_day integer DEFAULT 10000,

  -- 統計
  request_count bigint DEFAULT 0 NOT NULL,
  last_used_at timestamptz,

  -- 状態管理
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz,                -- NULL = 無期限
  is_active boolean DEFAULT true NOT NULL,

  -- インデックス用
  CONSTRAINT valid_key_prefix CHECK (key_prefix ~ '^ak_[a-zA-Z0-9]{6}$')
);

-- Indexes
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_owner ON api_keys(owner_id);
CREATE INDEX idx_api_keys_entity ON api_keys(entity_name);
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own API keys"
  ON api_keys FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own API keys"
  ON api_keys FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own API keys"
  ON api_keys FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own API keys"
  ON api_keys FOR DELETE
  USING (auth.uid() = owner_id);
```

### 3.2 api_key_usage テーブル (Rate Limit用)

```sql
CREATE TABLE api_key_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,

  -- 時間枠
  window_start timestamptz NOT NULL,
  window_type text NOT NULL CHECK (window_type IN ('minute', 'day')),

  -- カウント
  request_count integer DEFAULT 0 NOT NULL,

  UNIQUE (api_key_id, window_start, window_type)
);

CREATE INDEX idx_api_key_usage_lookup
  ON api_key_usage(api_key_id, window_type, window_start);

-- 古いレコードを自動削除 (pg_cron等で実行)
CREATE OR REPLACE FUNCTION cleanup_old_api_key_usage()
RETURNS void AS $$
BEGIN
  DELETE FROM api_key_usage
  WHERE window_start < now() - interval '2 days';
END;
$$ LANGUAGE plpgsql;
```

---

## 4. API Key フォーマット

```
ak_xxxxxx_yyyyyyyyyyyyyyyyyyyyyyyyyyyy
│  │       │
│  │       └── ランダム部分 (32文字, Base62)
│  └────────── プレフィックス表示用 (6文字)
└───────────── 固定プレフィックス
```

**生成ロジック:**
```typescript
function generateApiKey(): { key: string; prefix: string; hash: string } {
  const randomPart = crypto.randomBytes(24).toString('base64url') // 32文字
  const prefixPart = randomPart.slice(0, 6)
  const fullKey = `ak_${prefixPart}_${randomPart}`
  const hash = crypto.createHash('sha256').update(fullKey).digest('hex')

  return {
    key: fullKey,        // ユーザーに1度だけ表示
    prefix: `ak_${prefixPart}`, // 管理画面表示用
    hash: hash,          // DB保存用
  }
}
```

---

## 5. Edge Function 実装

### 5.1 api-gateway/index.ts

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * Public API Gateway
 *
 * URL Pattern: /api-gateway/{entity}/{operation}
 *
 * Examples:
 *   GET  /api-gateway/articles/list
 *   GET  /api-gateway/articles/get?id=xxx
 *   POST /api-gateway/articles/create
 *   POST /api-gateway/articles/update
 *   POST /api-gateway/articles/delete
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Parse URL
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    // Expected: ['api-gateway', '{entity}', '{operation}']

    if (pathParts.length < 3) {
      return errorResponse('Invalid URL format. Use: /api-gateway/{entity}/{operation}', 400)
    }

    const [, entity, operation] = pathParts

    // 2. Extract API Key
    const apiKey = req.headers.get('X-API-Key')
    if (!apiKey || !apiKey.startsWith('ak_')) {
      return errorResponse('Missing or invalid X-API-Key header', 401)
    }

    // 3. Validate API Key
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const keyHash = await sha256(apiKey)

    const { data: keyData, error: keyError } = await adminClient
      .from('api_keys')
      .select('*')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .single()

    if (keyError || !keyData) {
      return errorResponse('Invalid API key', 401)
    }

    // 4. Check expiration
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return errorResponse('API key expired', 401)
    }

    // 5. Check entity match
    if (keyData.entity_name.toLowerCase() !== entity.toLowerCase()) {
      return errorResponse(`API key not authorized for entity: ${entity}`, 403)
    }

    // 6. Check operation permission
    if (!keyData.allowed_operations.includes(operation)) {
      return errorResponse(`Operation not allowed: ${operation}`, 403)
    }

    // 7. Rate Limit check
    const rateLimitResult = await checkRateLimit(adminClient, keyData)
    if (!rateLimitResult.allowed) {
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded',
        retry_after: rateLimitResult.retryAfter,
      }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': String(rateLimitResult.retryAfter),
        },
      })
    }

    // 8. Proxy to target Edge Function
    const targetUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/${keyData.table_name}-crud`

    const body = req.method !== 'GET' ? await req.json() : {}
    const proxyBody = {
      operation,
      ...body,
      ...(operation === 'get' || operation === 'delete'
        ? { id: url.searchParams.get('id') }
        : {}),
    }

    const proxyResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify(proxyBody),
    })

    // 9. Update statistics (non-blocking)
    updateUsageStats(adminClient, keyData.id).catch(console.error)

    // 10. Return response
    const responseData = await proxyResponse.json()

    return new Response(JSON.stringify(responseData), {
      status: proxyResponse.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
      },
    })

  } catch (error) {
    console.error('API Gateway error:', error)
    return errorResponse('Internal Server Error', 500)
  }
})

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function checkRateLimit(client: any, keyData: any): Promise<{
  allowed: boolean
  remaining: number
  retryAfter: number
}> {
  const now = new Date()
  const minuteStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(),
                               now.getHours(), now.getMinutes(), 0, 0)

  // Upsert minute counter
  const { data, error } = await client
    .from('api_key_usage')
    .upsert({
      api_key_id: keyData.id,
      window_start: minuteStart.toISOString(),
      window_type: 'minute',
      request_count: 1,
    }, {
      onConflict: 'api_key_id,window_start,window_type',
      ignoreDuplicates: false,
    })
    .select('request_count')
    .single()

  if (error) {
    // Fallback: allow but log
    console.error('Rate limit check error:', error)
    return { allowed: true, remaining: keyData.rate_limit_per_minute, retryAfter: 0 }
  }

  const count = data?.request_count ?? 0
  const limit = keyData.rate_limit_per_minute

  if (count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: 60 - now.getSeconds(),
    }
  }

  // Increment counter
  await client
    .from('api_key_usage')
    .update({ request_count: count + 1 })
    .eq('api_key_id', keyData.id)
    .eq('window_start', minuteStart.toISOString())
    .eq('window_type', 'minute')

  return {
    allowed: true,
    remaining: limit - count - 1,
    retryAfter: 0,
  }
}

async function updateUsageStats(client: any, keyId: string): Promise<void> {
  await client
    .from('api_keys')
    .update({
      request_count: client.sql`request_count + 1`,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', keyId)
}

function errorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}
```

---

## 6. Admin UI

### 6.1 API Keys 管理画面

**場所:** `/admin/api-keys`

**機能:**
- API Key 一覧表示
- 新規発行（1度だけフルキー表示）
- 即時停止/有効化
- 有効期限設定
- 許可操作の設定
- Rate Limit設定
- 使用統計表示

### 6.2 コンポーネント構成

```
pages/admin/
└── ApiKeysAdminPage.tsx

components/features/api-keys/
├── ApiKeyList.tsx
├── ApiKeyCreateDialog.tsx
├── ApiKeyDetailDialog.tsx
└── ApiKeyUsageChart.tsx

hooks/
└── useApiKeys.ts

models/
└── ApiKey.ts

services/
└── ApiKeyService.ts
```

---

## 7. HEADLESS API Generator 拡張

### 7.1 新オプション

```bash
# Public API対応で生成
akatsuki api new Article --schema article.yaml --public

# 既存エンティティにPublic API追加
akatsuki api add-public Article
```

### 7.2 生成物

`--public` オプション追加時:
- `api_keys` テーブルの初期Migration（なければ）
- Admin UIコンポーネント
- 使用例ドキュメント

---

## 8. 使用例

### 8.1 API Key発行

```typescript
// Admin画面で発行
const { key, prefix } = await apiKeyService.create({
  name: 'Mobile App Production',
  entityName: 'Article',
  allowedOperations: ['list', 'get'],
  rateLimitPerMinute: 100,
})

// key: "ak_x7Kf9L_a1b2c3d4e5f6g7h8i9j0..." (1度だけ表示)
// prefix: "ak_x7Kf9L" (管理画面表示用)
```

### 8.2 API呼び出し

```bash
# List
curl -X GET "https://xxx.supabase.co/functions/v1/api-gateway/articles/list" \
  -H "X-API-Key: ak_x7Kf9L_a1b2c3d4e5f6g7h8i9j0..."

# Get
curl -X GET "https://xxx.supabase.co/functions/v1/api-gateway/articles/get?id=xxx" \
  -H "X-API-Key: ak_x7Kf9L_..."

# Create
curl -X POST "https://xxx.supabase.co/functions/v1/api-gateway/articles/create" \
  -H "X-API-Key: ak_x7Kf9L_..." \
  -H "Content-Type: application/json" \
  -d '{"title": "Hello", "content": "World"}'
```

---

## 9. 将来の拡張

### Phase 2: Shuttle Gateway
- Rust製高速Gateway
- Edge Functionsへのproxy
- より細かいRate Limit

### Phase 3: Custom Domain
- Cloudflare Workers
- カスタムドメインサポート
- Global CDN

### Phase 4: Webhooks
- API呼び出し時のWebhook通知
- イベント駆動連携

---

## 10. 実装順序

1. **Migration作成** - `api_keys`, `api_key_usage` テーブル
2. **api-gateway Edge Function** - 基本認証・プロキシ
3. **ApiKey Model/Service/Hook** - Frontend層
4. **Admin UI** - 管理画面
5. **HEADLESS Generator拡張** - `--public` オプション
6. **ドキュメント** - 使用例、AGENT-mini.md更新

---

## 参考

- 既存実装: `supabase/functions/cdn-gateway/index.ts`
- 既存テーブル: `url_aliases` (同様のパターン)
