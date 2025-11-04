# Async Job System 設計書

## 概要

Akatsukiの非同期ジョブ実行システムは、長時間実行されるタスクをCRONベースで処理し、Realtime経由で進捗をフロントエンドに配信するシステムです。

### 主な特徴

- **CRON駆動**: Edge Functionのタイムアウト（1分）を回避し、確実に処理完了
- **進捗トラッキング**: 0-100%の進捗をRealtime経由でリアルタイム配信
- **インフラ再利用**: 既存のEvent Systemを拡張、新規テーブル不要
- **簡潔なAPI**: `EventService.emit('job:*')` のみでジョブ起動
- **最大1分待機**: ジョブ起動から処理開始まで最大1分のディレイ（許容範囲）

### ユースケース

- レポート生成（時間のかかる集計処理）
- バッチ画像処理
- データエクスポート/インポート
- 大量メール送信
- AI推論（長時間のモデル実行）

## アーキテクチャ

### システム全体図

```
┌──────────────┐
│   Frontend   │
│  (React/JS)  │
└──────┬───────┘
       │ 1. EventService.emit('job:generate-report', {...})
       ↓
┌────────────────────────────────────────┐
│        system_events テーブル           │
│  ┌──────────────────────────────────┐  │
│  │ id: uuid                         │  │
│  │ event_type: 'job:generate-report'│  │
│  │ status: 'pending'                │  │
│  │ progress: 0                      │  │
│  │ payload: { reportType, ... }     │  │
│  │ result: null                     │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
       │
       │ 2. Realtime INSERT通知 → Frontend (即座)
       │
       ↓ 3. CRON実行（毎分）
┌──────────────────────┐
│  process-events      │
│  (Edge Function)     │
│                      │
│  ・pending検出       │
│  ・job:*判定        │
│  ・processJob()実行  │
└──────┬───────────────┘
       │ 4. handlers.ts から該当ハンドラー取得
       ↓
┌─────────────────────────────────┐
│  handlers.ts                    │
│  ┌───────────────────────────┐  │
│  │ 'generate-report': async  │  │
│  │   (params, context) => {  │  │
│  │     // 進捗更新            │  │
│  │     await context         │  │
│  │       .updateProgress(50) │  │
│  │                           │  │
│  │     // 処理実行            │  │
│  │     const result = ...    │  │
│  │     return result         │  │
│  │   }                       │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
       │ 5. 処理中に進捗を更新
       │    (UPDATE progress: 20 → 60 → 90)
       ↓
┌────────────────────────────────────────┐
│        system_events テーブル           │
│  ┌──────────────────────────────────┐  │
│  │ status: 'processing'             │  │
│  │ progress: 60                     │  │
│  │ processing_started_at: ...       │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
       │
       │ 6. Realtime UPDATE通知 → Frontend (リアルタイム)
       │
       ↓ 7. 完了時
┌────────────────────────────────────────┐
│        system_events テーブル           │
│  ┌──────────────────────────────────┐  │
│  │ status: 'completed'              │  │
│  │ progress: 100                    │  │
│  │ result: { records: 42, ... }     │  │
│  │ processed_at: ...                │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
       │
       │ 8. Realtime UPDATE通知 → Frontend
       ↓
┌──────────────┐
│   Frontend   │
│  useJob()    │
│  ・isCompleted: true
│  ・result: {...}
│  ・onComplete()発火
└──────────────┘
```

### コンポーネント

| コンポーネント | 役割 | 技術 |
|--------------|------|------|
| **Frontend** | ジョブ起動・進捗監視 | React, EventService, useJob Hook |
| **system_events** | ジョブレコード保存 | PostgreSQL (Supabase) |
| **Realtime** | 進捗通知配信 | Supabase Realtime (WebSocket) |
| **CRON** | 定期実行トリガー | Supabase Edge Function (pg_cron) |
| **process-events** | ジョブディスパッチャー | Edge Function (Deno) |
| **handlers.ts** | ジョブロジック | TypeScript |

## データベーススキーマ

### system_events テーブル拡張

既存の `system_events` テーブルにジョブ実行用カラムを追加：

