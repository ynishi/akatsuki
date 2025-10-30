/**
 * File Utilities
 * ファイル操作に関する汎用ユーティリティ関数
 *
 * NOTE: ファイルのアップロード・削除には PublicStorageService または
 * PrivateStorageService を使用してください。このクラスは補助的な
 * ユーティリティ関数のみを提供します。
 */
export class FileUtils {
  /**
   * ファイルサイズをバリデーション
   *
   * @param {File} file - ファイル
   * @param {number} maxSizeMB - 最大サイズ（MB）
   * @returns {boolean} サイズが許容範囲内なら true
   *
   * @example
   * if (!FileUtils.validateFileSize(file, 10)) {
   *   throw new Error('ファイルサイズは10MB以下にしてください')
   * }
   */
  static validateFileSize(file, maxSizeMB = 10) {
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    return file.size <= maxSizeBytes
  }

  /**
   * ファイルタイプをバリデーション
   *
   * @param {File} file - ファイル
   * @param {string[]} allowedTypes - 許可するMIMEタイプ
   * @returns {boolean} タイプが許可されていれば true
   *
   * @example
   * const allowedTypes = ['image/jpeg', 'image/png']
   * if (!FileUtils.validateFileType(file, allowedTypes)) {
   *   throw new Error('JPEGまたはPNG画像のみ許可されています')
   * }
   */
  static validateFileType(file, allowedTypes = []) {
    if (allowedTypes.length === 0) return true
    return allowedTypes.includes(file.type)
  }

  /**
   * 画像ファイルかチェック
   *
   * @param {File} file - ファイル
   * @returns {boolean} 画像ファイルなら true
   *
   * @example
   * if (FileUtils.isImage(file)) {
   *   // プレビュー表示処理
   * }
   */
  static isImage(file) {
    return file.type.startsWith('image/')
  }

  /**
   * 動画ファイルかチェック
   *
   * @param {File} file - ファイル
   * @returns {boolean} 動画ファイルなら true
   */
  static isVideo(file) {
    return file.type.startsWith('video/')
  }

  /**
   * PDFファイルかチェック
   *
   * @param {File} file - ファイル
   * @returns {boolean} PDFファイルなら true
   */
  static isPDF(file) {
    return file.type === 'application/pdf'
  }

  /**
   * ファイル情報を取得
   *
   * @param {File} file - ファイル
   * @returns {Object} ファイル情報オブジェクト
   *
   * @example
   * const info = FileUtils.getFileInfo(file)
   * console.log(info.sizeFormatted) // "2.5 MB"
   */
  static getFileInfo(file) {
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      lastModifiedDate: new Date(file.lastModified),
      sizeFormatted: this.formatFileSize(file.size),
      extension: this.getFileExtension(file.name),
    }
  }

  /**
   * ファイルサイズをフォーマット
   *
   * @param {number} bytes - バイト数
   * @returns {string} フォーマットされたサイズ文字列
   *
   * @example
   * FileUtils.formatFileSize(1024) // "1 KB"
   * FileUtils.formatFileSize(1048576) // "1 MB"
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  /**
   * ファイル拡張子を取得
   *
   * @param {string} filename - ファイル名
   * @returns {string} 拡張子（ドットなし、小文字）
   *
   * @example
   * FileUtils.getFileExtension('photo.JPG') // "jpg"
   * FileUtils.getFileExtension('document.pdf') // "pdf"
   */
  static getFileExtension(filename) {
    const parts = filename.split('.')
    if (parts.length === 1) return ''
    return parts.pop().toLowerCase()
  }

  /**
   * ファイル名から拡張子を除いた部分を取得
   *
   * @param {string} filename - ファイル名
   * @returns {string} 拡張子を除いたファイル名
   *
   * @example
   * FileUtils.getFileNameWithoutExtension('photo.jpg') // "photo"
   */
  static getFileNameWithoutExtension(filename) {
    const parts = filename.split('.')
    if (parts.length === 1) return filename
    parts.pop()
    return parts.join('.')
  }

  /**
   * File オブジェクトから Data URL を生成（プレビュー用）
   *
   * @param {File} file - ファイル
   * @returns {Promise<string>} Data URL
   *
   * @example
   * const dataUrl = await FileUtils.getFileDataUrl(file)
   * imgElement.src = dataUrl
   */
  static getFileDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  /**
   * 画像の寸法を取得
   *
   * @param {File} file - 画像ファイル
   * @returns {Promise<{width: number, height: number}>} 画像の幅と高さ
   *
   * @example
   * const { width, height } = await FileUtils.getImageDimensions(file)
   */
  static async getImageDimensions(file) {
    if (!this.isImage(file)) {
      throw new Error('画像ファイルではありません')
    }

    const dataUrl = await this.getFileDataUrl(file)

    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        resolve({ width: img.width, height: img.height })
      }
      img.onerror = reject
      img.src = dataUrl
    })
  }

  /**
   * 複数ファイルのバリデーション
   *
   * @param {File[]} files - ファイル配列
   * @param {Object} options - オプション
   * @param {number} options.maxSizeMB - 最大サイズ（MB）
   * @param {string[]} options.allowedTypes - 許可するMIMEタイプ
   * @param {number} options.maxCount - 最大ファイル数
   * @returns {{valid: boolean, errors: string[]}}
   *
   * @example
   * const result = FileUtils.validateFiles(files, {
   *   maxSizeMB: 5,
   *   allowedTypes: ['image/jpeg', 'image/png'],
   *   maxCount: 10
   * })
   * if (!result.valid) {
   *   alert(result.errors.join('\n'))
   * }
   */
  static validateFiles(files, options = {}) {
    const { maxSizeMB = 10, allowedTypes = [], maxCount } = options
    const errors = []

    // ファイル数チェック
    if (maxCount && files.length > maxCount) {
      errors.push(`ファイル数は${maxCount}個以下にしてください（現在: ${files.length}個）`)
    }

    // 個別ファイルチェック
    files.forEach((file, index) => {
      const fileNum = index + 1

      if (!this.validateFileSize(file, maxSizeMB)) {
        errors.push(
          `ファイル${fileNum} (${file.name}): サイズが大きすぎます（最大: ${maxSizeMB}MB）`
        )
      }

      if (allowedTypes.length > 0 && !this.validateFileType(file, allowedTypes)) {
        errors.push(
          `ファイル${fileNum} (${file.name}): 許可されていない形式です（許可: ${allowedTypes.join(', ')}）`
        )
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * 一般的な画像MIMEタイプ
   */
  static get IMAGE_TYPES() {
    return ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
  }

  /**
   * 一般的な動画MIMEタイプ
   */
  static get VIDEO_TYPES() {
    return ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
  }

  /**
   * 一般的なドキュメントMIMEタイプ
   */
  static get DOCUMENT_TYPES() {
    return [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ]
  }
}
