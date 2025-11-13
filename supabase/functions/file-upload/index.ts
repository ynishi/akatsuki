// File Upload Edge Function
// Generic file upload to Supabase Storage + files table
// Can be used for: RAG files, images, profile pictures, attachments, etc.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createAkatsukiHandler } from '../_shared/handler.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { ErrorCodes } from '../_shared/api_types.ts'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'

// ============================================================================
// Type Definitions (Strict)
// ============================================================================

/**
 * Input Schema
 * FormData format (file upload)
 */
const InputSchema = z.object({
  file: z.instanceof(File),
  bucket: z.enum(['public_assets', 'private_uploads']).optional().default('private_uploads'),
  is_public: z.boolean().optional().default(false),
  storage_path: z.string().optional(), // Optional: custom storage path
  metadata: z.record(z.any()).optional(), // Optional: custom metadata
})

type Input = z.infer<typeof InputSchema>

/**
 * Output Schema
 * Strict type definition for response
 */
interface Output {
  file: {
    id: string // files.id (UUID) - Primary identifier
    owner_id: string // Owner user ID
    storage_path: string // Storage path in bucket
    bucket_name: string // Bucket name
    file_name: string // Original file name
    file_size: number // File size in bytes
    mime_type: string // MIME type
    is_public: boolean // Public/Private flag
    status: string // File status (uploading/active/deleting)
    metadata: Record<string, any> // Custom metadata
    created_at: string // ISO 8601 timestamp
  }
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Parse FormData
  let parsedInput: Input

  if (!req.headers.get('content-type')?.includes('multipart/form-data')) {
    return new Response(
      JSON.stringify({ error: 'Content-Type must be multipart/form-data' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const bucket = (formData.get('bucket') as string | null) || 'private_uploads'
  const isPublic = formData.get('is_public') === 'true'
  const storagePath = formData.get('storage_path') as string | null
  const metadataStr = formData.get('metadata') as string | null
  const metadata = metadataStr ? JSON.parse(metadataStr) : undefined

  if (!file) {
    return new Response(
      JSON.stringify({ error: 'File is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  parsedInput = {
    file,
    bucket: bucket as 'public_assets' | 'private_uploads',
    is_public: isPublic,
    storage_path: storagePath || undefined,
    metadata,
  }

  return createAkatsukiHandler<Input, Output>(req, {
    inputSchema: InputSchema,
    requireAuth: true,
    input: parsedInput,

    logic: async ({ input, userClient, adminClient, repos }) => {
      // 1. Authentication check
      const { data: { user }, error: userError } = await userClient.auth.getUser()
      if (userError || !user) {
        throw Object.assign(
          new Error(`Unauthorized: ${userError?.message || 'Invalid token'}`),
          { code: ErrorCodes.UNAUTHORIZED, status: 401 }
        )
      }

      // 2. Validate bucket access
      const validBuckets = ['public_assets', 'private_uploads'] as const
      if (!validBuckets.includes(input.bucket)) {
        throw Object.assign(
          new Error(`Invalid bucket: ${input.bucket}`),
          { code: ErrorCodes.VALIDATION_FAILED, status: 400 }
        )
      }

      // 3. Upload to Supabase Storage + Create files table record
      console.log('[file-upload] Uploading file:', {
        fileName: input.file.name,
        fileSize: input.file.size,
        mimeType: input.file.type,
        bucket: input.bucket,
        isPublic: input.is_public,
      })

      let fileRecord
      try {
        fileRecord = await repos.file.uploadToStorage({
          file: input.file,
          bucket: input.bucket,
          ownerId: user.id,
          storagePath: input.storage_path,
          isPublic: input.is_public,
          metadata: input.metadata || {},
        })
      } catch (error: any) {
        console.error('[file-upload] Upload failed:', error)
        throw Object.assign(
          new Error(`File upload failed: ${error.message}`),
          { code: ErrorCodes.INTERNAL_ERROR, status: 500 }
        )
      }

      console.log('[file-upload] Upload successful:', {
        fileId: fileRecord.id,
        storagePath: fileRecord.storage_path,
      })

      // 4. Return strict typed response
      return {
        file: {
          id: fileRecord.id,
          owner_id: fileRecord.owner_id,
          storage_path: fileRecord.storage_path,
          bucket_name: fileRecord.bucket_name,
          file_name: fileRecord.file_name,
          file_size: fileRecord.file_size,
          mime_type: fileRecord.mime_type,
          is_public: fileRecord.is_public,
          status: fileRecord.status,
          metadata: fileRecord.metadata || {},
          created_at: fileRecord.created_at,
        },
      }
    },
  })
})
