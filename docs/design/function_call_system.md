# Function Call (AIGen) System 設計書

## 概要

Akatsukiの Function Call System は、LLMが自律的にシステム機能（Webhook送信、Job実行、DB操作等）を呼び出せるようにする高度な統合機能です。既存のAI Chat、Event System、Async Job Systemと連携し、AIエージェント的な動作を実現します。

### 主な特徴

- **LLM Function Calling**: OpenAI/Anthropic/GeminiのFunction Calling APIを活用
- **非同期実行**: 長時間処理はJob Systemで非同期実行（タイムアウト回避）
- **型安全**: TypeScript + Zodで関数定義と引数を厳密に管理
- **拡張可能**: VibeCodingでFunction定義を追加するだけで新機能を追加可能
- **監査ログ**: 全Function Call実行を`function_call_logs`テーブルに記録
- **セキュリティ**: ユーザー権限チェック、Quota管理、承認フロー対応

### ユースケース

- **AIアシスタント**: 「明日の天気を調べて、レポートをメールで送って」
- **データ分析**: 「先月の売上データを集計して、グラフを生成して」
- **Webhook連携**: 「GitHubに新しいPRが来たら、Slackに通知して」
- **バッチ処理**: 「全ユーザーの画像を最適化して、通知を送って」
- **カスタムワークフロー**: AIが複数の機能を組み合わせて自律実行

---

## アーキテクチャ

### システム全体図

```
┌──────────────┐
│   Frontend   │
│  (React/JS)  │
└──────┬───────┘
       │ 1. AIService.chat({ prompt, tools: [...] })
       ↓
┌────────────────────────────────────────┐
│  ai-chat (Edge Function)                │
│  ┌──────────────────────────────────┐  │
│  │ 1. LLM API呼び出し（tools付き）  │  │
│  │    - OpenAI: functions            │  │
│  │    - Anthropic: tools             │  │
│  │    - Gemini: function_declarations│  │
│  │                                    │  │
│  │ 2. LLMがFunction Callを返却       │  │
│  │    {                              │  │
│  │      tool_calls: [{               │  │
│  │        name: "send_webhook",      │  │
│  │        arguments: {...}           │  │
│  │      }]                           │  │
│  │    }                              │  │
│  │                                    │  │
│  │ 3. Function実行判定               │  │
│  │    - 同期実行可能? → execute()    │  │
│  │    - 非同期必要? → emit Job       │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
       │
       ├─── 同期実行 ──────────────────┐
       │                              │
       │                              ↓
       │                  ┌─────────────────────┐
       │                  │ Function Executor    │
       │                  │ ・execute_webhook()  │
       │                  │ ・query_database()   │
       │                  │ ・send_notification()│
       │                  └─────────────────────┘
       │                              │
       ↓                              ↓
┌────────────────────────────────────────┐
│  function_call_logs テーブル            │
│  ・実行ログ記録                         │
│  ・成功/失敗                            │
│  ・実行時間                             │
└────────────────────────────────────────┘
       │
       └─── 非同期実行（Job） ─────────┐
                                      │
                                      ↓
                          ┌─────────────────────┐
                          │ system_events        │
                          │ event_type:          │
                          │  'job:function-call' │
                          │ payload: {           │
                          │   function: "...",   │
                          │   arguments: {...}   │
                          │ }                    │
                          └─────────────────────┘
                                      │
                                      │ CRON実行（毎分）
                                      ↓
                          ┌─────────────────────┐
                          │ execute-async-job    │
                          │ handlers.ts:         │
                          │  'function-call'     │
                          │                      │
                          │ ・Function実行       │
                          │ ・進捗更新           │
                          │ ・結果返却           │
                          └─────────────────────┘
                                      │
                                      ↓ Realtime
                          ┌─────────────────────┐
                          │   Frontend           │
                          │  useJob() Hook       │
                          │  ・進捗表示          │
                          │  ・結果表示          │
                          └─────────────────────┘
```

---

## データベーススキーマ

### function_call_logs テーブル

全てのFunction Call実行を記録する監査ログテーブル。

