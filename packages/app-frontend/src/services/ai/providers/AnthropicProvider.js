import { BaseProvider } from './BaseProvider'
import { EdgeFunctionService } from '../../EdgeFunctionService'

/**
 * Anthropic (Claude) Provider
 * Edge Function経由でAnthropic APIを呼び出し
 */
export class AnthropicProvider extends BaseProvider {
  constructor(config = {}) {
    super(config)
    this.defaultModel = config.model || 'claude-sonnet-4-5-20250929'
  }

  /**
   * チャット補完
   */
  async chat(prompt, options = {}) {
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
    const { data, error } = await EdgeFunctionService.invoke('ai-chat', payload)

    if (error) {
      throw new Error(`Anthropic chat failed: ${error.message}`)
    }

    return {
      text: data.response,
      usage: data.usage,
      model: data.model,
      tokens: data.tokens,
    }
  }

  /**
   * ストリーミングチャット補完
   */
  async chatStream(prompt, onChunk, options = {}) {
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
    const { data, error } = await EdgeFunctionService.invoke('ai-stream', payload)

    if (error) {
      throw new Error(`Anthropic stream failed: ${error.message}`)
    }

    // 暫定: 非ストリーミングで全体を返す
    onChunk({ text: data.text, done: false })
    onChunk({ text: '', done: true })
  }

  /**
   * 画像生成（Anthropic は未対応）
   */
  async generateImage(prompt, options = {}) {
    throw new Error('Anthropic does not support image generation. Use OpenAI or other providers.')
  }

  /**
   * 画像編集（Anthropic は未対応）
   */
  async editImage(imageUrl, prompt, options = {}) {
    throw new Error('Anthropic does not support image editing. Use OpenAI or other providers.')
  }

  /**
   * 埋め込み生成（Anthropic は未対応）
   */
  async embed(text, options = {}) {
    throw new Error('Anthropic does not support embeddings. Use OpenAI or other providers.')
  }
}
