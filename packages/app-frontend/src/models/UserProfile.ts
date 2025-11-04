/**
 * ユーザープロフィールモデル
 * Supabase Authのユーザー情報を拡張するプロフィール情報を管理
 *
 * ベストプラクティス:
 * - auth.users (Supabase管理) とは別に public.profiles テーブルを作成
 * - user_id で auth.users と 1:1 関連
 * - RLS (Row Level Security) でユーザー自身のみアクセス可能に設定
 */

export type UserRole = 'user' | 'admin' | 'moderator'

export interface UserProfileData {
  id?: string | null
  userId: string
  username?: string | null
  displayName?: string | null
  avatarUrl?: string | null
  bio?: string | null
  role?: UserRole
  createdAt?: string | null
  updatedAt?: string | null
}

export interface UserProfileDatabaseRecord {
  id: string
  user_id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export class UserProfile {
  id: string | null
  userId: string
  username: string | null
  displayName: string | null
  avatarUrl: string | null
  bio: string | null
  role: UserRole
  createdAt: string | null
  updatedAt: string | null

  constructor({
    id = null,
    userId,
    username = null,
    displayName = null,
    avatarUrl = null,
    bio = null,
    role = 'user',
    createdAt = null,
    updatedAt = null,
  }: UserProfileData) {
    this.id = id
    this.userId = userId // auth.users.id との紐付け
    this.username = username
    this.displayName = displayName
    this.avatarUrl = avatarUrl
    this.bio = bio
    this.role = role // user, admin, moderator
    this.createdAt = createdAt
    this.updatedAt = updatedAt
  }

  /**
   * Supabaseのレコードからインスタンスを生成
   */
  static fromDatabase(data: UserProfileDatabaseRecord): UserProfile {
    return new UserProfile({
      id: data.id,
      userId: data.user_id,
      username: data.username,
      displayName: data.display_name,
      avatarUrl: data.avatar_url,
      bio: data.bio,
      role: data.role,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    })
  }

  /**
   * Supabase保存用の形式に変換
   */
  toDatabase() {
    return {
      user_id: this.userId,
      username: this.username,
      display_name: this.displayName,
      avatar_url: this.avatarUrl,
      bio: this.bio,
    }
  }

  /**
   * 更新用のデータ形式に変換（user_idを除外）
   */
  toUpdateDatabase() {
    return {
      username: this.username,
      display_name: this.displayName,
      avatar_url: this.avatarUrl,
      bio: this.bio,
    }
  }

  /**
   * 表示名を取得（優先順位: displayName > username > "ゲスト"）
   */
  getDisplayName(): string {
    return this.displayName || this.username || 'ゲスト'
  }

  /**
   * プロフィールが完成しているかチェック
   */
  isComplete(): boolean {
    return !!(this.username && this.displayName)
  }

  /**
   * 管理者権限を持っているかチェック
   */
  isAdmin(): boolean {
    return this.role === 'admin'
  }

  /**
   * モデレーター権限を持っているかチェック
   */
  isModerator(): boolean {
    return this.role === 'moderator' || this.role === 'admin'
  }
}
