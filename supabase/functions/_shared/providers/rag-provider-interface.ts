// RAG Provider Interface
// Unified interface for File Search (RAG) providers
// Supports: Gemini, OpenAI, Pinecone, AnythingLLM, etc.

/**
 * Store creation result
 */
export interface StoreResult {
  /** Provider-specific store identifier (e.g., "corpora/xxx" for Gemini) */
  name: string
  /** Human-readable display name */
  displayName: string
}

/**
 * File information
 */
export interface FileInfo {
  /** Provider-specific file identifier */
  name: string
  /** Human-readable file name */
  displayName?: string
  /** File size in bytes */
  size?: number
  /** MIME type */
  mimeType?: string
  /** Creation timestamp */
  createTime?: string
  /** Provider-specific metadata */
  metadata?: Record<string, any>
}

/**
 * File upload parameters
 */
export interface UploadFileParams {
  /** Store identifier */
  storeName: string
  /** File to upload */
  file: File
  /** Temporary file path (for server-side access) */
  tempFilePath: string
  /** Display name for the file */
  displayName?: string
  /** MIME type */
  mimeType?: string
}

/**
 * File upload result
 */
export interface UploadResult {
  /** Provider-specific document identifier */
  fileName: string
  /** Upload status */
  status: 'success' | 'processing' | 'failed'
  /** Additional metadata */
  metadata?: Record<string, any>
}

/**
 * Search parameters
 */
export interface SearchParams {
  /** Store identifiers to search in */
  storeNames: string[]
  /** Search query */
  query: string
  /** Maximum number of results */
  maxResults?: number
  /** Provider-specific options */
  options?: Record<string, any>
}

/**
 * Search result
 */
export interface SearchResult {
  /** Relevant document chunks */
  chunks: Array<{
    content: string
    score?: number
    metadata?: Record<string, any>
  }>
  /** Grounding metadata (citations, sources, etc.) */
  groundingMetadata?: any
}

/**
 * RAG Provider Interface
 *
 * All RAG providers must implement this interface to ensure
 * consistent behavior across different File Search backends.
 *
 * Supported Providers:
 * - Gemini File Search (Google AI)
 * - OpenAI Assistants API with File Search
 * - Pinecone Vector Database
 * - AnythingLLM
 * - Weaviate
 */
export interface RAGProviderInterface {
  /**
   * Provider name (e.g., 'gemini', 'openai', 'pinecone')
   */
  readonly providerName: string

  // ============================================================================
  // Store Operations
  // ============================================================================

  /**
   * Create a new File Search store
   *
   * @param displayName - Human-readable store name
   * @returns Store creation result
   *
   * @example
   * const store = await provider.createStore('My Knowledge Base')
   */
  createStore(displayName: string): Promise<StoreResult>

  /**
   * Delete a File Search store
   *
   * @param storeName - Provider-specific store identifier
   *
   * @example
   * await provider.deleteStore('corpora/xxx')
   */
  deleteStore(storeName: string): Promise<void>

  /**
   * List all files in a store
   *
   * @param storeName - Provider-specific store identifier
   * @returns Array of file information
   *
   * @example
   * const files = await provider.listFiles('corpora/xxx')
   */
  listFiles(storeName: string): Promise<FileInfo[]>

  // ============================================================================
  // File Operations
  // ============================================================================

  /**
   * Upload a file to a store
   *
   * @param params - Upload parameters
   * @returns Upload result
   *
   * @example
   * const result = await provider.uploadFile({
   *   storeName: 'corpora/xxx',
   *   file: myFile,
   *   tempFilePath: '/tmp/file.pdf',
   *   displayName: 'Document.pdf',
   *   mimeType: 'application/pdf'
   * })
   */
  uploadFile(params: UploadFileParams): Promise<UploadResult>

  // ============================================================================
  // Search Operations (for ai-chat integration)
  // ============================================================================

  /**
   * Search across stores (used in ai-chat for RAG)
   *
   * Note: This returns raw search results. The LLM provider (OpenAI, Anthropic, Gemini)
   * will use these results to generate the final response.
   *
   * @param params - Search parameters
   * @returns Search results
   *
   * @example
   * const results = await provider.search({
   *   storeNames: ['corpora/xxx'],
   *   query: 'What is RAG?',
   *   maxResults: 5
   * })
   */
  search(params: SearchParams): Promise<SearchResult>
}

/**
 * Factory function type for creating RAG providers
 */
export type RAGProviderFactory = (apiKey: string, options?: Record<string, any>) => RAGProviderInterface
