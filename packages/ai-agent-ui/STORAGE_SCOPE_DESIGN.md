# Storage, Scope, and Lifecycle Design

## 🎯 設計原則

Headless UIライブラリとして：
1. **ライブラリの責務**: 状態管理とロジック提供のみ
2. **Developer側の責務**: 永続化、スコープ管理、ライフサイクル管理
3. **Dependency Injection**: Developer側でストレージ実装を注入

## 📚 参考: 他のHeadlessライブラリの設計

### TanStack Table
- ストレージは一切提供しない
- Developer側で `onStateChange` を使って永続化

### React Hook Form
- ストレージは提供しない
- `watch()` でDeveloper側が永続化を実装

### Downshift
- ストレージ機能なし
- 完全にHeadless（状態管理のみ）

## 🎨 設計アプローチ

### Approach 1: Storage Adapter Pattern（推奨）

ライブラリは**インターフェース**のみ定義。Developer側で実装を注入。

```typescript
/**
 * Prompt永続化ストレージのインターフェース
 */
export interface PromptStorage {
  /**
   * Promptを読み込む
   * @param scope - スコープ（オプション）
   */
  load(scope?: string): Promise<SavedPrompt[]>;

  /**
   * Promptを保存する
   * @param prompts - 保存するPrompt一覧
   * @param scope - スコープ（オプション）
   */
  save(prompts: SavedPrompt[], scope?: string): Promise<void>;

  /**
   * Promptを削除する
   * @param promptId - Prompt ID
   * @param scope - スコープ（オプション）
   */
  delete?(promptId: string, scope?: string): Promise<void>;
}

/**
 * useAIRegisterのオプション
 */
export interface AIRegisterOptions {
  // ... 既存のオプション

  /**
   * Prompt永続化ストレージ（オプション）
   *
   * 提供しない場合、Promptはメモリ内のみで管理される（リロードで消える）
   */
  promptStorage?: PromptStorage;

  /**
   * ストレージのスコープ（オプション）
   *
   * Developer側でスコープを定義可能。例:
   * - 'form-{formId}': フォーム単位
   * - 'service-{serviceId}': サービス単位
   * - 'user-{userId}': ユーザー単位
   * - 'global': グローバル
   */
  promptStorageScope?: string;
}
```

### Approach 2: State Sync Pattern（シンプル）

ストレージインターフェースを提供せず、`savedPrompts`の変更をDeveloper側に通知。

```typescript
export interface AIRegisterOptions {
  // ... 既存のオプション

  /**
   * Prompt一覧の初期値（オプション）
   */
  initialPrompts?: SavedPrompt[];

  /**
   * Prompt一覧が変更された時のコールバック（オプション）
   * Developer側で永続化を実装する
   */
  onPromptsChange?: (prompts: SavedPrompt[]) => void;
}
```

## 🚀 実装計画（Approach 1: Storage Adapter）

### Phase 1: インターフェース定義

**新規ファイル**: `src/core/storage/PromptStorage.ts`

```typescript
import type { SavedPrompt } from '../types';

/**
 * Prompt永続化ストレージのインターフェース
 */
export interface PromptStorage {
  /**
   * Promptを読み込む
   *
   * @param scope - スコープ（オプション、Developer側で定義）
   * @returns Promise<SavedPrompt[]>
   *
   * @example
   * ```typescript
   * await storage.load('user-123');
   * await storage.load('form-profile');
   * ```
   */
  load(scope?: string): Promise<SavedPrompt[]>;

  /**
   * Promptを保存する
   *
   * @param prompts - 保存するPrompt一覧
   * @param scope - スコープ（オプション、Developer側で定義）
   *
   * @example
   * ```typescript
   * await storage.save(prompts, 'user-123');
   * ```
   */
  save(prompts: SavedPrompt[], scope?: string): Promise<void>;

  /**
   * Promptを削除する（オプショナル）
   *
   * @param promptId - Prompt ID
   * @param scope - スコープ（オプション）
   */
  delete?(promptId: string, scope?: string): Promise<void>;
}

/**
 * デフォルトのメモリ内ストレージ（永続化なし）
 */
export class InMemoryPromptStorage implements PromptStorage {
  private prompts: Map<string, SavedPrompt[]> = new Map();

  async load(scope?: string): Promise<SavedPrompt[]> {
    const key = scope || 'default';
    return this.prompts.get(key) || [];
  }

  async save(prompts: SavedPrompt[], scope?: string): Promise<void> {
    const key = scope || 'default';
    this.prompts.set(key, prompts);
  }

  async delete(promptId: string, scope?: string): Promise<void> {
    const key = scope || 'default';
    const prompts = this.prompts.get(key) || [];
    this.prompts.set(
      key,
      prompts.filter((p) => p.id !== promptId)
    );
  }
}
```

