# WASM Runtime Component - Detailed Design

## 1. 概要

Akatsukiに**WASM実行基盤コンポーネント**を追加し、VibeCodingで安全にWASMを利用できるようにする。

**目的:**
- VibeCodingでWASM実行コードを毎回書く必要をなくす
- メモリ管理、エラーハンドリング、タイムアウト等のバグを防ぐ
- `FileUpload`や`useImageGeneration`のように**すぐ使える高品質な部品**として提供

**設計方針:**
- 既存のAkatsukiアーキテクチャパターンに完全準拠
- 型安全性を最優先
- 本番品質のエラーハンドリング

---

## 2. DB Schema設計

### 2.1. wasm_modules テーブル

WASMモジュールのメタデータ管理（filesテーブルパターンを踏襲）

```sql
CREATE TABLE IF NOT EXISTS public.wasm_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Storage reference (WASMファイルはprivate_uploadsに保存)
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,

  -- Module information
  module_name text NOT NULL,
  description text,
  version text NOT NULL DEFAULT '1.0.0',

  -- WASM metadata
  wasm_size_bytes bigint NOT NULL,
  exported_functions jsonb NOT NULL DEFAULT '[]'::jsonb, -- ["add", "multiply", ...]
  memory_pages integer NOT NULL DEFAULT 1, -- 初期メモリページ数（1 page = 64KB）
  max_memory_pages integer, -- 最大メモリページ数（null = 制限なし）

  -- Execution settings
  timeout_ms integer NOT NULL DEFAULT 5000, -- デフォルト5秒タイムアウト
  max_execution_time_ms integer NOT NULL DEFAULT 30000, -- 絶対上限30秒

  -- Permissions
  is_public boolean NOT NULL DEFAULT false, -- true: 他ユーザーも実行可能
  allowed_users uuid[] DEFAULT ARRAY[]::uuid[], -- 特定ユーザーのみ許可

  -- Status
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('uploading', 'active', 'disabled', 'error')),

  -- Custom metadata
  metadata jsonb DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_wasm_modules_owner_id ON public.wasm_modules(owner_id);
CREATE INDEX idx_wasm_modules_file_id ON public.wasm_modules(file_id);
CREATE INDEX idx_wasm_modules_module_name ON public.wasm_modules(module_name);
CREATE INDEX idx_wasm_modules_is_public ON public.wasm_modules(is_public);
CREATE INDEX idx_wasm_modules_status ON public.wasm_modules(status);
CREATE INDEX idx_wasm_modules_created_at ON public.wasm_modules(created_at DESC);

-- Unique constraint (owner + module_name + version)
CREATE UNIQUE INDEX idx_wasm_modules_unique_name_version
  ON public.wasm_modules(owner_id, module_name, version);

-- Auto-update updated_at
CREATE TRIGGER trigger_update_wasm_modules_updated_at
  BEFORE UPDATE ON public.wasm_modules
  FOR EACH ROW
  EXECUTE FUNCTION update_files_updated_at(); -- 既存関数を再利用
```

**設計ポイント:**
- `file_id`で`files`テーブルと連携（Storage管理は既存システムを活用）
- `exported_functions`でWASM内の関数一覧を保存（フロントで選択可能に）
- `timeout_ms`でデフォルトタイムアウトを設定（無限ループ防止）
- `is_public`で他ユーザーとの共有をサポート
- `allowed_users`で細かい権限制御

---

### 2.2. wasm_executions テーブル

WASM実行履歴とログ（監査・デバッグ用）

```sql
CREATE TABLE IF NOT EXISTS public.wasm_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Module reference
  module_id uuid NOT NULL REFERENCES public.wasm_modules(id) ON DELETE CASCADE,

  -- Executor
  executor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Execution details
  function_name text NOT NULL,
  input_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_result jsonb, -- 成功時の結果

  -- Performance metrics
  execution_time_ms integer NOT NULL,
  memory_used_bytes bigint,

  -- Status
  status text NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
  error_message text, -- エラー時のメッセージ

  -- Timestamps
  executed_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_wasm_executions_module_id ON public.wasm_executions(module_id);
CREATE INDEX idx_wasm_executions_executor_id ON public.wasm_executions(executor_id);
CREATE INDEX idx_wasm_executions_status ON public.wasm_executions(status);
CREATE INDEX idx_wasm_executions_executed_at ON public.wasm_executions(executed_at DESC);

-- Composite index (module + status)
CREATE INDEX idx_wasm_executions_module_status
  ON public.wasm_executions(module_id, status);
```

**設計ポイント:**
- 全実行をログとして記録（監査証跡）
- `execution_time_ms`でパフォーマンス追跡
- `status`で成功/エラー/タイムアウトを明確に区別
- `memory_used_bytes`でメモリ使用量を記録（将来的な最適化に活用）

---

## 3. RLS Policies

### 3.1. wasm_modules

