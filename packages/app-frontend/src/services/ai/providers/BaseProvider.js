/**
 * AI Provider 基底クラス
 * すべてのAIプロバイダーはこのインターフェースを実装する
 */
export class BaseProvider {
  constructor(config = {}) {
    this.config = config
  }

  /**
   * チャット補完（テキスト生成）
   * @param {string} prompt - プロンプト
   * @param {Object} options - オプション
   * @param {string} options.model - モデル名
   * @param {number} options.temperature - 温度（0-1）
   * @param {number} options.maxTokens - 最大トークン数
   * @param {Array} options.messages - メッセージ履歴
   * @returns {Promise<Object>} { text, usage, model }
   */
  async chat(prompt, options = {}) {
    throw new Error('chat() must be implemented by subclass')
  }

  /**
   * ストリーミングチャット補完
   * @param {string} prompt - プロンプト
   * @param {Function} onChunk - チャンクコールバック
   * @param {Object} options - オプション
   * @returns {Promise<void>}
   */
  async chatStream(prompt, onChunk, options = {}) {
    throw new Error('chatStream() must be implemented by subclass')
  }

  /**
   * 画像生成（Text-to-Image）
   * @param {string} prompt - プロンプト
   * @param {Object} options - オプション
   * @param {string} options.model - モデル名
   * @param {string} options.size - 画像サイズ（例: "1024x1024"）
   * @param {string} options.quality - 品質（"standard", "hd"）
   * @returns {Promise<Object>} { url, data }
   */
  async generateImage(prompt, options = {}) {
    throw new Error('generateImage() must be implemented by subclass')
  }

  /**
   * 画像編集（Image-to-Image）
   * @param {string} imageUrl - 元画像URL
   * @param {string} prompt - プロンプト
   * @param {Object} options - オプション
   * @returns {Promise<Object>} { url, data }
   */
  async editImage(imageUrl, prompt, options = {}) {
    throw new Error('editImage() must be implemented by subclass')
  }

  /**
   * 埋め込み生成（Embeddings）
   * @param {string} text - テキスト
   * @param {Object} options - オプション
   * @returns {Promise<Array>} ベクトル配列
   */
  async embed(text, options = {}) {
    throw new Error('embed() must be implemented by subclass')
  }
}
