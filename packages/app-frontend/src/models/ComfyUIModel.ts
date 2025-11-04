/**
 * ComfyUI Model
 * ComfyUIで使用可能なモデル（チェックポイント）の情報を管理
 *
 * 用途:
 * - RunPodからフェッチしたモデル一覧のキャッシュ
 * - カテゴリ分類とメタデータ管理
 * - 使用統計とおすすめモデル表示
 */

export type ComfyUIModelType = 'checkpoint' | 'lora' | 'vae' | 'embedding'
export type ComfyUIModelCategory = 'anime' | 'pony' | '3d' | 'realistic' | 'other'
export type ComfyUIBaseModel = 'SDXL' | 'SD1.5' | 'Flux' | null

export interface ComfyUIModelSettings {
  steps?: number
  cfg?: number
  sampler?: string
  scheduler?: string
}

export interface ComfyUIModelData {
  id?: string | null
  filename: string
  displayName?: string | null
  description?: string | null
  category?: ComfyUIModelCategory | null
  tags?: string[]
  modelType?: ComfyUIModelType
  baseModel?: ComfyUIBaseModel
  recommendedSettings?: ComfyUIModelSettings | null
  usageCount?: number
  lastUsedAt?: string | null
  isActive?: boolean
  isFeatured?: boolean
  sortOrder?: number
  createdAt?: string | null
  updatedAt?: string | null
  lastSyncedAt?: string | null
}

export interface ComfyUIModelDatabaseRecord {
  id: string
  filename: string
  display_name: string | null
  description: string | null
  category: ComfyUIModelCategory | null
  tags: string[]
  model_type: ComfyUIModelType
  base_model: ComfyUIBaseModel
  recommended_settings: ComfyUIModelSettings | null
  usage_count: number
  last_used_at: string | null
  is_active: boolean
  is_featured: boolean
  sort_order: number
  created_at: string
  updated_at: string
  last_synced_at: string | null
}

export class ComfyUIModel {
  id: string | null
  filename: string
  displayName: string | null
  description: string | null
  category: ComfyUIModelCategory | null
  tags: string[]
  modelType: ComfyUIModelType
  baseModel: ComfyUIBaseModel
  recommendedSettings: ComfyUIModelSettings | null
  usageCount: number
  lastUsedAt: string | null
  isActive: boolean
  isFeatured: boolean
  sortOrder: number
  createdAt: string | null
  updatedAt: string | null
  lastSyncedAt: string | null

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
  }: ComfyUIModelData) {
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
   */
  static fromDatabase(data: ComfyUIModelDatabaseRecord): ComfyUIModel {
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
   */
  getDisplayName(): string {
    if (this.displayName) return this.displayName
    // .safetensorsを削除して表示
    return this.filename.replace('.safetensors', '')
  }

  /**
   * カテゴリの表示名を取得
   */
  getCategoryDisplay(): string {
    const categoryMap: Record<string, string> = {
      anime: 'Anime',
      pony: 'Pony',
      '3d': '3D',
      realistic: 'Realistic',
      other: 'Other',
    }
    return categoryMap[this.category || ''] || 'Uncategorized'
  }

  /**
   * おすすめ設定を取得（なければデフォルト値）
   */
  getRecommendedSettings(): ComfyUIModelSettings {
    return this.recommendedSettings || {
      steps: 25,
      cfg: 7.0,
      sampler: 'euler',
      scheduler: 'normal',
    }
  }

  /**
   * 人気モデルかどうか（使用回数で判定）
   */
  isPopular(): boolean {
    return this.usageCount > 10 // 閾値は適宜調整
  }

  /**
   * 最近使われたかどうか（7日以内）
   */
  isRecentlyUsed(): boolean {
    if (!this.lastUsedAt) return false
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    return new Date(this.lastUsedAt) > sevenDaysAgo
  }

  /**
   * タグで検索マッチするか
   */
  matchesSearch(query: string): boolean {
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