```sql
CREATE TABLE function_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- LLM Call情報
  llm_call_log_id UUID REFERENCES llm_call_logs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Function情報
  function_name TEXT NOT NULL,
  function_arguments JSONB NOT NULL,
  execution_type TEXT NOT NULL CHECK (execution_type IN ('sync', 'async')),

  -- 実行結果
  status TEXT NOT NULL CHECK (status IN ('pending', 'executing', 'success', 'failed')),
  result JSONB,
  error_message TEXT,

  -- Job連携（非同期実行の場合）
  system_event_id UUID REFERENCES system_events(id) ON DELETE SET NULL,

  -- メトリクス
  execution_time_ms INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- メタデータ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_function_call_logs_user_id ON function_call_logs(user_id);
CREATE INDEX idx_function_call_logs_function_name ON function_call_logs(function_name);
CREATE INDEX idx_function_call_logs_status ON function_call_logs(status);
CREATE INDEX idx_function_call_logs_llm_call_log_id ON function_call_logs(llm_call_log_id);
CREATE INDEX idx_function_call_logs_created_at ON function_call_logs(created_at DESC);

-- Updated_at trigger
CREATE TRIGGER set_function_call_logs_updated_at
  BEFORE UPDATE ON function_call_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE function_call_logs IS 'Function Call execution audit log';
COMMENT ON COLUMN function_call_logs.execution_type IS 'sync (immediate) or async (via Job System)';
COMMENT ON COLUMN function_call_logs.status IS 'pending | executing | success | failed';
```

### RLSポリシー

```sql
-- ============================================================
-- RLS: function_call_logs テーブル
-- ============================================================
ALTER TABLE function_call_logs ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のログのみ読み取り可能
CREATE POLICY "Users can read own function_call_logs"
  ON function_call_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- Admin は全ログ読み取り可能
CREATE POLICY "Admin can read all function_call_logs"
  ON function_call_logs
  FOR SELECT
  USING ((SELECT is_admin()) = true);

-- Edge Function（Service Role）のみ作成・更新可能
CREATE POLICY "Service role can manage function_call_logs"
  ON function_call_logs
  FOR ALL
  WITH CHECK (true);  -- Service RoleはRLSバイパス
```

---

## Function定義

### Function Registry

**ファイル**: `supabase/functions/ai-chat/function_registry.ts`

