/**
 * ComfyUI Model
 * ComfyUIで使用可能なモデル（チェックポイント）の情報を管理
 *
 * 用途:
 * - RunPodからフェッチしたモデル一覧のキャッシュ
 * - カテゴリ分類とメタデータ管理
 * - 使用統計とおすすめモデル表示
 */
export class ComfyUIModel {
  constructor({
    id = null,
    filename,
    displayName = null,
    description = null,
    category = null,
    tags = [],
    modelType = 'checkpoint',
    baseModel = null,
    recommendedSettings = null,
    usageCount = 0,
    lastUsedAt = null,
    isActive = true,
    isFeatured = false,
    sortOrder = 0,
    createdAt = null,
    updatedAt = null,
    lastSyncedAt = null,
  } = {}) {
    this.id = id
    this.filename = filename // 一意識別子
    this.displayName = displayName
    this.description = description
    this.category = category // 'anime', 'pony', '3d', 'realistic', 'other'
    this.tags = tags
    this.modelType = modelType // 'checkpoint', 'lora', 'vae', 'embedding'
    this.baseModel = baseModel // 'SDXL', 'SD1.5', 'Flux'
    this.recommendedSettings = recommendedSettings // { steps, cfg, sampler }
    this.usageCount = usageCount
    this.lastUsedAt = lastUsedAt
    this.isActive = isActive
    this.isFeatured = isFeatured
    this.sortOrder = sortOrder
    this.createdAt = createdAt
    this.updatedAt = updatedAt
    this.lastSyncedAt = lastSyncedAt
  }

  /**
   * Supabaseのレコードからインスタンスを生成
   * @param {Object} data - データベースレコード
   * @returns {ComfyUIModel}
   */
  static fromDatabase(data) {
    return new ComfyUIModel({
      id: data.id,
      filename: data.filename,
      displayName: data.display_name,
      description: data.description,
      category: data.category,
      tags: data.tags || [],
      modelType: data.model_type,
      baseModel: data.base_model,
      recommendedSettings: data.recommended_settings,
      usageCount: data.usage_count,
      lastUsedAt: data.last_used_at,
      isActive: data.is_active,
      isFeatured: data.is_featured,
      sortOrder: data.sort_order,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      lastSyncedAt: data.last_synced_at,
    })
  }

  /**
   * Supabase保存用のオブジェクトに変換
   * @returns {Object}
   */
  toDatabase() {
    return {
      id: this.id,
      filename: this.filename,
      display_name: this.displayName,
      description: this.description,
      category: this.category,
      tags: this.tags,
      model_type: this.modelType,
      base_model: this.baseModel,
      recommended_settings: this.recommendedSettings,
      usage_count: this.usageCount,
      last_used_at: this.lastUsedAt,
      is_active: this.isActive,
      is_featured: this.isFeatured,
      sort_order: this.sortOrder,
      last_synced_at: this.lastSyncedAt,
    }
  }

  /**
   * 表示名を取得（なければファイル名から生成）
   * @returns {string}
   */
  getDisplayName() {
    if (this.displayName) return this.displayName
    // .safetensorsを削除して表示
    return this.filename.replace('.safetensors', '')
  }

  /**
   * カテゴリの表示名を取得
   * @returns {string}
   */
  getCategoryDisplay() {
    const categoryMap = {
      anime: 'Anime',
      pony: 'Pony',
      '3d': '3D',
      realistic: 'Realistic',
      other: 'Other',
    }
    return categoryMap[this.category] || 'Uncategorized'
  }

  /**
   * おすすめ設定を取得（なければデフォルト値）
   * @returns {Object}
   */
  getRecommendedSettings() {
    return this.recommendedSettings || {
      steps: 25,
      cfg: 7.0,
      sampler: 'euler',
      scheduler: 'normal',
    }
  }

  /**
   * 人気モデルかどうか（使用回数で判定）
   * @returns {boolean}
   */
  isPopular() {
    return this.usageCount > 10 // 閾値は適宜調整
  }

  /**
   * 最近使われたかどうか（7日以内）
   * @returns {boolean}
   */
  isRecentlyUsed() {
    if (!this.lastUsedAt) return false
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    return new Date(this.lastUsedAt) > sevenDaysAgo
  }

  /**
   * タグで検索マッチするか
   * @param {string} query - 検索クエリ
   * @returns {boolean}
   */
  matchesSearch(query) {
    if (!query) return true
    const lowerQuery = query.toLowerCase()

    // ファイル名、表示名、説明、タグで検索
    return (
      this.filename.toLowerCase().includes(lowerQuery) ||
      this.getDisplayName().toLowerCase().includes(lowerQuery) ||
      (this.description && this.description.toLowerCase().includes(lowerQuery)) ||
      this.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    )
  }
}