```sql
-- 自分のモジュールは全操作可能
CREATE POLICY "Users can manage their own modules"
  ON public.wasm_modules
  FOR ALL
  USING (owner_id = auth.uid());

-- 公開モジュールは誰でも読み取り可能
CREATE POLICY "Public modules are readable by anyone"
  ON public.wasm_modules
  FOR SELECT
  USING (is_public = true AND status = 'active');

-- 許可されたユーザーは読み取り可能
CREATE POLICY "Allowed users can read shared modules"
  ON public.wasm_modules
  FOR SELECT
  USING (auth.uid() = ANY(allowed_users) AND status = 'active');

-- 管理者は全操作可能
CREATE POLICY "Admins can manage all modules"
  ON public.wasm_modules
  FOR ALL
  USING ((SELECT is_admin()) = true);
```

### 3.2. wasm_executions

```sql
-- 自分の実行履歴は読み取り可能
CREATE POLICY "Users can read their own executions"
  ON public.wasm_executions
  FOR SELECT
  USING (executor_id = auth.uid());

-- 自分のモジュールの実行履歴は読み取り可能（モジュール所有者）
CREATE POLICY "Module owners can read executions"
  ON public.wasm_executions
  FOR SELECT
  USING (
    module_id IN (
      SELECT id FROM public.wasm_modules WHERE owner_id = auth.uid()
    )
  );

-- 実行履歴の挿入は認証済みユーザーのみ
CREATE POLICY "Authenticated users can insert executions"
  ON public.wasm_executions
  FOR INSERT
  WITH CHECK (executor_id = auth.uid());

-- 管理者は全読み取り可能
CREATE POLICY "Admins can read all executions"
  ON public.wasm_executions
  FOR SELECT
  USING ((SELECT is_admin()) = true);
```

---

## 4. Model層設計

### 4.1. WasmModule.ts

```typescript
/**
 * WasmModule Model
 * WASMモジュールのドメインモデル
 */
export interface WasmModuleDatabase {
  id: string
  owner_id: string
  file_id: string
  module_name: string
  description: string | null
  version: string
  wasm_size_bytes: number
  exported_functions: string[]
  memory_pages: number
  max_memory_pages: number | null
  timeout_ms: number
  max_execution_time_ms: number
  is_public: boolean
  allowed_users: string[]
  status: 'uploading' | 'active' | 'disabled' | 'error'
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export class WasmModule {
  constructor(
    public id: string,
    public ownerId: string,
    public fileId: string,
    public moduleName: string,
    public description: string | null,
    public version: string,
    public wasmSizeBytes: number,
    public exportedFunctions: string[],
    public memoryPages: number,
    public maxMemoryPages: number | null,
    public timeoutMs: number,
    public maxExecutionTimeMs: number,
    public isPublic: boolean,
    public allowedUsers: string[],
    public status: 'uploading' | 'active' | 'disabled' | 'error',
    public metadata: Record<string, unknown>,
    public createdAt: Date,
    public updatedAt: Date
  ) {}

  /**
   * DB形式 → アプリ形式
   */
  static fromDatabase(data: WasmModuleDatabase): WasmModule {
    return new WasmModule(
      data.id,
      data.owner_id,
      data.file_id,
      data.module_name,
      data.description,
      data.version,
      data.wasm_size_bytes,
      data.exported_functions,
      data.memory_pages,
      data.max_memory_pages,
      data.timeout_ms,
      data.max_execution_time_ms,
      data.is_public,
      data.allowed_users,
      data.status,
      data.metadata,
      new Date(data.created_at),
      new Date(data.updated_at)
    )
  }

  /**
   * アプリ形式 → DB形式
   */
  toDatabase(): Omit<WasmModuleDatabase, 'id' | 'created_at' | 'updated_at'> {
    return {
      owner_id: this.ownerId,
      file_id: this.fileId,
      module_name: this.moduleName,
      description: this.description,
      version: this.version,
      wasm_size_bytes: this.wasmSizeBytes,
      exported_functions: this.exportedFunctions,
      memory_pages: this.memoryPages,
      max_memory_pages: this.maxMemoryPages,
      timeout_ms: this.timeoutMs,
      max_execution_time_ms: this.maxExecutionTimeMs,
      is_public: this.isPublic,
      allowed_users: this.allowedUsers,
      status: this.status,
      metadata: this.metadata,
    }
  }

  /**
   * ユーザーが実行権限を持つか確認
   */
  canExecute(userId: string): boolean {
    // 所有者は常に実行可能
    if (this.ownerId === userId) return true

    // 公開モジュールは誰でも実行可能
    if (this.isPublic && this.status === 'active') return true

    // 許可リストに含まれているか
    if (this.allowedUsers.includes(userId)) return true

    return false
  }

  /**
   * サイズを人間が読みやすい形式に変換
   */
  get formattedSize(): string {
    const kb = this.wasmSizeBytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    const mb = kb / 1024
    return `${mb.toFixed(2)} MB`
  }

  /**
   * メモリ制限情報
   */
  get memoryInfo(): string {
    const initialMB = (this.memoryPages * 64) / 1024
    if (this.maxMemoryPages === null) {
      return `Initial: ${initialMB.toFixed(1)} MB (無制限)`
    }
    const maxMB = (this.maxMemoryPages * 64) / 1024
    return `Initial: ${initialMB.toFixed(1)} MB, Max: ${maxMB.toFixed(1)} MB`
  }
}
```

### 4.2. WasmExecution.ts

