import { supabase } from '../lib/supabase'

/**
 * Edge Function invoke options
 */
export interface EdgeFunctionInvokeOptions {
  isFormData?: boolean
}

/**
 * Akatsuki Response format
 */
export interface AkatsukiResponse<T = unknown> {
  success: boolean
  result?: T
  error?: {
    message: string
    code?: string
  } | string | null
}

/**
 * Service response format
 */
export interface ServiceResponse<T = unknown> {
  data: T | null
  error: Error | null
}

/**
 * Extended Error with code
 */
interface ExtendedError extends Error {
  code?: string
}

/**
 * Edge Function Service
 * Supabase Edge Functions の呼び出しを管理
 *
 * Akatsukiハンドラーパターン対応:
 * - すべてのレスポンスは { success, result, error } 形式
 * - このServiceは { data, error } 形式に変換して返す
 * - data: 成功時のresult、error: 失敗時のエラーオブジェクト
 *
 * サービスレイヤーの利点:
 * - Edge Functions の呼び出しを一箇所に集約
 * - エラーハンドリングの統一
 * - { data, error } 形式でReact Queryとの相性が良い
 * - テストが容易（モックしやすい）
 */
export class EdgeFunctionService {
  /**
   * Edge Function を呼び出す（AkatsukiResponse対応）
   *
   * AkatsukiハンドラーパターンのEdge Functionは以下の形式でレスポンスを返します:
   * { success: true, result: {...}, error: null }
   *
   * このServiceはresultフィールドを取り出してdataとして返します:
   * { data: result, error: null }
   *
   * @param functionName - 関数名
   * @param payload - リクエストペイロード
   * @param options - オプション
   * @returns { data, error } 形式
   *
   * @example
   * // 基本的な使用方法
   * const { data, error } = await EdgeFunctionService.invoke('my-function', {
   *   param: 'value'
   * })
   *
   * if (error) {
   *   console.error('Error:', error.message)
   *   return { data: null, error }
   * }
   *
   * // data は Edge Function の result フィールドの中身
   * console.log(data.someField)
   */
  static async invoke<T = unknown>(
    functionName: string,
    payload: Record<string, unknown> | FormData = {},
    options: EdgeFunctionInvokeOptions = {}
  ): Promise<ServiceResponse<T>> {
    try {
      const { isFormData = false } = options

      const invokeOptions: {
        body?: FormData | string
        headers?: Record<string, string>
      } = {}

      // FormDataの場合
      if (isFormData) {
        invokeOptions.body = payload as FormData
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
        return { data: null, error: new Error(error.message || 'Edge Function invocation failed') }
      }

      // dataがない、またはオブジェクトでない場合
      if (!data || typeof data !== 'object') {
        console.warn(`[EdgeFunctionService] ${functionName} returned invalid response:`, data)
        return { data: data as T, error: null }
      }

      // AkatsukiResponse形式でない場合（旧実装との互換性）
      // upload-file等のEdge Functionは独自形式を返す
      if (!('success' in data)) {
        console.warn(`[EdgeFunctionService] ${functionName} returned non-Akatsuki response:`, data)
        return { data: data as T, error: null }
      }

      const akatsukiData = data as AkatsukiResponse<T>

      // successフィールドがあるが、resultフィールドがない場合（upload-file等）
      if (akatsukiData.success && !('result' in akatsukiData)) {
        console.log(`[EdgeFunctionService] ${functionName} returned success without result field:`, data)
        return { data: data as T, error: null }
      }

      // AkatsukiResponse形式の処理
      if (akatsukiData.success) {
        // 成功: { data: result, error: null }
        return { data: akatsukiData.result ?? null, error: null }
      } else {
        // 失敗: { data: null, error: Error }
        const errorData = akatsukiData.error
        const errorMessage =
          typeof errorData === 'string' ? errorData : errorData?.message || 'Unknown error'
        const errorCode = typeof errorData === 'object' && errorData !== null ? errorData.code : 'UNKNOWN_ERROR'
        const error: ExtendedError = new Error(errorMessage)
        error.code = errorCode
        console.error(`[EdgeFunctionService] ${functionName} function error:`, {
          message: errorMessage,
          code: errorCode,
        })
        return { data: null, error }
      }
    } catch (error) {
      console.error(`[EdgeFunctionService] ${functionName} 呼び出し失敗:`, error)
      return { data: null, error: error instanceof Error ? error : new Error(String(error)) }
    }
  }

  /**
   * ストリーミング Edge Function を呼び出す
   *
   * @param functionName - 関数名
   * @param payload - リクエストペイロード
   * @param onChunk - チャンクコールバック
   * @returns Promise
   */
  static async invokeStream(
    functionName: string,
    payload: Record<string, unknown>,
    onChunk: (chunk: unknown) => void
  ): Promise<void> {
    // TODO: 実装
    console.warn(`[EdgeFunctionService] invokeStream not implemented yet for ${functionName}`)
    await this.invoke(functionName, payload)
    onChunk({})
  }

  /**
   * 認証付きで Edge Function を呼び出す（AkatsukiResponse対応）
   *
   * 注意: AkatsukiハンドラーパターンのrequireAuth: trueを使用する場合、
   * supabase.functions.invokeは自動的にAuthorizationヘッダーを付与するため、
   * このメソッドは不要になります。通常のinvoke()を使用してください。
   *
   * @param functionName - 関数名
   * @param payload - リクエストペイロード
   * @param options - オプション
   * @returns Service response
   * @deprecated Akatsukiハンドラーパターンではinvoke()を使用してください
   */
  static async invokeWithAuth<T = unknown>(
    functionName: string,
    payload: Record<string, unknown> = {},
    options: EdgeFunctionInvokeOptions = {}
  ): Promise<ServiceResponse<T>> {
    // 現在のセッションを取得して明示的にAuthorizationヘッダーを設定
    // （ただし、通常はsupabase.functions.invokeが自動設定するため不要）
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      throw new Error('認証が必要です')
    }

    // 通常のinvokeを使用（Authorizationヘッダーは自動設定される）
    return this.invoke<T>(functionName, payload, options)
  }
}

/**
 * 個別の Edge Function サービス例
 * プロジェクト固有の Edge Functions はここに追加
 */

/**
 * サンプル: Hello Function
 * @param name - 名前
 * @returns Service response
 */
export async function callHelloFunction(name: string): Promise<ServiceResponse> {
  return EdgeFunctionService.invoke('hello-world', { name })
}

/**
 * サンプル: AI生成 Function（認証必要）
 * @param prompt - プロンプト
 * @returns Service response
 */
export async function generateWithAI(prompt: string): Promise<ServiceResponse> {
  return EdgeFunctionService.invokeWithAuth('generate-ai', { prompt })
}
