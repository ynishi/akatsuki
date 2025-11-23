# WASM Edge Function Integration - 設計ドキュメント

## 1. 概要

既存のWASM Runtime Component（`wasm-runtime-design.md`）をEdge Functionから利用可能にし、Admin/System/Userの3つのモジュールタイプで管理する包括的なWASMエコシステムを構築する。

**目的:**
- Edge FunctionからWASMモジュールを動的に実行可能に
- Admin/Systemモジュールの一元管理
- ユーザーアップロードWASMのサンドボックス実行
- VibeCodingとの統合（開発→デプロイの自動化）

**設計方針:**
- 既存の`wasm_modules`テーブルを拡張（破壊的変更なし）
- Edge Functionはストレージ読み込み + LRUキャッシュ
- 権限レベルに応じた実行制限
- Admin UIで全モジュールを可視化

---

## 2. DB Schema拡張

### 2.1. wasm_modules テーブルの拡張

```sql
-- 既存テーブルにカラム追加（ALTER TABLE）
ALTER TABLE public.wasm_modules
  ADD COLUMN owner_type text NOT NULL DEFAULT 'user'
    CHECK (owner_type IN ('system', 'admin', 'user'));

-- owner_typeのインデックス追加
CREATE INDEX idx_wasm_modules_owner_type
  ON public.wasm_modules(owner_type);

-- Composite index (owner_type + status)
CREATE INDEX idx_wasm_modules_owner_type_status
  ON public.wasm_modules(owner_type, status);

-- COMMENT追加
COMMENT ON COLUMN public.wasm_modules.owner_type IS
  'system: 組み込みモジュール（全ユーザー利用可）, admin: 管理者専用, user: ユーザーアップロード';
```

**owner_typeの定義:**
- `system`: 組み込みモジュール（画像処理、暗号化など）、全ユーザー利用可能、Immutable
- `admin`: 管理者専用モジュール（運用ツール、バッチ処理など）、管理者のみ実行可
- `user`: ユーザーアップロード、所有者+公開設定に応じて実行可

### 2.2. RLS Policies更新

```sql
-- System/Adminモジュールは管理者のみ作成可能
CREATE POLICY "Only admins can create system/admin modules"
  ON public.wasm_modules
  FOR INSERT
  WITH CHECK (
    (owner_type = 'user' AND owner_id = auth.uid())
    OR
    (owner_type IN ('system', 'admin') AND (SELECT is_admin()) = true)
  );

-- Systemモジュールは全員読み取り可能（ただしactive状態のみ）
CREATE POLICY "System modules are readable by everyone"
  ON public.wasm_modules
  FOR SELECT
  USING (owner_type = 'system' AND status = 'active');

-- Adminモジュールは管理者のみ読み取り可能
CREATE POLICY "Admin modules are readable by admins only"
  ON public.wasm_modules
  FOR SELECT
  USING (owner_type = 'admin' AND (SELECT is_admin()) = true);

-- System/Adminモジュールは管理者のみ更新・削除可能
CREATE POLICY "Only admins can update/delete system/admin modules"
  ON public.wasm_modules
  FOR UPDATE
  USING (
    (owner_type = 'user' AND owner_id = auth.uid())
    OR
    (owner_type IN ('system', 'admin') AND (SELECT is_admin()) = true)
  );
```

---

## 3. Edge Function設計

### 3.1. wasm-executor Edge Function

**責務:**
- Storage経由でWASMバイナリを取得
- LRUキャッシュで高速化
- タイムアウト・メモリ制限の適用
- 実行履歴の記録

**ディレクトリ構成:**
```
supabase/functions/wasm-executor/
├── index.ts              # メインハンドラー
├── wasm_loader.ts        # WASM読み込み＆キャッシュ
├── wasm_sandbox.ts       # サンドボックス実行
└── types.ts              # 型定義
```

#### 3.1.1. index.ts