```typescript
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'

/**
 * Function Context
 */
export interface FunctionContext {
  userId: string
  adminClient: SupabaseClient
  userClient: SupabaseClient
}

/**
 * Function Result
 */
export interface FunctionResult {
  success: boolean
  data?: any
  error?: string
  executionTimeMs?: number
}

/**
 * Function Handler
 */
export type FunctionHandler = (
  args: any,
  context: FunctionContext
) => Promise<FunctionResult>

/**
 * Function Definition
 */
export interface FunctionDefinition {
  name: string
  description: string
  parameters: z.ZodObject<any>
  executionType: 'sync' | 'async'  // 同期実行 or 非同期（Job）
  handler: FunctionHandler
}

/**
 * Function Registry
 *
 * VibeCoding: ここに新しいFunction定義を追加するだけで利用可能
 */
export const functionRegistry: Record<string, FunctionDefinition> = {
  /**
   * Webhook送信
   */
  send_webhook: {
    name: 'send_webhook',
    description: 'Send a webhook request to an external service',
    parameters: z.object({
      webhook_name: z.string().describe('Webhook name (e.g., github-push)'),
      payload: z.record(z.any()).describe('Webhook payload (JSON object)'),
    }),
    executionType: 'sync',  // すぐに実行
    handler: async (args, context) => {
      const { webhook_name, payload } = args
      const startTime = Date.now()

      try {
        // Webhook送信ロジック
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const response = await fetch(
          `${supabaseUrl}/functions/v1/webhook-receiver?name=${webhook_name}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        )

        const result = await response.json()

        return {
          success: response.ok,
          data: result,
          executionTimeMs: Date.now() - startTime,
        }
      } catch (error) {
        return {
          success: false,
          error: error.message,
          executionTimeMs: Date.now() - startTime,
        }
      }
    },
  },

  /**
   * データベースクエリ
   */
  query_database: {
    name: 'query_database',
    description: 'Query database tables (user has access to)',
    parameters: z.object({
      table: z.string().describe('Table name'),
      select: z.string().optional().describe('Columns to select (default: *)'),
      filter: z.record(z.any()).optional().describe('Filter conditions'),
      limit: z.number().optional().default(10).describe('Limit results'),
    }),
    executionType: 'sync',
    handler: async (args, context) => {
      const { table, select = '*', filter = {}, limit = 10 } = args
      const startTime = Date.now()

      try {
        let query = context.userClient.from(table).select(select).limit(limit)

        // Apply filters
        for (const [key, value] of Object.entries(filter)) {
          query = query.eq(key, value)
        }

        const { data, error } = await query

        if (error) throw error

        return {
          success: true,
          data: { records: data, count: data?.length || 0 },
          executionTimeMs: Date.now() - startTime,
        }
      } catch (error) {
        return {
          success: false,
          error: error.message,
          executionTimeMs: Date.now() - startTime,
        }
      }
    },
  },

  /**
   * 通知送信
   */
  send_notification: {
    name: 'send_notification',
    description: 'Send notification via email or Slack',
    parameters: z.object({
      channel: z.enum(['email', 'slack']).describe('Notification channel'),
      recipient: z.string().describe('Email address or Slack channel'),
      message: z.string().describe('Notification message'),
      title: z.string().optional().describe('Notification title'),
    }),
    executionType: 'async',  // 非同期実行（Email送信は時間がかかる可能性）
    handler: async (args, context) => {
      const { channel, recipient, message, title } = args
      const startTime = Date.now()

      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (channel === 'email') {
          const response = await fetch(
            `${supabaseUrl}/functions/v1/send-email`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${serviceRoleKey}`,
              },
              body: JSON.stringify({
                to: recipient,
                subject: title || 'Notification',
                text: message,
              }),
            }
          )

          const result = await response.json()
          return {
            success: response.ok,
            data: result,
            executionTimeMs: Date.now() - startTime,
          }
        } else if (channel === 'slack') {
          const response = await fetch(
            `${supabaseUrl}/functions/v1/slack-notify`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${serviceRoleKey}`,
              },
              body: JSON.stringify({
                text: message,
                channel: recipient,
              }),
            }
          )

          const result = await response.json()
          return {
            success: response.ok,
            data: result,
            executionTimeMs: Date.now() - startTime,
          }
        }

        return {
          success: false,
          error: `Unknown channel: ${channel}`,
          executionTimeMs: Date.now() - startTime,
        }
      } catch (error) {
        return {
          success: false,
          error: error.message,
          executionTimeMs: Date.now() - startTime,
        }
      }
    },
  },

  /**
   * 画像生成
   */
  generate_image: {
    name: 'generate_image',
    description: 'Generate image using DALL-E',
    parameters: z.object({
      prompt: z.string().describe('Image generation prompt'),
      size: z.enum(['256x256', '512x512', '1024x1024']).optional().default('512x512'),
    }),
    executionType: 'async',  // 画像生成は時間がかかる
    handler: async (args, context) => {
      const { prompt, size = '512x512' } = args
      const startTime = Date.now()

      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        const response = await fetch(
          `${supabaseUrl}/functions/v1/generate-image`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({ prompt, size }),
          }
        )

        const result = await response.json()

        return {
          success: response.ok,
          data: result,
          executionTimeMs: Date.now() - startTime,
        }
      } catch (error) {
        return {
          success: false,
          error: error.message,
          executionTimeMs: Date.now() - startTime,
        }
      }
    },
  },

  /**
   * データ集計（非同期）
   */
  aggregate_data: {
    name: 'aggregate_data',
    description: 'Aggregate data from database (async)',
    parameters: z.object({
      table: z.string().describe('Table name'),
      groupBy: z.string().describe('Column to group by'),
      aggregation: z.enum(['count', 'sum', 'avg']).describe('Aggregation function'),
      column: z.string().optional().describe('Column to aggregate (for sum/avg)'),
    }),
    executionType: 'async',  // 大量データの集計は非同期
    handler: async (args, context) => {
      const { table, groupBy, aggregation, column } = args
      const startTime = Date.now()

      try {
        // 実装例: ここに実際の集計ロジックを書く
        // 大量データの場合、バッチ処理 + 進捗更新が必要

        return {
          success: true,
          data: { message: 'Aggregation completed (mock)' },
          executionTimeMs: Date.now() - startTime,
        }
      } catch (error) {
        return {
          success: false,
          error: error.message,
          executionTimeMs: Date.now() - startTime,
        }
      }
    },
  },
}

/**
 * Convert Function Registry to OpenAI Functions format
 */
export function toOpenAIFunctions() {
  return Object.values(functionRegistry).map(func => ({
    name: func.name,
    description: func.description,
    parameters: zodToJsonSchema(func.parameters),
  }))
}

/**
 * Convert Function Registry to Anthropic Tools format
 */
export function toAnthropicTools() {
  return Object.values(functionRegistry).map(func => ({
    name: func.name,
    description: func.description,
    input_schema: zodToJsonSchema(func.parameters),
  }))
}

