import { EdgeFunctionService } from './EdgeFunctionService'
import { FileUtils } from '../utils/FileUtils'

/**
 * Upload options
 */
export interface UploadOptions {
  folder?: string
  metadata?: Record<string, unknown>
  allowedTypes?: string[]
  maxSizeMB?: number
}

/**
 * Upload result
 */
export interface UploadResult {
  id: string
  storagePath: string
  metadata: Record<string, unknown>
  bucket: string
  success: boolean
}

/**
 * Upload error result
 */
export interface UploadErrorResult {
  success: false
  error: string
  fileName: string
}

/**
 * Signed URL options
 */
export interface SignedUrlOptions {
  expiresIn?: number
}

/**
 * Signed URL result
 */
export interface SignedUrlResult {
  signedUrl: string
  expiresAt: string
  success: boolean
}

/**
 * Signed URL with file ID
 */
export interface SignedUrlWithId extends SignedUrlResult {
  fileId: string
}

/**
 * Signed URL error result
 */
export interface SignedUrlErrorResult {
  fileId: string
  success: false
  error: string
}

/**
 * Delete result
 */
export interface DeleteResult {
  success: boolean
  deletedAt: string
}

/**
 * Delete error result
 */
export interface DeleteErrorResult {
  success: false
  error: string
  fileId: string
}

/**
 * Download options
 */
