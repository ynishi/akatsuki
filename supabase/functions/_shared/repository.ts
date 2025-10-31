/**
 * Base Repository
 *
 * すべてのRepositoryクラスが継承する基底クラス。
 * ユーザー権限のSupabaseクライアントを受け取り、安全なDB操作を提供する。
 */

import { SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * BaseRepository
 * すべてのRepositoryはこれを継承する
 */
export class BaseRepository {
  protected supabase: SupabaseClient

  /**
   * @param supabase - ユーザー権限で初期化されたSupabaseクライアント
   */
  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  /**
   * 現在の認証ユーザーを取得
   * @returns 認証済みユーザー
   * @throws 認証エラー
   */
  protected async getCurrentUser(): Promise<User> {
    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser()

    if (error) {
      throw new Error(`Authentication error: ${error.message}`)
    }

    if (!user) {
      throw new Error('User not authenticated')
    }

    return user
  }

  /**
   * Postgrestエラーが「レコードが見つからない」エラーかどうか判定
   * @param error - Postgrestエラー
   */
  protected isNotFoundError(error: any): boolean {
    return error?.code === 'PGRST116'
  }
}
