import { EdgeFunctionService } from './EdgeFunctionService'
import { FileUtils } from '../utils/FileUtils'
import { uuidToBase62 } from '../utils/base62'

/**
 * Public Storage Service
 * 公開ファイル（アバター、ロゴ、一般公開画像など）のアップロード・削除を管理
 */

export interface UploadOptions {
  folder?: string
  metadata?: Record<string, unknown>
  allowedTypes?: string[]
  maxSizeMB?: number
}

export interface UploadResult {
  id: string
  publicUrl: string
  storagePath: string
  metadata: Record<string, unknown>
  bucket: string
  success: boolean
  cdnUrl: string
  cdnUrlFull: string
}

export interface CreateUrlAliasOptions {
  shortCode?: string
  slug?: string
  ogTitle?: string
  ogDescription?: string
  ogImageAlt?: string
  expiresAt?: string
}

export interface CreateUrlAliasResult {
  id: string
  shortCode?: string
  slug?: string
  cdnUrls: {
    short?: string
    seo?: string
  }
}

export interface DeleteResult {
  success: boolean
  deletedAt: string
}

export class PublicStorageService {
  static BUCKET_NAME = 'public_assets'
  static DEFAULT_MAX_SIZE_MB = 10
  static CDN_BASE_PATH = '/functions/v1/cdn-gateway'

