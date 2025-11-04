import { supabase } from '../lib/supabase'
import type { UserProfileDatabaseRecord } from '../models/UserProfile'

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
 * ```typescript
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
   */
  static async findByUserId(userId: string): Promise<UserProfileDatabaseRecord | null> {
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

    return data as UserProfileDatabaseRecord
  }

  /**
   * usernameでプロフィールを検索
   */
  static async findByUsername(username: string): Promise<UserProfileDatabaseRecord | null> {
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

    return data as UserProfileDatabaseRecord
  }

  /**
   * プロフィールを作成
   */
  static async create(profileData: Partial<UserProfileDatabaseRecord>): Promise<UserProfileDatabaseRecord> {
    const { data, error } = await supabase
      .from('profiles')
      .insert([profileData])
      .select()
      .single()

    if (error) {
      console.error('プロフィール作成エラー:', error)
      throw error
    }

    return data as UserProfileDatabaseRecord
  }

  /**
   * プロフィールを更新
   */
  static async update(userId: string, updates: Partial<UserProfileDatabaseRecord>): Promise<UserProfileDatabaseRecord> {
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

    return data as UserProfileDatabaseRecord
  }

  /**
   * プロフィールを削除
   */
  static async delete(userId: string): Promise<void> {
    const { error } = await supabase.from('profiles').delete().eq('user_id', userId)

    if (error) {
      console.error('プロフィール削除エラー:', error)
      throw error
    }
  }

  /**
   * usernameの重複チェック
   * @param excludeUserId - 除外するユーザーID（更新時に使用）
   * @returns true: 利用可能, false: 既に使用されている
   */
  static async isUsernameAvailable(username: string, excludeUserId: string | null = null): Promise<boolean> {
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
