# RAG Provider Abstraction Pattern

## 概要

RAG Provider Abstraction Patternは、複数のFile Search Provider（Gemini, OpenAI, Pinecone等）を統一されたインターフェースで扱うための設計パターンです。

**設計目標:**
- Provider固有のバグを隔離
- 新しいProvider追加を容易に
- 型安全性を確保
- コード重複を削減

## 問題

### Before（Provider抽象化なし）

```typescript
// knowledge-file-upload/index.ts (抽象化前)
if (provider === 'gemini') {
  // Gemini固有のコード（100行）
  const ai = new GoogleGenAI({ apiKey })
  const fileSearchStore = await ai.fileSearchStores.create(...)
  const operation = await ai.fileSearchStores.uploadToFileSearchStore(...)
  // ... Gemini固有の処理
} else if (provider === 'openai') {
  // OpenAI固有のコード（100行）
  const openai = new OpenAI({ apiKey })
  const vectorStore = await openai.vectorStores.create(...)
  // ... OpenAI固有の処理
} else if (provider === 'pinecone') {
  // Pinecone固有のコード（100行）
  // ... Pinecone固有の処理
}
```

**問題点:**
- ❌ Edge Function が肥大化（300行超）
- ❌ Provider固有のバグがEdge Function全体に影響
- ❌ 新しいProvider追加時に既存コードを変更
- ❌ テストが困難
- ❌ コード重複

## 解決策: Provider Client Layer

### After（Provider抽象化あり）

```typescript
// knowledge-file-index/index.ts (抽象化後)
const ragClient = createRAGProvider(provider) // Factory Pattern
const store = await ragClient.createStore(displayName)
const result = await ragClient.uploadFile(params)
// Provider固有の処理は隠蔽される
```

**メリット:**
- ✅ Edge Functionがシンプル（50行）
- ✅ Provider固有のバグを隔離
- ✅ 新しいProvider追加が容易（既存コード変更不要）
- ✅ 単体テスト可能
- ✅ コード重複なし

## アーキテクチャ

```
┌─────────────────────────────────────────┐
│ Edge Functions                          │
│ - knowledge-file-index                  │
│ - ai-chat                               │
└─────────────────────────────────────────┘
              ↓ createRAGProvider()
┌─────────────────────────────────────────┐
│ RAGProviderFactory                      │
│ - Factory Pattern実装                   │
│ - Provider切り替え                      │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ RAGProviderInterface                    │
│ - 共通インターフェース定義               │
│ - 全Providerが実装                      │
└─────────────────────────────────────────┘
              ↓
┌──────────┬─────────┬──────────┬─────────┐
│ Gemini   │ OpenAI  │ Pinecone │ ...     │
│ RAGClient│ RAGClient│RAGClient│         │
│ [実装済み]│ [TODO]  │ [TODO]   │         │
└──────────┴─────────┴──────────┴─────────┘
```

## 実装

### 1. RAGProviderInterface（共通インターフェース）

**Location:** `supabase/functions/_shared/providers/rag-provider-interface.ts`

```typescript
export interface RAGProviderInterface {
  readonly providerName: string

  // Store Operations
  createStore(displayName: string): Promise<StoreResult>
  deleteStore(storeName: string): Promise<void>
  listFiles(storeName: string): Promise<FileInfo[]>

  // File Operations
  uploadFile(params: UploadFileParams): Promise<UploadResult>

  // Search Operations
  search(params: SearchParams): Promise<SearchResult>
}
```

**型定義:**

```typescript
// Store creation result
export interface StoreResult {
  name: string          // Provider-specific identifier
  displayName: string
}

// File upload parameters
export interface UploadFileParams {
  storeName: string
  file: File
  tempFilePath: string
  displayName?: string
  mimeType?: string
}

// File upload result
export interface UploadResult {
  fileName: string      // Provider-specific file identifier
  status: 'success' | 'processing' | 'failed'
  metadata?: Record<string, any>
}

// Search parameters
export interface SearchParams {
  storeNames: string[]
  query: string
  maxResults?: number
  options?: Record<string, any>
}

// Search result
export interface SearchResult {
  chunks: Array<{
    content: string
    score?: number
    metadata?: Record<string, any>
  }>
  groundingMetadata?: any
}
```

### 2. GeminiRAGClient（実装例）

**Location:** `supabase/functions/_shared/providers/gemini-rag-client.ts`

