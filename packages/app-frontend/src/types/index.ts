/**
 * Type Definitions for Akatsuki Frontend
 *
 * このファイルはプロジェクト全体で使用される型定義を提供します。
 * 段階的TypeScript移行の一部として作成されました。
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// ============================================================
// Async Job System Types
// ============================================================

/**
 * Job status enum
 */
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

/**
 * System Event (Job) interface
 *
 * system_events テーブルのレコード型
 */
export interface SystemEvent {
  id: string
  event_type: string
  payload: Record<string, any>
  status: JobStatus
  priority: number
  scheduled_at: string
  created_at: string
  processed_at: string | null
  retry_count: number
  max_retries: number
  error_message: string | null
  user_id: string | null

  // Job-specific fields
  progress: number
  result: any
  processing_started_at: string | null
}

/**
 * Job type alias (for clarity)
 */
export type Job = SystemEvent

/**
 * Job Context provided to handlers
 *
 * ハンドラー関数に渡されるコンテキストオブジェクト
 */
export interface JobContext {
  /**
   * Supabase client with Service Role permissions
   */
  supabase: SupabaseClient

  /**
   * Job ID (system_events.id)
   */
  jobId: string

  /**
   * Update job progress (0-100)
   *
   * @param progress - Progress percentage (0-100)
   */
  updateProgress: (progress: number) => Promise<void>
}

/**
 * Job Handler function type
 *
 * @template P - Payload type
 * @template R - Result type
 *
 * @example
 * const generateReport: JobHandler<ReportParams, ReportResult> = async (params, context) => {
 *   await context.updateProgress(20)
 *   const data = await fetchData(params.startDate, params.endDate)
 *   await context.updateProgress(60)
 *   return { records: data.length, revenue: calculateRevenue(data) }
 * }
 */
export type JobHandler<P = any, R = any> = (
  params: P,
  context: JobContext
) => Promise<R>

/**
 * Job Handlers Registry type
 */
export type JobHandlers = Record<string, JobHandler>

// ============================================================
// useJob Hook Types
// ============================================================

/**
 * Options for useJob hook
 */
export interface UseJobOptions {
  /**
   * Enable/disable the hook (default: true)
   */
  enabled?: boolean

  /**
   * Refetch job on mount (default: true)
   */
  refetchOnMount?: boolean

  /**
   * Callback when job completes
   */
  onComplete?: (result: any) => void

  /**
   * Callback when job fails
   */
  onError?: (error: string) => void

  /**
   * Callback on progress update
   */
  onProgress?: (progress: number) => void
}

/**
 * Return type of useJob hook
 */
export interface UseJobReturn {
  /**
   * Full job object
   */
  job: Job | null

  /**
   * Progress percentage (0-100)
   */
  progress: number

  /**
   * Job result (available when completed)
   */
  result: any

  /**
   * Error message (available when failed)
   */
  error: string | null

  /**
   * Initial loading state
   */
  isLoading: boolean

  /**
   * Job is pending
   */
  isPending: boolean

  /**
   * Job is being processed
   */
  isProcessing: boolean

  /**
   * Job completed successfully
   */
  isCompleted: boolean

  /**
   * Job failed
   */
  isFailed: boolean

  /**
   * Manually refetch job state
   */
  refetch: () => Promise<void>
}

// ============================================================
// Event System Types
// ============================================================

/**
 * Event emission options
 */
export interface EventEmitOptions {
  /**
   * Event priority (higher = processed first)
   */
  priority?: number

  /**
   * When to process (default: now)
   */
  scheduledAt?: Date | string

  /**
   * User ID (auto-detected if not provided)
   */
  userId?: string

  /**
   * Max retry attempts (default: 3)
   */
  maxRetries?: number
}

// ============================================================
// Image Generation Types
// ============================================================

/**
 * Image generation provider
 */
export type ImageProvider = 'dalle' | 'gemini' | 'comfyui'

/**
 * Image generation result
 */
export interface ImageGenerationResult {
  id: string
  publicUrl: string
  provider: ImageProvider
  model: string
  size: string
  revisedPrompt?: string
}

// ============================================================
// User & Auth Types
// ============================================================

/**
 * User profile
 */
export interface UserProfile {
  userId: string
  username: string | null
  displayName: string | null
  bio: string | null
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
}

/**
 * User quota information
 */
export interface UserQuota {
  userId: string
  limit: number
  remaining: number
  resetAt: string
}

// ============================================================
// Utility Types
// ============================================================

/**
 * Async state for data fetching
 */
export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

/**
 * Pagination state
 */
export interface Pagination {
  page: number
  pageSize: number
  total: number
}

/**
 * Sort configuration
 */
export interface SortConfig {
  field: string
  direction: 'asc' | 'desc'
}

// ============================================================
// Edge Function Types
// ============================================================

/**
 * Standard Edge Function response pattern
 *
 * All Edge Functions return this pattern for consistency
 *
 * @template T - The data type on success
 */
