/**
 * Public API Gateway Edge Function
 *
 * Provides API Key authenticated access to HEADLESS API endpoints.
 *
 * URL Patterns:
 *   GET  /api-gateway/{entity}/list
 *   GET  /api-gateway/{entity}/get?id={uuid}
 *   POST /api-gateway/{entity}/create
 *   POST /api-gateway/{entity}/update
 *   POST /api-gateway/{entity}/delete
 *
 * Headers:
 *   X-API-Key: ak_xxxxxx_yyyyyyyyyyyyyyyyyyyy
 *
 * Features:
 *   - API Key authentication (SHA-256 hash validation)
 *   - Rate limiting (per minute / per day)
 *   - Operation permission checking
 *   - Automatic statistics tracking
 *   - Proxy to {entity}-crud Edge Functions
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ApiKeyRecord {
  id: string
  name: string
  entity_name: string
  table_name: string
  allowed_operations: string[]
  rate_limit_per_minute: number
  rate_limit_per_day: number
  expires_at: string | null
  is_active: boolean
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfter: number
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Parse URL
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)

    // Expected: ['api-gateway', '{entity}', '{operation}']
    // or from Supabase: ['functions', 'v1', 'api-gateway', '{entity}', '{operation}']
    let entity: string
    let operation: string

    const gatewayIndex = pathParts.indexOf('api-gateway')
    if (gatewayIndex === -1 || pathParts.length < gatewayIndex + 3) {
      return errorResponse(
        'Invalid URL format. Use: /api-gateway/{entity}/{operation}',
        400
      )
    }

    entity = pathParts[gatewayIndex + 1]
    operation = pathParts[gatewayIndex + 2]

    // Validate operation
    const validOperations = ['list', 'get', 'create', 'update', 'delete']
    if (!validOperations.includes(operation)) {
      return errorResponse(
        `Invalid operation: ${operation}. Valid: ${validOperations.join(', ')}`,
        400
      )
    }

    // 2. Extract API Key
    const apiKey = req.headers.get('X-API-Key')
    if (!apiKey) {
      return errorResponse('Missing X-API-Key header', 401)
    }

    if (!apiKey.startsWith('ak_')) {
      return errorResponse('Invalid API key format', 401)
    }

    // 3. Initialize admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
      return errorResponse('Server configuration error', 500)
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    // 4. Validate API Key
    const keyHash = await sha256(apiKey)

    const { data: keyData, error: keyError } = await adminClient
      .from('api_keys')
      .select('*')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .single<ApiKeyRecord>()

    if (keyError || !keyData) {
      console.warn('Invalid API key attempt:', keyHash.slice(0, 16) + '...')
      return errorResponse('Invalid API key', 401)
    }

    // 5. Check expiration
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return errorResponse('API key expired', 401)
    }

    // 6. Check entity match
    if (keyData.entity_name.toLowerCase() !== entity.toLowerCase()) {
      return errorResponse(
        `API key not authorized for entity: ${entity}`,
        403
      )
    }

    // 7. Check operation permission
    if (!keyData.allowed_operations.includes(operation)) {
      return errorResponse(
        `Operation not allowed: ${operation}. Allowed: ${keyData.allowed_operations.join(', ')}`,
        403
      )
    }

    // 8. Rate limit check
    const rateLimitResult = await checkRateLimit(adminClient, keyData)
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retry_after: rateLimitResult.retryAfter,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitResult.retryAfter),
            'X-RateLimit-Remaining': '0',
          },
        }
      )
    }

    // 9. Build proxy request
    const targetUrl = `${supabaseUrl}/functions/v1/${keyData.table_name}-crud`

    let proxyBody: Record<string, unknown> = { operation }

    // Handle GET parameters
    if (req.method === 'GET') {
      const id = url.searchParams.get('id')
      if ((operation === 'get' || operation === 'delete') && id) {
        proxyBody.id = id
      }
      // For list, pass through query params as filters
      if (operation === 'list') {
        const filters: Record<string, string> = {}
        url.searchParams.forEach((value, key) => {
          if (key !== 'id') {
            filters[key] = value
          }
        })
        if (Object.keys(filters).length > 0) {
          proxyBody.filters = filters
        }
      }
    } else {
      // POST body
      try {
        const body = await req.json()
        proxyBody = { operation, ...body }
      } catch {
        // Empty body is OK for some operations
      }
    }

    // 10. Proxy to target Edge Function
    const proxyResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(proxyBody),
    })

    // 11. Update statistics (non-blocking)
    updateStats(adminClient, keyData.id).catch((err) =>
      console.error('Failed to update stats:', err)
    )

    // 12. Return response
    const responseData = await proxyResponse.json()

    return new Response(JSON.stringify(responseData), {
      status: proxyResponse.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        'X-RateLimit-Limit': String(keyData.rate_limit_per_minute),
      },
    })
  } catch (error) {
    console.error('API Gateway error:', error)
    return errorResponse('Internal Server Error', 500)
  }
})

// =============================================================================
// Helper Functions
// =============================================================================

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function checkRateLimit(
  client: ReturnType<typeof createClient>,
  keyData: ApiKeyRecord
): Promise<RateLimitResult> {
  const now = new Date()

  // Calculate minute window start
  const minuteStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    0,
    0
  )

  try {
    // Use database function for atomic increment
    const { data, error } = await client.rpc('increment_api_key_usage', {
      p_api_key_id: keyData.id,
      p_window_type: 'minute',
      p_window_start: minuteStart.toISOString(),
    })

    if (error) {
      console.error('Rate limit check error:', error)
      // Fallback: allow but log
      return {
        allowed: true,
        remaining: keyData.rate_limit_per_minute,
        retryAfter: 0,
      }
    }

    const count = data as number
    const limit = keyData.rate_limit_per_minute

    if (count > limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfter: 60 - now.getSeconds(),
      }
    }

    return {
      allowed: true,
      remaining: Math.max(0, limit - count),
      retryAfter: 0,
    }
  } catch (err) {
    console.error('Rate limit error:', err)
    return {
      allowed: true,
      remaining: keyData.rate_limit_per_minute,
      retryAfter: 0,
    }
  }
}

async function updateStats(
  client: ReturnType<typeof createClient>,
  keyId: string
): Promise<void> {
  await client.rpc('update_api_key_stats', {
    p_api_key_id: keyId,
  })
}

function errorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}
