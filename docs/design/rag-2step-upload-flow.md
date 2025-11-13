# RAG 2-Step Upload Flow Design

## 概要

2-Step Upload Flowは、ファイルアップロード（Storage）とRAGインデックス化（Provider）を分離することで、単一責任原則を実現し、拡張性を高める設計パターンです。

**設計目標:**
- ファイルアップロードとインデックス化の責任分離
- エラー時の部分ロールバック
- 将来のWorkflow化を見据えた設計
- 型安全性の確保

## 問題

### Before（1-Function方式）

```
knowledge-file-upload Edge Function (300行):
  ├─ Supabase Storageアップロード (50行)
  ├─ filesテーブル作成 (30行)
  ├─ Gemini固有の処理 (100行)
  ├─ OpenAI固有の処理 (100行)
  └─ knowledge_filesテーブル作成 (20行)
```

**問題点:**
- ❌ 単一Functionに複数の責任
- ❌ Provider固有のエラーがStorage処理に影響
- ❌ Storageは成功したがインデックス化に失敗した場合の処理が複雑
- ❌ 画像生成等、他の用途でファイルアップロードを再利用できない
- ❌ Workflow化が困難

## 解決策: 2-Step Upload Flow

### After（2-Function方式）

```
┌───────────────────────────────────┐
│ file-upload (汎用的 - 50行)        │
│ - Supabase Storageアップロード    │
│ - filesテーブル作成               │
│ OUTPUT: file_id                   │
└───────────────────────────────────┘
              ↓ file_id
┌───────────────────────────────────┐
│ knowledge-file-index (RAG専用)    │
│ - file_idからファイル取得         │
│ - Providerにインデックス化        │
│ - knowledge_filesテーブル作成     │
└───────────────────────────────────┘
```

**メリット:**
- ✅ 単一責任: 各Functionが1つの役割
- ✅ 再利用性: file-uploadは複数用途で使用可能
- ✅ エラー分離: Storage失敗 vs Indexing失敗
- ✅ Workflow化が容易
- ✅ テスト容易性

## アーキテクチャ

### 全体フロー

```
┌────────────────────────────────────────────────────────┐
│                      Frontend                          │
│                                                        │
│  FileSearchService.uploadFile(storeId, file)          │
│    ↓                                                   │
│  [Internal 2-step flow]                               │
└────────────────────────────────────────────────────────┘
                       ↓
┌────────────────────────────────────────────────────────┐
│                  Step 1: file-upload                   │
│                                                        │
│  INPUT:                                                │
│    - File (FormData)                                   │
│    - bucket: 'private_uploads'                        │
│    - is_public: false                                 │
│    - metadata: { purpose: 'rag' }                     │
│                                                        │
│  PROCESSING:                                           │
│    1. Upload to Supabase Storage                      │
│    2. Create files table record                       │
│    3. Validate ownership                              │
│                                                        │
│  OUTPUT:                                               │
│    - file_id (UUID) ← 次のStepに渡す                  │
│    - storage_path                                      │
│    - file_name, file_size, mime_type                  │
│                                                        │
│  ERROR:                                                │
│    - Storage upload failed                            │
│    → Rollback: None (nothing created yet)             │
└────────────────────────────────────────────────────────┘
                       ↓ file_id
┌────────────────────────────────────────────────────────┐
│              Step 2: knowledge-file-index              │
│                                                        │
│  INPUT:                                                │
│    - file_id (UUID from Step 1) ← TYPE SAFE          │
│    - store_id (optional)                              │
│    - provider: 'gemini' | 'openai' | ...             │
│                                                        │
│  PROCESSING:                                           │
│    1. Get file record by file_id                      │
│    2. Verify ownership (files.owner_id = user.id)    │
│    3. Download from Supabase Storage (Signed URL)     │
│    4. Upload to Provider (Gemini/OpenAI/etc.)        │
│    5. Create knowledge_files table record             │
│                                                        │
│  OUTPUT:                                               │
│    - knowledge_file_id (UUID)                         │
│    - provider_file_name                               │
│    - indexing_status: 'completed'                     │
│                                                        │
│  ERROR:                                                │
│    - Indexing failed                                  │
│    → Rollback: None (file remains in Storage)        │
│    → User can retry indexing later                    │
└────────────────────────────────────────────────────────┘
```

## 詳細設計

### Step 1: file-upload Edge Function

**Location:** `supabase/functions/file-upload/index.ts`

**INPUT Schema (Zod):**
```typescript
const InputSchema = z.object({
  file: z.instanceof(File),                                    // REQUIRED
  bucket: z.enum(['public_assets', 'private_uploads'])         // REQUIRED
    .optional().default('private_uploads'),
  is_public: z.boolean().optional().default(false),
  storage_path: z.string().optional(),                         // Optional: custom path
  metadata: z.record(z.any()).optional(),                      // Optional: custom metadata
})
```

