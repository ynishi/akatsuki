# Type Definitions Guide

このディレクトリには、Akatsuki Frontend全体で使用される型定義が含まれています。

## 目次

- [Edge Function Types](#edge-function-types)
- [Service Types](#service-types)
- [使用例](#使用例)
- [よくあるミス](#よくあるミス)

## Edge Function Types

### EdgeFunctionResponse<T>

すべてのEdge Functionが返す標準的なレスポンス形式です。

```typescript
import type { EdgeFunctionResponse, AIChatResponse } from '@/types'

// Edge Functionを呼び出し
const result: EdgeFunctionResponse<AIChatResponse> = await EdgeFunctionService.invoke(
  'ai-chat',
  { message: 'Hello!' }
)

// ❌ 間違い: data をチェックせずにアクセス
console.log(result.data.response)  // data が null の可能性

// ✅ 正しい: エラーチェックしてからアクセス
if (result.error) {
  console.error('Error:', result.error.message)
  return
}

console.log(result.data.response)  // 安全
```

### 主要なEdge Function型

#### AI Chat

```typescript
import type { AIChatRequest, AIChatResponse, EdgeFunctionResponse } from '@/types'

const request: AIChatRequest = {
  message: 'Explain TypeScript',
  provider: 'openai',
  model: 'gpt-4',
  temperature: 0.7,
}

const { data, error }: EdgeFunctionResponse<AIChatResponse> =
  await EdgeFunctionService.invoke('ai-chat', request)

if (error) {
  console.error(error.message)
  return
}

console.log(data.response)        // AI's response
console.log(data.model)           // Model used
console.log(data.usage?.totalTokens)  // Tokens consumed
```

#### Image Generation

```typescript
import type {
  ImageGenerationRequest,
  ImageGenerationEdgeResponse,
  EdgeFunctionResponse
} from '@/types'

const request: ImageGenerationRequest = {
  prompt: 'A beautiful sunset',
  provider: 'dalle',
  size: '1024x1024',
  quality: 'hd',
  style: 'vivid',
}

const { data, error }: EdgeFunctionResponse<ImageGenerationEdgeResponse> =
  await EdgeFunctionService.invoke('generate-image', request)

if (error) {
  console.error('Generation failed:', error.message)
  return
}

console.log(data.imageUrl)        // Generated image URL
console.log(data.revisedPrompt)   // DALL-E's revised prompt
```

#### ImageGenerationService (with Storage)

```typescript
import type {
  ImageGenerationServiceResponse,
  EdgeFunctionResponse
} from '@/types'

const { data, error }: EdgeFunctionResponse<ImageGenerationServiceResponse> =
  await ImageGenerationService.generate({
    prompt: 'A cute cat',
    provider: 'dalle',
  })

if (error) {
  console.error('Failed:', error.message)
  return
}

console.log(data.id)          // File ID in storage
console.log(data.publicUrl)   // Permanent public URL
console.log(data.provider)    // 'dalle'
console.log(data.model)       // Model used
```

#### Web Search

```typescript
import type { WebSearchRequest, WebSearchResponse, EdgeFunctionResponse } from '@/types'

const request: WebSearchRequest = {
  query: 'TypeScript best practices',
  maxResults: 10,
  searchDepth: 'advanced',
}

const { data, error }: EdgeFunctionResponse<WebSearchResponse> =
  await EdgeFunctionService.invoke('web-search', request)

if (error) {
  console.error('Search failed:', error.message)
  return
}

data.results.forEach(result => {
  console.log(result.title)
  console.log(result.url)
  console.log(result.content)
})
```

## Service Types

### EventService

```typescript
import type { SystemEvent, EventEmitOptions } from '@/types'

// Emit event (throws on error)
const event: SystemEvent = await EventService.emit(
  'job:generate-report',
  {
    reportType: 'sales',
    startDate: '2025-01-01',
    endDate: '2025-01-31',
  },
  {
    priority: 10,
    scheduledAt: new Date(Date.now() + 60000), // 1 minute delay
  } as EventEmitOptions
)

console.log(event.id)          // Event ID
console.log(event.status)      // 'pending'
console.log(event.progress)    // 0
```

### Job System

```typescript
import type { Job, JobHandler, JobContext } from '@/types'

// Define typed job handler
interface ReportParams {
  reportType: string
  startDate: string
  endDate: string
}

interface ReportResult {
  records: number
  revenue: number
  generatedAt: string
}

const generateReport: JobHandler<ReportParams, ReportResult> = async (
  params,
  context
) => {
  // params は ReportParams 型
  // context は JobContext 型

  await context.updateProgress(20)

  // TypeScript が型チェック
  const data = await fetchData(params.startDate, params.endDate)

  await context.updateProgress(60)

  return {
    records: data.length,
    revenue: calculateRevenue(data),
    generatedAt: new Date().toISOString(),
  }
}
```

### useJob Hook

```typescript
import { useJob } from '@/hooks/useJob'
import type { UseJobReturn } from '@/types'

function MyComponent({ jobId }: { jobId: string }) {
  const {
    job,
    progress,
    result,
    error,
    isLoading,
    isPending,
    isProcessing,
    isCompleted,
    isFailed,
    refetch,
  }: UseJobReturn = useJob(jobId, {
    onComplete: (result) => {
      console.log('Job completed:', result)
    },
    onError: (error) => {
      console.error('Job failed:', error)
    },
    onProgress: (progress) => {
      console.log(`Progress: ${progress}%`)
    },
  })

  if (isLoading) return <div>Loading...</div>
  if (isFailed) return <div>Error: {error}</div>
  if (isCompleted) return <div>Result: {JSON.stringify(result)}</div>

  return (
    <div>
      <progress value={progress} max={100} />
      <p>{progress}%</p>
    </div>
  )
}
```

## よくあるミス

### ❌ ミス1: `{ data, error }` を忘れる

```typescript
// ❌ 間違い
const result = await EdgeFunctionService.invoke('ai-chat', { message: 'Hi' })
console.log(result.response)  // undefined

// ✅ 正しい
const { data, error } = await EdgeFunctionService.invoke('ai-chat', { message: 'Hi' })
if (error) {
  console.error(error.message)
  return
}
console.log(data.response)  // 正しい
```

### ❌ ミス2: エラーチェックをスキップ

```typescript
// ❌ 間違い
const { data } = await EdgeFunctionService.invoke('generate-image', params)
console.log(data.imageUrl)  // data が null の可能性

// ✅ 正しい
const { data, error } = await EdgeFunctionService.invoke('generate-image', params)
if (error) {
  toast.error(`Failed: ${error.message}`)
  return
}
console.log(data.imageUrl)  // 安全
```

### ❌ ミス3: プロパティ名のタイポ

```typescript
// ❌ 間違い (JavaScriptの場合)
const { data, error } = await EdgeFunctionService.invoke('ai-chat', { message: 'Hi' })
console.log(data.responce)  // undefined (typo: responce)

// ✅ 正しい (TypeScriptの場合)
const { data, error }: EdgeFunctionResponse<AIChatResponse> =
  await EdgeFunctionService.invoke('ai-chat', { message: 'Hi' })

console.log(data.responce)  // ❌ TypeScript error: Property 'responce' does not exist
console.log(data.response)  // ✅ OK
```

### ❌ ミス4: Job Handler の型指定忘れ

```typescript
// ❌ 間違い (型なし)
const myHandler = async (params, context) => {
  // params.reportType のタイポに気づかない
  console.log(params.reprType)  // undefined
}

// ✅ 正しい (型あり)
import type { JobHandler } from '@/types'

interface MyParams {
  reportType: string
}

const myHandler: JobHandler<MyParams, any> = async (params, context) => {
  console.log(params.reprType)  // ❌ TypeScript error: Property 'reprType' does not exist
  console.log(params.reportType)  // ✅ OK
}
```

## TypeScript移行戦略

### 新規ファイル

**すべて `.tsx` / `.ts` で作成してください。**

```typescript
// ✅ Good: NewComponent.tsx
import type { EdgeFunctionResponse, AIChatResponse } from '@/types'

export function NewComponent() {
  const [response, setResponse] = useState<AIChatResponse | null>(null)

  const handleChat = async (message: string) => {
    const { data, error }: EdgeFunctionResponse<AIChatResponse> =
      await EdgeFunctionService.invoke('ai-chat', { message })

    if (error) {
      console.error(error.message)
      return
    }

    setResponse(data)
  }

  // ...
}
```

### 既存ファイルの移行

優先順位:
1. **models/** - データ構造の型安全性
2. **services/** - API呼び出しの型チェック
3. **repositories/** - データアクセス層
4. **hooks/** - 複雑なロジック
5. **components/** - UI層

移行時は `.jsx` → `.tsx` にリネームし、型を追加していきます。

## さらなる情報

- [TypeScript公式ドキュメント](https://www.typescriptlang.org/docs/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [Supabase TypeScript Guide](https://supabase.com/docs/guides/api/typescript-support)
