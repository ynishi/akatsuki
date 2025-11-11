import { EdgeFunctionService } from './EdgeFunctionService'

/**
 * Upload file response
 */
export interface UploadFileResponse {
  store: {
    id: string
    name: string
    display_name: string | null
  }
  file: {
    id: string // knowledge_files.id
    file_id: string // files.id
    gemini_file_name: string
  }
}

/**
 * RAG chat response
 */
export interface RAGChatResponse {
  query: string
  response: string
  grounding_metadata?: {
    search_results?: Array<{
      title?: string
      url?: string
      content?: string
    }>
    citations?: Array<{
      start_index?: number
      end_index?: number
      source?: string
    }>
  }
}

/**
 * Service response
 */
export interface ServiceResponse<T> {
  data: T | null
  error: Error | null
}

/**
 * File Search Service
 * Gemini File Search API統合サービス
 *
 * @example
 * import { FileSearchService } from '@/services/FileSearchService'
 *
 * // Store作成
 * const { data, error } = await FileSearchService.createStore('My Knowledge Base')
 *
 * // ファイルアップロード
 * const { data, error } = await FileSearchService.uploadFile(storeId, file)
 *
 * // RAGチャット
 * const { data, error } = await FileSearchService.chatWithRAG('質問', [storeId])
 */
export class FileSearchService {
  /**
   * 新しいFile Search Storeを作成
   *
   * @param displayName - 表示名
   * @returns Store情報
   *
   * @example
   * const { data, error } = await FileSearchService.createStore('My Knowledge Base')
   * if (error) {
   *   console.error(error)
   * } else {
   *   console.log(data.store.id)
   * }
   */
  static async createStore(displayName: string): Promise<ServiceResponse<{ store: UploadFileResponse['store'] }>> {
    try {
      const { data, error } = await EdgeFunctionService.invoke<{ store: UploadFileResponse['store'] }>(
        'knowledge-file-upload',
        {
          display_name: displayName,
        }
      )

      if (error) {
        return { data: null, error }
      }

      return { data, error: null }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`Store作成に失敗: ${message}`) }
    }
  }

  /**
   * File Search Storeにファイルをアップロード
   *
   * @param storeId - Store ID（省略時は新規作成）
   * @param file - アップロードするファイル
   * @param options - オプション
   * @returns アップロード結果
   *
   * @example
   * const { data, error } = await FileSearchService.uploadFile(storeId, file)
   * if (error) {
   *   console.error(error)
   * } else {
   *   console.log(data.file.gemini_file_name)
   * }
   */
  static async uploadFile(
    storeId: string | null,
    file: File,
    options: {
      displayName?: string
    } = {}
  ): Promise<ServiceResponse<UploadFileResponse>> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (storeId) {
        formData.append('store_id', storeId)
      }
      if (options.displayName) {
        formData.append('display_name', options.displayName)
      }

      const { data, error } = await EdgeFunctionService.invoke<UploadFileResponse>('knowledge-file-upload', formData, {
        isFormData: true,
      })

      if (error) {
        return { data: null, error }
      }

      return { data, error: null }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`ファイルアップロードに失敗: ${message}`) }
    }
  }

  /**
   * RAGを使用してチャット
   *
   * @param message - ユーザーメッセージ
   * @param storeIds - 検索対象のStore ID配列
   * @param options - オプション
   * @returns RAGレスポンス
   *
   * @example
   * const { data, error } = await FileSearchService.chatWithRAG(
   *   'このドキュメントについて教えて',
   *   [storeId]
   * )
   * if (error) {
   *   console.error(error)
   * } else {
   *   console.log(data.response)
   *   console.log(data.grounding_metadata?.citations)
   * }
   */
  static async chatWithRAG(
    message: string,
    storeIds: string[],
    options: {
      model?: string
    } = {}
  ): Promise<ServiceResponse<RAGChatResponse>> {
    try {
      const { data, error } = await EdgeFunctionService.invoke<RAGChatResponse>('ai-chat', {
        message,
        file_search_store_ids: storeIds,
        provider: 'gemini', // Gemini のみ File Search 対応
        model: options.model,
      })

      if (error) {
        return { data: null, error }
      }

      return { data, error: null }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`RAGチャットに失敗: ${message}`) }
    }
  }

  /**
   * File Search Storeを削除
   *
   * @param storeId - Store ID
   * @returns 削除結果
   *
   * @example
   * const { error } = await FileSearchService.deleteStore(storeId)
   * if (error) {
   *   console.error(error)
   * }
   */
  static async deleteStore(storeId: string): Promise<ServiceResponse<{ success: boolean }>> {
    try {
      const { data, error } = await EdgeFunctionService.invoke<{ success: boolean }>('knowledge-file-delete', {
        store_id: storeId,
      })

      if (error) {
        return { data: null, error }
      }

      return { data, error: null }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`Store削除に失敗: ${message}`) }
    }
  }
}
