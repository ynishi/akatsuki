import { OpenAIProvider, AnthropicProvider, GeminiProvider, BaseProvider } from './providers'
import type { ChatOptions, ChatResponse, ImageGenerationOptions, ImageResponse } from './providers'

/**
 * Provider name type
 */
export type ProviderName = 'openai' | 'anthropic' | 'gemini' | string

/**
 * AI Service options with provider
 */
export interface AIServiceOptions extends ChatOptions {
  provider?: ProviderName
}

/**
 * AI Service - プロバイダー統合層
 * 複数のAIプロバイダーを統一インターフェースで扱う
 */
export class AIService {
  static providers: Record<string, BaseProvider> = {
    openai: new OpenAIProvider(),
    anthropic: new AnthropicProvider(),
    gemini: new GeminiProvider(),
  }

  static defaultProvider: ProviderName = 'openai'

  /**
   * プロバイダーを取得
   * @param providerName - プロバイダー名
   * @returns BaseProvider
   */
  static getProvider(providerName: ProviderName = this.defaultProvider): BaseProvider {
    const provider = this.providers[providerName]
    if (!provider) {
      throw new Error(`Unknown provider: ${providerName}. Available: ${Object.keys(this.providers).join(', ')}`)
    }
    return provider
  }

  /**
   * デフォルトプロバイダーを設定
   * @param providerName - プロバイダー名
   */
  static setDefaultProvider(providerName: ProviderName): void {
    if (!this.providers[providerName]) {
      throw new Error(`Unknown provider: ${providerName}`)
    }
    this.defaultProvider = providerName
  }

  /**
   * カスタムプロバイダーを追加
   * @param name - プロバイダー名
   * @param provider - プロバイダーインスタンス
   */
  static addProvider(name: string, provider: BaseProvider): void {
    this.providers[name] = provider
  }

  /**
   * チャット補完
   * @param prompt - プロンプト
   * @param options - オプション
   * @returns Chat response
   */
  static async chat(prompt: string, options: AIServiceOptions = {}): Promise<ChatResponse> {
    const provider = this.getProvider(options.provider)
    return provider.chat(prompt, options)
  }

  /**
   * ストリーミングチャット補完
   * @param prompt - プロンプト
   * @param onChunk - チャンクコールバック
   * @param options - オプション
   */
  static async chatStream(prompt: string, onChunk: (chunk: string) => void, options: AIServiceOptions = {}): Promise<void> {
    const provider = this.getProvider(options.provider)
    return provider.chatStream(prompt, onChunk, options)
  }

  /**
   * 画像生成
   * @param prompt - プロンプト
   * @param options - オプション
   * @returns Image response
   */
  static async generateImage(prompt: string, options: ImageGenerationOptions & { provider?: ProviderName } = {}): Promise<ImageResponse> {
    const provider = this.getProvider(options.provider || 'openai')
    return provider.generateImage(prompt, options)
  }

  /**
   * 画像編集
   * @param imageUrl - 元画像URL
   * @param prompt - プロンプト
   * @param options - オプション
   * @returns Image response
   */
  static async editImage(imageUrl: string, prompt: string, options: ImageGenerationOptions & { provider?: ProviderName } = {}): Promise<ImageResponse> {
    const provider = this.getProvider(options.provider || 'openai')
    return provider.editImage(imageUrl, prompt, options)
  }

  /**
   * 埋め込み生成
   * @param text - テキスト
   * @param options - オプション
   * @returns Embedding vector
   */
  static async embed(text: string, options: Record<string, unknown> & { provider?: ProviderName } = {}): Promise<number[]> {
    const provider = this.getProvider(options.provider || 'openai')
    return provider.embed(text, options)
  }
}
