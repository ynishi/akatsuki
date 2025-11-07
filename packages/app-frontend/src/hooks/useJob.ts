import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { EventService } from '../services/EventService'

interface JobData {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  result?: any
  error_message?: string
  [key: string]: any
}

interface UseJobOptions {
  enabled?: boolean
  refetchOnMount?: boolean
  onComplete?: (result: any) => void
  onError?: (error: string) => void
  onProgress?: (progress: number) => void
}

interface UseJobReturn {
  job: JobData | null
  progress: number
  result: any
  error: string | null
  isLoading: boolean
  isPending: boolean
  isProcessing: boolean
  isCompleted: boolean
  isFailed: boolean
  refetch: () => Promise<void>
}

/**
 * Monitor a job's progress in real-time
 *
 * @param {string} jobId - Job ID to monitor
 * @param {Object} options - Additional options
 * @param {boolean} options.enabled - Enable/disable monitoring (default: true)
 * @param {boolean} options.refetchOnMount - Refetch job on mount (default: true)
 * @param {function} options.onComplete - Callback when job completes: (result) => void
 * @param {function} options.onError - Callback when job fails: (error) => void
 * @param {function} options.onProgress - Callback on progress update: (progress) => void
 *
 * @returns {Object} Job state
 * @returns {Object} job - Full job object from system_events
 * @returns {number} progress - Progress percentage (0-100)
 * @returns {any} result - Job result (available when completed)
 * @returns {string} error - Error message (available when failed)
 * @returns {boolean} isLoading - Initial loading state
 * @returns {boolean} isPending - Job is pending
 * @returns {boolean} isProcessing - Job is being processed
 * @returns {boolean} isCompleted - Job completed successfully
 * @returns {boolean} isFailed - Job failed
 * @returns {function} refetch - Manually refetch job state
 *
 * @example
 * const { job, progress, isCompleted, result } = useJob(jobId, {
 *   onComplete: (result) => {
 *     toast.success('Job completed!')
 *     console.log('Result:', result)
 *   },
 *   onProgress: (progress) => {
 *     console.log(`Progress: ${progress}%`)
 *   }
 * })
 *
 * @example
 * // Start a job and monitor its progress
 * const [jobId, setJobId] = useState(null)
 *
 * const startJob = async () => {
 *   const event = await EventService.emit('job:generate-report', {
 *     reportType: 'sales',
 *     startDate: '2025-01-01',
 *     endDate: '2025-01-31'
 *   })
 *   setJobId(event.id)
 * }
 *
 * const { progress, isCompleted, result } = useJob(jobId, {
 *   enabled: !!jobId,
 *   onComplete: (result) => {
 *     console.log('Report:', result)
 *   }
 * })
 */
export function useJob(jobId: string, options: UseJobOptions = {}): UseJobReturn {
  const {
    enabled = true,
    refetchOnMount = true,
    onComplete,
    onError,
    onProgress,
  } = options

  const [job, setJob] = useState<JobData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch job state
  const refetch = useCallback(async () => {
    if (!jobId || !enabled) return

    try {
      setIsLoading(true)
      const data = await EventService.get(jobId)
      setJob(data as JobData)
    } catch (error) {
      console.error('Failed to fetch job:', error)
    } finally {
      setIsLoading(false)
    }
  }, [jobId, enabled])

  // Initial fetch
  useEffect(() => {
    if (refetchOnMount) {
      refetch()
    }
  }, [refetch, refetchOnMount])

  // Subscribe to Realtime updates
  useEffect(() => {
    if (!jobId || !enabled) return

    const channel = supabase
      .channel(`job_${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'system_events',
          filter: `id=eq.${jobId}`,
        },
        (payload: any) => {
          const updatedJob = payload.new as JobData
          setJob(updatedJob)

          // Trigger progress callback
          if (onProgress && updatedJob.progress !== job?.progress) {
            onProgress(updatedJob.progress ?? 0)
          }

          // Trigger completion callback
          if (onComplete && updatedJob.status === 'completed' && job?.status !== 'completed') {
            onComplete(updatedJob.result)
          }

          // Trigger error callback
          if (onError && updatedJob.status === 'failed' && job?.status !== 'failed') {
            onError(updatedJob.error_message ?? 'Unknown error')
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [jobId, enabled, job?.progress, job?.status, onProgress, onComplete, onError])

  // Derived state
  const progress = job?.progress ?? 0
  const result = job?.result ?? null
  const error = job?.error_message ?? null
  const isPending = job?.status === 'pending'
  const isProcessing = job?.status === 'processing'
  const isCompleted = job?.status === 'completed'
  const isFailed = job?.status === 'failed'

  return {
    job,
    progress,
    result,
    error,
    isLoading,
    isPending,
    isProcessing,
    isCompleted,
    isFailed,
    refetch,
  }
}

interface UseJobsOptions {
  onComplete?: (result: any, jobId: string) => void
  onError?: (error: string, jobId: string) => void
  onProgress?: (progress: number, jobId: string) => void
}

/**
 * Monitor multiple jobs at once
 *
 * @param {string[]} jobIds - Array of job IDs to monitor
 * @param {Object} options - Same options as useJob
 * @returns {Object} Map of jobId -> job state
 *
 * @example
 * const jobs = useJobs([jobId1, jobId2, jobId3], {
 *   onComplete: (result, jobId) => {
 *     console.log(`Job ${jobId} completed:`, result)
 *   }
 * })
 *
 * console.log(jobs[jobId1].progress) // 75
 * console.log(jobs[jobId2].isCompleted) // true
 */
export function useJobs(jobIds: string[], options: UseJobsOptions = {}): Record<string, JobData | null> {
  const [jobs, setJobs] = useState<Record<string, JobData | null>>({})

  useEffect(() => {
    if (!jobIds || jobIds.length === 0) return

    // Initialize all jobs
    const fetchAllJobs = async () => {
      const results = await Promise.all(
        jobIds.map(async (jobId) => {
          try {
            const data = await EventService.get(jobId)
            return [jobId, data as JobData] as const
          } catch (error) {
            console.error(`Failed to fetch job ${jobId}:`, error)
            return [jobId, null] as const
          }
        })
      )

      setJobs(Object.fromEntries(results))
    }

    fetchAllJobs()

    // Subscribe to all jobs
    const channel = supabase
      .channel('multiple_jobs')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'system_events',
          filter: `id=in.(${jobIds.join(',')})`,
        },
        (payload: any) => {
          const updatedJob = payload.new as JobData
          setJobs((prev) => ({
            ...prev,
            [updatedJob.id]: updatedJob,
          }))

          // Trigger callbacks
          const previousJob = jobs[updatedJob.id]
          if (options.onProgress && updatedJob.progress !== previousJob?.progress) {
            options.onProgress(updatedJob.progress ?? 0, updatedJob.id)
          }
          if (options.onComplete && updatedJob.status === 'completed' && previousJob?.status !== 'completed') {
            options.onComplete(updatedJob.result, updatedJob.id)
          }
          if (options.onError && updatedJob.status === 'failed' && previousJob?.status !== 'failed') {
            options.onError(updatedJob.error_message ?? 'Unknown error', updatedJob.id)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobIds.join(','), options.onProgress, options.onComplete, options.onError])

  return jobs
}
