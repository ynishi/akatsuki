import { EdgeFunctionService } from './EdgeFunctionService'

/**
 * File Search provider type
 */
export type FileSearchProvider = 'gemini' // 将来的に | 'openai' | 'pinecone' | 'weaviate' など追加可能

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
 * AI Chat Edge Function response
 */
interface AIChatEdgeFunctionResponse {
  response: string
  grounding_metadata?: RAGChatResponse['grounding_metadata']
}

/**
 * Create store options
 */
export interface CreateStoreOptions {
  provider?: FileSearchProvider
}

/**
 * Upload file options
 */
export interface UploadFileOptions {
  displayName?: string
  provider?: FileSearchProvider
}

/**
 * RAG chat options
 */
export interface RAGChatOptions {
  model?: string
  provider?: FileSearchProvider
}

/**
 * Delete store options
 */
export interface DeleteStoreOptions {
  provider?: FileSearchProvider
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
 * File Search API統合サービス
 * Provider: Gemini（デフォルト）、将来的に他のプロバイダーも追加可能
 *
 * @example
 * import { FileSearchService } from '@/services/FileSearchService'
 *
 * // Store作成（Geminiデフォルト）
 * const { data, error } = await FileSearchService.createStore('My Knowledge Base')
 *
 * // ファイルアップロード（Provider指定可能）
 * const { data, error } = await FileSearchService.uploadFile(storeId, file, {
 *   provider: 'gemini'
 * })
 *
 * // RAGチャット
 * const { data, error } = await FileSearchService.chatWithRAG('質問', [storeId], {
 *   provider: 'gemini'
 * })
 */
export class FileSearchService {
  /**
   * 新しいFile Search Storeを作成
   *
   * @param displayName - 表示名
   * @param options - オプション（provider指定など）
   * @returns Store情報
   *
   * @example
   * // Gemini（デフォルト）
   * const { data, error } = await FileSearchService.createStore('My Knowledge Base')
   *
   * @example
   * // Provider明示指定
   * const { data, error } = await FileSearchService.createStore('My Knowledge Base', {
   *   provider: 'gemini'
   * })
   */
  static async createStore(
    displayName: string,
    options: CreateStoreOptions = {}
  ): Promise<ServiceResponse<{ store: UploadFileResponse['store'] }>> {
    const { provider = 'gemini' } = options

    try {
      const { data: storeResult, error: createError } = await EdgeFunctionService.invoke<{ store: UploadFileResponse['store'] }>(
        'knowledge-file-upload',
        {
          mode: 'create_store',
          display_name: displayName,
          provider,
        }
      )

      if (createError) {
        return { data: null, error: createError }
      }

      if (!storeResult) {
        return { data: null, error: new Error('Store作成に失敗: レスポンスが空です') }
      }

      return { data: storeResult, error: null }
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
   * @param options - オプション（displayName, provider指定など）
   * @returns アップロード結果
   *
   * @example
   * // Gemini（デフォルト）
   * const { data, error } = await FileSearchService.uploadFile(storeId, file)
   *
   * @example
   * // Provider明示指定
   * const { data, error } = await FileSearchService.uploadFile(storeId, file, {
   *   displayName: 'My Document',
   *   provider: 'gemini'
   * })
   */
  static async uploadFile(
    storeId: string | null,
    file: File,
    options: UploadFileOptions = {}
  ): Promise<ServiceResponse<UploadFileResponse>> {
    const { displayName, provider = 'gemini' } = options

    try {
      const formData = new FormData()
      formData.append('mode', 'upload_file')
      formData.append('file', file)
      formData.append('provider', provider)
      if (storeId) {
        formData.append('store_id', storeId)
      }
      if (displayName) {
        formData.append('display_name', displayName)
      }

      const { data: uploadResult, error: uploadError } = await EdgeFunctionService.invoke<UploadFileResponse>('knowledge-file-upload', formData, {
        isFormData: true,
      })

      if (uploadError) {
        return { data: null, error: uploadError }
      }

      if (!uploadResult) {
        return { data: null, error: new Error('ファイルアップロードに失敗: レスポンスが空です') }
      }

      return { data: uploadResult, error: null }
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
   * @param options - オプション（model, provider指定など）
   * @returns RAGレスポンス
   *
   * @example
   * // Gemini（デフォルト）
   * const { data, error } = await FileSearchService.chatWithRAG(
   *   'このドキュメントについて教えて',
   *   [storeId]
   * )
   *
   * @example
   * // Provider & Model指定
   * const { data, error } = await FileSearchService.chatWithRAG(
   *   'このドキュメントについて教えて',
   *   [storeId],
   *   { provider: 'gemini', model: 'gemini-2.0-flash-exp' }
   * )
   */
  static async chatWithRAG(
    message: string,
    storeIds: string[],
    options: RAGChatOptions = {}
  ): Promise<ServiceResponse<RAGChatResponse>> {
    const { model, provider = 'gemini' } = options

    try {
      const { data: chatResult, error: chatError } = await EdgeFunctionService.invoke<AIChatEdgeFunctionResponse>('ai-chat', {
        provider,
        prompt: message,
        model,
        fileSearchStoreIds: storeIds,
      })

      if (chatError) {
        return { data: null, error: chatError }
      }

      if (!chatResult) {
        return { data: null, error: new Error('RAGチャットに失敗: レスポンスが空です') }
      }

      // ai-chatのレスポンス形式をRAGChatResponseに変換
      const ragResponse: RAGChatResponse = {
        query: message,
        response: chatResult.response || '',
        grounding_metadata: chatResult.grounding_metadata,
      }

      return { data: ragResponse, error: null }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`RAGチャットに失敗: ${message}`) }
    }
  }

  /**
   * File Search Store内のファイル一覧を取得
   *
   * @param storeId - Store ID
   * @param options - オプション（provider指定など）
   * @returns ファイル一覧
   *
   * @example
   * const { data, error } = await FileSearchService.listFiles(storeId)
   * if (data) {
   *   console.log(`${data.files.length} files in store`)
   * }
   */
  static async listFiles(
    storeId: string,
    options: DeleteStoreOptions = {}
  ): Promise<ServiceResponse<{ files: any[] }>> {
    const { provider = 'gemini' } = options

    try {
      const { data: listResult, error: listError } = await EdgeFunctionService.invoke<{ files: any[] }>('knowledge-file-list', {
        store_id: storeId,
        provider,
      })

      if (listError) {
        return { data: null, error: listError }
      }

      if (!listResult) {
        return { data: null, error: new Error('ファイル一覧取得に失敗: レスポンスが空です') }
      }

      return { data: listResult, error: null }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`ファイル一覧取得に失敗: ${message}`) }
    }
  }

  /**
   * File Search Storeを削除
   *
   * @param storeId - Store ID
   * @param options - オプション（provider指定など）
   * @returns 削除結果
   *
   * @example
   * // Gemini（デフォルト）
   * const { error } = await FileSearchService.deleteStore(storeId)
   *
   * @example
   * // Provider明示指定
   * const { error } = await FileSearchService.deleteStore(storeId, {
   *   provider: 'gemini'
   * })
   */
  static async deleteStore(
    storeId: string,
    options: DeleteStoreOptions = {}
  ): Promise<ServiceResponse<{ success: boolean }>> {
    const { provider = 'gemini' } = options

    try {
      const { data: deleteResult, error: deleteError } = await EdgeFunctionService.invoke<{ success: boolean }>('knowledge-file-delete', {
        store_id: storeId,
        provider,
      })

      if (deleteError) {
        return { data: null, error: deleteError }
      }

      if (!deleteResult) {
        return { data: null, error: new Error('Store削除に失敗: レスポンスが空です') }
      }

      return { data: deleteResult, error: null }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: new Error(`Store削除に失敗: ${message}`) }
    }
  }
}
