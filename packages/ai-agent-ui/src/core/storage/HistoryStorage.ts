import type { AIHistoryEntry } from '../types';

/**
 * 履歴永続化ストレージのインターフェース
 *
 * Developer側でこのインターフェースを実装し、useAIRegisterに注入する。
 * これにより、LocalStorage, IndexedDB, API など様々なストレージバックエンドに対応可能。
 */
export interface HistoryStorage {
  /**
   * 履歴を読み込む
   *
   * @param scope - スコープ（オプション、Developer側で定義）
   * @returns Promise<AIHistoryEntry[]>
   *
   * @example
   * ```typescript
   * // Form単位で読み込み
   * await storage.load('form-profile');
   *
   * // User + Form単位で読み込み
   * await storage.load('user-123:form-profile');
   * ```
   */
  load(scope?: string): Promise<AIHistoryEntry[]>;

  /**
   * 履歴を保存する
   *
   * @param history - 保存する履歴一覧
   * @param scope - スコープ（オプション、Developer側で定義）
   *
   * @example
   * ```typescript
   * await storage.save(history, 'form-profile');
   * ```
   */
  save(history: AIHistoryEntry[], scope?: string): Promise<void>;

  /**
   * 履歴エントリを削除する（オプショナル）
   *
   * このメソッドを実装しない場合、deleteはsave()を使って削除を実現する。
   *
   * @param historyId - 履歴エントリID
   * @param scope - スコープ（オプション）
   *
   * @example
   * ```typescript
   * await storage.delete('history-123', 'form-profile');
   * ```
   */
  delete?(historyId: string, scope?: string): Promise<void>;
}

/**
 * デフォルトのメモリ内ストレージ（永続化なし）
 *
 * ストレージが提供されない場合のデフォルト実装。
 * メモリ内にのみ履歴を保存するため、ページリロードで消える。
 *
 * @example
 * ```typescript
 * const storage = new InMemoryHistoryStorage();
 * await storage.save(history, 'form-profile');
 * const loaded = await storage.load('form-profile');
 * ```
 */
export class InMemoryHistoryStorage implements HistoryStorage {
  private history: Map<string, AIHistoryEntry[]> = new Map();

  async load(scope?: string): Promise<AIHistoryEntry[]> {
    const key = scope || 'default';
    return this.history.get(key) || [];
  }

  async save(history: AIHistoryEntry[], scope?: string): Promise<void> {
    const key = scope || 'default';
    this.history.set(key, history);
  }

  async delete(historyId: string, scope?: string): Promise<void> {
    const key = scope || 'default';
    const history = this.history.get(key) || [];
    this.history.set(
      key,
      history.filter((h) => h.id !== historyId)
    );
  }
}
