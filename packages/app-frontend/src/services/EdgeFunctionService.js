import { supabase } from '../lib/supabase'

/**
 * Edge Function Service
 * Supabase Edge Functions の呼び出しを管理
 *
 * サービスレイヤーの利点:
 * - Edge Functions の呼び出しを一箇所に集約
 * - エラーハンドリングの統一
 * - 型安全性の向上（将来的にTypeScript化した場合）
 * - テストが容易（モックしやすい）
 */
export class EdgeFunctionService {
  /**
   * Edge Function を呼び出す
   * @param {string} functionName - 関数名
   * @param {Object|FormData} payload - リクエストペイロード
   * @param {Object} options - オプション
   * @param {boolean} options.isFormData - FormDataかどうか
   * @returns {Promise<Object>} レスポンスデータ
   */
  static async invoke(functionName, payload = {}, options = {}) {
    try {
      const { isFormData = false } = options

      const invokeOptions = {}

      // FormDataの場合
      if (isFormData) {
        invokeOptions.body = payload
        // Content-Typeヘッダーは自動設定される
      } else {
        // JSON の場合は明示的に stringify
        invokeOptions.body = JSON.stringify(payload)
        invokeOptions.headers = {
          'Content-Type': 'application/json',
        }
      }

      const { data, error } = await supabase.functions.invoke(functionName, invokeOptions)

      console.log(`[EdgeFunctionService] ${functionName} response data:`, data)
      console.log(`[EdgeFunctionService] ${functionName} response error:`, error)
      console.log(`[EdgeFunctionService] ${functionName} data type:`, typeof data)

      if (error) {
        console.error(`Edge Function '${functionName}' エラー:`, error)
        throw error
      }

      return data
    } catch (error) {
      console.error(`Edge Function '${functionName}' 呼び出し失敗:`, error)
      throw error
    }
  }

  /**
   * 認証付きで Edge Function を呼び出す
   * @param {string} functionName - 関数名
   * @param {Object} payload - リクエストペイロード
   * @returns {Promise<Object>} レスポンスデータ
   */
  static async invokeWithAuth(functionName, payload = {}) {
    try {
      // 現在のセッションを取得
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('認証が必要です')
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (error) {
        console.error(`Edge Function '${functionName}' エラー:`, error)
        throw error
      }

      return data
    } catch (error) {
      console.error(`Edge Function '${functionName}' 呼び出し失敗:`, error)
      throw error
    }
  }
}

/**
 * 個別の Edge Function サービス例
 * プロジェクト固有の Edge Functions はここに追加
 */

/**
 * サンプル: Hello Function
 * @param {string} name - 名前
 * @returns {Promise<Object>}
 */
export async function callHelloFunction(name) {
  return EdgeFunctionService.invoke('hello-world', { name })
}

/**
 * サンプル: AI生成 Function（認証必要）
 * @param {string} prompt - プロンプト
 * @returns {Promise<Object>}
 */
export async function generateWithAI(prompt) {
  return EdgeFunctionService.invokeWithAuth('generate-ai', { prompt })
}