```sql
-- 既存カラム
id                UUID PRIMARY KEY
event_type        TEXT              -- 'job:*' プレフィックスでジョブを識別
status            TEXT              -- 'pending', 'processing', 'completed', 'failed'
payload           JSONB             -- ジョブパラメータ
user_id           UUID
priority          INTEGER
scheduled_at      TIMESTAMPTZ
created_at        TIMESTAMPTZ
processed_at      TIMESTAMPTZ
retry_count       INTEGER
max_retries       INTEGER
error_message     TEXT

-- ジョブ用追加カラム（Migration: 20251104044630）
progress          INTEGER           -- 0-100の進捗率
result            JSONB             -- ジョブ実行結果
processing_started_at TIMESTAMPTZ   -- 処理開始時刻

-- インデックス
CREATE INDEX idx_system_events_job_type
  ON system_events(event_type)
  WHERE event_type LIKE 'job:%';

CREATE INDEX idx_system_events_processing
  ON system_events(status, scheduled_at)
  WHERE status IN ('pending', 'processing');
```

### ジョブレコード例

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "event_type": "job:generate-report",
  "status": "processing",
  "progress": 60,
  "payload": {
    "reportType": "sales",
    "startDate": "2025-01-01",
    "endDate": "2025-01-31"
  },
  "result": null,
  "user_id": "a1b2c3d4-...",
  "priority": 0,
  "scheduled_at": "2025-11-04T10:00:00Z",
  "created_at": "2025-11-04T10:00:00Z",
  "processing_started_at": "2025-11-04T10:01:12Z",
  "processed_at": null,
  "retry_count": 0,
  "max_retries": 3,
  "error_message": null
}
```

## ジョブハンドラーの実装

### 新しいジョブを追加する（Backend）

#### Step 1: handlers.ts にハンドラーを定義

**ファイル**: `supabase/functions/execute-async-job/handlers.ts`

```typescript
export const jobHandlers: Record<string, JobHandler> = {
  // 既存ハンドラー
  'generate-report': async (params, context) => { /* ... */ },

  // 新しいハンドラーを追加
  'process-images': async (params, context) => {
    const { imageIds, filter } = params

    // Step 1: 初期化 (10%)
    await context.updateProgress(10)
    console.log(`Processing ${imageIds.length} images with filter: ${filter}`)

    // Step 2: 画像データ取得 (30%)
    const { data: images } = await context.supabase
      .from('images')
      .select('*')
      .in('id', imageIds)
    await context.updateProgress(30)

    // Step 3: 各画像を処理 (30% → 90%)
    const results = []
    for (let i = 0; i < images.length; i++) {
      const image = images[i]

      // 画像処理ロジック（例：フィルター適用）
      const processed = await applyFilter(image, filter)
      results.push(processed)

      // 進捗更新
      const progress = 30 + Math.floor((i + 1) / images.length * 60)
      await context.updateProgress(progress)
    }

    // Step 4: 完了 (100% は自動設定)
    return {
      processedCount: results.length,
      results,
      filter,
      completedAt: new Date().toISOString()
    }
  },

  // さらに追加...
  'send-bulk-email': async (params, context) => {
    const { recipients, template } = params

    await context.updateProgress(20)

    // メール送信ロジック
    const sent = []
    for (let i = 0; i < recipients.length; i++) {
      await sendEmail(recipients[i], template)
      sent.push(recipients[i])

      const progress = 20 + Math.floor((i + 1) / recipients.length * 70)
      await context.updateProgress(progress)
    }

    return {
      sentCount: sent.length,
      failedCount: recipients.length - sent.length,
      recipients: sent
    }
  },
}
```

#### Step 2: Edge Function をデプロイ

```bash
# process-events 関数を再デプロイ（handlers.tsが含まれる）
npm run supabase:function:deploy -- process-events
```

### ジョブコンテキスト API

ハンドラーは `context` オブジェクトを受け取ります：

```typescript
type JobContext = {
  supabase: SupabaseClient    // Service Role権限のクライアント
  jobId: string               // ジョブID (system_events.id)
  updateProgress: (progress: number) => Promise<void>  // 進捗更新関数
}
```

**使用例:**

```typescript
// データベースアクセス
const { data } = await context.supabase
  .from('users')
  .select('*')

// 進捗更新（0-100）
await context.updateProgress(50)  // 50%完了

// ジョブIDを使って関連データを保存
await context.supabase
  .from('job_artifacts')
  .insert({ job_id: context.jobId, data: '...' })