```typescript
import { createAkatsukiHandler } from '../_shared/handler.ts'
import { ErrorCodes } from '../_shared/api_types.ts'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'
import { WasmLoader } from './wasm_loader.ts'
import { WasmSandbox } from './wasm_sandbox.ts'

// Input Schema
const InputSchema = z.object({
  moduleId: z.string().uuid(),
  functionName: z.string().min(1),
  args: z.array(z.any()).optional().default([]),
  timeoutMs: z.number().min(100).max(30000).optional(),
})

type Input = z.infer<typeof InputSchema>

// Output
interface Output {
  result: unknown
  executionTimeMs: number
  memoryUsedBytes: number | null
  cacheHit: boolean
}

Deno.serve(async (req) => {
  return createAkatsukiHandler<Input, Output>(req, {
    inputSchema: InputSchema,
    requireAuth: true,

    logic: async ({ input, userClient, adminClient, repos }) => {
      const { moduleId, functionName, args, timeoutMs } = input

      // 1. ユーザー認証
      const { data: { user }, error: userError } = await userClient.auth.getUser()
      if (userError || !user) {
        throw Object.assign(
          new Error('Unauthorized'),
          { code: ErrorCodes.UNAUTHORIZED, status: 401 }
        )
      }

      // 2. モジュールメタデータ取得（adminClient経由でRLS適用）
      const { data: wasmModule, error: moduleError } = await adminClient
        .from('wasm_modules')
        .select('*')
        .eq('id', moduleId)
        .eq('status', 'active')
        .single()

      if (moduleError || !wasmModule) {
        throw Object.assign(
          new Error(`WASM module not found or inactive: ${moduleId}`),
          { code: ErrorCodes.NOT_FOUND, status: 404 }
        )
      }

      // 3. 権限チェック
      const canExecute = checkExecutionPermission(wasmModule, user)
      if (!canExecute) {
        throw Object.assign(
          new Error('Permission denied to execute this module'),
          { code: ErrorCodes.FORBIDDEN, status: 403 }
        )
      }

      // 4. WASMモジュールをロード（キャッシュ活用）
      const { instance, cacheHit } = await WasmLoader.load(
        moduleId,
        wasmModule.file_id,
        adminClient
      )

      // 5. サンドボックス実行
      const startTime = performance.now()
      const result = await WasmSandbox.execute(instance, {
        functionName,
        args,
        timeoutMs: timeoutMs || wasmModule.timeout_ms,
        maxMemoryBytes: wasmModule.max_memory_pages
          ? wasmModule.max_memory_pages * 64 * 1024
          : undefined,
      })
      const executionTimeMs = Math.round(performance.now() - startTime)

      // 6. 実行履歴を記録（adminClient経由）
      await repos.wasmExecution.create({
        module_id: moduleId,
        executor_id: user.id,
        function_name: functionName,
        input_params: { args },
        output_result: result,
        execution_time_ms: executionTimeMs,
        memory_used_bytes: WasmSandbox.getMemoryUsage(instance),
        status: 'success',
        error_message: null,
      })

      return {
        result,
        executionTimeMs,
        memoryUsedBytes: WasmSandbox.getMemoryUsage(instance),
        cacheHit,
      }
    },

    // エラーハンドリング
    onError: async (error, { input, adminClient }) => {
      // エラー履歴も記録
      if (input?.moduleId) {
        const { data: { user } } = await adminClient.auth.getUser()
        if (user) {
          await adminClient.from('wasm_executions').insert({
            module_id: input.moduleId,
            executor_id: user.id,
            function_name: input.functionName || 'unknown',
            input_params: { args: input.args || [] },
            output_result: null,
            execution_time_ms: 0,
            memory_used_bytes: null,
            status: 'error',
            error_message: error.message,
          })
        }
      }
    },
  })
})

// 権限チェックロジック
function checkExecutionPermission(wasmModule: any, user: any): boolean {
  // Systemモジュールは全員OK
  if (wasmModule.owner_type === 'system') return true

  // Adminモジュールは管理者のみ
  if (wasmModule.owner_type === 'admin') {
    // TODO: is_admin()の実装確認
    return user.is_admin === true
  }

  // Userモジュールは所有者チェック
  if (wasmModule.owner_id === user.id) return true

  // 公開モジュール
  if (wasmModule.is_public) return true

  // 許可リスト
  if (wasmModule.allowed_users?.includes(user.id)) return true

  return false
}
```