```typescript
/**
 * WasmExecution Model
 * WASM実行履歴のドメインモデル
 */
export interface WasmExecutionDatabase {
  id: string
  module_id: string
  executor_id: string
  function_name: string
  input_params: Record<string, unknown>
  output_result: unknown | null
  execution_time_ms: number
  memory_used_bytes: number | null
  status: 'success' | 'error' | 'timeout'
  error_message: string | null
  executed_at: string
}

export class WasmExecution {
  constructor(
    public id: string,
    public moduleId: string,
    public executorId: string,
    public functionName: string,
    public inputParams: Record<string, unknown>,
    public outputResult: unknown | null,
    public executionTimeMs: number,
    public memoryUsedBytes: number | null,
    public status: 'success' | 'error' | 'timeout',
    public errorMessage: string | null,
    public executedAt: Date
  ) {}

  /**
   * DB形式 → アプリ形式
   */
  static fromDatabase(data: WasmExecutionDatabase): WasmExecution {
    return new WasmExecution(
      data.id,
      data.module_id,
      data.executor_id,
      data.function_name,
      data.input_params,
      data.output_result,
      data.execution_time_ms,
      data.memory_used_bytes,
      data.status,
      data.error_message,
      new Date(data.executed_at)
    )
  }

  /**
   * アプリ形式 → DB形式
   */
  toDatabase(): Omit<WasmExecutionDatabase, 'id' | 'executed_at'> {
    return {
      module_id: this.moduleId,
      executor_id: this.executorId,
      function_name: this.functionName,
      input_params: this.inputParams,
      output_result: this.outputResult,
      execution_time_ms: this.executionTimeMs,
      memory_used_bytes: this.memoryUsedBytes,
      status: this.status,
      error_message: this.errorMessage,
    }
  }

  /**
   * 実行成功か
   */
  get isSuccess(): boolean {
    return this.status === 'success'
  }

  /**
   * パフォーマンス評価
   */
  get performanceRating(): 'fast' | 'normal' | 'slow' {
    if (this.executionTimeMs < 100) return 'fast'
    if (this.executionTimeMs < 1000) return 'normal'
    return 'slow'
  }

  /**
   * 実行時間を人間が読みやすい形式に変換
   */
  get formattedExecutionTime(): string {
    if (this.executionTimeMs < 1000) return `${this.executionTimeMs} ms`
    return `${(this.executionTimeMs / 1000).toFixed(2)} s`
  }

  /**
   * メモリ使用量を人間が読みやすい形式に変換
   */
  get formattedMemoryUsed(): string | null {
    if (this.memoryUsedBytes === null) return null
    const kb = this.memoryUsedBytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    const mb = kb / 1024
    return `${mb.toFixed(2)} MB`
  }
}
```

---

## 5. Repository層設計

### 5.1. WasmModuleRepository.ts

```typescript
import { supabase } from '@/lib/supabase'
import { WasmModule, WasmModuleDatabase } from '@/models/WasmModule'
import type { RepositoryResponse } from '@/types'

/**
 * WasmModule Repository
 * wasm_modulesテーブルへのCRUD操作
 */
export class WasmModuleRepository {
  /**
   * モジュール一覧を取得（自分のモジュール + 公開モジュール）
   */
  static async list(): Promise<RepositoryResponse<WasmModule[]>> {
    try {
      const { data, error } = await supabase
        .from('wasm_modules')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error

      const modules = (data || []).map((row) => WasmModule.fromDatabase(row as WasmModuleDatabase))

      return { data: modules, error: null }
    } catch (error) {
      console.error('[WasmModuleRepository] list error:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`モジュール一覧の取得に失敗: ${message}`) }
    }
  }

  /**
   * 自分のモジュール一覧を取得
   */
  static async listOwn(): Promise<RepositoryResponse<WasmModule[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('認証が必要です')

      const { data, error } = await supabase
        .from('wasm_modules')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const modules = (data || []).map((row) => WasmModule.fromDatabase(row as WasmModuleDatabase))

      return { data: modules, error: null }
    } catch (error) {
      console.error('[WasmModuleRepository] listOwn error:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`モジュール一覧の取得に失敗: ${message}`) }
    }
  }

  /**
   * IDでモジュールを取得
   */
  static async getById(id: string): Promise<RepositoryResponse<WasmModule>> {
    try {
      const { data, error } = await supabase
        .from('wasm_modules')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      if (!data) throw new Error('モジュールが見つかりません')

      const module = WasmModule.fromDatabase(data as WasmModuleDatabase)

      return { data: module, error: null }
    } catch (error) {
      console.error('[WasmModuleRepository] getById error:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`モジュールの取得に失敗: ${message}`) }
    }
  }

  /**
   * モジュールを作成
   */
  static async create(moduleData: Omit<WasmModuleDatabase, 'id' | 'created_at' | 'updated_at'>): Promise<RepositoryResponse<WasmModule>> {
    try {
      const { data, error } = await supabase
        .from('wasm_modules')
        .insert(moduleData)
        .select()
        .single()

      if (error) throw error
      if (!data) throw new Error('モジュールの作成に失敗しました')

      const module = WasmModule.fromDatabase(data as WasmModuleDatabase)

      return { data: module, error: null }
    } catch (error) {
      console.error('[WasmModuleRepository] create error:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`モジュールの作成に失敗: ${message}`) }
    }
  }

  /**
   * モジュールを更新
   */
  static async update(id: string, updates: Partial<WasmModuleDatabase>): Promise<RepositoryResponse<WasmModule>> {
    try {
      const { data, error } = await supabase
        .from('wasm_modules')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      if (!data) throw new Error('モジュールが見つかりません')

      const module = WasmModule.fromDatabase(data as WasmModuleDatabase)

      return { data: module, error: null }
    } catch (error) {
      console.error('[WasmModuleRepository] update error:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`モジュールの更新に失敗: ${message}`) }
    }
  }

  /**
   * モジュールを削除
   */
  static async delete(id: string): Promise<RepositoryResponse<void>> {
    try {
      const { error } = await supabase
        .from('wasm_modules')
        .delete()
        .eq('id', id)

      if (error) throw error

      return { data: undefined, error: null }
    } catch (error) {
      console.error('[WasmModuleRepository] delete error:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`モジュールの削除に失敗: ${message}`) }
    }
  }
}
```