  /**
   * Public ファイルをアップロード
   */
  static async upload(file: File, options: UploadOptions = {}): Promise<UploadResult> {
    const {
      folder = '',
      metadata = {},
      allowedTypes = [],
      maxSizeMB = this.DEFAULT_MAX_SIZE_MB,
    } = options

    // バリデーション
    this._validateFile(file, { allowedTypes, maxSizeMB })

    // FormData 作成
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', this.BUCKET_NAME)
    formData.append('isPublic', 'true')
    if (folder) formData.append('folder', folder)
    formData.append('metadata', JSON.stringify(metadata))

    try {
      // Edge Function 呼び出し: Storage アップロード + DB INSERT
      const { data, error } = await EdgeFunctionService.invoke('upload-file', formData, {
        isFormData: true,
      })

      if (error) {
        throw error
      }

      if (!data || typeof data !== 'object') {
        throw new Error('Edge Function が無効なレスポンスを返しました')
      }

      const mappedResult = {
        id: data.file_id, // files テーブルの ID
        publicUrl: data.public_url, // 恒久的な公開 URL
        storagePath: data.storage_path, // Storage 内のパス
        metadata: data.metadata, // DB に保存されたメタデータ
        bucket: data.bucket || this.BUCKET_NAME,
        success: data.success !== undefined ? data.success : true,
        // CDN URL追加（Base62圧縮版）
        cdnUrl: this.getCdnUrl(data.file_id),
        cdnUrlFull: this.getFullCdnUrl(data.file_id),
      }

      console.log('[PublicStorageService] Mapped result:', mappedResult)

      return mappedResult
    } catch (error: unknown) {
      console.error('[PublicStorageService] Upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Public ファイルのアップロードに失敗: ${errorMessage}`)
    }
  }

  /**
   * 複数の Public ファイルを一括アップロード
   *
   * @param {File[]} files - ファイル配列
   * @param {Object} options - オプション
   * @returns {Promise<Object[]>} アップロード結果の配列
   *
   * @example
   * const results = await PublicStorageService.uploadMultiple(files, {
   *   folder: 'gallery',
   *   maxSizeMB: 5
   * })
   *
   * const successful = results.filter(r => r.success)
   * const failed = results.filter(r => !r.success)
   */
  static async uploadMultiple(files: File[], options: UploadOptions = {}) {
    const uploadPromises = files.map((file: File) =>
      this.upload(file, options).catch((error: unknown) => ({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        fileName: file.name,
      }))
    )

    return await Promise.all(uploadPromises)
  }

  /**
   * Public ファイルを削除
   *
   * Edge Function が以下を実行:
   * 1. files テーブルから DELETE (RLS で権限チェック)
   * 2. Storage Hooks が自動的に Storage のファイルも削除
   *
   * @param {string} fileId - files テーブルの ID
   * @returns {Promise<Object>} { success, deletedAt }
   * @throws {Error} 権限エラー、ファイルが存在しない
   *
   * @example
   * await PublicStorageService.delete(fileId)
   */
  static async delete(fileId: string): Promise<DeleteResult> {
    try {
      const { data, error } = await EdgeFunctionService.invoke('delete-file', {
        fileId,
      })

      if (error) {
        throw error
      }

      if (!data || typeof data !== 'object') {
        throw new Error('Edge Function が無効なレスポンスを返しました')
      }

      return {
        success: true,
        deletedAt: data.deleted_at,
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      if (errorMessage.includes('not found')) {
        throw new Error('ファイルが存在しないか、削除権限がありません')
      }
      throw new Error(`Public ファイルの削除に失敗: ${errorMessage}`)
    }
  }

  /**
   * 複数の Public ファイルを一括削除
   *
   * @param {string[]} fileIds - ファイルID配列
   * @returns {Promise<Object[]>} 削除結果の配列
   *
   * @example
   * const results = await PublicStorageService.deleteMultiple(fileIds)
   * const successful = results.filter(r => r.success)
   */
  static async deleteMultiple(fileIds: string[]) {
    const deletePromises = fileIds.map((fileId: string) =>
      this.delete(fileId).catch((error: unknown) => ({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        fileId,
      }))
    )

    return await Promise.all(deletePromises)
  }

  /**
   * 画像をアップロード（画像専用の便利メソッド）
   *
   * @param {File} imageFile - 画像ファイル
   * @param {Object} options - オプション
   * @returns {Promise<Object>}
   *
   * @example
   * const result = await PublicStorageService.uploadImage(avatarFile, {
   *   folder: 'avatars',
   *   maxSizeMB: 2
   * })
   */
  static async uploadImage(imageFile: File, options: UploadOptions = {}) {
    return this.upload(imageFile, {
      ...options,
      allowedTypes: FileUtils.IMAGE_TYPES,
    })
  }

  /**
   * アバター画像をアップロード（アバター専用の便利メソッド）
   *
   * @param {File} avatarFile - アバター画像
   * @param {Object} options - オプション
   * @returns {Promise<Object>}
   *
   * @example
   * const result = await PublicStorageService.uploadAvatar(file, {
   *   metadata: { userId: currentUser.id }
   * })
   */
  static async uploadAvatar(avatarFile: File, options: UploadOptions = {}) {
    return this.uploadImage(avatarFile, {
      folder: 'avatars',
      maxSizeMB: 2,
      ...options,
    })
  }

  /**
   * ロゴ画像をアップロード（ロゴ専用の便利メソッド）
   *
   * @param {File} logoFile - ロゴ画像
   * @param {Object} options - オプション
   * @returns {Promise<Object>}
   *
   * @example
   * const result = await PublicStorageService.uploadLogo(file, {
   *   metadata: { companyId: '123' }
   * })
   */
  static async uploadLogo(logoFile: File, options: UploadOptions = {}) {
    return this.upload(logoFile, {
      folder: 'logos',
      maxSizeMB: 5,
      allowedTypes: ['image/png', 'image/svg+xml', 'image/jpeg'],
      ...options,
    })
  }

  // ================== CDN URL メソッド ==================

  /**
   * ファイルIDからCDN URLを生成（相対パス）
   *
   * @param {string} fileId - ファイルID（UUID）
   * @returns {string} CDN URL（相対パス）
   *
   * @example
   * const cdnUrl = PublicStorageService.getCdnUrl('550e8400-e29b-41d4-a716-446655440000')
   * // → '/functions/v1/cdn-gateway/2qjb5Xk9lMz7w8PqRaE'
   */
  static getCdnUrl(fileId: string): string {
    if (!fileId) {
      throw new Error('fileId is required')
    }

    const base62Id = uuidToBase62(fileId)
    return `${this.CDN_BASE_PATH}/${base62Id}`
  }

  /**
   * ファイルIDから完全なCDN URLを生成（フルパス）
   *
   * @param {string} fileId - ファイルID（UUID）
   * @returns {string} CDN URL（フルパス）
   *
   * @example
   * const cdnUrl = PublicStorageService.getFullCdnUrl('550e8400-e29b-41d4-a716-446655440000')
   * // → 'https://rogkshcsqnirozjakelo.supabase.co/functions/v1/cdn-gateway/2qjb5Xk9lMz7w8PqRaE'
   */
  static getFullCdnUrl(fileId: string): string {
    const cdnPath = this.getCdnUrl(fileId)

    // Supabase URLを環境変数から取得
    // @ts-ignore - Vite environment variable
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

    if (!supabaseUrl) {
      console.warn('VITE_SUPABASE_URL is not defined, returning relative path')
      return cdnPath
    }

    // Supabase URLベースで完全なURLを生成
    return `${supabaseUrl}${cdnPath}`
  }

  /**
   * カスタムURL Aliasを作成（短縮URL、SEO slug）
   *
   * @param {string} fileId - ファイルID
   * @param {Object} options - オプション
   * @param {string} options.shortCode - 短縮コード (3-20文字の英数字)
   * @param {string} options.slug - SEO slug (3-100文字の小文字英数字+ハイフン)
   * @param {string} options.ogTitle - OGPタイトル
   * @param {string} options.ogDescription - OGP説明文
   * @param {string} options.ogImageAlt - OGP画像代替テキスト
   * @param {string} options.expiresAt - 有効期限 (ISO日時文字列)
   * @returns {Promise<Object>} { id, shortCode, slug, cdnUrls: { short, seo } }
   *
   * @example
   * // 短縮URLを作成
   * const result = await PublicStorageService.createUrlAlias(fileId, {
   *   shortCode: 'cat123',
   *   ogTitle: 'My Cat Photo',
   *   ogDescription: 'Check out my cute cat!'
   * })
   * // → { cdnUrls: { short: '/cdn/i/cat123' } }
   *
   * // SEO slugを作成
   * const result = await PublicStorageService.createUrlAlias(fileId, {
   *   slug: 'my-awesome-sunset-2025',
   *   ogTitle: 'Beautiful Sunset',
   * })
   * // → { cdnUrls: { seo: '/cdn/s/my-awesome-sunset-2025' } }
   *
   * // 両方を作成
   * const result = await PublicStorageService.createUrlAlias(fileId, {
   *   shortCode: 'sun2025',
   *   slug: 'beautiful-sunset-beach-2025',
   *   ogTitle: 'Sunset at the Beach',
   *   ogDescription: 'Amazing sunset view from the beach'
   * })
   */
  static async createUrlAlias(
    fileId: string,
    options: CreateUrlAliasOptions = {}
  ): Promise<CreateUrlAliasResult> {
    const { shortCode, slug, ogTitle, ogDescription, ogImageAlt, expiresAt } = options

    if (!shortCode && !slug) {
      throw new Error('Either shortCode or slug must be provided')
    }

    try {
      const result = await EdgeFunctionService.invoke('create-url-alias', {
        fileId,
        shortCode: shortCode || null,
        slug: slug || null,
        ogTitle: ogTitle || null,
        ogDescription: ogDescription || null,
        ogImageAlt: ogImageAlt || null,
        expiresAt: expiresAt || null,
      })

      return result.data || result
    } catch (error: unknown) {
      console.error('[PublicStorageService] createUrlAlias error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`URL Aliasの作成に失敗: ${errorMessage}`)
    }
  }

  /**
   * ファイル名からSEO slugを自動生成
   *
   * @param {string} filename - ファイル名
   * @returns {string} SEO slug
   *
   * @example
   * const slug = PublicStorageService.generateSlug('My Awesome Photo.jpg')
   * // → 'my-awesome-photo'
   */
  static generateSlug(filename: string): string {
    return filename
      .toLowerCase()
      .replace(/\.[^/.]+$/, '') // 拡張子を削除
      .replace(/[^a-z0-9]+/g, '-') // 特殊文字をハイフンに
      .replace(/^-+|-+$/g, '') // 前後のハイフンを削除
      .substring(0, 100) // 最大100文字
  }

  /**
   * ランダムな短縮コードを生成
   *
   * @param {number} length - コードの長さ (デフォルト: 8)
   * @returns {string} 短縮コード
   *
   * @example
   * const shortCode = PublicStorageService.generateShortCode()
   * // → 'aBc12XyZ'
   */
  static generateShortCode(length: number = 8): string {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  // ================== Private メソッド ==================

  /**
   * ファイルバリデーション
   * @private
   */
  static _validateFile(file: File, options: UploadOptions = {}) {
    const { allowedTypes = [], maxSizeMB = this.DEFAULT_MAX_SIZE_MB } = options

    // ファイル存在チェック
    if (!file) {
      throw new Error('ファイルが指定されていません')
    }

    // サイズチェック
    if (!FileUtils.validateFileSize(file, maxSizeMB)) {
      throw new Error(
        `ファイルサイズが大きすぎます（最大: ${maxSizeMB}MB、現在: ${FileUtils.formatFileSize(file.size)}）`
      )
    }

    // タイプチェック
    if (allowedTypes.length > 0 && !FileUtils.validateFileType(file, allowedTypes)) {
      throw new Error(
        `許可されていないファイル形式です（許可: ${allowedTypes.join(', ')}、現在: ${file.type}）`
      )
    }
  }
}
