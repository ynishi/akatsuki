import { BaseProvider } from './BaseProvider'
import { EdgeFunctionService } from '../../EdgeFunctionService'

/**
 * OpenAI Provider
 * Edge Function経由でOpenAI APIを呼び出し
 */
export class OpenAIProvider extends BaseProvider {
  constructor(config = {}) {
    super(config)
    this.defaultModel = config.model || 'gpt-4o-mini'
    this.defaultImageModel = config.imageModel || 'dall-e-3'
  }

  /**
   * チャット補完
   */
  async chat(prompt, options = {}) {
    const payload = {
      provider: 'openai',
      prompt,
      model: options.model || this.defaultModel,
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? 1000,
      messages: options.messages || [],
    }

    try {
      // EdgeFunctionServiceは既にresultを抽出して返す
      // ai-chatのレスポンス: { response, model, usage, tokens }
      const result = await EdgeFunctionService.invoke('ai-chat', payload)
      return {
        text: result.response, // responseフィールドに変更
        usage: result.usage,
        model: result.model,
        tokens: result.tokens, // トークン情報も追加
      }
    } catch (error) {
      throw new Error(`OpenAI chat failed: ${error.message}`)
    }
  }

  /**
   * ストリーミングチャット補完
   */
  async chatStream(prompt, onChunk, options = {}) {
    const payload = {
      provider: 'openai',
      prompt,
      model: options.model || this.defaultModel,
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? 1000,
      messages: options.messages || [],
      stream: true,
    }

    try {
      // TODO: SSE (Server-Sent Events) 実装
      // Edge Function 'ai-stream' を呼び出してストリーミング受信
      const result = await EdgeFunctionService.invoke('ai-stream', payload)

      // 暫定: 非ストリーミングで全体を返す
      onChunk({ text: result.text, done: false })
      onChunk({ text: '', done: true })
    } catch (error) {
      throw new Error(`OpenAI stream failed: ${error.message}`)
    }
  }

  /**
   * 画像生成（DALL-E）
   */
  async generateImage(prompt, options = {}) {
    const payload = {
      provider: 'openai',
      prompt,
      model: options.model || this.defaultImageModel,
      size: options.size || '1024x1024',
      quality: options.quality || 'standard',
      n: options.n || 1,
    }

    try {
      const result = await EdgeFunctionService.invoke('ai-image', payload)
      return {
        url: result.url,
        data: result.data,
      }
    } catch (error) {
      throw new Error(`OpenAI image generation failed: ${error.message}`)
    }
  }

  /**
   * 画像編集（DALL-E Edit）
   */
  async editImage(imageUrl, prompt, options = {}) {
    const payload = {
      provider: 'openai',
      imageUrl,
      prompt,
      model: options.model || this.defaultImageModel,
      size: options.size || '1024x1024',
    }

    try {
      const result = await EdgeFunctionService.invoke('ai-image-edit', payload)
      return {
        url: result.url,
        data: result.data,
      }
    } catch (error) {
      throw new Error(`OpenAI image edit failed: ${error.message}`)
    }
  }

  /**
   * 埋め込み生成
   */
  async embed(text, options = {}) {
    const payload = {
      provider: 'openai',
      text,
      model: options.model || 'text-embedding-3-small',
    }

    try {
      const result = await EdgeFunctionService.invoke('ai-embed', payload)
      return result.embedding
    } catch (error) {
      throw new Error(`OpenAI embedding failed: ${error.message}`)
    }
  }
}
