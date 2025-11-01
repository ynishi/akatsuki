import { EdgeFunctionService } from './EdgeFunctionService'
import { FileUtils } from '../utils/FileUtils'

/**
 * Public Storage Service
 * 公開ファイル（アバター、ロゴ、一般公開画像など）のアップロード・削除を管理
 *
 * このサービスを使用するファイル:
 * - ユーザーアバター
 * - 企業ロゴ
 * - 公開記事の画像
 * - その他、URLを知っている人なら誰でも見られるファイル
 *
 * 特徴:
 * - getPublicUrl() で恒久的な公開URLを取得可能
 * - Edge Function が Storage + DB を原子的に処理（整合性保証）
 * - DB削除時にStorage Hooksが自動的にStorageファイルも削除
 *
 * @example
 * // アバター画像をアップロード
 * import { PublicStorageService } from '@/services/PublicStorageService'
 *
 * const result = await PublicStorageService.upload(avatarFile, {
 *   folder: 'avatars',
 *   maxSizeMB: 2,
 *   allowedTypes: FileUtils.IMAGE_TYPES
 * })
 * console.log(result.publicUrl) // 恒久的な公開URL
 */
export class PublicStorageService {
  static BUCKET_NAME = 'public_assets'
  static DEFAULT_MAX_SIZE_MB = 10

  /**
   * Public ファイルをアップロード
   *
   * Edge Function が以下を実行:
   * 1. ファイルを public_assets バケットにアップロード
   * 2. files テーブルに metadata を INSERT (status: 'uploading' → 'active')
   * 3. 失敗時は Storage のファイルをロールバック削除
   *
   * @param {File} file - アップロードするファイル
   * @param {Object} options - オプション
   * @param {string} options.folder - フォルダ名（例: 'avatars', 'logos'）
   * @param {Object} options.metadata - DB に保存する追加メタデータ
   * @param {string[]} options.allowedTypes - 許可する MIME タイプ
   * @param {number} options.maxSizeMB - 最大サイズ（MB）
   * @returns {Promise<Object>} { id, publicUrl, storagePath, metadata }
   * @throws {Error} バリデーションエラー、アップロードエラー
   *
   * @example
   * // 基本的な使用
   * const result = await PublicStorageService.upload(file, {
   *   folder: 'avatars'
   * })
   *
   * // バリデーション付き
   * const result = await PublicStorageService.upload(file, {
   *   folder: 'logos',
   *   maxSizeMB: 5,
   *   allowedTypes: ['image/png', 'image/svg+xml'],
   *   metadata: { companyId: '123' }
   * })
   */
  static async upload(file, options = {}) {
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
      const result = await EdgeFunctionService.invoke('upload-file', formData, {
        isFormData: true,
      })

      console.log('[PublicStorageService] Raw result from Edge Function:', result)
      console.log('[PublicStorageService] Result type:', typeof result)
      console.log('[PublicStorageService] Result keys:', result ? Object.keys(result) : 'null/undefined')
      console.log('[PublicStorageService] result.data:', result?.data)

      // Edge Functionの結果は {data: {...}, error: null} 形式
      const responseData = result?.data || result

      console.log('[PublicStorageService] file_id:', responseData?.file_id)
      console.log('[PublicStorageService] public_url:', responseData?.public_url)
      console.log('[PublicStorageService] bucket:', responseData?.bucket)

      const mappedResult = {
        id: responseData.file_id, // files テーブルの ID
        publicUrl: responseData.public_url, // 恒久的な公開 URL
        storagePath: responseData.storage_path, // Storage 内のパス
        metadata: responseData.metadata, // DB に保存されたメタデータ
        bucket: responseData.bucket || this.BUCKET_NAME,
        success: responseData.success !== undefined ? responseData.success : true,
      }

      console.log('[PublicStorageService] Mapped result:', mappedResult)

      return mappedResult
    } catch (error) {
      console.error('[PublicStorageService] Upload error:', error)
      throw new Error(`Public ファイルのアップロードに失敗: ${error.message}`)
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
  static async uploadMultiple(files, options = {}) {
    const uploadPromises = files.map((file) =>
      this.upload(file, options).catch((error) => ({
        success: false,
        error: error.message,
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
  static async delete(fileId) {
    try {
      const result = await EdgeFunctionService.invoke('delete-file', {
        fileId,
      })

      return {
        success: true,
        deletedAt: result.deleted_at,
      }
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new Error('ファイルが存在しないか、削除権限がありません')
      }
      throw new Error(`Public ファイルの削除に失敗: ${error.message}`)
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
  static async deleteMultiple(fileIds) {
    const deletePromises = fileIds.map((fileId) =>
      this.delete(fileId).catch((error) => ({
        success: false,
        error: error.message,
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
  static async uploadImage(imageFile, options = {}) {
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
  static async uploadAvatar(avatarFile, options = {}) {
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
  static async uploadLogo(logoFile, options = {}) {
    return this.upload(logoFile, {
      folder: 'logos',
      maxSizeMB: 5,
      allowedTypes: ['image/png', 'image/svg+xml', 'image/jpeg'],
      ...options,
    })
  }

  // ================== Private メソッド ==================

  /**
   * ファイルバリデーション
   * @private
   */
  static _validateFile(file, options = {}) {
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
