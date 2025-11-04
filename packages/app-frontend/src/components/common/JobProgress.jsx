import { Progress } from '../ui/progress'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Badge } from '../ui/badge'
import { useJob } from '../../hooks/useJob'

/**
 * Job Progress Component
 *
 * Displays job execution progress with real-time updates
 *
 * @param {string} jobId - Job ID to monitor
 * @param {string} title - Job title (optional)
 * @param {function} onComplete - Callback when job completes: (result) => void
 * @param {function} onError - Callback when job fails: (error) => void
 * @param {boolean} showResult - Show result when completed (default: true)
 * @param {function} renderResult - Custom result renderer: (result) => JSX.Element
 * @param {string} className - Additional CSS classes
 *
 * @example
 * <JobProgress
 *   jobId={jobId}
 *   title="Generating Sales Report"
 *   onComplete={(result) => console.log('Done:', result)}
 * />
 *
 * @example
 * <JobProgress
 *   jobId={jobId}
 *   renderResult={(result) => (
 *     <div>
 *       <p>Revenue: ${result.revenue}</p>
 *       <p>Records: {result.records}</p>
 *     </div>
 *   )}
 * />
 */
export function JobProgress({
  jobId,
  title,
  onComplete,
  onError,
  showResult = true,
  renderResult,
  className = '',
}) {
  const {
    job,
    progress,
    result,
    error,
    isLoading,
    isPending,
    isProcessing,
    isCompleted,
    isFailed,
  } = useJob(jobId, {
    onComplete,
    onError,
  })

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title || 'Loading...'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!job) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Job Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Job ID: {jobId}</p>
        </CardContent>
      </Card>
    )
  }

  const getStatusBadge = () => {
    if (isPending) return <Badge variant="outline">Pending</Badge>
    if (isProcessing) return <Badge variant="default">Processing</Badge>
    if (isCompleted) return <Badge className="bg-green-500 text-white border-transparent">Completed</Badge>
    if (isFailed) return <Badge variant="destructive">Failed</Badge>
    return <Badge variant="outline">{job.status}</Badge>
  }

  const getStatusColor = () => {
    if (isCompleted) return 'text-green-600'
    if (isFailed) return 'text-red-600'
    if (isProcessing) return 'text-blue-600'
    return 'text-gray-600'
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={getStatusColor()}>
            {title || job.event_type.replace('job:', '')}
          </CardTitle>
          {getStatusBadge()}
        </div>
        {job.created_at && (
          <CardDescription>
            Started: {new Date(job.created_at).toLocaleString()}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {!isCompleted && !isFailed && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Progress</span>
              <span className="font-semibold text-purple-600">{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Completed Result */}
        {isCompleted && showResult && result && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700">Result</h4>
            {renderResult ? (
              renderResult(result)
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <pre className="text-xs text-gray-800 overflow-auto max-h-48">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {isFailed && error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-red-700 mb-2">Error</h4>
            <p className="text-sm text-red-600">{error}</p>
            {job.retry_count > 0 && (
              <p className="text-xs text-red-500 mt-2">
                Retry attempts: {job.retry_count} / {job.max_retries}
              </p>
            )}
          </div>
        )}

        {/* Job Details */}
        {job.processing_started_at && (
          <div className="text-xs text-gray-500">
            Processing started: {new Date(job.processing_started_at).toLocaleString()}
          </div>
        )}
        {job.processed_at && (
          <div className="text-xs text-gray-500">
            Completed at: {new Date(job.processed_at).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Compact Job Progress (minimal UI)
 *
 * @param {string} jobId - Job ID to monitor
 * @param {function} onComplete - Callback when job completes
 * @param {function} onError - Callback when job fails
 *
 * @example
 * <JobProgressCompact jobId={jobId} />
 */
export function JobProgressCompact({ jobId, onComplete, onError }) {
  const { progress, isCompleted, isFailed, error } = useJob(jobId, {
    onComplete,
    onError,
  })

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600">
          {isCompleted ? 'Completed' : isFailed ? 'Failed' : 'Processing...'}
        </span>
        <span className="font-semibold text-purple-600">{progress}%</span>
      </div>
      <Progress value={progress} className="h-2" />
      {isFailed && error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}

/**
 * Multiple Jobs Progress (batch monitoring)
 *
 * @param {string[]} jobIds - Array of job IDs to monitor
 * @param {string} title - Overall title
 * @param {function} renderJobItem - Custom job item renderer: (job, index) => JSX.Element
 *
 * @example
 * <JobProgressBatch
 *   jobIds={[jobId1, jobId2, jobId3]}
 *   title="Batch Report Generation"
 * />
 */
export function JobProgressBatch({ jobIds, title, renderJobItem }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || 'Batch Jobs'}</CardTitle>
        <CardDescription>{jobIds.length} jobs</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {jobIds.map((jobId, index) => (
          <div key={jobId} className="border-b pb-4 last:border-0 last:pb-0">
            {renderJobItem ? (
              renderJobItem(jobId, index)
            ) : (
              <JobProgressCompact jobId={jobId} />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
