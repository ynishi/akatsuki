import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Authentication check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt)
    if (userError) {
      throw new Error(`Unauthorized: ${userError.message}`)
    }

    const { filePath, bucket = 'private_uploads', expiresIn = 3600 } = await req.json()
    if (!filePath) {
      throw new Error('filePath is required')
    }

    // Generate a signed URL for uploading a file to a private bucket
    // This allows the client to upload directly to storage without going through the server
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUploadUrl(filePath, {
        upsert: false,
      })

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`)
    }

    // Also create a signed URL for downloading (valid for specified time)
    const { data: downloadData, error: downloadError } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn)

    return new Response(JSON.stringify({
      success: true,
      upload: {
        signed_url: data.signedUrl,
        token: data.token,
        path: data.path,
      },
      download: downloadData ? {
        signed_url: downloadData.signedUrl,
      } : null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Create signed URL error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