#### 3.1.2. wasm_loader.ts

```typescript
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

interface LoadResult {
  instance: WebAssembly.Instance
  cacheHit: boolean
}

// LRUキャッシュ実装
class WasmModuleLRUCache {
  private cache = new Map<string, WebAssembly.Instance>()
  private maxSize = 20 // 最大20モジュール

  get(key: string): WebAssembly.Instance | undefined {
    const value = this.cache.get(key)
    if (value) {
      // LRU更新
      this.cache.delete(key)
      this.cache.set(key, value)
      console.log(`[WasmLoader] Cache HIT: ${key}`)
    }
    return value
  }

  set(key: string, value: WebAssembly.Instance): void {
    if (this.cache.size >= this.maxSize) {
      // 最古削除
      const firstKey = this.cache.keys().next().value
      console.log(`[WasmLoader] Cache EVICT: ${firstKey}`)
      this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
    console.log(`[WasmLoader] Cache SET: ${key}`)
  }

  clear(): void {
    this.cache.clear()
  }
}

export class WasmLoader {
  private static cache = new WasmModuleLRUCache()

  static async load(
    moduleId: string,
    fileId: string,
    supabase: SupabaseClient
  ): Promise<LoadResult> {
    // キャッシュチェック
    const cachedInstance = this.cache.get(moduleId)
    if (cachedInstance) {
      return { instance: cachedInstance, cacheHit: true }
    }

    console.log(`[WasmLoader] Loading module ${moduleId} from storage...`)

    // ファイルメタデータ取得
    const { data: file, error: fileError } = await supabase
      .from('files')
      .select('storage_path, bucket_name')
      .eq('id', fileId)
      .single()

    if (fileError || !file) {
      throw new Error(`File not found: ${fileId}`)
    }

    // Storage経由でバイナリ取得
    const { data: binaryBlob, error: downloadError } = await supabase.storage
      .from(file.bucket_name || 'private_uploads')
      .download(file.storage_path)

    if (downloadError || !binaryBlob) {
      throw new Error(`Failed to download WASM: ${downloadError?.message}`)
    }

    // ArrayBufferに変換
    const arrayBuffer = await binaryBlob.arrayBuffer()

    // コンパイル
    const module = await WebAssembly.compile(arrayBuffer)

    // インスタンス化（importsは必要に応じて拡張）
    const instance = await WebAssembly.instantiate(module, {
      env: {
        // ホスト関数（将来的に拡張可能）
        abort: () => {
          throw new Error('WASM abort called')
        },
      },
    })

    // キャッシュに保存
    this.cache.set(moduleId, instance)

    return { instance, cacheHit: false }
  }

  static clearCache(): void {
    this.cache.clear()
  }
}
```

#### 3.1.3. wasm_sandbox.ts

