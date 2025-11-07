import { BaseProvider, ProviderConfig, ChatOptions, ChatResponse, ImageGenerationOptions, ImageResponse } from './BaseProvider'
import { EdgeFunctionService } from '../../EdgeFunctionService'

/**
 * Gemini Provider Configuration
 */
export interface GeminiProviderConfig extends ProviderConfig {
  model?: string
}

/**
 * Gemini-specific chat options
 */
export interface GeminiChatOptions extends ChatOptions {
  responseJson?: boolean
}

/**
 * Gemini-specific chat response
 */
interface GeminiChatResponse {
  response: string
  model: string
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
  tokens?: number
}

/**
 * Gemini-specific embed response
 */
interface GeminiEmbedResponse {
  embedding: number[]
  model: string
}

/**
 * Google Gemini Provider
 * Gemini APIを使用したAI機能の実装
 */
export class GeminiProvider extends BaseProvider {
  private defaultModel: string

  constructor(config: GeminiProviderConfig = {}) {
    super(config)
    this.defaultModel = config.model || 'gemini-2.5-flash'
  }

  /**
   * チャット補完
   */
  async chat(prompt: string, options: GeminiChatOptions = {}): Promise<ChatResponse> {
    const payload = {
      provider: 'gemini',
      prompt,
      model: options.model || this.defaultModel,
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? 1000,
      messages: options.messages || undefined,
      responseJson: options.responseJson || false,
    }

    // EdgeFunctionServiceは { data, error } 形式を返す
    // ai-chatのレスポンス: { response, model, usage, tokens }
    const { data, error } = await EdgeFunctionService.invoke<GeminiChatResponse>('ai-chat', payload)

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error('Gemini chat failed: No data returned')
    }

    return {
      text: data.response,
      usage: data.usage,
      model: data.model,
    }
  }

  /**
   * ストリーミングチャット補完
   */
  async chatStream(prompt: string, onChunk: (chunk: string) => void, options: ChatOptions = {}): Promise<void> {
    const payload = {
      provider: 'gemini',
      prompt,
      model: options.model || this.defaultModel,
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? 1000,
      messages: options.messages || [],
      stream: true,
    }

    // TODO: Edge Functionでストリーミング実装後に有効化
    await EdgeFunctionService.invokeStream('ai-chat', payload, (chunk: { text: string }) => {
      onChunk(chunk.text)
    })
  }

  /**
   * 画像生成
   * Geminiは画像生成未対応
   */
  async generateImage(_prompt: string, _options: ImageGenerationOptions = {}): Promise<ImageResponse> {
    throw new Error('Gemini does not support image generation. Use OpenAI provider instead.')
  }

  /**
   * 画像編集
   * Geminiは画像編集未対応
   */
  async editImage(_imageUrl: string, _prompt: string, _options: ImageGenerationOptions = {}): Promise<ImageResponse> {
    throw new Error('Gemini does not support image editing. Use OpenAI provider instead.')
  }

  /**
   * 埋め込み生成
   */
  async embed(text: string, options: Record<string, unknown> = {}): Promise<number[]> {
    const payload = {
      provider: 'gemini',
      text,
      model: (options.model as string) || 'text-embedding-004',
    }

    const { data, error } = await EdgeFunctionService.invoke<GeminiEmbedResponse>('ai-embed', payload)

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error('Gemini embed failed: No data returned')
    }

    return data.embedding
  }
}
