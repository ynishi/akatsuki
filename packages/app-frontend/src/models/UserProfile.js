/**
 * ユーザープロフィールモデル
 * Supabase Authのユーザー情報を拡張するプロフィール情報を管理
 *
 * ベストプラクティス:
 * - auth.users (Supabase管理) とは別に public.profiles テーブルを作成
 * - user_id で auth.users と 1:1 関連
 * - RLS (Row Level Security) でユーザー自身のみアクセス可能に設定
 */
export class UserProfile {
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
  } = {}) {
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
   * @param {Object} data - データベースレコード
   * @returns {UserProfile}
   */
  static fromDatabase(data) {
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
   * @returns {Object} データベース保存用オブジェクト
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
   * @returns {Object} 更新用オブジェクト
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
   * @returns {string}
   */
  getDisplayName() {
    return this.displayName || this.username || 'ゲスト'
  }

  /**
   * プロフィールが完成しているかチェック
   * @returns {boolean}
   */
  isComplete() {
    return !!(this.username && this.displayName)
  }

  /**
   * 管理者権限を持っているかチェック
   * @returns {boolean}
   */
  isAdmin() {
    return this.role === 'admin'
  }

  /**
   * モデレーター権限を持っているかチェック
   * @returns {boolean}
   */
  isModerator() {
    return this.role === 'moderator' || this.role === 'admin'
  }
}
