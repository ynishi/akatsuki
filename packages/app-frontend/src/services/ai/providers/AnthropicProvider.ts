import { BaseProvider, ProviderConfig, ChatOptions, ChatResponse, ImageGenerationOptions, ImageResponse } from './BaseProvider'
import { EdgeFunctionService } from '../../EdgeFunctionService'

/**
 * Anthropic Provider Configuration
 */
export interface AnthropicProviderConfig extends ProviderConfig {
  model?: string
}

/**
 * Anthropic-specific chat response
 */
interface AnthropicChatResponse {
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
 * Anthropic (Claude) Provider
 * Edge Function経由でAnthropic APIを呼び出し
 */
export class AnthropicProvider extends BaseProvider {
  private defaultModel: string

  constructor(config: AnthropicProviderConfig = {}) {
    super(config)
    this.defaultModel = config.model || 'claude-sonnet-4-5-20250929'
  }

  /**
   * チャット補完
   */
  async chat(prompt: string, options: ChatOptions = {}): Promise<ChatResponse> {
    const payload = {
      provider: 'anthropic',
      prompt,
      model: options.model || this.defaultModel,
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? 1000,
      messages: options.messages || [],
    }

    // EdgeFunctionServiceは { data, error } 形式を返す
    // ai-chatのレスポンス: { response, model, usage, tokens }
    const { data, error } = await EdgeFunctionService.invoke<AnthropicChatResponse>('ai-chat', payload)

    if (error) {
      throw new Error(`Anthropic chat failed: ${error.message}`)
    }

    if (!data) {
      throw new Error('Anthropic chat failed: No data returned')
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
      provider: 'anthropic',
      prompt,
      model: options.model || this.defaultModel,
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? 1000,
      messages: options.messages || [],
      stream: true,
    }

    // TODO: SSE (Server-Sent Events) 実装
    const { data, error } = await EdgeFunctionService.invoke<{ text: string }>('ai-stream', payload)

    if (error) {
      throw new Error(`Anthropic stream failed: ${error.message}`)
    }

    if (!data) {
      throw new Error('Anthropic stream failed: No data returned')
    }

    // 暫定: 非ストリーミングで全体を返す
    onChunk(data.text)
  }

  /**
   * 画像生成（Anthropic は未対応）
   */
  async generateImage(_prompt: string, _options: ImageGenerationOptions = {}): Promise<ImageResponse> {
    throw new Error('Anthropic does not support image generation. Use OpenAI or other providers.')
  }

  /**
   * 画像編集（Anthropic は未対応）
   */
  async editImage(_imageUrl: string, _prompt: string, _options: ImageGenerationOptions = {}): Promise<ImageResponse> {
    throw new Error('Anthropic does not support image editing. Use OpenAI or other providers.')
  }

  /**
   * 埋め込み生成（Anthropic は未対応）
   */
  async embed(_text: string, _options: Record<string, unknown> = {}): Promise<number[]> {
    throw new Error('Anthropic does not support embeddings. Use OpenAI or other providers.')
  }
}