export interface EdgeFunctionResponse<T = any> {
  /**
   * Response data (null on error)
   */
  data: T | null

  /**
   * Error object (null on success)
   */
  error: Error | null
}

/**
 * Akatsuki Handler Pattern response
 *
 * Internal Edge Function format (converted to EdgeFunctionResponse by EdgeFunctionService)
 */
export interface AkatsukiResponse<T = any> {
  /**
   * Operation success flag
   */
  success: boolean

  /**
   * Result data (on success)
   */
  result?: T

  /**
   * Error information (on failure)
   */
  error?: {
    message: string
    code?: string
  } | string
}

/**
 * AI Chat request parameters
 */
export interface AIChatRequest {
  /**
   * User message
   */
  message: string

  /**
   * AI provider ('openai' | 'anthropic' | 'gemini')
   */
  provider?: string

  /**
   * Model name (e.g., 'gpt-4', 'claude-3-sonnet')
   */
  model?: string

  /**
   * Conversation history
   */
  history?: Array<{ role: 'user' | 'assistant'; content: string }>

  /**
   * Temperature (0-2)
   */
  temperature?: number

  /**
   * Max tokens to generate
   */
  maxTokens?: number
}

/**
 * AI Chat response
 */
export interface AIChatResponse {
  /**
   * AI-generated response
   */
  response: string

  /**
   * Model used
   */
  model: string

  /**
   * Provider used
   */
  provider: string

  /**
   * Tokens used
   */
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/**
 * Image Generation request parameters
 */
export interface ImageGenerationRequest {
  /**
   * Generation mode
   */
  mode?: 'text-to-image' | 'variation' | 'edit'

  /**
   * Text prompt
   */
  prompt?: string

  /**
   * Provider ('dalle' | 'gemini' | 'comfyui')
   */
  provider?: string

  /**
   * Image size
   */
  size?: '1024x1024' | '1792x1024' | '1024x1792' | string

  /**
   * Quality ('standard' | 'hd')
   */
  quality?: 'standard' | 'hd'

  /**
   * Style ('vivid' | 'natural')
   */
  style?: 'vivid' | 'natural'

  /**
   * Model name (optional)
   */
  model?: string

  /**
   * Source image URL (for variation/edit)
   */
  sourceImage?: string

  /**
   * ComfyUI-specific config
   */
  comfyui_config?: {
    workflowId?: string
    workflow?: Record<string, any>
  }
}

/**
 * Image Generation response from Edge Function
 */
export interface ImageGenerationEdgeResponse {
  /**
   * Generated image URL
   */
  imageUrl: string

  /**
   * Provider used
   */
  provider: string

  /**
   * Model used
   */
  model: string

  /**
   * Revised prompt (DALL-E)
   */
  revisedPrompt?: string

  /**
   * Image size
   */
  size: string
}

/**
 * Image Generation Service response (with Storage)
 */
export interface ImageGenerationServiceResponse {
  /**
   * File ID in storage
   */
  id: string

  /**
   * Permanent public URL
   */
  publicUrl: string

  /**
   * Provider used
   */
  provider: string

  /**
   * Model used
   */
  model: string

  /**
   * Image size
   */
  size: string

  /**
   * Revised prompt (if applicable)
   */
  revisedPrompt?: string

  /**
   * Full metadata
   */
  metadata?: Record<string, any>
}

/**
 * File Upload response
 */
export interface FileUploadResponse {
  /**
   * File ID
   */
  id: string

  /**
   * File path in storage
   */
  path: string

  /**
   * Public URL (if public storage)
   */
  publicUrl?: string

  /**
   * Signed URL (if private storage)
   */
  signedUrl?: string

  /**
   * File size in bytes
   */
  size: number

  /**
   * MIME type
   */
  mimeType: string
}

/**
 * Web Search request
 */
export interface WebSearchRequest {
  /**
   * Search query
   */
  query: string

  /**
   * Max results
   */
  maxResults?: number

  /**
   * Search depth ('basic' | 'advanced')
   */
  searchDepth?: 'basic' | 'advanced'
}

/**
 * Web Search result
 */
export interface WebSearchResult {
  /**
   * Page title
   */
  title: string

  /**
   * Page URL
   */
  url: string

  /**
   * Content snippet
   */
  content: string

  /**
   * Relevance score
   */
  score?: number
}

/**
 * Web Search response
 */
export interface WebSearchResponse {
  /**
   * Search results
   */
  results: WebSearchResult[]

  /**
   * Query used
   */
  query: string

  /**
   * Provider used
   */
  provider: string
}

// ============================================================
// Service Types
// ============================================================

// Note: EventService.emit() returns SystemEvent directly (throws on error)
// EventEmitOptions is defined in Event System Types section above

// ============================================================
// Re-export common types
// ============================================================

export type { SupabaseClient }
