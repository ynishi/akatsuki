import { EdgeFunctionService } from './EdgeFunctionService'
import { FileUtils } from '../utils/FileUtils'

/**
 * Private Storage Service
 * 非公開ファイル（個人ドキュメント、機密情報など）のアップロード・削除を管理
 *
 * このサービスを使用するファイル:
 * - 個人のドキュメント
 * - 請求書、契約書
 * - 機密情報を含むファイル
 * - 特定のユーザーのみがアクセスできるファイル
 *
 * 特徴:
 * - 署名付きURL（Signed URL）でのみアクセス可能
 * - files テーブルの RLS で厳格に権限管理
 * - Edge Function が Storage + DB を原子的に処理（整合性保証）
 * - DB削除時にStorage Hooksが自動的にStorageファイルも削除
 *
 * @example
 * // Private ファイルをアップロード
 * import { PrivateStorageService } from '@/services/PrivateStorageService'
 *
 * const result = await PrivateStorageService.upload(documentFile, {
 *   folder: 'invoices',
 *   metadata: { invoiceId: '123' }
 * })
 *
 * // 後で署名付きURLを取得してアクセス
 * const { signedUrl } = await PrivateStorageService.getSignedUrl(result.id)
 * window.open(signedUrl) // 1時間有効な一時URL
 */
export class PrivateStorageService {
  static BUCKET_NAME = 'private_uploads'
  static DEFAULT_MAX_SIZE_MB = 10
  static DEFAULT_SIGNED_URL_EXPIRES_IN = 3600 // 1時間

