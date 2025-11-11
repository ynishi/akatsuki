/**
 * Knowledge File Model
 * Gemini File Search APIにアップロードされたファイルを管理
 *
 * ベストプラクティス:
 * - files テーブルとの外部キーで Storage 情報を管理
 * - Gemini API のfile nameと紐付け
 * - RLS (Row Level Security) でユーザー自身のみアクセス可能に設定
 */

export interface KnowledgeFileData {
  id?: string | null
  storeId: string
  fileId: string // files テーブルへの外部キー
  geminiFileName: string // Gemini API file name (e.g., "corpora/xxx/documents/xxx")
  userId: string
  createdAt?: string | null
  // 関連データ（JOIN時に取得）
  file?: FileData | null
}

export interface FileData {
  fileName: string
  fileSize: number
  mimeType: string
  storagePath: string
  bucketName: string
  metadata: Record<string, unknown>
}

export interface KnowledgeFileDatabaseRecord {
  id: string
  store_id: string
  file_id: string
  gemini_file_name: string
  user_id: string
  created_at: string
  // JOIN データ
  file?: {
    file_name: string
    file_size: number
    mime_type: string
    storage_path: string
    bucket_name: string
    metadata: Record<string, unknown>
  } | null
}

export class KnowledgeFile {
  id: string | null
  storeId: string
  fileId: string
  geminiFileName: string
  userId: string
  createdAt: string | null
  file: FileData | null

  constructor({ id = null, storeId, fileId, geminiFileName, userId, createdAt = null, file = null }: KnowledgeFileData) {
    this.id = id
    this.storeId = storeId
    this.fileId = fileId
    this.geminiFileName = geminiFileName
    this.userId = userId
    this.createdAt = createdAt
    this.file = file
  }

  /**
   * Supabaseのレコードからインスタンスを生成
   */
  static fromDatabase(data: KnowledgeFileDatabaseRecord): KnowledgeFile {
    return new KnowledgeFile({
      id: data.id,
      storeId: data.store_id,
      fileId: data.file_id,
      geminiFileName: data.gemini_file_name,
      userId: data.user_id,
      createdAt: data.created_at,
      file: data.file
        ? {
            fileName: data.file.file_name,
            fileSize: data.file.file_size,
            mimeType: data.file.mime_type,
            storagePath: data.file.storage_path,
            bucketName: data.file.bucket_name,
            metadata: data.file.metadata || {},
          }
        : null,
    })
  }

  /**
   * Supabase保存用の形式に変換
   */
  toDatabase() {
    return {
      store_id: this.storeId,
      file_id: this.fileId,
      gemini_file_name: this.geminiFileName,
      user_id: this.userId,
    }
  }

  /**
   * ファイル名を取得
   */
  getFileName(): string {
    return this.file?.fileName || 'Unknown'
  }

  /**
   * ファイルサイズを人間が読める形式で取得
   */
  getFileSizeFormatted(): string {
    if (!this.file) return 'Unknown'
    const size = this.file.fileSize
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  /**
   * MIMEタイプを取得
   */
  getMimeType(): string {
    return this.file?.mimeType || 'unknown'
  }
}
