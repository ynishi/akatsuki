// Gemini RAG Provider Client
// Implementation of RAGProviderInterface for Google Gemini File Search

import { GoogleGenAI } from 'npm:@google/genai@1.29.0'
import type {
  RAGProviderInterface,
  StoreResult,
  FileInfo,
  UploadFileParams,
  UploadResult,
  SearchParams,
  SearchResult,
} from './rag-provider-interface.ts'

/**
 * Gemini RAG Provider Client
 *
 * Implements File Search (RAG) functionality using Google Gemini's
 * File Search API (Corpora & Documents).
 *
 * @see https://ai.google.dev/gemini-api/docs/file-search
 */
export class GeminiRAGClient implements RAGProviderInterface {
  readonly providerName = 'gemini'
  private ai: GoogleGenAI

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey })
  }

  // ============================================================================
  // Store Operations
  // ============================================================================

  /**
   * Create a new Gemini File Search Store (Corpus)
   */
  async createStore(displayName: string): Promise<StoreResult> {
    try {
      const fileSearchStore = await this.ai.fileSearchStores.create({
        config: { displayName }
      })

      return {
        name: fileSearchStore.name, // "corpora/xxx"
        displayName: displayName,
      }
    } catch (error: any) {
      throw new Error(`[GeminiRAGClient] Failed to create store: ${error.message}`)
    }
  }

  /**
   * Delete a Gemini File Search Store (Corpus)
   */
  async deleteStore(storeName: string): Promise<void> {
    try {
      await this.ai.fileSearchStores.delete({ name: storeName })
    } catch (error: any) {
      throw new Error(`[GeminiRAGClient] Failed to delete store: ${error.message}`)
    }
  }

  /**
   * List all files in a Gemini File Search Store
   */
  async listFiles(storeName: string): Promise<FileInfo[]> {
    try {
      // List documents in the corpus
      const response = await this.ai.fileSearchStores.listDocuments({
        fileSearchStoreName: storeName
      })

      // Convert to FileInfo format
      const files: FileInfo[] = (response.documents || []).map((doc: any) => ({
        name: doc.name, // "corpora/xxx/documents/xxx"
        displayName: doc.displayName || doc.name,
        mimeType: doc.mimeType,
        createTime: doc.createTime,
        metadata: {
          state: doc.state,
          updateTime: doc.updateTime,
        }
      }))

      return files
    } catch (error: any) {
      throw new Error(`[GeminiRAGClient] Failed to list files: ${error.message}`)
    }
  }

  // ============================================================================
  // File Operations
  // ============================================================================

  /**
   * Upload a file to Gemini File Search Store
   *
   * Note: Gemini requires file paths (not File objects directly),
   * so we use tempFilePath from params.
   */
  async uploadFile(params: UploadFileParams): Promise<UploadResult> {
    const { storeName, tempFilePath, displayName, mimeType } = params

    try {
      console.log('[GeminiRAGClient] Uploading file:', {
        storeName,
        tempFilePath,
        displayName,
        mimeType,
      })

      // Upload to File Search Store
      const operation = await this.ai.fileSearchStores.uploadToFileSearchStore({
        file: tempFilePath,
        fileSearchStoreName: storeName,
        config: {
          displayName: displayName,
          mimeType: mimeType
        }
      })

      // Wait for upload to complete
      let currentOperation = operation
      const maxWaitTime = 60000 // 60 seconds
      const startTime = Date.now()

      while (!currentOperation.done) {
        if (Date.now() - startTime > maxWaitTime) {
          throw new Error('Upload timeout: operation did not complete in 60 seconds')
        }

        await new Promise(resolve => setTimeout(resolve, 2000))
        currentOperation = await this.ai.operations.get({ name: currentOperation.name })
      }

      console.log('[GeminiRAGClient] Upload completed:', currentOperation)

      // Extract file name from result
      const uploadResult = currentOperation.response
      const geminiFileName = uploadResult?.name || uploadResult?.file?.name

      if (!geminiFileName) {
        throw new Error('Failed to get Gemini file name from upload result')
      }

      return {
        fileName: geminiFileName,
        status: 'success',
        metadata: {
          operation: currentOperation.name,
          uploadResult: uploadResult,
        }
      }
    } catch (error: any) {
      throw new Error(`[GeminiRAGClient] Failed to upload file: ${error.message}`)
    }
  }

  // ============================================================================
  // Search Operations
  // ============================================================================

  /**
   * Search using Gemini File Search
   *
   * Note: For Gemini, File Search is integrated directly into the generateContent API,
   * so this method is primarily for compatibility. In practice, you should use
   * the File Search integration in ai-chat's Gemini provider code.
   *
   * This method returns a placeholder indicating that search is handled at the
   * LLM generation level.
   */
  async search(params: SearchParams): Promise<SearchResult> {
    console.warn('[GeminiRAGClient] Direct search() is not typically used with Gemini.')
    console.warn('Gemini File Search is integrated at the LLM generation level (see ai-chat).')

    // Return placeholder - actual search happens in generateContent with fileSearchConfig
    return {
      chunks: [],
      groundingMetadata: {
        message: 'Gemini File Search is integrated at LLM generation level',
        storeNames: params.storeNames,
      }
    }
  }
}