/**
 * Convert Function Registry to Gemini Function Declarations
 */
export function toGeminiFunctionDeclarations() {
  return Object.values(functionRegistry).map(func => ({
    name: func.name,
    description: func.description,
    parameters: zodToJsonSchema(func.parameters),
  }))
}

/**
 * Helper: Zod to JSON Schema
 */
function zodToJsonSchema(schema: z.ZodObject<any>): any {
  // 簡略実装（実際はzod-to-json-schemaライブラリ使用推奨）
  const shape = schema._def.shape()
  const properties: Record<string, any> = {}
  const required: string[] = []

  for (const [key, value] of Object.entries(shape)) {
    const zodType = value as any

    properties[key] = {
      type: getJsonSchemaType(zodType),
      description: zodType._def.description || '',
    }

    if (!zodType.isOptional()) {
      required.push(key)
    }

    // Handle enums
    if (zodType._def.typeName === 'ZodEnum') {
      properties[key].enum = zodType._def.values
    }
  }

  return {
    type: 'object',
    properties,
    required,
  }
}

function getJsonSchemaType(zodType: any): string {
  switch (zodType._def.typeName) {
    case 'ZodString':
      return 'string'
    case 'ZodNumber':
      return 'number'
    case 'ZodBoolean':
      return 'boolean'
    case 'ZodObject':
      return 'object'
    case 'ZodArray':
      return 'array'
    default:
      return 'string'
  }
}
```

---

## Edge Function拡張: ai-chat

既存の`ai-chat` Edge Functionを拡張してFunction Calling対応。

**ファイル**: `supabase/functions/ai-chat/index.ts`

```typescript
// ... 既存のimport ...
import {
  functionRegistry,
  toOpenAIFunctions,
  toAnthropicTools,
  toGeminiFunctionDeclarations,
} from './function_registry.ts'

// IN型にtools追加
const InputSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'gemini']),
  prompt: z.string().min(1).optional(),
  messages: z.array(z.any()).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  maxTokens: z.number().positive().optional().default(1000),
  responseJson: z.boolean().optional().default(false),

  // NEW: Function Calling support
  enableFunctions: z.boolean().optional().default(false),
  functions: z.array(z.string()).optional(),  // Function名のリスト（省略時は全Function）
})

// ... 既存のlogic内で ...

// 5. Function Calling対応
if (input.enableFunctions) {
  let tools: any[]

  // 使用するFunction一覧を取得
  const availableFunctions = input.functions
    ? input.functions.map(name => functionRegistry[name]).filter(Boolean)
    : Object.values(functionRegistry)

  switch (input.provider) {
    case 'openai':
      tools = availableFunctions.map(func => ({
        type: 'function',
        function: {
          name: func.name,
          description: func.description,
          parameters: zodToJsonSchema(func.parameters),
        },
      }))

      const completion = await openai.chat.completions.create({
        model: selectedModel,
        messages: input.messages || [{ role: 'user', content: input.prompt! }],
        temperature: input.temperature,
        max_tokens: input.maxTokens,
        tools,
        tool_choice: 'auto',
      })

      const message = completion.choices[0].message

      // Tool callsがある場合
      if (message.tool_calls && message.tool_calls.length > 0) {
        const functionCallResults = []

        for (const toolCall of message.tool_calls) {
          const funcName = toolCall.function.name
          const funcArgs = JSON.parse(toolCall.function.arguments)
          const funcDef = functionRegistry[funcName]

          if (!funcDef) {
            console.error(`Function not found: ${funcName}`)
            continue
          }

          // Function実行
          const result = await executeFunctionCall(
            funcDef,
            funcArgs,
            {
              userId: user.id,
              adminClient,
              userClient,
            },
            llmCallLogId  // 監査ログ用
          )

          functionCallResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: funcName,
            content: JSON.stringify(result),
          })
        }

        // Function実行結果を含めて再度LLM呼び出し
        const finalCompletion = await openai.chat.completions.create({
          model: selectedModel,
          messages: [
            ...input.messages,
            message,
            ...functionCallResults,
          ],
          temperature: input.temperature,
          max_tokens: input.maxTokens,
        })

        responseText = finalCompletion.choices[0].message.content || ''
      } else {
        responseText = message.content || ''
      }
      break

    // Anthropic, Gemini も同様に実装
  }
}

/**
 * Function Call実行
 */
