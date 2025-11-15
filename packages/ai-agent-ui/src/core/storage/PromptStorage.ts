import type { SavedPrompt } from '../types';

/**
 * Prompt永続化ストレージのインターフェース
 *
 * Developer側でこのインターフェースを実装し、useAIRegisterに注入する。
 * これにより、LocalStorage, IndexedDB, API など様々なストレージバックエンドに対応可能。
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
   * // User単位で読み込み
   * await storage.load('user-123');
   *
   * // Form単位で読み込み
   * await storage.load('form-profile');
   *
   * // User + Form単位で読み込み
   * await storage.load('user-123:form-profile');
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
   * このメソッドを実装しない場合、deletePromptはsave()を使って削除を実現する。
   *
   * @param promptId - Prompt ID
   * @param scope - スコープ（オプション）
   *
   * @example
   * ```typescript
   * await storage.delete('prompt-123', 'user-123');
   * ```
   */
  delete?(promptId: string, scope?: string): Promise<void>;
}

/**
 * デフォルトのメモリ内ストレージ（永続化なし）
 *
 * ストレージが提供されない場合のデフォルト実装。
 * メモリ内にのみPromptを保存するため、ページリロードで消える。
 *
 * @example
 * ```typescript
 * const storage = new InMemoryPromptStorage();
 * await storage.save(prompts, 'user-123');
 * const loaded = await storage.load('user-123');
 * ```
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
