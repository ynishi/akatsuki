/**
 * File Search Store Model
 * Gemini File Search APIのCorpusを管理
 *
 * ベストプラクティス:
 * - Gemini APIのCorpus（Knowledge Base）とDB上の管理情報を1:1で紐付け
 * - RLS (Row Level Security) でユーザー自身のみアクセス可能に設定
 */

export interface FileSearchStoreData {
  id?: string | null
  name: string // Gemini API corpus name (e.g., "corpora/xxx")
  displayName?: string | null
  userId: string
  createdAt?: string | null
  updatedAt?: string | null
}

export interface FileSearchStoreDatabaseRecord {
  id: string
  name: string
  display_name: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export class FileSearchStore {
  id: string | null
  name: string
  displayName: string | null
  userId: string
  createdAt: string | null
  updatedAt: string | null

  constructor({ id = null, name, displayName = null, userId, createdAt = null, updatedAt = null }: FileSearchStoreData) {
    this.id = id
    this.name = name // Gemini API corpus name
    this.displayName = displayName
    this.userId = userId
    this.createdAt = createdAt
    this.updatedAt = updatedAt
  }

  /**
   * Supabaseのレコードからインスタンスを生成
   */
  static fromDatabase(data: FileSearchStoreDatabaseRecord): FileSearchStore {
    return new FileSearchStore({
      id: data.id,
      name: data.name,
      displayName: data.display_name,
      userId: data.user_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    })
  }

  /**
   * Supabase保存用の形式に変換
   */
  toDatabase() {
    return {
      name: this.name,
      display_name: this.displayName,
      user_id: this.userId,
    }
  }

  /**
   * 表示名を取得（displayName or name）
   */
  getDisplayName(): string {
    return this.displayName || this.name
  }
}