export interface DownloadOptions {
  downloadFileName?: string
}

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
  static readonly BUCKET_NAME = 'private_uploads'
  static readonly DEFAULT_MAX_SIZE_MB = 10
  static readonly DEFAULT_SIGNED_URL_EXPIRES_IN = 3600 // 1時間

  /**
   * Private ファイルをアップロード
   *
   * Edge Function が以下を実行:
   * 1. ファイルを private_uploads バケットにアップロード
   * 2. files テーブルに metadata を INSERT (status: 'uploading' → 'active')
   * 3. 失敗時は Storage のファイルをロールバック削除
   *
   * @param file - アップロードするファイル
   * @param options - オプション
   * @returns { id, storagePath, metadata }
   * @throws バリデーションエラー、アップロードエラー
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
    formData.append('isPublic', 'false')
    if (folder) formData.append('folder', folder)
    formData.append('metadata', JSON.stringify(metadata))

    try {
      // Edge Function 呼び出し: Storage アップロード + DB INSERT
      const { data, error } = await EdgeFunctionService.invoke<{
        file_id: string
        storage_path: string
        metadata: Record<string, unknown>
        bucket?: string
        success?: boolean
      }>('upload-file', formData, {
        isFormData: true,
      })

      if (error) {
        throw error
      }

      if (!data || typeof data !== 'object') {
        throw new Error('Edge Function が無効なレスポンスを返しました')
      }

      return {
        id: data.file_id, // files テーブルの ID
        storagePath: data.storage_path, // Storage 内のパス
        metadata: data.metadata, // DB に保存されたメタデータ
        bucket: data.bucket || this.BUCKET_NAME,
        success: data.success !== undefined ? data.success : true,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Private ファイルのアップロードに失敗: ${message}`)
    }
  }

  /**
   * Private ファイルの署名付き URL を取得
   *
   * Edge Function が以下を実行:
   * 1. files テーブルから fileId で検索（RLS で権限チェック）
   * 2. 権限があれば署名付き URL を生成
   *
   * @param fileId - files テーブルの ID
   * @param options - オプション
   * @returns { signedUrl, expiresAt }
   * @throws 権限エラー、ファイルが存在しない
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
  static async getSignedUrl(fileId: string, options: SignedUrlOptions = {}): Promise<SignedUrlResult> {
    const { expiresIn = this.DEFAULT_SIGNED_URL_EXPIRES_IN } = options

    try {
      // Edge Function:
      // 1. files テーブルから fileId で検索（RLS で権限チェック）
      // 2. 権限があれば署名付き URL を生成
      const { data, error } = await EdgeFunctionService.invoke<{
        signed_url: string
        expires_at: string
      }>('get-signed-url', {
        fileId,
        expiresIn,
      })

      if (error) {
        throw error
      }

      if (!data || typeof data !== 'object') {
        throw new Error('Edge Function が無効なレスポンスを返しました')
      }

      return {
        signedUrl: data.signed_url,
        expiresAt: data.expires_at,
        success: true,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('not found')) {
        throw new Error('ファイルが存在しないか、アクセス権限がありません')
      }
      throw new Error(`署名付き URL の取得に失敗: ${message}`)
    }
  }

  /**
   * 複数ファイルの署名付き URL を一括取得
   *
   * @param fileIds - ファイルID配列
   * @param options - オプション
   * @returns 署名付きURL配列
   *
   * @example
   * const urls = await PrivateStorageService.getSignedUrls(['id1', 'id2'])
   * urls.forEach(({ fileId, signedUrl }) => {
   *   console.log(fileId, signedUrl)
   * })
   */
  static async getSignedUrls(
    fileIds: string[],
    options: SignedUrlOptions = {}
  ): Promise<(SignedUrlWithId | SignedUrlErrorResult)[]> {
    const urlPromises = fileIds.map((fileId) =>
      this.getSignedUrl(fileId, options)
        .then((result): SignedUrlWithId => ({
          fileId,
          ...result,
        }))
        .catch((error): SignedUrlErrorResult => ({
          fileId,
          success: false,
          error: error instanceof Error ? error.message : String(error),
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
   * @param fileId - files テーブルの ID
   * @returns { success, deletedAt }
   * @throws 権限エラー、ファイルが存在しない
   *
   * @example
   * await PrivateStorageService.delete(fileId)
   */
  static async delete(fileId: string): Promise<DeleteResult> {
    try {
      const { data, error } = await EdgeFunctionService.invoke<{
        deleted_at: string
      }>('delete-file', {
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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('not found')) {
        throw new Error('ファイルが存在しないか、削除権限がありません')
      }
      throw new Error(`Private ファイルの削除に失敗: ${message}`)
    }
  }

  /**
   * 複数の Private ファイルを一括削除
   *
   * @param fileIds - ファイルID配列
   * @returns 削除結果の配列
   *
   * @example
   * const results = await PrivateStorageService.deleteMultiple(fileIds)
   * const successful = results.filter(r => r.success)
   */
  static async deleteMultiple(fileIds: string[]): Promise<(DeleteResult | DeleteErrorResult)[]> {
    const deletePromises = fileIds.map((fileId) =>
      this.delete(fileId).catch((error): DeleteErrorResult => ({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        fileId,
      }))
    )

    return await Promise.all(deletePromises)
  }

  /**
   * 複数の Private ファイルを一括アップロード
   *
   * @param files - ファイル配列
   * @param options - オプション
   * @returns アップロード結果の配列
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
  static async uploadMultiple(
    files: File[],
    options: UploadOptions = {}
  ): Promise<(UploadResult | UploadErrorResult)[]> {
    const uploadPromises = files.map((file) =>
      this.upload(file, options).catch((error): UploadErrorResult => ({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        fileName: file.name,
      }))
    )

    return await Promise.all(uploadPromises)
  }

  /**
   * PDF をアップロード（PDF専用の便利メソッド）
   *
   * @param pdfFile - PDFファイル
   * @param options - オプション
   * @returns Upload result
   *
   * @example
   * const result = await PrivateStorageService.uploadPDF(pdfFile, {
   *   folder: 'invoices',
   *   metadata: { invoiceId: '123' }
   * })
   */
  static async uploadPDF(pdfFile: File, options: UploadOptions = {}): Promise<UploadResult> {
    return this.upload(pdfFile, {
      ...options,
      allowedTypes: ['application/pdf'],
    })
  }

  /**
   * ドキュメントをアップロード（ドキュメント専用の便利メソッド）
   *
   * @param documentFile - ドキュメントファイル
   * @param options - オプション
   * @returns Upload result
   *
   * @example
   * const result = await PrivateStorageService.uploadDocument(file, {
   *   folder: 'contracts',
   *   maxSizeMB: 50
   * })
   */
  static async uploadDocument(documentFile: File, options: UploadOptions = {}): Promise<UploadResult> {
    return this.upload(documentFile, {
      ...options,
      allowedTypes: FileUtils.DOCUMENT_TYPES,
    })
  }

  /**
   * 署名付きURLから直接ダウンロードを開始
   *
   * @param fileId - ファイルID
   * @param options - オプション
   *
   * @example
   * // ブラウザでダウンロードを開始
   * await PrivateStorageService.download(fileId, {
   *   downloadFileName: 'invoice_2024.pdf'
   * })
   */
  static async download(fileId: string, options: DownloadOptions = {}): Promise<void> {
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
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`ファイルのダウンロードに失敗: ${message}`)
    }
  }

  // ================== Private メソッド ==================

  /**
   * ファイルバリデーション
   * @private
   */
  private static _validateFile(
    file: File,
    options: { allowedTypes?: string[]; maxSizeMB?: number } = {}
  ): void {
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
