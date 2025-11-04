import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * Create URL Alias Edge Function
 *
 * Creates custom URL aliases (short codes, slugs) for uploaded files
 *
 * Request body:
 * {
 *   fileId: string,
 *   shortCode?: string,
 *   slug?: string,
 *   ogTitle?: string,
 *   ogDescription?: string,
 *   ogImageAlt?: string,
 *   expiresAt?: string (ISO date),
 * }
 *
 * Returns:
 * {
 *   id: string,
 *   shortCode?: string,
 *   slug?: string,
 *   cdnUrls: {
 *     base62: string,
 *     short?: string,
 *     seo?: string,
 *   }
 * }
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return errorResponse('Missing Authorization header', 401)
    }

    const jwt = authHeader.replace('Bearer ', '')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(jwt)

    if (userError || !user) {
      return errorResponse(`Unauthorized: ${userError?.message}`, 401)
    }

    // Parse request body
    const body = await req.json()
    const {
      fileId,
      shortCode,
      slug,
      ogTitle,
      ogDescription,
      ogImageAlt,
      expiresAt,
    } = body

    if (!fileId) {
      return errorResponse('fileId is required', 400)
    }

    if (!shortCode && !slug) {
      return errorResponse('Either shortCode or slug must be provided', 400)
    }

    // Verify file exists and user owns it
    const { data: file, error: fileError } = await supabaseAdmin
      .from('files')
      .select('id, owner_id, is_public')
      .eq('id', fileId)
      .single()

    if (fileError || !file) {
      return errorResponse('File not found', 404)
    }

    if (file.owner_id !== user.id) {
      return errorResponse('You do not own this file', 403)
    }

    if (!file.is_public) {
      return errorResponse('File must be public to create URL aliases', 400)
    }

    // Create URL alias
    const { data: alias, error: aliasError } = await supabaseAdmin
      .from('url_aliases')
      .insert({
        file_id: fileId,
        short_code: shortCode || null,
        slug: slug || null,
        og_title: ogTitle || null,
        og_description: ogDescription || null,
        og_image_alt: ogImageAlt || null,
        expires_at: expiresAt || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (aliasError) {
      if (aliasError.code === '23505') {
        // Unique constraint violation
        return errorResponse('Short code or slug already exists', 409)
      }
      throw aliasError
    }

    // Generate CDN URLs
    const cdnBaseUrl = Deno.env.get('CDN_BASE_URL') || '/cdn-gateway'
    const cdnUrls: Record<string, string> = {}

    if (alias.short_code) {
      cdnUrls.short = `${cdnBaseUrl}/i/${alias.short_code}`
    }

    if (alias.slug) {
      cdnUrls.seo = `${cdnBaseUrl}/s/${alias.slug}`
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: alias.id,
        shortCode: alias.short_code,
        slug: alias.slug,
        cdnUrls,
      }),
      {
        status: 201,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    console.error('Create URL alias error:', error)
    return errorResponse('Internal Server Error', 500)
  }
})

function errorResponse(message: string, status: number): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  )
}
