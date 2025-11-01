/**
 * RunPod ComfyUI Client
 *
 * RunPod上のComfyUIインスタンスと通信するためのクライアント。
 * - 認証ヘッダーの自動付与（X-Auth）
 * - ワークフロー実行と結果取得
 * - エラーハンドリング
 */

import { ErrorCodes } from './api_types.ts'

/**
 * RunPod ComfyUI クライアント設定
 */
export interface RunPodClientConfig {
  /** RunPod エンドポイント（例: https://your-pod-id.proxy.runpod.net） */
  endpoint: string
  /** 認証トークン（RunPod側で設定したAPIキー） */
  apiKey: string
  /** タイムアウト（ミリ秒、デフォルト: 60秒） */
  timeout?: number
}

/**
 * ComfyUI ワークフロー実行結果
 */
export interface ComfyUIPromptResponse {
  /** プロンプトID（実行追跡用） */
  prompt_id: string
  /** 実行番号 */
  number: number
  /** ノードエラー（エラー時のみ） */
  node_errors?: Record<string, any>
}

/**
 * ComfyUI 履歴レスポンス
 */
export interface ComfyUIHistoryResponse {
  [prompt_id: string]: {
    prompt: any[]
    outputs: Record<string, {
      images?: Array<{
        filename: string
        subfolder: string
        type: string
      }>
    }>
    status: {
      status_str: string
      completed: boolean
      messages?: string[][]
    }
  }
}

/**
 * 画像生成結果
 */
export interface GeneratedImage {
  /** 画像データ（base64） */
  data: string
  /** MIMEタイプ */
  mimeType: string
  /** ファイル名 */
  filename: string
}

/**
 * RunPod ComfyUI クライアント
 */
export class RunPodClient {
  private config: Required<RunPodClientConfig>

  constructor(config: RunPodClientConfig) {
    this.config = {
      endpoint: config.endpoint.replace(/\/$/, ''), // 末尾のスラッシュを削除
      apiKey: config.apiKey,
      timeout: config.timeout ?? 60000, // デフォルト60秒
    }
  }

