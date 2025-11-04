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
// Re-export common types
// ============================================================

export type { SupabaseClient }
