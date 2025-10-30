# Supabase Configuration

このドキュメントは Akatsuki プロジェクトの Supabase 設定を記録しています。

## Edge Functions

### 1. ai-chat
**説明:** マルチプロバイダー LLM チャット API
**認証:** 必須
**プロバイダー:** OpenAI, Anthropic (Claude), Google (Gemini)

**必要な Secrets:**
```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
```

**使用方法:**
```javascript
const { data } = await supabase.functions.invoke('ai-chat', {
  body: {
    provider: 'gemini',  // 'openai' | 'anthropic' | 'gemini'
    prompt: 'こんにちは',
    model: 'gemini-2.5-flash',  // optional
    temperature: 0.7,  // optional
    maxTokens: 1000,  // optional
  }
})
```

**デフォルトモデル:**
- OpenAI: `gpt-4o-mini`
- Anthropic: `claude-sonnet-4-5-20250929`
- Gemini: `gemini-2.5-flash`

---

### 2. upload-file
**説明:** ファイルアップロード (Public/Private バケット対応)
**認証:** 必須

**使用方法:**
```javascript
const formData = new FormData()
formData.append('file', file)
formData.append('bucket', 'uploads')  // or 'private_uploads'
formData.append('folder', 'images')  // optional

const { data } = await supabase.functions.invoke('upload-file', {
  body: formData
})
// Returns: { file_path, file_url, bucket }
```

---

### 3. create-signed-url
**説明:** プライベートファイル用の Signed URL 生成
**認証:** 必須

**使用方法:**
```javascript
const { data } = await supabase.functions.invoke('create-signed-url', {
  body: {
    filePath: 'user_id/folder/file.pdf',
    bucket: 'private_uploads',  // optional
    expiresIn: 3600,  // optional (seconds)
  }
})
// Returns: { upload: { signed_url, token, path }, download: { signed_url } }
```

---

## Storage Buckets

### uploads (Public)
- **アクセス:** Public
- **最大サイズ:** 10MB
- **許可する MIME タイプ:**
  - `image/jpeg`
  - `image/png`
  - `image/gif`
  - `image/webp`
  - `application/pdf`
  - `text/plain`

**RLS ポリシー:**
- ✅ 認証済みユーザーは自分のフォルダにアップロード可能
- ✅ 認証済みユーザーは自分のファイルを読み取り可能
- ✅ 誰でも全ファイルを読み取り可能（Public）
- ✅ 認証済みユーザーは自分のファイルを削除可能

---

### private_uploads (Private)
- **アクセス:** Private (Signed URL required)
- **最大サイズ:** 10MB
- **許可する MIME タイプ:**
  - `image/jpeg`
  - `image/png`
  - `image/gif`
  - `image/webp`
  - `application/pdf`
  - `text/plain`
  - `application/json`

**RLS ポリシー:**
- ✅ 認証済みユーザーは自分のフォルダにアップロード可能
- ✅ 認証済みユーザーは自分のファイルのみ読み取り可能
- ✅ 認証済みユーザーは自分のファイルを削除可能

---

## Database Tables

### llm_call_logs
LLM API 呼び出しの履歴を記録

**カラム:**
- `id` (UUID, PK)
- `user_id` (UUID, FK to auth.users)
- `provider` (TEXT: 'openai' | 'anthropic' | 'gemini')
- `model_id` (TEXT)
- `input_tokens` (INTEGER)
- `output_tokens` (INTEGER)
- `total_tokens` (INTEGER)
- `request_type` (TEXT, DEFAULT 'chat')
- `success` (BOOLEAN)
- `error_message` (TEXT)
- `created_at` (TIMESTAMPTZ)

---

### user_quotas
ユーザーごとの月間 LLM 使用制限

**カラム:**
- `id` (UUID, PK)
- `user_id` (UUID, FK to auth.users, UNIQUE)
- `monthly_request_limit` (INTEGER, DEFAULT 100)
- `current_month` (TEXT, e.g., '2025-10')
- `requests_used` (INTEGER, DEFAULT 0)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

---

### profiles
ユーザープロフィール情報

**カラム:**
- `id` (BIGSERIAL, PK)
- `user_id` (UUID, FK to auth.users, UNIQUE)
- `username` (TEXT, UNIQUE)
- `display_name` (TEXT)
- `avatar_url` (TEXT)
- `bio` (TEXT)
- `role` (TEXT: 'user' | 'moderator' | 'admin', DEFAULT 'user')
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**トリガー:**
- 新規ユーザー登録時に自動的にプロフィール作成

---

## Helper Views

### user_monthly_stats
ユーザーごとの月間統計

```sql
SELECT
  user_id,
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as total_requests,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(total_tokens) as total_tokens
FROM llm_call_logs
GROUP BY user_id, DATE_TRUNC('month', created_at)
```

---

### user_current_usage
現在の月のユーザー使用量

```sql
SELECT
  uq.user_id,
  uq.monthly_request_limit,
  COALESCE(ums.total_requests, 0) as requests_used,
  uq.monthly_request_limit - COALESCE(ums.total_requests, 0) as remaining_requests,
  COALESCE(ums.total_tokens, 0) as total_tokens_used
FROM user_quotas uq
LEFT JOIN user_monthly_stats ums ON ...
WHERE ums.month = DATE_TRUNC('month', CURRENT_TIMESTAMP)
```

---

## Secrets Management

### 必要な Secrets 一覧

```bash
# LLM Provider API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...

# Supabase (自動設定済み)
SUPABASE_URL=https://...supabase.co
SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh...
SUPABASE_DB_URL=postgresql://...
```

### Secrets の設定方法

```bash
# 個別設定
npx supabase secrets set OPENAI_API_KEY=sk-...
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
npx supabase secrets set GEMINI_API_KEY=AIza...

# 一括設定（.env.secrets ファイルから）
npx supabase secrets set --env-file .env.secrets
```

### Secrets の確認

```bash
npx supabase secrets list
```

---

## Environment Variables (.env)

```bash
# Frontend
VITE_SUPABASE_URL=https://...supabase.co
VITE_SUPABASE_ANON_KEY=eyJh...
```

---

## デプロイ方法

### Edge Functions のデプロイ

```bash
# 全関数を一括デプロイ
npx supabase functions deploy

# 個別にデプロイ
npx supabase functions deploy ai-chat
npx supabase functions deploy upload-file
npx supabase functions deploy create-signed-url
```

### Database Migrations の適用

```bash
# ローカル開発環境
npx supabase db push

# 本番環境（自動適用）
git push origin main
```

---

## トラブルシューティング

### Edge Function が 500 エラーを返す

1. Secrets が設定されているか確認
   ```bash
   npx supabase secrets list
   ```

2. Edge Function のログを確認
   - Supabase Dashboard → Functions → Logs

3. 再デプロイを試す
   ```bash
   npx supabase functions deploy <function-name>
   ```

### Storage アップロードが失敗する

1. バケットが作成されているか確認
   - Supabase Dashboard → Storage

2. RLS ポリシーが正しく設定されているか確認
   ```sql
   SELECT * FROM storage.objects WHERE bucket_id = 'uploads';
   ```

3. ファイルサイズが制限を超えていないか確認（10MB）

### Profile が読み込めない

1. トリガーが動作しているか確認
   ```sql
   SELECT * FROM profiles WHERE user_id = '<your-user-id>';
   ```

2. 手動でプロフィールを作成
   ```sql
   INSERT INTO profiles (user_id, username, display_name)
   VALUES ('<user-id>', 'username', 'Display Name');
   ```
