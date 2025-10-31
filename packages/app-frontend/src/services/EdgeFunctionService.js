import { supabase } from '../lib/supabase'

/**
 * Edge Function Service
 * Supabase Edge Functions の呼び出しを管理
 *
 * Akatsukiハンドラーパターン対応:
 * - すべてのレスポンスは { success, result, error } 形式
 * - success: true の場合、result を返す
 * - success: false の場合、エラーをthrow
 *
 * サービスレイヤーの利点:
 * - Edge Functions の呼び出しを一箇所に集約
 * - エラーハンドリングの統一
 * - 型安全性の向上（将来的にTypeScript化した場合）
 * - テストが容易（モックしやすい）
 */
export class EdgeFunctionService {
  /**
   * Edge Function を呼び出す（AkatsukiResponse対応）
   * @param {string} functionName - 関数名
   * @param {Object|FormData} payload - リクエストペイロード
   * @param {Object} options - オプション
   * @param {boolean} options.isFormData - FormDataかどうか
   * @param {boolean} options.rawResponse - 生のレスポンスを返すか（デフォルト: false）
   * @returns {Promise<any>} レスポンスのresult部分（またはrawResponse: trueの場合は全体）
   */
  static async invoke(functionName, payload = {}, options = {}) {
    try {
      const { isFormData = false, rawResponse = false } = options

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

      console.log(`[EdgeFunctionService] ${functionName} response:`, { data, error })

      // Supabase Functions自体のエラー（ネットワークエラー等）
      if (error) {
        console.error(`[EdgeFunctionService] ${functionName} Supabase error:`, error)
        throw new Error(error.message || 'Edge Function invocation failed')
      }

      // dataがない、またはオブジェクトでない場合
      if (!data || typeof data !== 'object') {
        console.warn(`[EdgeFunctionService] ${functionName} returned invalid response:`, data)
        return data
      }

      // AkatsukiResponse形式でない場合（旧実装との互換性）
      // upload-file等のEdge Functionは独自形式を返す
      if (!('success' in data)) {
        console.warn(`[EdgeFunctionService] ${functionName} returned non-Akatsuki response:`, data)
        return data
      }

      // successフィールドがあるが、resultフィールドがない場合（upload-file等）
      if (data.success && !('result' in data)) {
        console.log(`[EdgeFunctionService] ${functionName} returned success without result field:`, data)
        return data // データ全体を返す
      }

      // AkatsukiResponse形式の処理
      if (data.success) {
        // 成功: resultを返す
        return rawResponse ? data : data.result
      } else {
        // 失敗: エラーをthrow
        const errorMessage = data.error?.message || data.error || 'Unknown error'
        const errorCode = data.error?.code || 'UNKNOWN_ERROR'
        const error = new Error(errorMessage)
        error.code = errorCode
        console.error(`[EdgeFunctionService] ${functionName} function error:`, {
          message: errorMessage,
          code: errorCode,
        })
        throw error
      }
    } catch (error) {
      console.error(`[EdgeFunctionService] ${functionName} 呼び出し失敗:`, error)
      throw error
    }
  }

  /**
   * 認証付きで Edge Function を呼び出す（AkatsukiResponse対応）
   *
   * 注意: AkatsukiハンドラーパターンのrequireAuth: trueを使用する場合、
   * supabase.functions.invokeは自動的にAuthorizationヘッダーを付与するため、
   * このメソッドは不要になります。通常のinvoke()を使用してください。
   *
   * @param {string} functionName - 関数名
   * @param {Object} payload - リクエストペイロード
   * @param {Object} options - オプション
   * @returns {Promise<any>} レスポンスのresult部分
   * @deprecated Akatsukiハンドラーパターンではinvoke()を使用してください
   */
  static async invokeWithAuth(functionName, payload = {}, options = {}) {
    // 現在のセッションを取得して明示的にAuthorizationヘッダーを設定
    // （ただし、通常はsupabase.functions.invokeが自動設定するため不要）
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      throw new Error('認証が必要です')
    }

    // 通常のinvokeを使用（Authorizationヘッダーは自動設定される）
    return this.invoke(functionName, payload, options)
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