### 5.2. WasmExecutionRepository.ts

```typescript
import { supabase } from '@/lib/supabase'
import { WasmExecution, WasmExecutionDatabase } from '@/models/WasmExecution'
import type { RepositoryResponse } from '@/types'

/**
 * WasmExecution Repository
 * wasm_executionsテーブルへのCRUD操作
 */
export class WasmExecutionRepository {
  /**
   * 実行履歴を記録
   */
  static async create(executionData: Omit<WasmExecutionDatabase, 'id' | 'executed_at'>): Promise<RepositoryResponse<WasmExecution>> {
    try {
      const { data, error } = await supabase
        .from('wasm_executions')
        .insert(executionData)
        .select()
        .single()

      if (error) throw error
      if (!data) throw new Error('実行履歴の記録に失敗しました')

      const execution = WasmExecution.fromDatabase(data as WasmExecutionDatabase)

      return { data: execution, error: null }
    } catch (error) {
      console.error('[WasmExecutionRepository] create error:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`実行履歴の記録に失敗: ${message}`) }
    }
  }

  /**
   * モジュールの実行履歴を取得
   */
  static async listByModule(moduleId: string, limit = 100): Promise<RepositoryResponse<WasmExecution[]>> {
    try {
      const { data, error } = await supabase
        .from('wasm_executions')
        .select('*')
        .eq('module_id', moduleId)
        .order('executed_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      const executions = (data || []).map((row) => WasmExecution.fromDatabase(row as WasmExecutionDatabase))

      return { data: executions, error: null }
    } catch (error) {
      console.error('[WasmExecutionRepository] listByModule error:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`実行履歴の取得に失敗: ${message}`) }
    }
  }

  /**
   * 自分の実行履歴を取得
   */
  static async listOwn(limit = 100): Promise<RepositoryResponse<WasmExecution[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('認証が必要です')

      const { data, error } = await supabase
        .from('wasm_executions')
        .select('*')
        .eq('executor_id', user.id)
        .order('executed_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      const executions = (data || []).map((row) => WasmExecution.fromDatabase(row as WasmExecutionDatabase))

      return { data: executions, error: null }
    } catch (error) {
      console.error('[WasmExecutionRepository] listOwn error:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`実行履歴の取得に失敗: ${message}`) }
    }
  }

  /**
   * モジュールの統計情報を取得
   */
  static async getStats(moduleId: string): Promise<RepositoryResponse<{
    totalExecutions: number
    successRate: number
    avgExecutionTime: number
  }>> {
    try {
      const { data, error } = await supabase
        .from('wasm_executions')
        .select('status, execution_time_ms')
        .eq('module_id', moduleId)

      if (error) throw error

      const executions = data || []
      const totalExecutions = executions.length
      const successCount = executions.filter((e) => e.status === 'success').length
      const successRate = totalExecutions > 0 ? (successCount / totalExecutions) * 100 : 0

      const avgExecutionTime = totalExecutions > 0
        ? executions.reduce((sum, e) => sum + e.execution_time_ms, 0) / totalExecutions
        : 0

      return {
        data: {
          totalExecutions,
          successRate,
          avgExecutionTime,
        },
        error: null,
      }
    } catch (error) {
      console.error('[WasmExecutionRepository] getStats error:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`統計情報の取得に失敗: ${message}`) }
    }
  }
}
```

---

## 6. Service層設計（最重要）

### 6.1. WasmRuntimeService.ts

**WASM実行の安全性を保証する核心部分**

