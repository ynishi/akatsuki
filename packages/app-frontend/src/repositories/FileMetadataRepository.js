import { supabase } from '../lib/supabase'

/**
 * File Metadata Repository
 * files テーブルへの直接的なデータアクセス層
 *
 * ⚠️ 警告: このリポジトリは低レベルなDB操作を提供します。
 * 通常のファイルアップロード・削除には PublicStorageService または
 * PrivateStorageService を使用してください。
 *
 * このリポジトリの使用例:
 * - バッチ処理でメタデータのみを一括取得
 * - 管理画面でのファイル一覧表示
 * - 統計情報の取得
 * - デバッグ・トラブルシューティング
 */
export class FileMetadataRepository {
  static TABLE_NAME = 'files'

  /**
   * ファイルメタデータをIDで取得
   *
   * @param {string} fileId - ファイルID
   * @returns {Promise<Object|null>} ファイルメタデータ
   *
   * @example
   * const metadata = await FileMetadataRepository.findById('uuid-here')
   */
  static async findById(fileId) {
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq('id', fileId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(`ファイルメタデータの取得に失敗: ${error.message}`)
    }

    return data
  }

  /**
   * 複数のファイルメタデータをIDで一括取得
   *
   * @param {string[]} fileIds - ファイルID配列
   * @returns {Promise<Object[]>} ファイルメタデータ配列
   *
   * @example
   * const files = await FileMetadataRepository.findByIds(['id1', 'id2'])
   */
  static async findByIds(fileIds) {
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .select('*')
      .in('id', fileIds)

    if (error) {
      throw new Error(`ファイルメタデータの一括取得に失敗: ${error.message}`)
    }

    return data || []
  }

  /**
   * 所有者でフィルタしてファイル一覧を取得
   *
   * @param {string} ownerId - 所有者のユーザーID
   * @param {Object} options - オプション
   * @param {number} options.limit - 取得件数
   * @param {number} options.offset - オフセット
   * @param {string} options.orderBy - ソート列
   * @param {boolean} options.ascending - 昇順ソート
   * @returns {Promise<Object[]>}
   *
   * @example
   * const myFiles = await FileMetadataRepository.findByOwner(userId, {
   *   limit: 20,
   *   orderBy: 'created_at',
   *   ascending: false
   * })
   */
  static async findByOwner(ownerId, options = {}) {
    const { limit = 100, offset = 0, orderBy = 'created_at', ascending = false } = options

    let query = supabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq('owner_id', ownerId)
      .order(orderBy, { ascending })

    if (limit) query = query.limit(limit)
    if (offset) query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      throw new Error(`ファイル一覧の取得に失敗: ${error.message}`)
    }