### Phase 2: useAIRegisterの拡張

**更新ファイル**: `src/core/hooks/useAIRegister.ts`

```typescript
import type { PromptStorage } from '../storage/PromptStorage';
import { InMemoryPromptStorage } from '../storage/PromptStorage';

export interface AIRegisterOptions {
  // ... 既存のオプション

  /**
   * Prompt永続化ストレージ（オプション）
   *
   * 提供しない場合、デフォルトのメモリ内ストレージを使用（リロードで消える）
   *
   * @example
   * ```typescript
   * // LocalStorage実装を使用
   * promptStorage: new LocalStoragePromptStorage('ai-prompts')
   *
   * // API実装を使用
   * promptStorage: new ApiPromptStorage('/api/prompts')
   * ```
   */
  promptStorage?: PromptStorage;

  /**
   * ストレージのスコープ（オプション）
   *
   * Developer側でスコープを自由に定義可能。
   *
   * @example
   * ```typescript
   * // フォーム単位で保存
   * promptStorageScope: `form-${formId}`
   *
   * // ユーザー単位で保存
   * promptStorageScope: `user-${userId}`
   *
   * // サービス単位で保存
   * promptStorageScope: 'service-blog'
   *
   * // グローバルで保存
   * promptStorageScope: 'global'
   * ```
   */
  promptStorageScope?: string;
}

export function useAIRegister(options: AIRegisterOptions): AIRegisterResult {
  const { promptStorage, promptStorageScope, ...restOptions } = options;

  // ストレージ（提供されない場合はメモリ内ストレージ）
  const storage = useMemo(
    () => promptStorage || new InMemoryPromptStorage(),
    [promptStorage]
  );

  // Promptをストレージから読み込み
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadPrompts = async () => {
      try {
        const prompts = await storage.load(promptStorageScope);
        if (!cancelled) {
          setSavedPrompts(prompts);
          setIsLoadingPrompts(false);
        }
      } catch (error) {
        console.error('Failed to load prompts:', error);
        if (!cancelled) {
          setIsLoadingPrompts(false);
        }
      }
    };

    loadPrompts();

    return () => {
      cancelled = true;
    };
  }, [storage, promptStorageScope]);

  /**
   * 💾 Promptを保存
   */
  const savePrompt = useCallback(
    async (label: string, prompt: string, category?: string) => {
      const newPrompt: SavedPrompt = {
        id: `prompt-${Date.now()}-${Math.random()}`,
        type: 'editable',
        label,
        prompt,
        category,
        editable: true,
        visible: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0,
      };

      const updatedPrompts = [newPrompt, ...savedPrompts];
      setSavedPrompts(updatedPrompts);

      // ストレージに保存（非同期）
      try {
        await storage.save(updatedPrompts, promptStorageScope);
      } catch (error) {
        console.error('Failed to save prompt:', error);
        // エラー時はロールバック
        setSavedPrompts(savedPrompts);
      }
    },
    [savedPrompts, storage, promptStorageScope]
  );

  /**
   * 🗑️ Promptを削除
   */
  const deletePrompt = useCallback(
    async (promptId: string) => {
      const updatedPrompts = savedPrompts.filter((p) => p.id !== promptId);
      setSavedPrompts(updatedPrompts);

      try {
        // deleteメソッドがある場合は使用
        if (storage.delete) {
          await storage.delete(promptId, promptStorageScope);
        } else {
          // ない場合はsaveで上書き
          await storage.save(updatedPrompts, promptStorageScope);
        }
      } catch (error) {
        console.error('Failed to delete prompt:', error);
        // エラー時はロールバック
        setSavedPrompts(savedPrompts);
      }
    },
    [savedPrompts, storage, promptStorageScope]
  );

  /**
   * ✏️ Promptを更新
   */
  const updatePrompt = useCallback(
    async (
      promptId: string,
      updates: Partial<Pick<SavedPrompt, 'label' | 'prompt' | 'category'>>
    ) => {
      const updatedPrompts = savedPrompts.map((p) =>
        p.id === promptId ? { ...p, ...updates, updatedAt: Date.now() } : p
      );
      setSavedPrompts(updatedPrompts);

      try {
        await storage.save(updatedPrompts, promptStorageScope);
      } catch (error) {
        console.error('Failed to update prompt:', error);
        // エラー時はロールバック
        setSavedPrompts(savedPrompts);
      }
    },
    [savedPrompts, storage, promptStorageScope]
  );

  // ... 残りのロジック
}
```