**OUTPUT Schema (TypeScript):**
```typescript
interface Output {
  file: {
    id: string              // files.id (UUID) ← Step 2に渡す
    owner_id: string
    storage_path: string
    bucket_name: string
    file_name: string
    file_size: number       // bytes
    mime_type: string
    is_public: boolean
    status: 'active'
    metadata: Record<string, any>
    created_at: string      // ISO 8601
  }
}
```

**処理フロー:**
```typescript
1. 認証チェック (userClient.auth.getUser())
2. Bucket検証 (valid bucket name)
3. FileRepository.uploadToStorage():
   a. Supabase Storage upload
   b. files table insert
   c. Rollback on failure (delete storage file)
4. Return file_id
```

**エラーハンドリング:**
```typescript
try {
  // Storage upload
  const { data: uploadData } = await supabase.storage.from(bucket).upload(...)

  // DB insert
  const fileRecord = await supabase.from('files').insert(...)
} catch (error) {
  // Rollback: Delete uploaded file
  await supabase.storage.from(bucket).remove([uploadData.path])
  throw error
}
```

### Step 2: knowledge-file-index Edge Function

**Location:** `supabase/functions/knowledge-file-index/index.ts`

**INPUT Schema (Zod):**
```typescript
const IndexFileInputSchema = z.object({
  mode: z.literal('index_file'),
  file_id: z.string().uuid(),                                  // REQUIRED from Step 1
  store_id: z.string().uuid().optional(),                      // Optional: create new store if not provided
  display_name: z.string().optional(),                         // Store display name (if creating)
  provider: z.enum(['gemini', 'openai', 'pinecone', ...])
    .optional().default('gemini'),
})
```

**OUTPUT Schema (TypeScript):**
```typescript
interface Output {
  knowledge_file: {
    id: string              // knowledge_files.id (UUID)
    file_id: string         // files.id (UUID) ← from INPUT
    store_id: string        // file_search_stores.id (UUID)
    provider_file_name: string  // Provider-specific identifier
    indexing_status: 'pending' | 'processing' | 'completed' | 'failed'
    created_at: string
  }
  store: {
    id: string
    name: string            // Provider-specific store identifier
    display_name: string
    provider: string
  }
}
```

**処理フロー:**
```typescript
1. 認証チェック
2. Get file record by file_id
3. Verify ownership (files.owner_id = user.id)
4. Get or create store
5. Download file from Supabase Storage (Signed URL)
6. Create temp file for Provider
7. Upload to Provider via RAGProviderClient
8. Create knowledge_files table record
9. Cleanup temp file
10. Return knowledge_file_id
```

**エラーハンドリング:**
```typescript
try {
  // Provider upload
  const uploadResult = await ragClient.uploadFile(...)

  // DB insert
  const knowledgeFile = await repos.knowledgeFile.create(...)

  return { knowledge_file, store }
} catch (error) {
  // Note: File remains in Supabase Storage
  // User can retry indexing later
  console.error('Indexing failed:', error)

  // Optional: Store failure in knowledge_files
  await repos.knowledgeFile.create({
    file_id,
    store_id,
    provider_file_name: '',
    indexing_status: 'failed',
    error_message: error.message
  })

  throw error
} finally {
  // Always cleanup temp file
  await Deno.remove(tempFilePath)
}
```

## Frontend統合

### FileSearchService.ts

**内部で2-step flowを実行:**

```typescript
static async uploadFile(
  storeId: string | null,
  file: File,
  options: UploadFileOptions = {}
): Promise<ServiceResponse<UploadFileResponse>> {
  try {
    // ========================================================================
    // Step 1: Upload to Supabase Storage
    // ========================================================================
    const storageFormData = new FormData()
    storageFormData.append('file', file)
    storageFormData.append('bucket', 'private_uploads')
    storageFormData.append('is_public', 'false')
    storageFormData.append('metadata', JSON.stringify({ purpose: 'rag' }))

    const { data: fileUploadResult, error: fileUploadError } =
      await EdgeFunctionService.invoke('file-upload', storageFormData, {
        isFormData: true,
      })

    if (fileUploadError) {
      return { data: null, error: fileUploadError }
    }

    const fileId = fileUploadResult.file.id

    // ========================================================================
    // Step 2: Index to RAG Provider
    // ========================================================================
    const indexPayload = {
      mode: 'index_file',
      file_id: fileId,          // ← TYPE SAFE: UUID from Step 1
      store_id: storeId,
      provider: options.provider || 'gemini',
    }

    const { data: indexResult, error: indexError } =
      await EdgeFunctionService.invoke('knowledge-file-index', indexPayload)

    if (indexError) {
      // TODO: Cleanup uploaded file from storage
      return { data: null, error: indexError }
    }

    return { data: indexResult, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}
```

## エラーシナリオ