  /**
   * ワークフローを実行
   * @param workflow - ComfyUI ワークフロー JSON
   * @returns プロンプトID
   */
  async executeWorkflow(workflow: Record<string, any>): Promise<string> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(`${this.config.endpoint}/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth': this.config.apiKey,
        },
        body: JSON.stringify({ prompt: workflow }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw Object.assign(
          new Error(`RunPod API error: ${response.status} ${errorText}`),
          { code: ErrorCodes.INTERNAL_ERROR, status: response.status }
        )
      }

      const result: ComfyUIPromptResponse = await response.json()

      if (result.node_errors && Object.keys(result.node_errors).length > 0) {
        throw Object.assign(
          new Error(`ComfyUI workflow error: ${JSON.stringify(result.node_errors)}`),
          { code: ErrorCodes.INTERNAL_ERROR, status: 500 }
        )
      }

      return result.prompt_id
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw Object.assign(
          new Error(`RunPod request timeout after ${this.config.timeout}ms`),
          { code: ErrorCodes.INTERNAL_ERROR, status: 504 }
        )
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * 実行結果を取得（ポーリング）
   * @param promptId - プロンプトID
   * @param maxAttempts - 最大試行回数（デフォルト: 30）
   * @param interval - ポーリング間隔（ミリ秒、デフォルト: 2000）
   * @returns 生成された画像データ
   */
  async getResult(
    promptId: string,
    maxAttempts = 30,
    interval = 2000
  ): Promise<GeneratedImage[]> {
    for (let i = 0; i < maxAttempts; i++) {
      const history = await this.getHistory(promptId)

      if (history[promptId]) {
        const item = history[promptId]

        // エラーチェック
        if (item.status.status_str === 'error') {
          throw Object.assign(
            new Error(`ComfyUI execution error: ${JSON.stringify(item.status.messages)}`),
            { code: ErrorCodes.INTERNAL_ERROR, status: 500 }
          )
        }

        // 完了チェック
        if (item.status.completed) {
          // 画像を抽出
          const images: GeneratedImage[] = []

          for (const nodeId in item.outputs) {
            const output = item.outputs[nodeId]
            if (output.images && output.images.length > 0) {
              for (const img of output.images) {
                const imageData = await this.downloadImage(
                  img.filename,
                  img.subfolder,
                  img.type
                )
                images.push(imageData)
              }
            }
          }

          if (images.length === 0) {
            throw Object.assign(
              new Error('No images generated'),
              { code: ErrorCodes.INTERNAL_ERROR, status: 500 }
            )
          }

          return images
        }
      }

      // 次のポーリングまで待機
      await new Promise((resolve) => setTimeout(resolve, interval))
    }

    throw Object.assign(
      new Error(`Timeout waiting for ComfyUI result (${maxAttempts * interval}ms)`),
      { code: ErrorCodes.INTERNAL_ERROR, status: 504 }
    )
  }

  /**
   * 履歴を取得
   * @param promptId - プロンプトID
   * @returns 履歴レスポンス
   */
  private async getHistory(promptId: string): Promise<ComfyUIHistoryResponse> {
    const response = await fetch(`${this.config.endpoint}/history/${promptId}`, {
      headers: {
        'X-Auth': this.config.apiKey,
      },
    })

    if (!response.ok) {
      throw Object.assign(
        new Error(`Failed to get history: ${response.status}`),
        { code: ErrorCodes.INTERNAL_ERROR, status: response.status }
      )
    }

    return await response.json()
  }

  /**
   * 画像をダウンロード
   * @param filename - ファイル名
   * @param subfolder - サブフォルダ
   * @param type - タイプ
   * @returns 画像データ（base64）
   */
  private async downloadImage(
    filename: string,
    subfolder: string,
    type: string
  ): Promise<GeneratedImage> {
    const params = new URLSearchParams({
      filename,
      subfolder,
      type,
    })

    const response = await fetch(
      `${this.config.endpoint}/view?${params.toString()}`,
      {
        headers: {
          'X-Auth': this.config.apiKey,
        },
      }
    )

    if (!response.ok) {
      throw Object.assign(
        new Error(`Failed to download image: ${response.status}`),
        { code: ErrorCodes.INTERNAL_ERROR, status: response.status }
      )
    }

    const imageBuffer = await response.arrayBuffer()
    const mimeType = response.headers.get('content-type') || 'image/png'

    // ArrayBufferをbase64に変換
    const bytes = new Uint8Array(imageBuffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    const base64 = btoa(binary)

    return {
      data: base64,
      mimeType,
      filename,
    }
  }

  /**
   * ワークフローにプロンプトを差し込む（Phase 1: シンプルな実装）
   *
   * 注意: この実装は特定のワークフロー構造を前提としています。
   * 互換性のために残していますが、新規コードではinjectVariablesを使用してください。
   *
   * @param workflow - ベースワークフロー
   * @param prompt - ユーザープロンプト
   * @param nodeId - プロンプトノードのID（デフォルト: "6"）
   * @returns プロンプトが差し込まれたワークフロー
   * @deprecated Phase 2ではinjectVariablesを使用してください
   */
  static injectPrompt(
    workflow: Record<string, any>,
    prompt: string,
    nodeId = '6'
  ): Record<string, any> {
    const newWorkflow = JSON.parse(JSON.stringify(workflow))

    if (newWorkflow[nodeId] && newWorkflow[nodeId].inputs) {
      newWorkflow[nodeId].inputs.text = prompt
    } else {
      console.warn(
        `[RunPodClient] Node ${nodeId} not found in workflow. Prompt injection skipped.`
      )
    }

    return newWorkflow
  }

  /**
   * ワークフローに変数を差し込む（Phase 2: 柔軟な実装）
   *
   * ワークフローJSON内の{{variable}}形式のプレースホルダーを再帰的に探して置換します。
   *
   * @example
   * ```typescript
   * const workflow = {
   *   "6": {
   *     "inputs": {
   *       "text": "{{prompt}}",
   *       "width": "{{width}}"
   *     }
   *   }
   * }
   *
   * const result = RunPodClient.injectVariables(workflow, {
   *   prompt: "A beautiful sunset",
   *   width: 1024
   * })
   * // => "6".inputs.text = "A beautiful sunset"
   * // => "6".inputs.width = 1024
   * ```
   *
   * @param workflow - ベースワークフロー
   * @param variables - 変数マップ（key: 変数名, value: 置換値）
   * @returns 変数が差し込まれたワークフロー
   */
  static injectVariables(
    workflow: Record<string, any>,
    variables: Record<string, any>
  ): Record<string, any> {
    // Deep cloneしてオリジナルを変更しない
    const workflowStr = JSON.stringify(workflow)

    // {{variable}}形式のプレースホルダーを置換
    let result = workflowStr
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')

      // 値が文字列の場合はそのまま、それ以外はJSON化
      const replacement = typeof value === 'string' ? value : JSON.stringify(value)
      result = result.replace(regex, replacement)
    }

    return JSON.parse(result)
  }

  /**
   * ワークフロー内の未置換プレースホルダーをチェック
   *
   * {{variable}}形式のプレースホルダーが残っている場合、警告を出力します。
   * デバッグやバリデーションに使用。
   *
   * @param workflow - チェック対象のワークフロー
   * @returns 未置換プレースホルダーの配列
   */
  static checkUnresolvedPlaceholders(workflow: Record<string, any>): string[] {
    const workflowStr = JSON.stringify(workflow)
    const placeholderRegex = /\{\{([^}]+)\}\}/g
    const matches = workflowStr.matchAll(placeholderRegex)

    const unresolvedPlaceholders = new Set<string>()
    for (const match of matches) {
      unresolvedPlaceholders.add(match[1])
    }

    if (unresolvedPlaceholders.size > 0) {
      console.warn(
        `[RunPodClient] Unresolved placeholders found: ${Array.from(unresolvedPlaceholders).join(', ')}`
      )
    }

    return Array.from(unresolvedPlaceholders)
  }
}

/**
 * 環境変数からRunPod Clientを作成
 * @returns RunPodClient インスタンス
 * @throws 環境変数が設定されていない場合
 */
export function createRunPodClient(): RunPodClient {
  const endpoint = Deno.env.get('RUNPOD_ENDPOINT')
  const apiKey = Deno.env.get('RUNPOD_API_KEY')

  if (!endpoint) {
    throw Object.assign(
      new Error('RUNPOD_ENDPOINT is not configured'),
      { code: ErrorCodes.INTERNAL_ERROR, status: 500 }
    )
  }

  if (!apiKey) {
    throw Object.assign(
      new Error('RUNPOD_API_KEY is not configured'),
      { code: ErrorCodes.INTERNAL_ERROR, status: 500 }
    )
  }

  return new RunPodClient({ endpoint, apiKey })
}
