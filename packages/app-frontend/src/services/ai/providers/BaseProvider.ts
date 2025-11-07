/**
 * AI Provider Configuration
 */
export interface ProviderConfig {
  apiKey?: string
  baseURL?: string
  [key: string]: unknown
}

/**
 * Chat options
 */
export interface ChatOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  messages?: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
  }>
  [key: string]: unknown
}

/**
 * Chat response
 */
export interface ChatResponse {
  text: string
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
  model?: string
}

/**
 * Image generation options
 */
export interface ImageGenerationOptions {
  model?: string
  size?: string
  quality?: 'standard' | 'hd'
  [key: string]: unknown
}

/**
 * Image response
 */
export interface ImageResponse {
  url?: string
  data?: string
}

/**
 * AI Provider 基底クラス
 * すべてのAIプロバイダーはこのインターフェースを実装する
 */
export abstract class BaseProvider {
  protected config: ProviderConfig

  constructor(config: ProviderConfig = {}) {
    this.config = config
  }

  /**
   * チャット補完（テキスト生成）
   * @param prompt - プロンプト
   * @param options - オプション
   * @returns { text, usage, model }
   */
  abstract chat(prompt: string, options?: ChatOptions): Promise<ChatResponse>

  /**
   * ストリーミングチャット補完
   * @param prompt - プロンプト
   * @param onChunk - チャンクコールバック
   * @param options - オプション
   */
  abstract chatStream(
    prompt: string,
    onChunk: (chunk: string) => void,
    options?: ChatOptions
  ): Promise<void>

  /**
   * 画像生成（Text-to-Image）
   * @param prompt - プロンプト
   * @param options - オプション
   * @returns { url, data }
   */
  abstract generateImage(
    prompt: string,
    options?: ImageGenerationOptions
  ): Promise<ImageResponse>

  /**
   * 画像編集（Image-to-Image）
   * @param imageUrl - 元画像URL
   * @param prompt - プロンプト
   * @param options - オプション
   * @returns { url, data }
   */
  abstract editImage(
    imageUrl: string,
    prompt: string,
    options?: ImageGenerationOptions
  ): Promise<ImageResponse>

  /**
   * 埋め込み生成（Embeddings）
   * @param text - テキスト
   * @param options - オプション
   * @returns ベクトル配列
   */
  abstract embed(text: string, options?: Record<string, unknown>): Promise<number[]>
}