### Phase 3: Developer側の実装例

**例1: LocalStorage実装**

```typescript
// src/examples/LocalStoragePromptStorage.ts
import type { PromptStorage, SavedPrompt } from '@akatsuki/ai-agent-ui';

export class LocalStoragePromptStorage implements PromptStorage {
  constructor(private baseKey: string = 'ai-prompts') {}

  async load(scope?: string): Promise<SavedPrompt[]> {
    const key = this.getKey(scope);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  async save(prompts: SavedPrompt[], scope?: string): Promise<void> {
    const key = this.getKey(scope);
    localStorage.setItem(key, JSON.stringify(prompts));
  }

  async delete(promptId: string, scope?: string): Promise<void> {
    const prompts = await this.load(scope);
    await this.save(
      prompts.filter((p) => p.id !== promptId),
      scope
    );
  }

  private getKey(scope?: string): string {
    return scope ? `${this.baseKey}:${scope}` : this.baseKey;
  }
}
```

**例2: IndexedDB実装**

```typescript
// src/examples/IndexedDBPromptStorage.ts
import type { PromptStorage, SavedPrompt } from '@akatsuki/ai-agent-ui';

export class IndexedDBPromptStorage implements PromptStorage {
  private dbName = 'ai-agent-db';
  private storeName = 'prompts';

  async load(scope?: string): Promise<SavedPrompt[]> {
    const db = await this.openDB();
    const transaction = db.transaction(this.storeName, 'readonly');
    const store = transaction.objectStore(this.storeName);

    const key = scope || 'default';
    const result = await store.get(key);
    return result || [];
  }

  async save(prompts: SavedPrompt[], scope?: string): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction(this.storeName, 'readwrite');
    const store = transaction.objectStore(this.storeName);

    const key = scope || 'default';
    await store.put({ key, prompts });
  }

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' });
        }
      };
    });
  }
}
```

**例3: API実装**

```typescript
// src/examples/ApiPromptStorage.ts
import type { PromptStorage, SavedPrompt } from '@akatsuki/ai-agent-ui';

export class ApiPromptStorage implements PromptStorage {
  constructor(private apiEndpoint: string) {}

  async load(scope?: string): Promise<SavedPrompt[]> {
    const params = new URLSearchParams();
    if (scope) params.set('scope', scope);

    const response = await fetch(`${this.apiEndpoint}?${params}`);
    if (!response.ok) throw new Error('Failed to load prompts');
    return response.json();
  }

  async save(prompts: SavedPrompt[], scope?: string): Promise<void> {
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompts, scope }),
    });
    if (!response.ok) throw new Error('Failed to save prompts');
  }

  async delete(promptId: string, scope?: string): Promise<void> {
    const params = new URLSearchParams();
    if (scope) params.set('scope', scope);

    const response = await fetch(`${this.apiEndpoint}/${promptId}?${params}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete prompt');
  }
}
```

### Phase 4: 使用例

```typescript
import { useAIRegister } from '@akatsuki/ai-agent-ui';
import { LocalStoragePromptStorage } from './LocalStoragePromptStorage';

