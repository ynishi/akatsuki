import { BaseProvider } from './BaseProvider'
import { EdgeFunctionService } from '../../EdgeFunctionService'

/**
 * Google Gemini Provider
 * Gemini APIを使用したAI機能の実装
 */
export class GeminiProvider extends BaseProvider {
  constructor(config = {}) {
    super(config)
    this.defaultModel = config.model || 'gemini-2.5-flash'
    this.config = config
  }

  /**
   * チャット補完
   * @param {string} prompt - プロンプト
   * @param {Object} options - オプション
   * @returns {Promise<Object>}
   */
  async chat(prompt, options = {}) {
    const payload = {
      provider: 'gemini',
      prompt,
      model: options.model || this.defaultModel,
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? 1000,
      messages: options.messages || undefined,
      responseJson: options.responseJson || false,
    }

    const result = await EdgeFunctionService.invoke('ai-chat', payload)

    // New response format: { success, response, model, usage, tokens }
    return {
      text: result.response,
      usage: result.usage,
      tokens: result.tokens,
      model: result.model,
      success: result.success,
    }
  }

  /**
   * ストリーミングチャット補完
   * @param {string} prompt - プロンプト
   * @param {Function} onChunk - チャンクコールバック
   * @param {Object} options - オプション
   */
  async chatStream(prompt, onChunk, options = {}) {
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
    await EdgeFunctionService.invokeStream('ai-chat', payload, (chunk) => {
      onChunk(chunk.text)
    })
  }

  /**
   * 画像生成
   * Geminiは画像生成未対応
   */
  async generateImage(prompt, options = {}) {
    throw new Error('Gemini does not support image generation. Use OpenAI provider instead.')
  }

  /**
   * 画像編集
   * Geminiは画像編集未対応
   */
  async editImage(imageUrl, prompt, options = {}) {
    throw new Error('Gemini does not support image editing. Use OpenAI provider instead.')
  }

  /**
   * 埋め込み生成
   * @param {string} text - テキスト
   * @param {Object} options - オプション
   * @returns {Promise<Array>}
   */
  async embed(text, options = {}) {
    const payload = {
      provider: 'gemini',
      text,
      model: options.model || 'text-embedding-004',
    }

    const result = await EdgeFunctionService.invoke('ai-embed', payload)

    return {
      embedding: result.embedding,
      model: result.model,
    }
  }
}