    return data || []
  }

  /**
   * Public/Private でフィルタしてファイル一覧を取得
   *
   * @param {boolean} isPublic - Public ファイルを取得する場合 true
   * @param {Object} options - オプション
   * @returns {Promise<Object[]>}
   *
   * @example
   * const publicFiles = await FileMetadataRepository.findByVisibility(true)
   */
  static async findByVisibility(isPublic, options = {}) {
    const { limit = 100, offset = 0, orderBy = 'created_at', ascending = false } = options

    let query = supabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq('is_public', isPublic)
      .order(orderBy, { ascending })

    if (limit) query = query.limit(limit)
    if (offset) query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      throw new Error(`ファイル一覧の取得に失敗: ${error.message}`)
    }

    return data || []
  }

  /**
   * storage_path でファイルメタデータを取得
   *
   * @param {string} storagePath - Storage パス
   * @returns {Promise<Object|null>}
   *
   * @example
   * const file = await FileMetadataRepository.findByStoragePath('avatars/user123.jpg')
   */
  static async findByStoragePath(storagePath) {
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq('storage_path', storagePath)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`ファイルメタデータの取得に失敗: ${error.message}`)
    }

    return data
  }

  /**
   * ファイル総数を取得
   *
   * @param {Object} filters - フィルタ条件
   * @param {string} filters.ownerId - 所有者ID
   * @param {boolean} filters.isPublic - Public/Private
   * @returns {Promise<number>}
   *
   * @example
   * const count = await FileMetadataRepository.count({ ownerId: userId })
   */
  static async count(filters = {}) {
    let query = supabase.from(this.TABLE_NAME).select('*', { count: 'exact', head: true })

    if (filters.ownerId) query = query.eq('owner_id', filters.ownerId)
    if (filters.isPublic !== undefined) query = query.eq('is_public', filters.isPublic)

    const { count, error } = await query

    if (error) {
      throw new Error(`ファイル数の取得に失敗: ${error.message}`)
    }

    return count || 0
  }

  /**
   * ストレージ使用量を計算（バイト）
   *
   * @param {string} ownerId - 所有者ID（オプション）
   * @returns {Promise<number>} 合計サイズ（バイト）
   *
   * @example
   * const totalBytes = await FileMetadataRepository.calculateStorageUsage(userId)
   * console.log(`使用量: ${totalBytes / 1024 / 1024} MB`)
   */
  static async calculateStorageUsage(ownerId = null) {
    let query = supabase.from(this.TABLE_NAME).select('size')

    if (ownerId) query = query.eq('owner_id', ownerId)

    const { data, error } = await query

    if (error) {
      throw new Error(`ストレージ使用量の計算に失敗: ${error.message}`)
    }

    return data.reduce((total, file) => total + (file.size || 0), 0)
  }

  /**
   * ファイルメタデータを更新
   *
   * ⚠️ 注意: storage_path や is_public など、重要なフィールドの変更は
   * Storage との整合性を壊す可能性があります。慎重に使用してください。
   *
   * @param {string} fileId - ファイルID
   * @param {Object} updates - 更新内容
   * @returns {Promise<Object>} 更新後のメタデータ
   *
   * @example
   * await FileMetadataRepository.update(fileId, {
   *   metadata: { description: '新しい説明' }
   * })
   */
  static async update(fileId, updates) {
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .update(updates)
      .eq('id', fileId)
      .select()
      .single()

    if (error) {
      throw new Error(`ファイルメタデータの更新に失敗: ${error.message}`)
    }

    return data
  }

  /**
   * ファイルメタデータを削除
   *
   * ⚠️ 警告: このメソッドは DB レコードのみを削除します。
   * Storage Hooks により Storage のファイルも削除されますが、
   * 通常は PublicStorageService.delete() または
   * PrivateStorageService.delete() を使用してください。
   *
   * @param {string} fileId - ファイルID
   * @returns {Promise<void>}
   *
   * @example
   * await FileMetadataRepository.delete(fileId)
   */
  static async delete(fileId) {
    const { error } = await supabase.from(this.TABLE_NAME).delete().eq('id', fileId)

    if (error) {
      throw new Error(`ファイルメタデータの削除に失敗: ${error.message}`)
    }
  }

  /**
   * 複数ファイルを一括削除
   *
   * ⚠️ 警告: 大量削除の場合、Storage Hooks のトリガーが大量に発火します。
   * パフォーマンスに注意してください。
   *
   * @param {string[]} fileIds - ファイルID配列
   * @returns {Promise<void>}
   *
   * @example
   * await FileMetadataRepository.deleteMany(['id1', 'id2', 'id3'])
   */
  static async deleteMany(fileIds) {
    const { error } = await supabase.from(this.TABLE_NAME).delete().in('id', fileIds)

    if (error) {
      throw new Error(`ファイルの一括削除に失敗: ${error.message}`)
    }
  }

  /**
   * ステータス別にファイルを検索
   *
   * @param {string} status - 'uploading' | 'active' | 'deleting'
   * @param {Object} options - オプション
   * @returns {Promise<Object[]>}
   *
   * @example
   * // アップロード中のまま残っているファイルを検出
   * const stuckFiles = await FileMetadataRepository.findByStatus('uploading')
   */
  static async findByStatus(status, options = {}) {
    const { limit = 100, offset = 0 } = options

    let query = supabase.from(this.TABLE_NAME).select('*').eq('status', status)

    if (limit) query = query.limit(limit)
    if (offset) query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      throw new Error(`ファイル検索に失敗: ${error.message}`)
    }

    return data || []
  }

  /**
   * 古い uploading 状態のファイルを検出（デバッグ用）
   *
   * @param {number} olderThanMinutes - 何分以上古いものを検出するか
   * @returns {Promise<Object[]>}
   *
   * @example
   * // 1時間以上 uploading 状態のファイルを検出
   * const stuckFiles = await FileMetadataRepository.findStuckUploads(60)
   */
  static async findStuckUploads(olderThanMinutes = 60) {
    const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq('status', 'uploading')
      .lt('created_at', cutoffTime)

    if (error) {
      throw new Error(`Stuck uploads の検出に失敗: ${error.message}`)
    }

    return data || []
  }
}
