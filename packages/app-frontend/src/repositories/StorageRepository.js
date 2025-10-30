import { EdgeFunctionService } from '../services/EdgeFunctionService'

/**
 * Storage リポジトリ
 * Supabase Storage へのファイル操作を管理
 */
export class StorageRepository {
  /**
   * ファイルをアップロード（Public bucket）
   * @param {File} file - アップロードするファイル
   * @param {Object} options - オプション
   * @param {string} options.bucket - バケット名（デフォルト: 'uploads'）
   * @param {string} options.folder - フォルダ名（オプション）
   * @returns {Promise<Object>}
   */
  static async uploadFile(file, options = {}) {
    const { bucket = 'uploads', folder = '' } = options

    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', bucket)
    if (folder) {
      formData.append('folder', folder)
    }

    const result = await EdgeFunctionService.invoke('upload-file', formData, {
      isFormData: true,
    })

    return {
      filePath: result.file_path,
      fileUrl: result.file_url,
      bucket: result.bucket,
      success: result.success,
    }
  }

  /**
   * Signed URLを作成（Private bucket用）
   * @param {string} filePath - ファイルパス
   * @param {Object} options - オプション
   * @param {string} options.bucket - バケット名（デフォルト: 'private_uploads'）
   * @param {number} options.expiresIn - 有効期限（秒）
   * @returns {Promise<Object>}
   */
  static async createSignedUrl(filePath, options = {}) {
    const { bucket = 'private_uploads', expiresIn = 3600 } = options

    const result = await EdgeFunctionService.invoke('create-signed-url', {
      filePath,
      bucket,
      expiresIn,
    })

    return {
      upload: result.upload,
      download: result.download,
      success: result.success,
    }
  }

  /**
   * Signed URLを使ってファイルをアップロード
   * @param {File} file - アップロードするファイル
   * @param {string} signedUrl - Signed URL
   * @param {string} token - トークン
   * @returns {Promise<void>}
   */
  static async uploadWithSignedUrl(file, signedUrl, token) {
    const response = await fetch(signedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
        'x-upsert': 'false',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Upload failed: ${error}`)
    }

    return {
      success: true,
    }
  }

  /**
   * 複数ファイルを一括アップロード
   * @param {File[]} files - ファイル配列
   * @param {Object} options - オプション
   * @returns {Promise<Object[]>}
   */
  static async uploadMultiple(files, options = {}) {
    const uploadPromises = files.map((file) => this.uploadFile(file, options))
    return await Promise.all(uploadPromises)
  }

  /**
   * ファイルサイズをバリデーション
   * @param {File} file - ファイル
   * @param {number} maxSizeMB - 最大サイズ（MB）
   * @returns {boolean}
   */
  static validateFileSize(file, maxSizeMB = 10) {
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    return file.size <= maxSizeBytes
  }

  /**
   * ファイルタイプをバリデーション
   * @param {File} file - ファイル
   * @param {string[]} allowedTypes - 許可するMIMEタイプ
   * @returns {boolean}
   */
  static validateFileType(file, allowedTypes = []) {
    if (allowedTypes.length === 0) return true
    return allowedTypes.includes(file.type)
  }

  /**
   * 画像ファイルかチェック
   * @param {File} file - ファイル
   * @returns {boolean}
   */
  static isImage(file) {
    return file.type.startsWith('image/')
  }

  /**
   * ファイル情報を取得
   * @param {File} file - ファイル
   * @returns {Object}
   */
  static getFileInfo(file) {
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      sizeFormatted: this.formatFileSize(file.size),
    }
  }

  /**
   * ファイルサイズをフォーマット
   * @param {number} bytes - バイト数
   * @returns {string}
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }
}