```

### エラーハンドリング

```typescript
'risky-job': async (params, context) => {
  try {
    await context.updateProgress(10)

    // 危険な処理
    const result = await riskyOperation()

    await context.updateProgress(100)
    return result

  } catch (error) {
    // エラーはthrowするだけでOK
    // process-eventsが自動的にfail_event RPCを呼び出す
    throw new Error(`Risky operation failed: ${error.message}`)
  }
}
```

**エラー時の動作:**
- `status` が `'failed'` に更新
- `error_message` にエラー内容が保存
- `retry_count` がインクリメント
- `max_retries` に達するまで自動リトライ

## Frontend統合

### ジョブを起動する

**EventService.emit() を使用:**

```javascript
import { EventService } from '@/services/EventService'

// ジョブを起動
const event = await EventService.emit('job:generate-report', {
  reportType: 'sales',
  startDate: '2025-01-01',
  endDate: '2025-01-31'
})

console.log('Job created:', event.id)
// Job created: 550e8400-e29b-41d4-a716-446655440000
```

**オプション付き:**

```javascript
const event = await EventService.emit('job:process-images',
  {
    imageIds: ['img1', 'img2', 'img3'],
    filter: 'grayscale'
  },
  {
    priority: 10,              // 優先度（高いほど先に処理）
    scheduledAt: '2025-11-05T00:00:00Z'  // 実行予定時刻
  }
)
```

### ジョブの進捗を監視する

**useJob Hook を使用:**

```javascript
import { useJob } from '@/hooks/useJob'

