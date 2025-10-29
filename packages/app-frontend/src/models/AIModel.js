/**
 * AIモデル定義
 * プロバイダーごとのモデル情報を管理
 */
export class AIModel {
  /**
   * @param {Object} params
   * @param {string} params.id - UUID
   * @param {string} params.provider - プロバイダー名 (openai, claude, gemini)
   * @param {string} params.modelId - プロバイダー側のモデルID (例: "gpt-4o")
   * @param {string} params.label - UI表示名 (例: "GPT-4o")
   * @param {boolean} params.isActive - 有効/無効
   * @param {boolean} params.isBasic - Basic tier (false = Advanced)
   * @param {number} params.sortOrder - 表示順
   * @param {boolean} params.supportsText - テキスト対応
   * @param {boolean} params.supportsImageInput - 画像入力対応 (Vision)
   * @param {boolean} params.supportsImageOutput - 画像出力対応 (生成)
   * @param {boolean} params.supportsAudio - 音声対応
   * @param {boolean} params.supportsVideo - 動画対応
   * @param {boolean} params.supportsStreaming - ストリーミング対応
   * @param {boolean} params.supportsFunctionCalling - Function Calling対応
   * @param {boolean} params.supportsJson - JSON mode対応
   * @param {number} params.maxTokens - 最大出力トークン数
   * @param {number} params.contextWindow - コンテキストウィンドウサイズ
   * @param {string} params.createdAt - 作成日時
   * @param {string} params.updatedAt - 更新日時
   */
  constructor({
    id,
    provider,
    modelId,
    label,
    isActive = true,
    isBasic = false,
    sortOrder = 0,
    supportsText = true,
    supportsImageInput = false,
    supportsImageOutput = false,
    supportsAudio = false,
    supportsVideo = false,
    supportsStreaming = false,
    supportsFunctionCalling = false,
    supportsJson = false,
    maxTokens = null,
    contextWindow = null,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id
    this.provider = provider
    this.modelId = modelId
    this.label = label
    this.isActive = isActive
    this.isBasic = isBasic
    this.sortOrder = sortOrder
    this.supportsText = supportsText
    this.supportsImageInput = supportsImageInput
    this.supportsImageOutput = supportsImageOutput
    this.supportsAudio = supportsAudio
    this.supportsVideo = supportsVideo
    this.supportsStreaming = supportsStreaming
    this.supportsFunctionCalling = supportsFunctionCalling
    this.supportsJson = supportsJson
    this.maxTokens = maxTokens
    this.contextWindow = contextWindow
    this.createdAt = createdAt
    this.updatedAt = updatedAt
  }

  /**
   * Advancedモデルかどうか
   */
  isAdvanced() {
    return !this.isBasic
  }

  /**
   * UI表示用のラベル
   */
  getLabel() {
    return `${this.label} (${this.provider})`
  }

  /**
   * UI表示用の詳細説明
   */
  getDescription() {
    const features = []
    if (this.supportsStreaming) features.push('Streaming')
    if (this.supportsImageInput) features.push('Vision')
    if (this.supportsImageOutput) features.push('Image Gen')
    if (this.supportsFunctionCalling) features.push('Function Call')
    if (this.supportsJson) features.push('JSON')

    const tierLabel = this.isAdvanced() ? 'Advanced' : 'Basic'
    const contextInfo = this.contextWindow ? `${(this.contextWindow / 1000).toFixed(0)}k tokens` : ''
    const featuresText = features.length > 0 ? ` | ${features.join(', ')}` : ''

    return `${tierLabel}${contextInfo ? ` | ${contextInfo}` : ''}${featuresText}`
  }

  /**
   * データベースレコードから生成
   */
  static fromDatabase(record) {
    return new AIModel({
      id: record.id,
      provider: record.provider,
      modelId: record.model_id,
      label: record.label,
      isActive: record.is_active,
      isBasic: record.is_basic,
      sortOrder: record.sort_order,
      supportsText: record.supports_text ?? true,
      supportsImageInput: record.supports_image_input ?? false,
      supportsImageOutput: record.supports_image_output ?? false,
      supportsAudio: record.supports_audio ?? false,
      supportsVideo: record.supports_video ?? false,
      supportsStreaming: record.supports_streaming ?? false,
      supportsFunctionCalling: record.supports_function_calling ?? false,
      supportsJson: record.supports_json ?? false,
      maxTokens: record.max_tokens,
      contextWindow: record.context_window,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    })
  }

  /**
   * データベース保存用に変換
   */
  toDatabase() {
    return {
      id: this.id,
      provider: this.provider,
      model_id: this.modelId,
      label: this.label,
      is_active: this.isActive,
      is_basic: this.isBasic,
      sort_order: this.sortOrder,
      supports_text: this.supportsText,
      supports_image_input: this.supportsImageInput,
      supports_image_output: this.supportsImageOutput,
      supports_audio: this.supportsAudio,
      supports_video: this.supportsVideo,
      supports_streaming: this.supportsStreaming,
      supports_function_calling: this.supportsFunctionCalling,
      supports_json: this.supportsJson,
      max_tokens: this.maxTokens,
      context_window: this.contextWindow,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    }
  }

  /**
   * JSON化
   */
  toJSON() {
    return {
      id: this.id,
      provider: this.provider,
      modelId: this.modelId,
      label: this.label,
      isActive: this.isActive,
      isBasic: this.isBasic,
      sortOrder: this.sortOrder,
      supportsText: this.supportsText,
      supportsImageInput: this.supportsImageInput,
      supportsImageOutput: this.supportsImageOutput,
      supportsAudio: this.supportsAudio,
      supportsVideo: this.supportsVideo,
      supportsStreaming: this.supportsStreaming,
      supportsFunctionCalling: this.supportsFunctionCalling,
      supportsJson: this.supportsJson,
      maxTokens: this.maxTokens,
      contextWindow: this.contextWindow,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}