  /**
   * Private ファイルをアップロード
   *
   * Edge Function が以下を実行:
   * 1. ファイルを private_uploads バケットにアップロード
   * 2. files テーブルに metadata を INSERT (status: 'uploading' → 'active')
   * 3. 失敗時は Storage のファイルをロールバック削除
   *
   * @param {File} file - アップロードするファイル
   * @param {Object} options - オプション
   * @param {string} options.folder - フォルダ名（例: 'documents', 'invoices'）
   * @param {Object} options.metadata - DB に保存する追加メタデータ
   * @param {string[]} options.allowedTypes - 許可する MIME タイプ
   * @param {number} options.maxSizeMB - 最大サイズ（MB）
   * @returns {Promise<Object>} { id, storagePath, metadata }
   * @throws {Error} バリデーションエラー、アップロードエラー
   *
   * @example
   * // 基本的な使用
   * const result = await PrivateStorageService.upload(file, {
   *   folder: 'documents'
   * })
   *
   * // バリデーション付き
   * const result = await PrivateStorageService.upload(file, {
   *   folder: 'invoices',
   *   maxSizeMB: 20,
   *   allowedTypes: FileUtils.DOCUMENT_TYPES,
   *   metadata: { invoiceId: '123', year: 2024 }
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
    formData.append('isPublic', 'false')
    if (folder) formData.append('folder', folder)
    formData.append('metadata', JSON.stringify(metadata))

    try {
      // Edge Function 呼び出し: Storage アップロード + DB INSERT
      const result = await EdgeFunctionService.invoke('upload-file', formData, {
        isFormData: true,
      })

      return {
        id: result.file_id, // files テーブルの ID
        storagePath: result.storage_path, // Storage 内のパス
        metadata: result.metadata, // DB に保存されたメタデータ
        bucket: result.bucket || this.BUCKET_NAME,
        success: result.success !== undefined ? result.success : true,
      }
    } catch (error) {
      throw new Error(`Private ファイルのアップロードに失敗: ${error.message}`)
    }
  }

  /**
   * Private ファイルの署名付き URL を取得
   *
   * Edge Function が以下を実行:
   * 1. files テーブルから fileId で検索（RLS で権限チェック）
   * 2. 権限があれば署名付き URL を生成
   *
   * @param {string} fileId - files テーブルの ID
   * @param {Object} options - オプション
   * @param {number} options.expiresIn - 有効期限（秒、デフォルト: 1時間）
   * @returns {Promise<Object>} { signedUrl, expiresAt }
   * @throws {Error} 権限エラー、ファイルが存在しない
   *
   * @example
   * // 1時間有効な署名付きURLを取得
   * const { signedUrl } = await PrivateStorageService.getSignedUrl(fileId)
   * window.open(signedUrl)
   *
   * // 10分間だけ有効なURLを取得
   * const { signedUrl } = await PrivateStorageService.getSignedUrl(fileId, {
   *   expiresIn: 600
   * })
   */
  static async getSignedUrl(fileId, options = {}) {
    const { expiresIn = this.DEFAULT_SIGNED_URL_EXPIRES_IN } = options

    try {
      // Edge Function:
      // 1. files テーブルから fileId で検索（RLS で権限チェック）
      // 2. 権限があれば署名付き URL を生成
      const result = await EdgeFunctionService.invoke('get-signed-url', {
        fileId,
        expiresIn,
      })

      return {
        signedUrl: result.signed_url,
        expiresAt: result.expires_at,
        success: true,
      }
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new Error('ファイルが存在しないか、アクセス権限がありません')
      }
      throw new Error(`署名付き URL の取得に失敗: ${error.message}`)
    }
  }

  /**
   * 複数ファイルの署名付き URL を一括取得
   *
   * @param {string[]} fileIds - ファイルID配列
   * @param {Object} options - オプション
   * @returns {Promise<Object[]>} 署名付きURL配列
   *
   * @example
   * const urls = await PrivateStorageService.getSignedUrls(['id1', 'id2'])
   * urls.forEach(({ fileId, signedUrl }) => {
   *   console.log(fileId, signedUrl)
   * })
   */
  static async getSignedUrls(fileIds, options = {}) {
    const urlPromises = fileIds.map((fileId) =>
      this.getSignedUrl(fileId, options).then((result) => ({
        fileId,
        ...result,
      })).catch((error) => ({
        fileId,
        success: false,
        error: error.message,
      }))
    )

    return await Promise.all(urlPromises)
  }

  /**
   * Private ファイルを削除
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
   * await PrivateStorageService.delete(fileId)
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
      throw new Error(`Private ファイルの削除に失敗: ${error.message}`)
    }
  }

  /**
   * 複数の Private ファイルを一括削除
   *
   * @param {string[]} fileIds - ファイルID配列
   * @returns {Promise<Object[]>} 削除結果の配列
   *
   * @example
   * const results = await PrivateStorageService.deleteMultiple(fileIds)
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
   * 複数の Private ファイルを一括アップロード
   *
   * @param {File[]} files - ファイル配列
   * @param {Object} options - オプション
   * @returns {Promise<Object[]>} アップロード結果の配列
   *
   * @example
   * const results = await PrivateStorageService.uploadMultiple(files, {
   *   folder: 'documents',
   *   maxSizeMB: 20
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
   * PDF をアップロード（PDF専用の便利メソッド）
   *
   * @param {File} pdfFile - PDFファイル
   * @param {Object} options - オプション
   * @returns {Promise<Object>}
   *
   * @example
   * const result = await PrivateStorageService.uploadPDF(pdfFile, {
   *   folder: 'invoices',
   *   metadata: { invoiceId: '123' }
   * })
   */
  static async uploadPDF(pdfFile, options = {}) {
    return this.upload(pdfFile, {
      ...options,
      allowedTypes: ['application/pdf'],
    })
  }

  /**
   * ドキュメントをアップロード（ドキュメント専用の便利メソッド）
   *
   * @param {File} documentFile - ドキュメントファイル
   * @param {Object} options - オプション
   * @returns {Promise<Object>}
   *
   * @example
   * const result = await PrivateStorageService.uploadDocument(file, {
   *   folder: 'contracts',
   *   maxSizeMB: 50
   * })
   */
  static async uploadDocument(documentFile, options = {}) {
    return this.upload(documentFile, {
      ...options,
      allowedTypes: FileUtils.DOCUMENT_TYPES,
    })
  }

  /**
   * 署名付きURLから直接ダウンロードを開始
   *
   * @param {string} fileId - ファイルID
   * @param {Object} options - オプション
   * @param {string} options.downloadFileName - ダウンロード時のファイル名
   * @returns {Promise<void>}
   *
   * @example
   * // ブラウザでダウンロードを開始
   * await PrivateStorageService.download(fileId, {
   *   downloadFileName: 'invoice_2024.pdf'
   * })
   */
  static async download(fileId, options = {}) {
    const { downloadFileName } = options

    try {
      const { signedUrl } = await this.getSignedUrl(fileId)

      // ダウンロードリンクを作成してクリック
      const link = document.createElement('a')
      link.href = signedUrl
      if (downloadFileName) {
        link.download = downloadFileName
      }
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      throw new Error(`ファイルのダウンロードに失敗: ${error.message}`)
    }
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