```typescript
import type { EdgeFunctionResponse } from '@/types'

/**
 * WASM実行オプション
 */
export interface WasmExecutionOptions {
  functionName: string
  args?: unknown[]
  timeoutMs?: number
  memoryLimitBytes?: number
}

/**
 * WASM実行結果
 */
export interface WasmExecutionResult {
  result: unknown
  executionTimeMs: number
  memoryUsedBytes: number | null
}

/**
 * WASM Runtime Service
 * ブラウザでのWASM実行を安全に管理
 *
 * 重要な責務:
 * 1. メモリ管理（リーク防止）
 * 2. タイムアウト（無限ループ防止）
 * 3. エラーハンドリング（安全な復帰）
 * 4. パフォーマンス計測
 */
export class WasmRuntimeService {
  // モジュールキャッシュ（同じWASMを何度も読み込まない）
  private static moduleCache = new Map<string, WebAssembly.Module>()

  // インスタンスキャッシュ（再利用可能なインスタンス）
  private static instanceCache = new Map<string, WebAssembly.Instance>()

  /**
   * WASMバイナリからモジュールをロード（キャッシュ対応）
   *
   * @param wasmBytes - WASMバイナリ（ArrayBuffer）
   * @param cacheKey - キャッシュキー（file_id等）
   * @returns WebAssembly.Module
   */
  static async loadModule(wasmBytes: ArrayBuffer, cacheKey?: string): Promise<WebAssembly.Module> {
    try {
      // キャッシュチェック
      if (cacheKey && this.moduleCache.has(cacheKey)) {
        console.log('[WasmRuntimeService] Module loaded from cache:', cacheKey)
        return this.moduleCache.get(cacheKey)!
      }

      console.log('[WasmRuntimeService] Compiling WASM module...')
      const startTime = performance.now()

      // WASMコンパイル
      const module = await WebAssembly.compile(wasmBytes)

      const compileTime = performance.now() - startTime
      console.log(`[WasmRuntimeService] Module compiled in ${compileTime.toFixed(2)}ms`)

      // キャッシュに保存
      if (cacheKey) {
        this.moduleCache.set(cacheKey, module)
      }

      return module
    } catch (error) {
      console.error('[WasmRuntimeService] Module compilation failed:', error)
      throw new Error(`WASMモジュールのコンパイルに失敗: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * WASMモジュールをインスタンス化
   *
   * @param module - WebAssembly.Module
   * @param imports - インポートオブジェクト（必要に応じて）
   * @returns WebAssembly.Instance
   */
  static async instantiate(
    module: WebAssembly.Module,
    imports?: WebAssembly.Imports
  ): Promise<WebAssembly.Instance> {
    try {
      console.log('[WasmRuntimeService] Instantiating WASM module...')
      const startTime = performance.now()

      const instance = await WebAssembly.instantiate(module, imports || {})

      const instantiateTime = performance.now() - startTime
      console.log(`[WasmRuntimeService] Module instantiated in ${instantiateTime.toFixed(2)}ms`)

      return instance
    } catch (error) {
      console.error('[WasmRuntimeService] Module instantiation failed:', error)
      throw new Error(`WASMモジュールのインスタンス化に失敗: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * WASM関数を実行（タイムアウト・エラーハンドリング付き）
   *
   * @param instance - WebAssembly.Instance
   * @param options - 実行オプション
   * @returns 実行結果
   *
   * @throws タイムアウト、実行エラー
   */
  static async execute(
    instance: WebAssembly.Instance,
    options: WasmExecutionOptions
  ): Promise<EdgeFunctionResponse<WasmExecutionResult>> {
    const { functionName, args = [], timeoutMs = 5000 } = options

    try {
      // 関数が存在するか確認
      const exports = instance.exports as Record<string, unknown>
      if (typeof exports[functionName] !== 'function') {
        throw new Error(`関数 "${functionName}" が見つかりません`)
      }

      const func = exports[functionName] as (...args: unknown[]) => unknown

      console.log('[WasmRuntimeService] Executing function:', functionName, 'with args:', args)

      // タイムアウト制御付き実行
      const startTime = performance.now()
      let timeoutId: number | null = null
      let didTimeout = false

      const executionPromise = new Promise((resolve, reject) => {
        // タイムアウトタイマー
        timeoutId = window.setTimeout(() => {
          didTimeout = true
          reject(new Error(`実行がタイムアウトしました (${timeoutMs}ms)`))
        }, timeoutMs)

        try {
          // WASM関数を実行
          const result = func(...args)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })

      // 実行待機
      const result = await executionPromise

      // タイムアウトタイマークリア
      if (timeoutId !== null && !didTimeout) {
        clearTimeout(timeoutId)
      }

      const executionTimeMs = Math.round(performance.now() - startTime)

      console.log(`[WasmRuntimeService] Execution completed in ${executionTimeMs}ms`)

      // メモリ使用量取得（memory exportがある場合）
      let memoryUsedBytes: number | null = null
      if (exports.memory && exports.memory instanceof WebAssembly.Memory) {
        memoryUsedBytes = exports.memory.buffer.byteLength
      }

      return {
        data: {
          result,
          executionTimeMs,
          memoryUsedBytes,
        },
        error: null,
      }
    } catch (error) {
      console.error('[WasmRuntimeService] Execution failed:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`WASM実行に失敗: ${message}`) }
    }
  }

  /**
   * WASMファイルを取得してロード・実行（ワンストップAPI）
   *
   * @param fileId - filesテーブルのID
   * @param options - 実行オプション
   * @returns 実行結果
   */
  static async executeFromFile(
    fileId: string,
    options: WasmExecutionOptions
  ): Promise<EdgeFunctionResponse<WasmExecutionResult>> {
    try {
      // PrivateStorageService経由でWASMファイルを取得
      // （実装は次ステップ: PrivateStorageService.download() を使用）
      throw new Error('executeFromFile は未実装です（次のステップで実装）')
    } catch (error) {
      console.error('[WasmRuntimeService] executeFromFile failed:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`ファイルからの実行に失敗: ${message}`) }
    }
  }

  /**
   * モジュールキャッシュをクリア
   */
  static clearCache(cacheKey?: string): void {
    if (cacheKey) {
      this.moduleCache.delete(cacheKey)
      this.instanceCache.delete(cacheKey)
      console.log('[WasmRuntimeService] Cache cleared for key:', cacheKey)
    } else {
      this.moduleCache.clear()
      this.instanceCache.clear()
      console.log('[WasmRuntimeService] All cache cleared')
    }
  }

  /**
   * エクスポートされた関数一覧を取得
   *
   * @param instance - WebAssembly.Instance
   * @returns 関数名の配列
   */
  static getExportedFunctions(instance: WebAssembly.Instance): string[] {
    const exports = instance.exports as Record<string, unknown>
    return Object.keys(exports).filter((key) => typeof exports[key] === 'function')
  }

  /**
   * メモリ情報を取得
   *
   * @param instance - WebAssembly.Instance
   * @returns メモリ情報
   */
  static getMemoryInfo(instance: WebAssembly.Instance): {
    currentBytes: number
    currentPages: number
    maxPages: number | null
  } | null {
    const exports = instance.exports as Record<string, unknown>
    if (!exports.memory || !(exports.memory instanceof WebAssembly.Memory)) {
      return null
    }

    const memory = exports.memory
    const currentBytes = memory.buffer.byteLength
    const currentPages = currentBytes / (64 * 1024) // 1 page = 64KB

    return {
      currentBytes,
      currentPages,
      maxPages: null, // WebAssembly.Memory には max 情報がない
    }
  }
}
```

**設計ポイント:**
- **タイムアウト制御**: `setTimeout` で無限ループを防ぐ
- **メモリ管理**: モジュールキャッシュで再コンパイルを防ぐ
- **エラーハンドリング**: 全てtry-catchで包み、`{ data, error }` 形式で返す
- **パフォーマンス計測**: `performance.now()` で実行時間を記録
- **型安全性**: TypeScriptで厳密な型定義

---

## 7. Hook層設計

### 7.1. useWasmModule.ts

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { WasmModuleRepository } from '@/repositories/WasmModuleRepository'
import { WasmExecutionRepository } from '@/repositories/WasmExecutionRepository'
import { WasmRuntimeService, WasmExecutionOptions, WasmExecutionResult } from '@/services/WasmRuntimeService'
import type { WasmModule } from '@/models/WasmModule'
import type { WasmExecution } from '@/models/WasmExecution'
import type { EdgeFunctionResponse } from '@/types'

/**
 * WASM実行パラメータ
 */
interface ExecuteWasmParams {
  moduleId: string
  functionName: string
  args?: unknown[]
  timeoutMs?: number
}

/**
 * useWasmModule Hook
 * WASMモジュールの管理・実行を統合
 *
 * ImageGenerationServiceと同じパターン
 */
export function useWasmModule() {
  const queryClient = useQueryClient()

  // モジュール一覧取得
  const {
    data: modules,
    isLoading: isLoadingModules,
    error: modulesError,
    refetch: refetchModules,
  } = useQuery({
    queryKey: ['wasm-modules'],
    queryFn: async () => {
      const { data, error } = await WasmModuleRepository.list()
      if (error) throw error
      return data
    },
  })

  // 自分のモジュール一覧取得
  const {
    data: ownModules,
    isLoading: isLoadingOwnModules,
    error: ownModulesError,
    refetch: refetchOwnModules,
  } = useQuery({
    queryKey: ['wasm-modules', 'own'],
    queryFn: async () => {
      const { data, error } = await WasmModuleRepository.listOwn()
      if (error) throw error
      return data
    },
  })

  // モジュール削除
  const deleteMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      const { error } = await WasmModuleRepository.delete(moduleId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wasm-modules'] })
    },
  })

  // WASM実行
  const executeMutation = useMutation({
    mutationFn: async (params: ExecuteWasmParams): Promise<WasmExecutionResult> => {
      const { moduleId, functionName, args, timeoutMs } = params

      // モジュール取得
      const { data: module, error: moduleError } = await WasmModuleRepository.getById(moduleId)
      if (moduleError || !module) throw moduleError || new Error('モジュールが見つかりません')

      // TODO: PrivateStorageService経由でWASMファイル取得
      // const { data: fileData, error: fileError } = await PrivateStorageService.download(module.fileId)
      // if (fileError) throw fileError

      // 仮実装: executeFromFile を使う（次のステップで実装）
      const { data: result, error: executeError } = await WasmRuntimeService.executeFromFile(
        module.fileId,
        { functionName, args, timeoutMs: timeoutMs || module.timeoutMs }
      )

      if (executeError || !result) throw executeError || new Error('実行に失敗しました')

      // 実行履歴を記録
      await WasmExecutionRepository.create({
        module_id: moduleId,
        executor_id: '', // 自動取得（Repository内で取得）
        function_name: functionName,
        input_params: args ? { args } : {},
        output_result: result.result,
        execution_time_ms: result.executionTimeMs,
        memory_used_bytes: result.memoryUsedBytes,
        status: 'success',
        error_message: null,
      })

      return result
    },
    onError: async (error, params) => {
      // エラー時も履歴を記録
      await WasmExecutionRepository.create({
        module_id: params.moduleId,
        executor_id: '',
        function_name: params.functionName,
        input_params: params.args ? { args: params.args } : {},
        output_result: null,
        execution_time_ms: 0,
        memory_used_bytes: null,
        status: 'error',
        error_message: error instanceof Error ? error.message : String(error),
      })
    },
  })

  return {
    // モジュール一覧
    modules,
    ownModules,
    isLoadingModules,
    isLoadingOwnModules,
    modulesError,
    ownModulesError,
    refetchModules,
    refetchOwnModules,

    // モジュール削除
    deleteModule: deleteMutation.mutate,
    deleteModuleAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,

    // WASM実行
    execute: executeMutation.mutate,
    executeAsync: executeMutation.mutateAsync,
    isExecuting: executeMutation.isPending,
    executionError: executeMutation.error,
    executionResult: executeMutation.data,
  }
}

/**
 * useWasmExecutionHistory Hook
 * 実行履歴の取得
 */
export function useWasmExecutionHistory(moduleId?: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: moduleId ? ['wasm-executions', moduleId] : ['wasm-executions', 'own'],
    queryFn: async () => {
      if (moduleId) {
        const { data, error } = await WasmExecutionRepository.listByModule(moduleId)
        if (error) throw error
        return data
      } else {
        const { data, error } = await WasmExecutionRepository.listOwn()
        if (error) throw error
        return data
      }
    },
  })

  return {
    executions: data,
    isLoading,
    error,
    refetch,
  }
}