```typescript
export interface ExecuteOptions {
  functionName: string
  args: unknown[]
  timeoutMs: number
  maxMemoryBytes?: number
}

export class WasmSandbox {
  /**
   * WASM関数をサンドボックス実行（タイムアウト付き）
   */
  static async execute(
    instance: WebAssembly.Instance,
    options: ExecuteOptions
  ): Promise<unknown> {
    const { functionName, args, timeoutMs } = options

    // 関数存在チェック
    const exports = instance.exports as Record<string, unknown>
    if (typeof exports[functionName] !== 'function') {
      throw new Error(`Function "${functionName}" not found in WASM module`)
    }

    const func = exports[functionName] as CallableFunction

    // タイムアウト制御
    let timeoutId: number | null = null
    let didTimeout = false

    const executionPromise = new Promise((resolve, reject) => {
      timeoutId = setTimeout(() => {
        didTimeout = true
        reject(new Error(`Execution timeout (${timeoutMs}ms)`))
      }, timeoutMs)

      try {
        const result = func(...args)
        resolve(result)
      } catch (error) {
        reject(error)
      }
    })

    try {
      const result = await executionPromise
      return result
    } finally {
      if (timeoutId !== null && !didTimeout) {
        clearTimeout(timeoutId)
      }
    }
  }

  /**
   * メモリ使用量を取得
   */
  static getMemoryUsage(instance: WebAssembly.Instance): number | null {
    const exports = instance.exports as Record<string, unknown>
    if (exports.memory && exports.memory instanceof WebAssembly.Memory) {
      return exports.memory.buffer.byteLength
    }
    return null
  }

  /**
   * エクスポート関数一覧を取得
   */
  static getExportedFunctions(instance: WebAssembly.Instance): string[] {
    const exports = instance.exports as Record<string, unknown>
    return Object.keys(exports).filter((key) => typeof exports[key] === 'function')
  }
}
```

---

## 4. Repository層の拡張

### 4.1. WasmModuleRepository拡張

```typescript
// src/repositories/WasmModuleRepository.ts

export class WasmModuleRepository {
  // 既存メソッド...

  /**
   * owner_type別にモジュール一覧を取得
   */
  static async listByOwnerType(
    ownerType: 'system' | 'admin' | 'user'
  ): Promise<RepositoryResponse<WasmModule[]>> {
    try {
      const { data, error } = await supabase
        .from('wasm_modules')
        .select('*')
        .eq('owner_type', ownerType)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error

      const modules = (data || []).map((row) =>
        WasmModule.fromDatabase(row as WasmModuleDatabase)
      )

      return { data: modules, error: null }
    } catch (error) {
      console.error('[WasmModuleRepository] listByOwnerType error:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`モジュール一覧の取得に失敗: ${message}`) }
    }
  }

  /**
   * Systemモジュール一覧（全ユーザーが利用可能）
   */
  static async listSystemModules(): Promise<RepositoryResponse<WasmModule[]>> {
    return this.listByOwnerType('system')
  }

  /**
   * Adminモジュール一覧（管理者のみ）
   */
  static async listAdminModules(): Promise<RepositoryResponse<WasmModule[]>> {
    return this.listByOwnerType('admin')
  }

  /**
   * 実行可能なモジュール一覧（権限考慮）
   */
  static async listExecutable(): Promise<RepositoryResponse<WasmModule[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('認証が必要です')

      // System + 自分のUser + 公開User
      const { data, error } = await supabase
        .from('wasm_modules')
        .select('*')
        .eq('status', 'active')
        .or(`owner_type.eq.system,owner_id.eq.${user.id},is_public.eq.true`)
        .order('owner_type', { ascending: true }) // system → user
        .order('created_at', { ascending: false })

      if (error) throw error

      const modules = (data || []).map((row) =>
        WasmModule.fromDatabase(row as WasmModuleDatabase)
      )

      return { data: modules, error: null }
    } catch (error) {
      console.error('[WasmModuleRepository] listExecutable error:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`実行可能モジュールの取得に失敗: ${message}`) }
    }
  }
}
```

### 4.2. Model拡張

