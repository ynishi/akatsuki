import { supabase } from '../lib/supabase'

/**
 * UserProfile リポジトリ
 * profiles テーブルへのデータアクセスを管理
 *
 * リポジトリパターンの利点:
 * - データアクセスロジックを一箇所に集約
 * - テストが容易（モックしやすい）
 * - Supabaseクライアントの実装詳細を隠蔽
 *
 * 使用例:
 * ```javascript
 * import { UserProfileRepository } from '../repositories/UserProfileRepository'
 * import { UserProfile } from '../models/UserProfile'
 *
 * // 1. Repository でデータ取得
 * const data = await UserProfileRepository.findByUserId(userId)
 *
 * // 2. Model でドメインオブジェクトに変換
 * const profile = UserProfile.fromDatabase(data)
 *
 * // 3. Model で更新データ作成
 * const updated = new UserProfile({ ...profile, displayName: 'New Name' })
 *
 * // 4. Repository で保存
 * await UserProfileRepository.update(userId, updated.toUpdateDatabase())
 * ```
 */
export class UserProfileRepository {
  /**
   * ユーザーIDでプロフィールを取得
   * @param {string} userId - auth.users.id
   * @returns {Promise<Object|null>}
   */
  static async findByUserId(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // レコードが見つからない場合はnullを返す
        return null
      }
      console.error('プロフィール取得エラー:', error)
      throw error
    }

    return data
  }

  /**
   * usernameでプロフィールを検索
   * @param {string} username
   * @returns {Promise<Object|null>}
   */
  static async findByUsername(username) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('プロフィール検索エラー:', error)
      throw error
    }

    return data
  }

  /**
   * プロフィールを作成
   * @param {Object} profileData - プロフィールデータ
   * @returns {Promise<Object>}
   */
  static async create(profileData) {
    const { data, error } = await supabase
      .from('profiles')
      .insert([profileData])
      .select()
      .single()

    if (error) {
      console.error('プロフィール作成エラー:', error)
      throw error
    }

    return data
  }

  /**
   * プロフィールを更新
   * @param {string} userId - auth.users.id
   * @param {Object} updates - 更新データ
   * @returns {Promise<Object>}
   */
  static async update(userId, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('プロフィール更新エラー:', error)
      throw error
    }

    return data
  }

  /**
   * プロフィールを削除
   * @param {string} userId - auth.users.id
   * @returns {Promise<void>}
   */
  static async delete(userId) {
    const { error } = await supabase.from('profiles').delete().eq('user_id', userId)

    if (error) {
      console.error('プロフィール削除エラー:', error)
      throw error
    }
  }

  /**
   * usernameの重複チェック
   * @param {string} username
   * @param {string} [excludeUserId] - 除外するユーザーID（更新時に使用）
   * @returns {Promise<boolean>} true: 利用可能, false: 既に使用されている
   */
  static async isUsernameAvailable(username, excludeUserId = null) {
    let query = supabase.from('profiles').select('user_id').eq('username', username)

    if (excludeUserId) {
      query = query.neq('user_id', excludeUserId)
    }

    const { data, error } = await query

    if (error) {
      console.error('username重複チェックエラー:', error)
      throw error
    }

    return data.length === 0
  }
}
