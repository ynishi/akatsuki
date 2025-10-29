import { OpenAIProvider, AnthropicProvider, GeminiProvider } from './providers'

/**
 * AI Service - プロバイダー統合層
 * 複数のAIプロバイダーを統一インターフェースで扱う
 */
export class AIService {
  static providers = {
    openai: new OpenAIProvider(),
    anthropic: new AnthropicProvider(),
    gemini: new GeminiProvider(),
  }

  static defaultProvider = 'openai'

  /**
   * プロバイダーを取得
   * @param {string} providerName - プロバイダー名
   * @returns {BaseProvider}
   */
  static getProvider(providerName = this.defaultProvider) {
    const provider = this.providers[providerName]
    if (!provider) {
      throw new Error(`Unknown provider: ${providerName}. Available: ${Object.keys(this.providers).join(', ')}`)
    }
    return provider
  }

  /**
   * デフォルトプロバイダーを設定
   * @param {string} providerName - プロバイダー名
   */
  static setDefaultProvider(providerName) {
    if (!this.providers[providerName]) {
      throw new Error(`Unknown provider: ${providerName}`)
    }
    this.defaultProvider = providerName
  }

  /**
   * カスタムプロバイダーを追加
   * @param {string} name - プロバイダー名
   * @param {BaseProvider} provider - プロバイダーインスタンス
   */
  static addProvider(name, provider) {
    this.providers[name] = provider
  }

  /**
   * チャット補完
   * @param {string} prompt - プロンプト
   * @param {Object} options - オプション
   * @param {string} options.provider - プロバイダー名（省略時はdefaultProvider）
   * @returns {Promise<Object>}
   */
  static async chat(prompt, options = {}) {
    const provider = this.getProvider(options.provider)
    return provider.chat(prompt, options)
  }

  /**
   * ストリーミングチャット補完
   * @param {string} prompt - プロンプト
   * @param {Function} onChunk - チャンクコールバック
   * @param {Object} options - オプション
   * @returns {Promise<void>}
   */
  static async chatStream(prompt, onChunk, options = {}) {
    const provider = this.getProvider(options.provider)
    return provider.chatStream(prompt, onChunk, options)
  }

  /**
   * 画像生成
   * @param {string} prompt - プロンプト
   * @param {Object} options - オプション
   * @returns {Promise<Object>}
   */
  static async generateImage(prompt, options = {}) {
    const provider = this.getProvider(options.provider || 'openai')
    return provider.generateImage(prompt, options)
  }

  /**
   * 画像編集
   * @param {string} imageUrl - 元画像URL
   * @param {string} prompt - プロンプト
   * @param {Object} options - オプション
   * @returns {Promise<Object>}
   */
  static async editImage(imageUrl, prompt, options = {}) {
    const provider = this.getProvider(options.provider || 'openai')
    return provider.editImage(imageUrl, prompt, options)
  }

  /**
   * 埋め込み生成
   * @param {string} text - テキスト
   * @param {Object} options - オプション
   * @returns {Promise<Array>}
   */
  static async embed(text, options = {}) {
    const provider = this.getProvider(options.provider || 'openai')
    return provider.embed(text, options)
  }
}