```typescript
import { GoogleGenAI } from 'npm:@google/genai@1.29.0'
import type { RAGProviderInterface, StoreResult, UploadFileParams, UploadResult } from './rag-provider-interface.ts'

export class GeminiRAGClient implements RAGProviderInterface {
  readonly providerName = 'gemini'
  private ai: GoogleGenAI

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey })
  }

  async createStore(displayName: string): Promise<StoreResult> {
    try {
      const fileSearchStore = await this.ai.fileSearchStores.create({
        config: { displayName }
      })

      return {
        name: fileSearchStore.name, // "corpora/xxx"
        displayName: displayName,
      }
    } catch (error: any) {
      throw new Error(`[GeminiRAGClient] Failed to create store: ${error.message}`)
    }
  }

  async uploadFile(params: UploadFileParams): Promise<UploadResult> {
    const { storeName, tempFilePath, displayName, mimeType } = params

    try {
      // Upload to File Search Store
      const operation = await this.ai.fileSearchStores.uploadToFileSearchStore({
        file: tempFilePath,
        fileSearchStoreName: storeName,
        config: { displayName, mimeType }
      })

      // Wait for completion
      let currentOperation = operation
      while (!currentOperation.done) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        currentOperation = await this.ai.operations.get({ name: currentOperation.name })
      }

      const geminiFileName = currentOperation.response?.name

      return {
        fileName: geminiFileName,
        status: 'success',
        metadata: { operation: currentOperation.name }
      }
    } catch (error: any) {
      throw new Error(`[GeminiRAGClient] Failed to upload file: ${error.message}`)
    }
  }

  // ... 他のメソッドも実装
}
```

### 3. RAGProviderFactory（Factory Pattern）

**Location:** `supabase/functions/_shared/providers/rag-provider-factory.ts`

```typescript
import type { RAGProviderInterface } from './rag-provider-interface.ts'
import { GeminiRAGClient } from './gemini-rag-client.ts'
import { OpenAIRAGClient } from './openai-rag-client.ts'
import { PineconeRAGClient } from './pinecone-rag-client.ts'

export type RAGProviderType = 'gemini' | 'openai' | 'pinecone' | 'anythingllm' | 'weaviate'

export function createRAGProvider(
  provider: RAGProviderType,
  options: RAGProviderOptions = {}
): RAGProviderInterface {
  switch (provider) {
    case 'gemini': {
      const apiKey = options.geminiApiKey || Deno.env.get('GEMINI_API_KEY')
      if (!apiKey) {
        throw new Error('[RAGProviderFactory] GEMINI_API_KEY is required')
      }
      return new GeminiRAGClient(apiKey)
    }

    case 'openai': {
      const apiKey = options.openaiApiKey || Deno.env.get('OPENAI_API_KEY')
      if (!apiKey) {
        throw new Error('[RAGProviderFactory] OPENAI_API_KEY is required')
      }
      return new OpenAIRAGClient(apiKey)
    }

    // ... 他のProviderも同様
  }
}

// Helper functions
export function getAvailableProviders(): RAGProviderType[] {
  const providers: RAGProviderType[] = []
  if (Deno.env.get('GEMINI_API_KEY')) providers.push('gemini')
  if (Deno.env.get('OPENAI_API_KEY')) providers.push('openai')
  if (Deno.env.get('PINECONE_API_KEY')) providers.push('pinecone')
  return providers
}

export function isProviderAvailable(provider: RAGProviderType): boolean {
  return getAvailableProviders().includes(provider)
}
```

### 4. Edge Functionでの使用

**Before:**
```typescript
// 300行のProviderごとの分岐処理
if (provider === 'gemini') { /* 100行 */ }
else if (provider === 'openai') { /* 100行 */ }
else if (provider === 'pinecone') { /* 100行 */ }
```

**After:**
```typescript
// たった3行
const ragClient = createRAGProvider(provider)
const store = await ragClient.createStore(displayName)
const result = await ragClient.uploadFile(params)
```

## Provider追加手順

### Step 1: Provider Client実装

```typescript
// new-provider-rag-client.ts
import type { RAGProviderInterface } from './rag-provider-interface.ts'

export class NewProviderRAGClient implements RAGProviderInterface {
  readonly providerName = 'new-provider'
  private client: any

  constructor(apiKey: string) {
    // Provider SDK初期化
  }

  async createStore(displayName: string): Promise<StoreResult> {
    // Provider APIでStore作成
  }

  async uploadFile(params: UploadFileParams): Promise<UploadResult> {
    // Provider APIでファイルアップロード
  }

  // ... 他のメソッドも実装
}
```

### Step 2: Factory登録

```typescript
// rag-provider-factory.ts
import { NewProviderRAGClient } from './new-provider-rag-client.ts'

export type RAGProviderType =
  | 'gemini'
  | 'openai'
  | 'pinecone'
  | 'new-provider' // 追加

export function createRAGProvider(provider: RAGProviderType): RAGProviderInterface {
  switch (provider) {
    // ... 既存のcase

    case 'new-provider': {
      const apiKey = Deno.env.get('NEW_PROVIDER_API_KEY')
      if (!apiKey) throw new Error('NEW_PROVIDER_API_KEY not configured')
      return new NewProviderRAGClient(apiKey)
    }
  }
}
```