### シナリオ1: Step 1失敗（Storage upload失敗）

```
User → Frontend → file-upload
                   ↓ (Storage upload failed)
                   ❌ Error: "Failed to upload file"

Result:
- ✅ Nothing created (clean state)
- ✅ User can retry
```

### シナリオ2: Step 1成功 → Step 2失敗（Indexing失敗）

```
User → Frontend → file-upload → ✅ file_id returned
                              ↓
                   knowledge-file-index
                              ↓ (Provider API error)
                              ❌ Error: "Failed to index file"

Result:
- ✅ File remains in Supabase Storage
- ✅ files table record exists
- ❌ knowledge_files table record not created
- ✅ User can retry indexing with same file_id
```

**リトライロジック:**
```typescript
// User can retry indexing
const { data, error } = await EdgeFunctionService.invoke('knowledge-file-index', {
  mode: 'index_file',
  file_id: existingFileId,  // ← Reuse file_id from Step 1
  store_id: storeId,
  provider: 'gemini'
})
```

### シナリオ3: Step 2成功後にProvider障害

```
User → Frontend → file-upload → ✅
                              ↓
                   knowledge-file-index → ✅ (indexed)
                              ↓ (Later: Provider service down)
                              ❌ Search queries fail

Result:
- ✅ File in Supabase Storage (backup)
- ✅ knowledge_files record exists
- ✅ Can re-index to different provider
```

**Provider切り替え:**
```typescript
// Re-index to different provider
const { data } = await EdgeFunctionService.invoke('knowledge-file-index', {
  mode: 'index_file',
  file_id: existingFileId,
  store_id: newStoreId,  // Different provider's store
  provider: 'openai'     // Switch from gemini to openai
})
```

## 型安全性

### file_idの厳密な型管理

**Step 1 OUTPUT:**
```typescript
interface Step1Output {
  file: {
    id: string  // UUID format validated by Zod
  }
}
```

**Step 2 INPUT:**
```typescript
const Step2InputSchema = z.object({
  file_id: z.string().uuid()  // ← Validates UUID format
})
```

**Frontend:**
```typescript
// TypeScript ensures file_id is passed correctly
const fileId: string = fileUploadResult.file.id  // UUID
const indexPayload = {
  file_id: fileId  // ← Type-checked
}
```

### Provider型の制限

```typescript
// Only valid providers are allowed
export type FileSearchProvider =
  | 'gemini'
  | 'openai'
  | 'pinecone'
  | 'anythingllm'
  | 'weaviate'

// TypeScript compile error if invalid provider
const provider: FileSearchProvider = 'invalid'  // ❌ Compile error
```

## パフォーマンス

### 処理時間

```
Total: 15-60秒

Step 1 (file-upload): 2-5秒
  - Supabase Storage upload: 1-3秒
  - DB insert: 0.5-1秒
  - Return response: 0.5-1秒

Step 2 (knowledge-file-index): 10-50秒
  - File download (Signed URL): 1-3秒
  - Provider upload: 5-30秒 (size dependent)
  - Provider indexing: 3-15秒 (provider dependent)
  - DB insert: 0.5-1秒
  - Return response: 0.5-1秒
```

### 最適化

**並列化（将来）:**
```typescript
// Multiple files upload
const fileIds = await Promise.all(
  files.map(file => uploadToStorage(file))
)

// Parallel indexing
await Promise.all(
  fileIds.map(fileId => indexToProvider(fileId, storeId))
)
```

**バックグラウンド化（将来）:**
```typescript
// Step 1: Immediate
const fileId = await uploadToStorage(file)

// Step 2: Background job
await createAsyncJob({
  event_type: 'job:index_file',
  params: { file_id: fileId, store_id: storeId }
})
```

## Workflow化（将来）

2-step flowはWorkflow化が容易：

```yaml
# workflow.yml
name: RAG File Upload Workflow
on:
  trigger: manual

jobs:
  upload:
    runs: file-upload
    outputs: file_id

  index:
    runs: knowledge-file-index
    needs: upload
    inputs:
      file_id: ${{ jobs.upload.outputs.file_id }}

  notify:
    runs: send-notification
    needs: index
    inputs:
      message: "File indexed successfully"
```

## まとめ

2-Step Upload Flowにより：
- ✅ 単一責任: ファイルアップロード vs インデックス化
- ✅ 再利用性: file-uploadは複数用途で使用可能
- ✅ エラー分離: Storage失敗 vs Indexing失敗
- ✅ 型安全性: file_id/store_id/providerの厳密な型管理
- ✅ 拡張性: Workflow化・バックグラウンド化が容易
- ✅ テスト容易性: 各Stepを独立してテスト可能

関連ドキュメント:
- `rag-file-search-architecture.md` - アーキテクチャ全体像
- `rag-provider-abstraction.md` - Provider抽象化パターン
