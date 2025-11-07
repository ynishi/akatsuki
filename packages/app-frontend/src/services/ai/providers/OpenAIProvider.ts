import { BaseProvider, ProviderConfig, ChatOptions, ChatResponse, ImageGenerationOptions, ImageResponse } from './BaseProvider'
import { EdgeFunctionService } from '../../EdgeFunctionService'

/**
 * OpenAI Provider Configuration
 */
export interface OpenAIProviderConfig extends ProviderConfig {
  model?: string
  imageModel?: string
}

/**
 * OpenAI-specific chat response
 */
interface OpenAIChatResponse {
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
 * OpenAI Provider
 * Edge Function経由でOpenAI APIを呼び出し
 */
export class OpenAIProvider extends BaseProvider {
  private defaultModel: string
  private defaultImageModel: string

  constructor(config: OpenAIProviderConfig = {}) {
    super(config)
    this.defaultModel = config.model || 'gpt-4o-mini'
    this.defaultImageModel = config.imageModel || 'dall-e-3'
  }

  /**
   * チャット補完
   */
  async chat(prompt: string, options: ChatOptions = {}): Promise<ChatResponse> {
    const payload = {
      provider: 'openai',
      prompt,
      model: options.model || this.defaultModel,
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? 1000,
      messages: options.messages || [],
    }

    // EdgeFunctionServiceは { data, error } 形式を返す
    // ai-chatのレスポンス: { response, model, usage, tokens }
    const { data, error } = await EdgeFunctionService.invoke<OpenAIChatResponse>('ai-chat', payload)

    if (error) {
      throw new Error(`OpenAI chat failed: ${error.message}`)
    }

    if (!data) {
      throw new Error('OpenAI chat failed: No data returned')
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
      provider: 'openai',
      prompt,
      model: options.model || this.defaultModel,
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? 1000,
      messages: options.messages || [],
      stream: true,
    }

    // TODO: SSE (Server-Sent Events) 実装
    // Edge Function 'ai-stream' を呼び出してストリーミング受信
    const { data, error } = await EdgeFunctionService.invoke<{ text: string }>('ai-stream', payload)

    if (error) {
      throw new Error(`OpenAI stream failed: ${error.message}`)
    }

    if (!data) {
      throw new Error('OpenAI stream failed: No data returned')
    }

    // 暫定: 非ストリーミングで全体を返す
    onChunk(data.text)
  }

  /**
   * 画像生成（DALL-E）
   */
  async generateImage(prompt: string, options: ImageGenerationOptions = {}): Promise<ImageResponse> {
    const payload = {
      provider: 'openai',
      prompt,
      model: options.model || this.defaultImageModel,
      size: options.size || '1024x1024',
      quality: options.quality || 'standard',
      n: 1,
    }

    const { data, error } = await EdgeFunctionService.invoke<ImageResponse>('ai-image', payload)

    if (error) {
      throw new Error(`OpenAI image generation failed: ${error.message}`)
    }

    if (!data) {
      throw new Error('OpenAI image generation failed: No data returned')
    }

    return {
      url: data.url,
      data: data.data,
    }
  }

  /**
   * 画像編集（DALL-E Edit）
   */
  async editImage(imageUrl: string, prompt: string, options: ImageGenerationOptions = {}): Promise<ImageResponse> {
    const payload = {
      provider: 'openai',
      imageUrl,
      prompt,
      model: options.model || this.defaultImageModel,
      size: options.size || '1024x1024',
    }

    const { data, error } = await EdgeFunctionService.invoke<ImageResponse>('ai-image-edit', payload)

    if (error) {
      throw new Error(`OpenAI image edit failed: ${error.message}`)
    }

    if (!data) {
      throw new Error('OpenAI image edit failed: No data returned')
    }

    return {
      url: data.url,
      data: data.data,
    }
  }

  /**
   * 埋め込み生成
   */
  async embed(text: string, options: Record<string, unknown> = {}): Promise<number[]> {
    const payload = {
      provider: 'openai',
      text,
      model: (options.model as string) || 'text-embedding-3-small',
    }

    const { data, error } = await EdgeFunctionService.invoke<{ embedding: number[] }>('ai-embed', payload)

    if (error) {
      throw new Error(`OpenAI embedding failed: ${error.message}`)
    }

    if (!data) {
      throw new Error('OpenAI embedding failed: No data returned')
    }

    return data.embedding
  }
}