```typescript
// src/models/WasmModule.ts

export interface WasmModuleDatabase {
  // 既存フィールド...
  owner_type: 'system' | 'admin' | 'user' // 追加
}

export class WasmModule {
  constructor(
    // 既存フィールド...
    public ownerType: 'system' | 'admin' | 'user', // 追加
  ) {}

  static fromDatabase(data: WasmModuleDatabase): WasmModule {
    return new WasmModule(
      // 既存フィールド...
      data.owner_type, // 追加
    )
  }

  toDatabase(): Omit<WasmModuleDatabase, 'id' | 'created_at' | 'updated_at'> {
    return {
      // 既存フィールド...
      owner_type: this.ownerType, // 追加
    }
  }

  /**
   * モジュールタイプのバッジカラー
   */
  get typeBadgeColor(): string {
    switch (this.ownerType) {
      case 'system': return 'bg-blue-500'
      case 'admin': return 'bg-red-500'
      case 'user': return 'bg-green-500'
    }
  }

  /**
   * モジュールタイプの表示名
   */
  get typeDisplayName(): string {
    switch (this.ownerType) {
      case 'system': return 'System'
      case 'admin': return 'Admin'
      case 'user': return 'User'
    }
  }

  /**
   * システムモジュールか
   */
  get isSystem(): boolean {
    return this.ownerType === 'system'
  }

  /**
   * 管理者専用モジュールか
   */
  get isAdminOnly(): boolean {
    return this.ownerType === 'admin'
  }
}
```

---

## 5. Admin UI設計

### 5.1. WasmModuleAdminPage.tsx

```typescript
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useWasmModule } from '@/hooks/useWasmModule'
import { WasmModuleUploader } from '@/components/wasm/WasmModuleUploader'
import type { WasmModule } from '@/models/WasmModule'

export function WasmModuleAdminPage() {
  const [selectedTab, setSelectedTab] = useState<'system' | 'admin' | 'user'>('system')
  const { modules, isLoadingModules, deleteModule } = useWasmModule()

  // タイプ別にフィルタリング
  const systemModules = modules?.filter(m => m.ownerType === 'system') || []
  const adminModules = modules?.filter(m => m.ownerType === 'admin') || []
  const userModules = modules?.filter(m => m.ownerType === 'user') || []

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">WASM Module Management</h1>

      <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="system">
            System ({systemModules.length})
          </TabsTrigger>
          <TabsTrigger value="admin">
            Admin ({adminModules.length})
          </TabsTrigger>
          <TabsTrigger value="user">
            User ({userModules.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system">
          <div className="mb-4">
            <WasmModuleUploader ownerType="system" />
          </div>
          <WasmModuleList modules={systemModules} onDelete={deleteModule} />
        </TabsContent>

        <TabsContent value="admin">
          <div className="mb-4">
            <WasmModuleUploader ownerType="admin" />
          </div>
          <WasmModuleList modules={adminModules} onDelete={deleteModule} />
        </TabsContent>

        <TabsContent value="user">
          <WasmModuleList modules={userModules} onDelete={deleteModule} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function WasmModuleList({
  modules,
  onDelete
}: {
  modules: WasmModule[]
  onDelete: (id: string) => void
}) {
  return (
    <div className="space-y-4">
      {modules.map((module) => (
        <div key={module.id} className="border rounded-lg p-4 flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold">{module.moduleName}</h3>
              <Badge className={module.typeBadgeColor}>
                {module.typeDisplayName}
              </Badge>
              {module.isPublic && <Badge variant="outline">Public</Badge>}
              <Badge variant="secondary">{module.status}</Badge>
            </div>
            <p className="text-sm text-gray-600 mb-2">{module.description}</p>
            <div className="text-xs text-gray-500 space-y-1">
              <div>Version: {module.version}</div>
              <div>Size: {module.formattedSize}</div>
              <div>Functions: {module.exportedFunctions.join(', ')}</div>
              <div>Timeout: {module.timeoutMs}ms</div>
              <div>Memory: {module.memoryInfo}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Test
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(module.id)}
            >
              Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
```

### 5.2. WasmModuleUploader拡張

