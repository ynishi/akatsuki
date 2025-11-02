/**
 * Handle Image Generated Event
 *
 * Called when 'image.generated' event is processed
 * Example tasks:
 * - Generate thumbnails
 * - Extract metadata
 * - Send notifications
 * - Update analytics
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface ImageGeneratedPayload {
  imageId: string
  imageUrl: string
  userId: string
  workflowId?: string
  modelName?: string
}

Deno.serve(async (req) => {
  try {
    const { event_id, payload } = await req.json() as {
      event_id: string
      event_type: string
      payload: ImageGeneratedPayload
      user_id: string | null
    }

    console.log(`Processing image.generated event ${event_id}:`, payload)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Example: Increment model usage count
    if (payload.modelName) {
      await supabase.rpc('increment_model_usage', {
        model_filename: payload.modelName
      })
      console.log(`Incremented usage for model: ${payload.modelName}`)
    }

    // Example: Update analytics (if you have analytics table)
    // await supabase.from('analytics').insert({
    //   event_type: 'image_generated',
    //   user_id: payload.userId,
    //   metadata: {
    //     image_id: payload.imageId,
    //     workflow_id: payload.workflowId
    //   }
    // })

    // Example: Send notification (if user has enabled notifications)
    // This could emit another event or call a notification service
    // await supabase.from('system_events').insert({
    //   event_type: 'notification.send',
    //   payload: {
    //     userId: payload.userId,
    //     title: 'Image Generated',
    //     message: `Your image has been generated successfully!`,
    //     imageUrl: payload.imageUrl
    //   }
    // })

    console.log(`Successfully processed image.generated event ${event_id}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Image processed successfully'
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Handle image generated error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})