function MyComponent() {
  const userId = 'user-123';
  const formId = 'profile-bio';

  const ai = useAIRegister({
    context: { scope: 'UserProfile.Bio', type: 'long_text' },
    getValue: () => bio,
    setValue: setBio,

    // ストレージ実装を注入
    promptStorage: new LocalStoragePromptStorage(),

    // スコープを指定
    // - 'global': すべてのフォームで共有
    // - `user-${userId}`: ユーザー単位
    // - `form-${formId}`: フォーム単位
    // - `user-${userId}:form-${formId}`: ユーザー＋フォーム単位
    promptStorageScope: `user-${userId}:form-${formId}`,
  });

  // Promptは自動的にストレージから読み込まれ、保存される
  return (
    <div>
      <button onClick={() => ai.actions.savePrompt('My Prompt', 'Make it formal')}>
        Save Prompt
      </button>
      {ai.state.savedPrompts.map((p) => (
        <div key={p.id}>{p.label}</div>
      ))}
    </div>
  );
}
```

## 🎯 スコープ設計のベストプラクティス

### 推奨するスコープ命名規則

```typescript
// 1. Form単位（そのフォームのみ）
promptStorageScope: `form:${formId}`

// 2. Service単位（そのサービス全体で共有）
promptStorageScope: `service:blog`

// 3. User単位（そのユーザーの全フォームで共有）
promptStorageScope: `user:${userId}`

// 4. User + Service単位
promptStorageScope: `user:${userId}:service:blog`

// 5. User + Form単位（最も細かい）
promptStorageScope: `user:${userId}:form:${formId}`

// 6. Global（すべてのユーザーで共有）
promptStorageScope: 'global'
```

### Developer側のスコープ管理例

```typescript
// スコープヘルパー関数
export const PromptScope = {
  global: () => 'global',
  user: (userId: string) => `user:${userId}`,
  service: (serviceName: string) => `service:${serviceName}`,
  form: (formId: string) => `form:${formId}`,
  userForm: (userId: string, formId: string) => `user:${userId}:form:${formId}`,
  userService: (userId: string, serviceName: string) =>
    `user:${userId}:service:${serviceName}`,
};

// 使用
const ai = useAIRegister({
  promptStorageScope: PromptScope.userForm(currentUser.id, 'profile-bio'),
  promptStorage: new LocalStoragePromptStorage(),
});
```

## 📝 ライフサイクル管理

ライフサイクル（TTL、有効期限）もDeveloper側で実装：

```typescript
// TTL付きLocalStorage実装
export class TTLLocalStoragePromptStorage implements PromptStorage {
  constructor(
    private baseKey: string = 'ai-prompts',
    private ttlMs: number = 7 * 24 * 60 * 60 * 1000 // 7日間
  ) {}

  async load(scope?: string): Promise<SavedPrompt[]> {
    const key = this.getKey(scope);
    const data = localStorage.getItem(key);
    if (!data) return [];

    const { prompts, timestamp } = JSON.parse(data);

    // TTL チェック
    if (Date.now() - timestamp > this.ttlMs) {
      localStorage.removeItem(key);
      return [];
    }

    return prompts;
  }

  async save(prompts: SavedPrompt[], scope?: string): Promise<void> {
    const key = this.getKey(scope);
    const data = {
      prompts,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(data));
  }

  private getKey(scope?: string): string {
    return scope ? `${this.baseKey}:${scope}` : this.baseKey;
  }
}
```

## 🚀 実装の優先順位

### Phase 1（今回実装）
- [x] PromptStorageインターフェース定義
- [x] InMemoryPromptStorage実装（デフォルト）
- [x] useAIRegisterのストレージ対応
- [x] promptStorageScope対応

### Phase 2（Examplesとして提供）
- [ ] LocalStoragePromptStorage実装例
- [ ] IndexedDBPromptStorage実装例（Optional）
- [ ] ApiPromptStorage実装例（Optional）

### Phase 3（ドキュメント）
- [ ] Storage実装ガイド
- [ ] Scope設計ガイド
- [ ] ライフサイクル管理ガイド

## 📚 まとめ

### ✅ ライブラリの責務
- PromptStorageインターフェース提供
- デフォルトのInMemoryPromptStorage提供
- スコープ文字列の受け渡しのみ

### ✅ Developer側の責務
- ストレージ実装の選択・実装
- スコープ設計（global, user, service, form）
- ライフサイクル管理（TTL, 有効期限）
- エラーハンドリング

### 🎯 利点
- ライブラリは状態管理に集中（Headless原則）
- Developer側で柔軟な永続化戦略を選択可能
- 様々なバックエンド（localStorage, IndexedDB, API）に対応
- テストが容易（モックストレージを注入）
