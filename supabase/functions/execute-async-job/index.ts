/**
 * Execute Async Job
 *
 * Creates a job record in system_events and returns immediately.
 * The actual processing is done by CRON (process-events).
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { type, params, priority = 0, scheduledAt } = await req.json()
  const authHeader = req.headers.get('Authorization')!

  // User authentication
  const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Create job record (CRON will process it)
  const jobType = `job:${type}`
  const { data: job, error } = await supabase
    .from('system_events')
    .insert({
      event_type: jobType,
      status: 'pending',
      user_id: user.id,
      payload: params,
      progress: 0,
      priority,
      scheduled_at: scheduledAt || new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create job:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  console.log(`✓ Job ${job.id} queued (type: ${jobType})`)

  // Return job ID immediately
  // CRON will start processing within 1 minute
  return new Response(
    JSON.stringify({
      job_id: job.id,
      message: 'Job queued. Processing will start within 1 minute.'
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  )
})
