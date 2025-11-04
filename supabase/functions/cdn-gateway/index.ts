import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { base62ToUuid, isValidBase62 } from '../_shared/base62.ts'

/**
 * CDN Gateway Edge Function (Phase 2/3)
 *
 * Supports 3 URL patterns:
 * 1. /cdn-gateway/{base62_uuid}  - Phase 1: Direct Base62 UUID (no DB query)
 * 2. /cdn-gateway/i/{short_code} - Phase 3: Custom short URL (SNS sharing)
 * 3. /cdn-gateway/s/{slug}       - Phase 2: SEO-friendly URL
 *
 * Features:
 * - 302 Redirect to Supabase Storage CDN
 * - OGP meta tags for social media crawlers
 * - Multi-layer caching (browser + CDN)
 * - Access statistics tracking
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)

    // Parse URL pattern
    // Pattern 1: /cdn-gateway/{identifier}
    // Pattern 2: /cdn-gateway/i/{short_code}
    // Pattern 3: /cdn-gateway/s/{slug}
    const lastSegment = pathParts[pathParts.length - 1]
    const secondLast = pathParts.length > 1 ? pathParts[pathParts.length - 2] : null

    let identifier: string
    let identifierType: 'base62' | 'short' | 'slug'

    if (secondLast === 'i') {
      identifier = lastSegment
      identifierType = 'short'
    } else if (secondLast === 's') {
      identifier = lastSegment
      identifierType = 'slug'
    } else {
      identifier = lastSegment
      identifierType = 'base62'
    }

    if (!identifier) {
      return errorResponse('Invalid URL format', 400)
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    let fileId: string
    let ogMetadata: { title?: string; description?: string; imageAlt?: string } | null = null

    // Resolve file_id based on identifier type
    if (identifierType === 'base62') {
      // Phase 1: Base62 → UUID (no DB query)
      if (!isValidBase62(identifier)) {
        return errorResponse('Invalid Base62 identifier', 400)
      }

      try {
        fileId = base62ToUuid(identifier)
      } catch (error) {
        console.error('Base62 decode error:', error)
        return errorResponse('Failed to decode identifier', 400)
      }
    } else {
      // Phase 2/3: Query url_aliases table
      const column = identifierType === 'short' ? 'short_code' : 'slug'
      const { data: alias, error: aliasError } = await adminClient
        .from('url_aliases')
        .select(
          `
          file_id,
          og_title,
          og_description,
          og_image_alt,
          expires_at,
          is_active
        `
        )
        .eq(column, identifier)
        .eq('is_active', true)
        .single()

      if (aliasError || !alias) {
        console.error('Alias not found:', identifier, aliasError)
        return notFoundResponse()
      }

      // Check expiration
      if (alias.expires_at && new Date(alias.expires_at) < new Date()) {
        return new Response('Link expired', {
          status: 410,
          headers: corsHeaders,
        })
      }

      fileId = alias.file_id
      ogMetadata = {
        title: alias.og_title,
        description: alias.og_description,
        imageAlt: alias.og_image_alt,
      }

      // Update access statistics (non-blocking)
      adminClient
        .rpc('increment_url_alias_access', {
          p_identifier: identifier,
          p_column: column,
        })
        .then(() => {})
        .catch((err) => console.error('Failed to update stats:', err))
    }

    // Get file info
    const { data: file, error: fileError } = await adminClient
      .from('files')
      .select('bucket_name, storage_path, is_public, file_name, mime_type')
      .eq('id', fileId)
      .single()

    if (fileError || !file) {
      console.error('File not found:', fileId, fileError)
      return notFoundResponse()
    }

    // Security check: only serve public files
    if (!file.is_public) {
      console.warn(`Attempted access to private file: ${fileId}`)
      return notFoundResponse()
    }

    // Get Supabase Storage CDN URL
    const { data: publicUrlData } = adminClient.storage
      .from(file.bucket_name)
      .getPublicUrl(file.storage_path)

    const cdnUrl = publicUrlData.publicUrl

    // Detect social media crawlers
    const userAgent = req.headers.get('user-agent') || ''
    const isSocialCrawler =
      /bot|crawler|spider|facebook|twitter|linkedin|slack|whatsapp|telegram/i.test(userAgent)

    // Return OGP HTML for social media crawlers
    if (isSocialCrawler && ogMetadata && (ogMetadata.title || ogMetadata.description)) {
      const html = generateOgpHtml({
        title: ogMetadata.title || file.file_name,
        description: ogMetadata.description || '',
        imageUrl: cdnUrl,
        imageAlt: ogMetadata.imageAlt || file.file_name,
        url: req.url,
        mimeType: file.mime_type,
      })

      return new Response(html, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      })
    }

    // Regular browser: 302 Redirect
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: cdnUrl,
        'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
        Vary: 'User-Agent',
        'X-Content-Type': file.mime_type || 'application/octet-stream',
      },
    })
  } catch (error) {
    console.error('CDN Gateway error:', error)
    return errorResponse('Internal Server Error', 500)
  }
})

function notFoundResponse(): Response {
  return new Response('Not Found', {
    status: 404,
    headers: {
      ...corsHeaders,
      'Cache-Control': 'public, max-age=60',
    },
  })
}

function errorResponse(message: string, status: number): Response {
  return new Response(
    JSON.stringify({
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

function generateOgpHtml(options: {
  title: string
  description: string
  imageUrl: string
  imageAlt: string
  url: string
  mimeType?: string
}): string {
  const isVideo = options.mimeType?.startsWith('video/')
  const ogType = isVideo ? 'video.other' : 'website'
  const twitterCard = isVideo ? 'player' : 'summary_large_image'

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta property="og:title" content="${escapeHtml(options.title)}" />
  <meta property="og:description" content="${escapeHtml(options.description)}" />
  <meta property="og:image" content="${escapeHtml(options.imageUrl)}" />
  <meta property="og:image:alt" content="${escapeHtml(options.imageAlt)}" />
  <meta property="og:url" content="${escapeHtml(options.url)}" />
  <meta property="og:type" content="${ogType}" />
  <meta name="twitter:card" content="${twitterCard}" />
  <meta name="twitter:title" content="${escapeHtml(options.title)}" />
  <meta name="twitter:description" content="${escapeHtml(options.description)}" />
  <meta name="twitter:image" content="${escapeHtml(options.imageUrl)}" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(options.imageUrl)}" />
  <title>${escapeHtml(options.title)}</title>
</head>
<body>
  <h1>${escapeHtml(options.title)}</h1>
  <p>${escapeHtml(options.description)}</p>
  <a href="${escapeHtml(options.imageUrl)}">View Media</a>
</body>
</html>`
}

function escapeHtml(text: string): string {
  if (!text) return ''
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}
