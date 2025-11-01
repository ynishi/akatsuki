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

    // EdgeFunctionServiceは { data, error } 形式を返す
    // ai-chatのレスポンス: { response, model, usage, tokens }
    const { data, error } = await EdgeFunctionService.invoke('ai-chat', payload)

    if (error) {
      throw new Error(`OpenAI chat failed: ${error.message}`)
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
    const { data, error } = await EdgeFunctionService.invoke('ai-stream', payload)

    if (error) {
      throw new Error(`OpenAI stream failed: ${error.message}`)
    }

    // 暫定: 非ストリーミングで全体を返す
    onChunk({ text: data.text, done: false })
    onChunk({ text: '', done: true })
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

    const { data, error } = await EdgeFunctionService.invoke('ai-image', payload)

    if (error) {
      throw new Error(`OpenAI image generation failed: ${error.message}`)
    }

    return {
      url: data.url,
      data: data.data,
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

    const { data, error } = await EdgeFunctionService.invoke('ai-image-edit', payload)

    if (error) {
      throw new Error(`OpenAI image edit failed: ${error.message}`)
    }

    return {
      url: data.url,
      data: data.data,
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

    const { data, error } = await EdgeFunctionService.invoke('ai-embed', payload)

    if (error) {
      throw new Error(`OpenAI embedding failed: ${error.message}`)
    }

    return data.embedding
  }
}