function MyComponent() {
  const [jobId, setJobId] = useState(null)

  // ジョブ起動
  const startJob = async () => {
    const event = await EventService.emit('job:generate-report', {...})
    setJobId(event.id)
  }

  // ジョブ監視
  const {
    job,           // 完全なジョブオブジェクト
    progress,      // 進捗率 (0-100)
    result,        // 実行結果
    error,         // エラーメッセージ
    isLoading,     // 初回読み込み中
    isPending,     // pending状態
    isProcessing,  // processing状態
    isCompleted,   // completed状態
    isFailed,      // failed状態
    refetch,       // 手動再取得
  } = useJob(jobId, {
    enabled: !!jobId,
    onProgress: (progress) => {
      console.log(`Progress: ${progress}%`)
    },
    onComplete: (result) => {
      console.log('Job completed!', result)
      toast.success('Report generated!')
    },
    onError: (error) => {
      console.error('Job failed:', error)
      toast.error(`Failed: ${error}`)
    }
  })

  return (
    <div>
      <button onClick={startJob}>Start Job</button>

      {jobId && (
        <div>
          <p>Progress: {progress}%</p>
          <progress value={progress} max={100} />

          {isCompleted && (
            <div>
              <h3>Result:</h3>
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}

          {isFailed && (
            <div className="error">
              Error: {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

### JobProgress コンポーネントを使用

**最も簡単な方法:**

```javascript
import { JobProgress } from '@/components/common/JobProgress'

function ReportPage() {
  const [jobId, setJobId] = useState(null)

  const startReport = async () => {
    const event = await EventService.emit('job:generate-report', {...})
    setJobId(event.id)
  }

  return (
    <div>
      <button onClick={startReport}>Generate Report</button>

      {jobId && (
        <JobProgress
          jobId={jobId}
          title="Sales Report Generation"
          onComplete={(result) => {
            console.log('Done!', result)
          }}
        />
      )}
    </div>
  )
}
```

**カスタム結果表示:**

```javascript
<JobProgress
  jobId={jobId}
  title="Image Processing"
  renderResult={(result) => (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h4>Processed</h4>
        <p className="text-2xl font-bold">{result.processedCount}</p>
      </div>
      <div>
        <h4>Filter</h4>
        <p>{result.filter}</p>
      </div>
    </div>
  )}
/>
```

**コンパクト版:**

```javascript
import { JobProgressCompact } from '@/components/common/JobProgress'

<JobProgressCompact
  jobId={jobId}
  onComplete={(result) => console.log(result)}
/>
```

### 複数ジョブの監視

```javascript
import { useJobs } from '@/hooks/useJob'

const jobIds = ['job1-id', 'job2-id', 'job3-id']

const jobs = useJobs(jobIds, {
  onComplete: (result, jobId) => {
    console.log(`Job ${jobId} completed:`, result)
  }
})

// 各ジョブにアクセス
console.log(jobs['job1-id'].progress)  // 75
console.log(jobs['job2-id'].isCompleted)  // true
```

## CRON設定

### process-events の定期実行

**supabase/config.toml:**

```toml
[functions.process-events]
verify_jwt = false

# CRON設定（毎分実行）
[functions.process-events.cron]
schedule = "* * * * *"  # 毎分
```

**動作確認:**

```bash
# CRONジョブの確認
supabase functions list

# 手動実行テスト
curl -X POST https://your-project.supabase.co/functions/v1/process-events \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## トラブルシューティング

### ジョブが処理されない

**症状:** ジョブが `pending` のまま

**確認項目:**

1. **CRON が動いているか確認**
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'invoke_process_events';
   ```

2. **process-events が正常か確認**
   ```bash
   # 手動実行
   curl -X POST https://your-project.supabase.co/functions/v1/process-events \
     -H "Authorization: Bearer YOUR_ANON_KEY"
   ```

3. **Edge Function ログを確認**
   ```bash
   supabase functions logs process-events --tail
   ```

4. **ハンドラーが登録されているか確認**
   ```typescript
   // handlers.ts
   console.log('Available handlers:', Object.keys(jobHandlers))
   ```

### 進捗が更新されない

**症状:** progress が 0 のまま動かない

**確認項目:**

1. **Realtime が有効か確認**
   ```sql
   SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';
   ```

2. **system_events テーブルが Realtime 対象か確認**
   ```sql
   SELECT schemaname, tablename
   FROM pg_publication_tables
   WHERE pubname = 'supabase_realtime';
   ```

3. **Frontend の Realtime 接続確認**
   ```javascript
   // useJob Hook内部でチャンネル購読を確認
   console.log('Subscribed to:', `job_${jobId}`)
   ```

4. **updateProgress が呼ばれているか確認**
   ```typescript
   // handlers.ts
   const updateProgress = async (progress: number) => {
     console.log(`Updating progress: ${progress}%`)
     await context.supabase...
   }
   ```

### ジョブがすぐに失敗する

**症状:** status が即座に `'failed'`

**確認項目:**

1. **エラーメッセージを確認**
   ```javascript
   const { job } = useJob(jobId)
   console.log('Error:', job.error_message)
   ```

2. **ハンドラー内のエラーログ**
   ```bash
   supabase functions logs process-events --tail
   ```

3. **パラメータの型を確認**
   ```typescript
   // handlers.ts
   'my-job': async (params, context) => {
     console.log('Received params:', params)
     // paramsが期待通りか確認
   }
   ```

4. **Service Role 権限の確認**
   ```typescript
   // context.supabase はService Role権限を持っているか
   const { data, error } = await context.supabase
     .from('private_table')
     .select('*')

   if (error) console.error('Permission error:', error)
   ```

### タイムアウトエラー

**症状:** 長時間ジョブが `processing` のまま

**原因:** Edge Function は最大実行時間の制限なし（CRON実行のため）

**対策:**

1. **処理を分割する**
   ```typescript
   // 悪い例: 一度に10000件処理
   for (const item of allItems) {
     await processItem(item)
   }

   // 良い例: バッチ処理
   const BATCH_SIZE = 100
   for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
     const batch = allItems.slice(i, i + BATCH_SIZE)
     await Promise.all(batch.map(processItem))

     // 進捗更新
     const progress = Math.floor((i + BATCH_SIZE) / allItems.length * 100)
     await context.updateProgress(progress)
   }
   ```

2. **チェーンジョブを使う**
   ```typescript
   // 大量データは複数ジョブに分割
   'process-large-dataset': async (params, context) => {
     const { datasetId, offset = 0 } = params
     const CHUNK_SIZE = 1000

     // 1000件だけ処理
     const chunk = await fetchData(datasetId, offset, CHUNK_SIZE)
     await processChunk(chunk)

     // 続きがあれば次のジョブを起動
     if (chunk.length === CHUNK_SIZE) {
       await context.supabase.from('system_events').insert({
         event_type: 'job:process-large-dataset',
         payload: { datasetId, offset: offset + CHUNK_SIZE },
         status: 'pending'
       })
     }

     return { processed: chunk.length, offset }
   }
   ```

## ベストプラクティス

### 1. 進捗更新は適度に

```typescript
// ❌ 悪い例: 更新が多すぎる
for (let i = 0; i < 10000; i++) {
  await processItem(items[i])
  await context.updateProgress((i / 10000) * 100)  // 10000回DB更新！
}

// ✅ 良い例: 5%刻みで更新
let lastProgress = 0
for (let i = 0; i < 10000; i++) {
  await processItem(items[i])

  const currentProgress = Math.floor((i / 10000) * 100)
  if (currentProgress - lastProgress >= 5) {
    await context.updateProgress(currentProgress)
    lastProgress = currentProgress
  }
}
```

### 2. エラーは早期検出

```typescript
// ✅ 良い例: パラメータバリデーション
'generate-report': async (params, context) => {
  // 早期バリデーション
  if (!params.reportType) {
    throw new Error('reportType is required')
  }
  if (!params.startDate || !params.endDate) {
    throw new Error('startDate and endDate are required')
  }

  await context.updateProgress(10)

  // メイン処理
  // ...
}
```

### 3. 結果は構造化

```typescript
// ✅ 良い例: 構造化された結果
return {
  success: true,
  processedCount: 42,
  metadata: {
    duration: '2.5s',
    memoryUsed: '128MB'
  },
  summary: {
    totalRecords: 42,
    dateRange: { startDate, endDate }
  },
  artifacts: {
    reportUrl: 'https://...',
    csvUrl: 'https://...'
  }
}
```

### 4. 冪等性を確保

```typescript
// ✅ 良い例: 同じジョブを複数回実行しても安全
'send-notification': async (params, context) => {
  const { userId, notificationId } = params

  // すでに送信済みかチェック
  const { data: existing } = await context.supabase
    .from('sent_notifications')
    .select('id')
    .eq('notification_id', notificationId)
    .single()

  if (existing) {
    console.log('Already sent, skipping')
    return { alreadySent: true }
  }

  // 送信実行
  await sendNotification(userId, notificationId)

  // 送信記録
  await context.supabase
    .from('sent_notifications')
    .insert({ notification_id: notificationId, sent_at: new Date() })

  return { sent: true }
}
```

### 5. ログを充実させる

```typescript
// ✅ 良い例: 詳細なログ
'complex-job': async (params, context) => {
  console.log(`[Job ${context.jobId}] Starting with params:`, params)

  await context.updateProgress(10)
  console.log(`[Job ${context.jobId}] Fetching data...`)

  const data = await fetchData()
  console.log(`[Job ${context.jobId}] Fetched ${data.length} records`)

  await context.updateProgress(50)
  console.log(`[Job ${context.jobId}] Processing...`)

  const result = await process(data)
  console.log(`[Job ${context.jobId}] Processed successfully:`, result)

  return result
}
```

## 設計上の決定事項

### なぜCRON-onlyなのか？

**検討した選択肢:**

1. **即時実行（Edge Function）**
   - ⚠️ 問題: Edge Functionは1分タイムアウト
   - 長時間ジョブが失敗する

2. **CRON + 即時実行のハイブリッド**
   - ⚠️ 問題: 複雑性が増す
   - タイムアウト前にCRONに引き継ぐロジックが必要

3. **CRON-only（採用）**
   - ✅ シンプル
   - ✅ 確実（タイムアウトなし）
   - ✅ 最大1分待機は許容範囲

### なぜstartJob()を追加しないのか？

**検討した選択肢:**

1. **新メソッド `EventService.startJob()`**
   - ⚠️ API増加
   - 実態は `emit('job:*')` のラッパー

2. **既存の `EventService.emit()` を使用（採用）**
   - ✅ APIがシンプル
   - ✅ 一貫性（全てemitで統一）
   - ✅ job:* プレフィックスで十分識別可能

### なぜ新テーブルを作らないのか？

**検討した選択肢:**

1. **新テーブル `jobs`**
   - ⚠️ インフラ重複（Realtime, CRON, Retry）
   - データ分散

2. **既存 `system_events` 拡張（採用）**
   - ✅ インフラ再利用
   - ✅ イベントとジョブを統一管理
   - ✅ カラム追加のみで実装完了

## 実装履歴

- **2025-11-04**: 設計完了、Backend実装（Migration, handlers.ts, process-events拡張）
- **2025-11-04**: Frontend実装（useJob Hook, JobProgress Component, ExamplesPage統合）
- **2025-11-04**: ドキュメント作成

## 参考リンク

- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [pg_cron Documentation](https://github.com/citusdata/pg_cron)
- [Event System設計](../AGENT.md#event-system)

## 今後の拡張予定

- [ ] ジョブ履歴ビュー（Admin Dashboard）
- [ ] ジョブキャンセル機能
- [ ] スケジュール実行UI（スケジューラー）
- [ ] ジョブ依存関係（Job A完了後にJob B実行）
- [ ] ジョブテンプレート機能
- [ ] Webhook通知（ジョブ完了時に外部通知）
