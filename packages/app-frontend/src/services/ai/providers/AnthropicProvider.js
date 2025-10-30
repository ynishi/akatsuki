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

    try {
      const result = await EdgeFunctionService.invoke('ai-chat', payload)
      return {
        text: result.text,
        usage: result.usage,
        model: result.model,
      }
    } catch (error) {
      throw new Error(`Anthropic chat failed: ${error.message}`)
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

    try {
      // TODO: SSE (Server-Sent Events) 実装
      const result = await EdgeFunctionService.invoke('ai-stream', payload)

      // 暫定: 非ストリーミングで全体を返す
      onChunk({ text: result.text, done: false })
      onChunk({ text: '', done: true })
    } catch (error) {
      throw new Error(`Anthropic stream failed: ${error.message}`)
    }
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