async function executeFunctionCall(
  funcDef: FunctionDefinition,
  args: any,
  context: FunctionContext,
  llmCallLogId: string
): Promise<FunctionResult> {
  const startTime = Date.now()

  // ログ作成
  const { data: logRecord } = await context.adminClient
    .from('function_call_logs')
    .insert({
      llm_call_log_id: llmCallLogId,
      user_id: context.userId,
      function_name: funcDef.name,
      function_arguments: args,
      execution_type: funcDef.executionType,
      status: 'executing',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  const logId = logRecord?.id

  try {
    let result: FunctionResult

    if (funcDef.executionType === 'sync') {
      // 同期実行
      result = await funcDef.handler(args, context)

      // ログ更新
      await context.adminClient
        .from('function_call_logs')
        .update({
          status: result.success ? 'success' : 'failed',
          result: result.data,
          error_message: result.error,
          execution_time_ms: Date.now() - startTime,
          completed_at: new Date().toISOString(),
        })
        .eq('id', logId)

      return result
    } else {
      // 非同期実行（Job System）
      const { data: event } = await context.adminClient
        .from('system_events')
        .insert({
          event_type: 'job:function-call',
          payload: {
            function_name: funcDef.name,
            arguments: args,
            function_call_log_id: logId,
          },
          status: 'pending',
          user_id: context.userId,
        })
        .select('id')
        .single()

      // ログ更新（Job ID記録）
      await context.adminClient
        .from('function_call_logs')
        .update({
          status: 'pending',
          system_event_id: event?.id,
        })
        .eq('id', logId)

      return {
        success: true,
        data: {
          message: 'Function queued for async execution',
          job_id: event?.id,
        },
      }
    }
  } catch (error) {
    // エラーログ更新
    await context.adminClient
      .from('function_call_logs')
      .update({
        status: 'failed',
        error_message: error.message,
        execution_time_ms: Date.now() - startTime,
        completed_at: new Date().toISOString(),
      })
      .eq('id', logId)

    return {
      success: false,
      error: error.message,
      executionTimeMs: Date.now() - startTime,
    }
  }
}
```

---

## Job Handler: function-call

非同期Function Callを処理するJob Handler。

**ファイル**: `supabase/functions/execute-async-job/handlers.ts`

```typescript
import { functionRegistry } from '../ai-chat/function_registry.ts'

export const jobHandlers: Record<string, JobHandler> = {
  // 既存のハンドラー...

  /**
   * Function Call非同期実行
   */
  'function-call': async (params, context) => {
    const { function_name, arguments: funcArgs, function_call_log_id } = params

    await context.updateProgress(10)

    const funcDef = functionRegistry[function_name]
    if (!funcDef) {
      throw new Error(`Function not found: ${function_name}`)
    }

    await context.updateProgress(30)

    // Function実行
    const result = await funcDef.handler(funcArgs, {
      userId: params.user_id,  // Jobペイロードから取得
      adminClient: context.supabase,
      userClient: context.supabase,  // 注: ここではService Roleなので注意
    })

    await context.updateProgress(80)

    // ログ更新
    await context.supabase
      .from('function_call_logs')
      .update({
        status: result.success ? 'success' : 'failed',
        result: result.data,
        error_message: result.error,
        execution_time_ms: result.executionTimeMs,
        completed_at: new Date().toISOString(),
      })
      .eq('id', function_call_log_id)

    await context.updateProgress(100)

    return {
      success: result.success,
      function_name,
      result: result.data,
      error: result.error,
    }
  },
}
```

---

## Frontend統合

### AIService拡張

**ファイル**: `packages/app-frontend/src/services/ai/AIService.js`

```javascript
/**
 * AI Chat with Function Calling
 */
async chat({ provider, prompt, messages, enableFunctions = false, functions = [] }) {
  const { data, error } = await EdgeFunctionService.invoke('ai-chat', {
    provider,
    prompt,
    messages,
    enableFunctions,
    functions,  // 使用するFunction名のリスト
  })

  if (error) {
    return { data: null, error }
  }

  return { data: data.result, error: null }
}
```

### 使用例

```javascript
import { AIService } from './services/ai/AIService'

// Function Calling有効でAI Chat
const { data, error } = await AIService.chat({
  provider: 'openai',
  prompt: '明日の天気を調べて、結果をSlackに通知して',
  enableFunctions: true,
  functions: ['query_database', 'send_notification'],  // 使用可能なFunction
})

if (error) {
  console.error('Error:', error)
} else {
  console.log('AI Response:', data.response)
  // "明日の天気を確認し、Slackに通知しました。"
}
```

---

## VibeCoding: 新しいFunctionを追加

**Step 1: function_registry.ts にFunction定義追加**

```typescript
export const functionRegistry: Record<string, FunctionDefinition> = {
  // 既存のFunction...

  // 新規追加
  create_github_issue: {
    name: 'create_github_issue',
    description: 'Create a new GitHub issue',
    parameters: z.object({
      repo: z.string().describe('Repository name (owner/repo)'),
      title: z.string().describe('Issue title'),
      body: z.string().describe('Issue body'),
      labels: z.array(z.string()).optional().describe('Issue labels'),
    }),
    executionType: 'sync',
    handler: async (args, context) => {
      const { repo, title, body, labels = [] } = args
      const startTime = Date.now()

      try {
        const githubToken = Deno.env.get('GITHUB_TOKEN')
        if (!githubToken) throw new Error('GITHUB_TOKEN not configured')

        const response = await fetch(
          `https://api.github.com/repos/${repo}/issues`,
          {
            method: 'POST',
            headers: {
              'Authorization': `token ${githubToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title, body, labels }),
          }
        )

        const result = await response.json()

        return {
          success: response.ok,
          data: { issue_url: result.html_url, issue_number: result.number },
          executionTimeMs: Date.now() - startTime,
        }
      } catch (error) {
        return {
          success: false,
          error: error.message,
          executionTimeMs: Date.now() - startTime,
        }
      }
    },
  },
}
```

**Step 2: デプロイ**

```bash
npx supabase functions deploy ai-chat
npx supabase functions deploy execute-async-job
```

**完了！** AIが自動的に新しいFunctionを使えるようになります。

---

## セキュリティ考慮事項

1. **ユーザー権限チェック**
   - Function実行前にユーザー権限を確認
   - RLSで保護されたデータへのアクセス制限

2. **Quota管理**
   - Function Call実行回数の制限
   - 月間実行上限の設定

3. **承認フロー（オプション）**
   - 危険なFunction（削除、課金等）は承認必須
   - Admin承認後に実行

4. **監査ログ**
   - 全Function Call実行を記録
   - 成功/失敗、実行時間、引数、結果を保存

5. **Rate Limiting**
   - 短時間での大量実行を防止
   - ユーザー別の実行回数制限

---

## ベストプラクティス

### 1. Function設計

```typescript
// ✅ 良い例: 明確な責務、適切な粒度
'send_email': {
  name: 'send_email',
  description: 'Send an email to a recipient',
  parameters: z.object({
    to: z.string().email(),
    subject: z.string(),
    body: z.string(),
  }),
  executionType: 'async',
  handler: async (args, context) => { /* ... */ },
}

// ❌ 悪い例: 曖昧、粒度が大きすぎ
'do_everything': {
  name: 'do_everything',
  description: 'Do various things',
  parameters: z.object({
    action: z.string(),
    data: z.any(),
  }),
  // ...
}
```

### 2. 同期 vs 非同期の判断

```typescript
// 同期実行: 即座に完了（< 5秒）
executionType: 'sync'
// 例: データベースクエリ、Webhook送信、簡単な計算

// 非同期実行: 時間がかかる（>= 5秒）
executionType: 'async'
// 例: 画像生成、大量データ処理、外部API呼び出し（複数）
```

### 3. エラーハンドリング

```typescript
handler: async (args, context) => {
  try {
    // メイン処理
    const result = await doSomething(args)

    return {
      success: true,
      data: result,
      executionTimeMs: Date.now() - startTime,
    }
  } catch (error) {
    // エラー時は必ず success: false を返す
    return {
      success: false,
      error: error.message,
      executionTimeMs: Date.now() - startTime,
    }
  }
}
```

---

## 実装履歴

- **2025-11-05**: 設計完了、ドキュメント作成

---

## 今後の拡張予定

- [ ] Function Call UI（Admin Dashboard）
- [ ] Function実行ログビューア
- [ ] Function承認フロー
- [ ] Rate Limiting実装
- [ ] カスタムFunction定義UI（コード不要で追加）
- [ ] Function Chain機能（複数Functionの連鎖実行）
- [ ] Function Template（よくある組み合わせをテンプレート化）

---

## 参考リンク

- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [Anthropic Tool Use](https://docs.anthropic.com/claude/docs/tool-use)
- [Gemini Function Calling](https://ai.google.dev/docs/function_calling)
- [Async Job System設計](./async_job_system.md)
- [Event System設計](../AGENT.md#event-system)