/**
 * useWasmModuleStats Hook
 * モジュール統計情報の取得
 */
export function useWasmModuleStats(moduleId: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['wasm-module-stats', moduleId],
    queryFn: async () => {
      const { data, error } = await WasmExecutionRepository.getStats(moduleId)
      if (error) throw error
      return data
    },
  })

  return {
    stats: data,
    isLoading,
    error,
    refetch,
  }
}
```

---

## 8. Component層設計

### 8.1. WasmModuleUploader.tsx

```typescript
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PrivateStorageService } from '@/services/PrivateStorageService'
import { WasmModuleRepository } from '@/repositories/WasmModuleRepository'
import { WasmRuntimeService } from '@/services/WasmRuntimeService'
import { FileUtils } from '@/utils/FileUtils'

/**
 * WasmModuleUploader Component
 * WASMモジュールのアップロード・登録UI
 *
 * FileUploadコンポーネントと同じパターン
 */
export function WasmModuleUploader({
  onUploadComplete,
}: {
  onUploadComplete?: (moduleId: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // フォーム入力
  const [moduleName, setModuleName] = useState('')
  const [description, setDescription] = useState('')
  const [version, setVersion] = useState('1.0.0')
  const [timeoutMs, setTimeoutMs] = useState(5000)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // WASMファイル検証
    if (!file.name.endsWith('.wasm')) {
      setError('WASMファイル（.wasm）を選択してください')
      return
    }

    setSelectedFile(file)
    setError(null)

    // ファイル名からモジュール名を推測
    if (!moduleName) {
      const baseName = file.name.replace('.wasm', '')
      setModuleName(baseName)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('ファイルを選択してください')
      return
    }

    if (!moduleName.trim()) {
      setError('モジュール名を入力してください')
      return
    }

    setUploading(true)
    setError(null)

    try {
      console.log('[WasmModuleUploader] Uploading WASM file...')

      // Step 1: WASMファイルをPrivate Storageにアップロード
      const uploadResult = await PrivateStorageService.uploadDocument(selectedFile, {
        folder: 'wasm-modules',
        metadata: {
          type: 'wasm_module',
          module_name: moduleName,
          version,
        },
      })

      console.log('[WasmModuleUploader] File uploaded:', uploadResult.id)

      // Step 2: WASMバイナリを取得してメタデータ抽出
      const wasmBytes = await selectedFile.arrayBuffer()
      const module = await WasmRuntimeService.loadModule(wasmBytes)
      const instance = await WasmRuntimeService.instantiate(module)
      const exportedFunctions = WasmRuntimeService.getExportedFunctions(instance)

      console.log('[WasmModuleUploader] Exported functions:', exportedFunctions)

      // Step 3: wasm_modulesテーブルに登録
      const { data: wasmModule, error: createError } = await WasmModuleRepository.create({
        owner_id: '', // 自動取得（Repository内で取得）
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
        is_public: false,
        allowed_users: [],
        status: 'active',
        metadata: {},
      })

      if (createError || !wasmModule) {
        throw createError || new Error('モジュールの登録に失敗しました')
      }

      console.log('[WasmModuleUploader] Module registered:', wasmModule.id)

      // 完了コールバック
      if (onUploadComplete) {
        onUploadComplete(wasmModule.id)
      }

      // フォームリセット
      setSelectedFile(null)
      setModuleName('')
      setDescription('')
      setVersion('1.0.0')
      setTimeoutMs(5000)
    } catch (err) {
      console.error('[WasmModuleUploader] Upload error:', err)
      const errorMessage = err instanceof Error ? err.message : String(err)
      setError(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">WASMモジュールをアップロード</h3>

      {/* File Input */}
      <div>
        <label className="block text-sm font-medium mb-2">WASMファイル (.wasm)</label>
        <input
          type="file"
          accept=".wasm"
          onChange={handleFileSelect}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-purple-500 file:to-blue-500 file:text-white hover:file:opacity-90"
        />
        {selectedFile && (
          <p className="text-xs text-gray-500 mt-1">
            {selectedFile.name} ({FileUtils.formatFileSize(selectedFile.size)})
          </p>
        )}
      </div>

      {/* Module Name */}
      <div>
        <label className="block text-sm font-medium mb-2">モジュール名</label>
        <input
          type="text"
          value={moduleName}
          onChange={(e) => setModuleName(e.target.value)}
          placeholder="my-wasm-module"
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-2">説明（任意）</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="このモジュールの機能..."
          className="w-full px-3 py-2 border rounded-lg"
          rows={3}
        />
      </div>

      {/* Version & Timeout */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">バージョン</label>
          <input
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="1.0.0"
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">タイムアウト (ms)</label>
          <input
            type="number"
            value={timeoutMs}
            onChange={(e) => setTimeoutMs(Number(e.target.value))}
            min={100}
            max={30000}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      </div>

      {/* Upload Button */}
      <Button
        onClick={handleUpload}
        disabled={uploading || !selectedFile || !moduleName}
        variant="gradient"
        className="w-full"
      >
        {uploading ? 'アップロード中...' : 'アップロード'}
      </Button>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
```

### 8.2. WasmExecutor.tsx

```typescript
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useWasmModule } from '@/hooks/useWasmModule'
import type { WasmModule } from '@/models/WasmModule'

/**
 * WasmExecutor Component
 * WASMモジュールの実行UI
 */
export function WasmExecutor({ module }: { module: WasmModule }) {
  const { executeAsync, isExecuting, executionError, executionResult } = useWasmModule()

  const [selectedFunction, setSelectedFunction] = useState(module.exportedFunctions[0] || '')
  const [argsInput, setArgsInput] = useState('[]')
  const [result, setResult] = useState<unknown>(null)

  const handleExecute = async () => {
    try {
      // 引数をパース
      const args = JSON.parse(argsInput)
      if (!Array.isArray(args)) {
        throw new Error('引数は配列形式で入力してください（例: [1, 2]）')
      }

      // 実行
      const execResult = await executeAsync({
        moduleId: module.id,
        functionName: selectedFunction,
        args,
      })

      setResult(execResult.result)
    } catch (error) {
      console.error('Execution error:', error)
      setResult({ error: error instanceof Error ? error.message : String(error) })
    }
  }

  return (
    <div className="space-y-4 border rounded-lg p-4">
      <h3 className="text-lg font-semibold">実行: {module.moduleName}</h3>

      {/* Function Select */}
      <div>
        <label className="block text-sm font-medium mb-2">関数を選択</label>
        <select
          value={selectedFunction}
          onChange={(e) => setSelectedFunction(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
        >
          {module.exportedFunctions.map((func) => (
            <option key={func} value={func}>
              {func}
            </option>
          ))}
        </select>
      </div>

      {/* Args Input */}
      <div>
        <label className="block text-sm font-medium mb-2">引数（JSON配列）</label>
        <input
          type="text"
          value={argsInput}
          onChange={(e) => setArgsInput(e.target.value)}
          placeholder="[1, 2, 3]"
          className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
        />
      </div>

      {/* Execute Button */}
      <Button onClick={handleExecute} disabled={isExecuting} variant="gradient" className="w-full">
        {isExecuting ? '実行中...' : '実行'}
      </Button>

      {/* Result Display */}
      {result !== null && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold mb-2">実行結果:</h4>
          <pre className="bg-gray-100 p-3 rounded-lg text-sm overflow-x-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {/* Error Display */}
      {executionError && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {executionError.message}
        </div>
      )}
    </div>
  )
}
```

---

## 9. 次のステップ

### Phase 1: 基盤実装
1. ✅ DB schema設計完了
2. ⏳ Migration作成
3. ⏳ Model/Repository実装
4. ⏳ Service実装（WasmRuntimeService）
5. ⏳ Hook実装（useWasmModule）

### Phase 2: UI実装
6. ⏳ WasmModuleUploader実装
7. ⏳ WasmExecutor実装
8. ⏳ 管理画面（モジュール一覧・削除）

### Phase 3: 統合・テスト
9. ⏳ サンプルWASMモジュール作成（Rust）
10. ⏳ E2Eテスト
11. ⏳ ドキュメント作成（AGENT.mdに追加）

---

## 10. 参考実装

### サンプルWASMモジュール（Rust）

```rust
// src/lib.rs
#[no_mangle]
pub extern "C" fn add(a: i32, b: i32) -> i32 {
    a + b
}

#[no_mangle]
pub extern "C" fn multiply(a: i32, b: i32) -> i32 {
    a * b
}

#[no_mangle]
pub extern "C" fn fibonacci(n: i32) -> i32 {
    if n <= 1 {
        return n;
    }
    fibonacci(n - 1) + fibonacci(n - 2)
}
```

**ビルド:**
```bash
rustc --target wasm32-unknown-unknown -O --crate-type=cdylib src/lib.rs -o sample.wasm
```

---

以上が WASM Runtime Component の詳細設計です。