### Step 3: DB Migration

```sql
-- file_search_stores のCHECK制約を更新
ALTER TABLE public.file_search_stores
DROP CONSTRAINT file_search_stores_provider_check;

ALTER TABLE public.file_search_stores
ADD CONSTRAINT file_search_stores_provider_check
CHECK (provider IN ('gemini', 'openai', 'pinecone', 'weaviate', 'new-provider'));
```

### Step 4: Frontend型更新

```typescript
// FileSearchService.ts
export type FileSearchProvider =
  | 'gemini'
  | 'openai'
  | 'pinecone'
  | 'weaviate'
  | 'new-provider'
```

**これで完了！** 既存のEdge Functionコードは一切変更不要です。

## Provider実装ガイド

各Provider Client実装時の注意点：

### Gemini
- File Search Storesを使用
- uploadToFileSearchStore() で直接アップロード
- Operation APIで完了待機
- Grounding metadataを取得可能

### OpenAI
- Vector Storesを使用
- ファイルアップロード → Vector Store添付の2段階
- Assistants API with file_search tool
- Citations取得可能

### Pinecone
- Vector Databaseを使用
- ファイルをchunk → embedding → upsert
- 独自のEmbedding model選択可能
- Metadata filteringサポート

### AnythingLLM
- Workspace概念を使用
- REST APIが簡潔
- 複数のVector DB/LLM Providerをサポート
- セルフホスト可能

## テスト

### Unit Test（Provider Client）

```typescript
import { GeminiRAGClient } from './gemini-rag-client.ts'

Deno.test('GeminiRAGClient: createStore', async () => {
  const client = new GeminiRAGClient(testApiKey)
  const store = await client.createStore('Test Store')

  assertEquals(store.displayName, 'Test Store')
  assert(store.name.startsWith('corpora/'))
})

Deno.test('GeminiRAGClient: uploadFile', async () => {
  const client = new GeminiRAGClient(testApiKey)
  const result = await client.uploadFile({
    storeName: 'corpora/test',
    file: testFile,
    tempFilePath: '/tmp/test.pdf',
    displayName: 'test.pdf',
    mimeType: 'application/pdf'
  })

  assertEquals(result.status, 'success')
  assert(result.fileName.includes('documents/'))
})
```

### Integration Test（Factory）

```typescript
import { createRAGProvider } from './rag-provider-factory.ts'

Deno.test('RAGProviderFactory: createProvider', () => {
  const gemini = createRAGProvider('gemini')
  assertEquals(gemini.providerName, 'gemini')

  const openai = createRAGProvider('openai')
  assertEquals(openai.providerName, 'openai')
})
```

## エラーハンドリング

### Provider固有のエラーを隔離

```typescript
try {
  const result = await ragClient.uploadFile(params)
} catch (error) {
  if (error.message.includes('[GeminiRAGClient]')) {
    // Gemini固有のエラー処理
    console.error('Gemini upload failed, trying fallback...')
  } else if (error.message.includes('[OpenAIRAGClient]')) {
    // OpenAI固有のエラー処理
  }
  throw error
}
```

### リトライロジック

```typescript
async function uploadWithRetry(
  ragClient: RAGProviderInterface,
  params: UploadFileParams,
  maxRetries = 3
): Promise<UploadResult> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await ragClient.uploadFile(params)
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)))
    }
  }
  throw new Error('Max retries exceeded')
}
```

## パフォーマンス

### Provider選択の指針

| Provider | Upload Speed | Search Speed | Cost | Complexity |
|----------|--------------|--------------|------|------------|
| Gemini | ⭐⭐⭐ | ⭐⭐⭐⭐ | Free Tier | ⭐⭐ |
| OpenAI | ⭐⭐⭐⭐ | ⭐⭐⭐ | $0.10/GB | ⭐⭐⭐ |
| Pinecone | ⭐⭐ | ⭐⭐⭐⭐⭐ | $70/month~ | ⭐⭐⭐⭐ |
| AnythingLLM | ⭐⭐⭐ | ⭐⭐⭐ | Self-host | ⭐⭐ |

## まとめ

Provider Abstraction Patternにより：
- ✅ Provider固有のバグを隔離
- ✅ 新しいProvider追加が容易（5つのステップ）
- ✅ コード重複を削減（300行 → 50行）
- ✅ テスト容易性を向上
- ✅ Edge Functionをシンプルに保つ

関連ドキュメント:
- `rag-file-search-architecture.md` - アーキテクチャ全体像
- `rag-2step-upload-flow.md` - 2-step Upload Flow設計