```typescript
export function WasmModuleUploader({
  ownerType = 'user',
  onUploadComplete,
}: {
  ownerType?: 'system' | 'admin' | 'user'
  onUploadComplete?: (moduleId: string) => void
}) {
  // 既存実装 + owner_type設定

  const handleUpload = async () => {
    // ...既存のアップロード処理...

    // wasm_modulesテーブルに登録
    const { data: wasmModule, error: createError } = await WasmModuleRepository.create({
      owner_id: user.id,
      file_id: uploadResult.id,
      module_name: moduleName,
      description: description || null,
      version,
      wasm_size_bytes: selectedFile.size,
      exported_functions: exportedFunctions,
      memory_pages: 1,
      max_memory_pages: null,
      timeout_ms: timeoutMs,
      max_execution_time_ms: 30000,
      is_public: ownerType === 'system', // Systemは自動的にPublic
      allowed_users: [],
      status: 'active',
      metadata: {},
      owner_type: ownerType, // ★追加
    })

    // ...
  }
}
```

---

## 6. セキュリティ設計

### 6.1. 権限レベル定義

| owner_type | 作成権限 | 実行権限 | 更新権限 | 削除権限 |
|-----------|---------|---------|---------|---------|
| system | Admin | All users | Admin | Admin |
| admin | Admin | Admin | Admin | Admin |
| user | All users | Owner + Public | Owner | Owner |

### 6.2. 実行制限

```typescript
// wasm_sandbox.tsの拡張

interface SandboxLimits {
  maxMemoryBytes: number
  maxExecutionTimeMs: number
  allowedHostFunctions: string[]
}

const SANDBOX_LIMITS: Record<string, SandboxLimits> = {
  system: {
    maxMemoryBytes: 100 * 1024 * 1024, // 100MB
    maxExecutionTimeMs: 30000, // 30秒
    allowedHostFunctions: ['env.abort', 'env.log'],
  },
  admin: {
    maxMemoryBytes: 500 * 1024 * 1024, // 500MB
    maxExecutionTimeMs: 60000, // 60秒
    allowedHostFunctions: ['env.abort', 'env.log', 'env.fetch'], // 拡張可能
  },
  user: {
    maxMemoryBytes: 50 * 1024 * 1024, // 50MB
    maxExecutionTimeMs: 10000, // 10秒
    allowedHostFunctions: ['env.abort'], // 最小限
  },
}
```

---

## 7. 実装計画

### Phase 1: DB拡張
- [ ] Migration作成（owner_type追加）
- [ ] RLS Policies更新
- [ ] Model/Repository拡張

### Phase 2: Edge Function
- [ ] wasm-executor実装
- [ ] wasm_loader実装
- [ ] wasm_sandbox実装
- [ ] テスト用WASMモジュール作成

### Phase 3: Admin UI
- [ ] WasmModuleAdminPage実装
- [ ] WasmModuleUploader拡張
- [ ] 権限チェック実装

### Phase 4: 統合テスト
- [ ] System/Admin/Userモジュールの動作確認
- [ ] パフォーマンステスト（キャッシュ効果確認）
- [ ] セキュリティテスト

---

## 8. 使用例

### 8.1. Systemモジュールの登録（Admin操作）

```bash
# 1. Rustで画像処理WASMをビルド
cd tools/wasm-modules/image-processor
cargo build --target wasm32-unknown-unknown --release
wasm-bindgen target/wasm32-unknown-unknown/release/image_processor.wasm \
  --out-dir dist --target web

# 2. Admin UIからアップロード
# - Owner Type: System
# - Module Name: image-resize
# - Functions: resize, crop, rotate
```

### 8.2. Edge Functionから実行

```typescript
// ai-chat Edge Functionから画像処理を呼び出す
const response = await fetch('https://<project>.supabase.co/functions/v1/wasm-executor', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    moduleId: 'system-image-resize-uuid',
    functionName: 'resize',
    args: [imageData, 800, 600],
  }),
})

const { result } = await response.json()
```

### 8.3. VibeCodingとの統合

```bash
# VibeCodingでWASM生成
akatsuki design "Create a WASM module for vintage photo filter"

# → Rust生成
# → cargo build --target wasm32-unknown-unknown
# → Admin UIに自動アップロード（owner_type: user）
# → 即座に実行可能
```

---

以上が、WASM Edge Integration の包括的な設計です。
