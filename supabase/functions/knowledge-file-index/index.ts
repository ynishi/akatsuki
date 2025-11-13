// Knowledge File Index Edge Function
// RAG Indexing: Upload file to RAG provider (Gemini, OpenAI, Pinecone, etc.)
// and create knowledge_files table record

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createAkatsukiHandler } from '../_shared/handler.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { ErrorCodes } from '../_shared/api_types.ts'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'
import { createRAGProvider, type RAGProviderType } from '../_shared/providers/rag-provider-factory.ts'

// ============================================================================
// Type Definitions (Strict)
// ============================================================================

/**
 * Input Schema - Mode 1: Create Store
 */
const CreateStoreInputSchema = z.object({
  mode: z.literal('create_store'),
  display_name: z.string().min(1),
  provider: z.enum(['gemini', 'openai', 'pinecone', 'anythingllm', 'weaviate']).optional().default('gemini'),
})

/**
 * Input Schema - Mode 2: Index File
 */
const IndexFileInputSchema = z.object({
  mode: z.literal('index_file'),
  file_id: z.string().uuid(), // files.id (UUID) - REQUIRED
  store_id: z.string().uuid().optional(), // Optional: use existing store or create new one
  display_name: z.string().optional(), // Store display name (if creating new store)
  provider: z.enum(['gemini', 'openai', 'pinecone', 'anythingllm', 'weaviate']).optional().default('gemini'),
})

/**
 * Union Input Schema
 */
const InputSchema = z.discriminatedUnion('mode', [
  CreateStoreInputSchema,
  IndexFileInputSchema,
])

type Input = z.infer<typeof InputSchema>

/**
 * Output Schema - Store Creation
 */
interface CreateStoreOutput {
  store: {
    id: string // file_search_stores.id (UUID)
    name: string // Provider-specific store identifier
    display_name: string | null
    provider: string
    created_at: string
  }
}

/**
 * Output Schema - File Indexing
 */
interface IndexFileOutput {
  knowledge_file: {
    id: string // knowledge_files.id (UUID)
    file_id: string // files.id (UUID)
    store_id: string // file_search_stores.id (UUID)
    provider_file_name: string // Provider-specific file identifier
    indexing_status: 'pending' | 'processing' | 'completed' | 'failed'
    created_at: string
  }
  store: {
    id: string
    name: string
    display_name: string | null
    provider: string
  }
}

type Output = CreateStoreOutput | IndexFileOutput

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Parse JSON input
  const body = await req.json()
  const parsedInput: Input = body

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

      const provider = input.provider

      // 2. Create RAG Provider instance
      let ragClient
      try {
        ragClient = createRAGProvider(provider)
      } catch (error: any) {
        throw Object.assign(
          new Error(`Failed to initialize provider '${provider}': ${error.message}`),
          { code: ErrorCodes.INTERNAL_ERROR, status: 500 }
        )
      }

      // ========================================================================
      // Mode 1: Create Store Only
      // ========================================================================
      if (input.mode === 'create_store') {
        console.log('[knowledge-file-index] Creating store:', {
          displayName: input.display_name,
          provider: provider,
        })

        let providerStore
        try {
          providerStore = await ragClient.createStore(input.display_name)
        } catch (error: any) {
          throw Object.assign(
            new Error(`Failed to create store with provider '${provider}': ${error.message}`),
            { code: ErrorCodes.INTERNAL_ERROR, status: 500 }
          )
        }

        // Save to DB
        let storeRecord
        try {
          storeRecord = await repos.fileSearchStore.create({
            user_id: user.id,
            name: providerStore.name,
            display_name: input.display_name,
            provider: provider,
          })
        } catch (error: any) {
          // Rollback: Delete provider store
          try {
            await ragClient.deleteStore(providerStore.name)
          } catch (e) {
            console.error('[knowledge-file-index] Failed to rollback provider store:', e)
          }
          throw Object.assign(
            new Error(`Failed to save store to database: ${error.message}`),
            { code: ErrorCodes.INTERNAL_ERROR, status: 500 }
          )
        }

        console.log('[knowledge-file-index] Store created:', {
          storeId: storeRecord.id,
          providerName: storeRecord.name,
        })

        return {
          store: {
            id: storeRecord.id,
            name: storeRecord.name,
            display_name: storeRecord.display_name,
            provider: storeRecord.provider,
            created_at: storeRecord.created_at,
          },
        }
      }

      // ========================================================================
      // Mode 2: Index File
      // ========================================================================

      // 2-1. Get file record (verify ownership via RLS)
      const fileRecord = await repos.file.findById(input.file_id)
      if (!fileRecord) {
        throw Object.assign(
          new Error(`File not found: ${input.file_id}`),
          { code: ErrorCodes.NOT_FOUND, status: 404 }
        )
      }

      // Verify ownership
      if (fileRecord.owner_id !== user.id) {
        throw Object.assign(
          new Error('Access denied: You do not own this file'),
          { code: ErrorCodes.FORBIDDEN, status: 403 }
        )
      }

      console.log('[knowledge-file-index] Indexing file:', {
        fileId: input.file_id,
        fileName: fileRecord.file_name,
        provider: provider,
      })

      // 2-2. Get or create store
      let storeRecord: any

      if (input.store_id) {
        // Use existing store
        const hasOwnership = await repos.fileSearchStore.checkOwnership(input.store_id, user.id)
        if (!hasOwnership) {
          throw Object.assign(
            new Error('Store not found or access denied'),
            { code: ErrorCodes.NOT_FOUND, status: 404 }
          )
        }

        storeRecord = await repos.fileSearchStore.findById(input.store_id)
        if (!storeRecord) {
          throw Object.assign(
            new Error('Store not found'),
            { code: ErrorCodes.NOT_FOUND, status: 404 }
          )
        }

        // Provider consistency check
        if (storeRecord.provider !== provider) {
          throw Object.assign(
            new Error(`Store provider mismatch: store uses '${storeRecord.provider}', but request specifies '${provider}'`),
            { code: ErrorCodes.VALIDATION_FAILED, status: 400 }
          )
        }
      } else {
        // Create new store
        const displayName = input.display_name || 'My Knowledge Base'

        let providerStore
        try {
          providerStore = await ragClient.createStore(displayName)
        } catch (error: any) {
          throw Object.assign(
            new Error(`Failed to create store with provider '${provider}': ${error.message}`),
            { code: ErrorCodes.INTERNAL_ERROR, status: 500 }
          )
        }

        try {
          storeRecord = await repos.fileSearchStore.create({
            user_id: user.id,
            name: providerStore.name,
            display_name: displayName,
            provider: provider,
          })
        } catch (error: any) {
          try {
            await ragClient.deleteStore(providerStore.name)
          } catch (e) {
            console.error('[knowledge-file-index] Failed to rollback provider store:', e)
          }
          throw Object.assign(
            new Error(`Failed to save store to database: ${error.message}`),
            { code: ErrorCodes.INTERNAL_ERROR, status: 500 }
          )
        }
      }

      // 2-3. Download file from Supabase Storage
      const signedUrl = await repos.file.getSignedUrl(input.file_id, 3600)

      // Fetch file content
      const fileResponse = await fetch(signedUrl)
      if (!fileResponse.ok) {
        throw Object.assign(
          new Error(`Failed to download file from storage: ${fileResponse.statusText}`),
          { code: ErrorCodes.INTERNAL_ERROR, status: 500 }
        )
      }

      const fileBlob = await fileResponse.blob()
      const file = new File([fileBlob], fileRecord.file_name, {
        type: fileRecord.mime_type,
      })

      // 2-4. Upload to Provider (create temp file for providers that need file paths)
      const tempFilePath = `/tmp/${Date.now()}-${fileRecord.file_name}`
      const fileBuffer = await file.arrayBuffer()
      await Deno.writeFile(tempFilePath, new Uint8Array(fileBuffer))

      let uploadResult
      try {
        uploadResult = await ragClient.uploadFile({
          storeName: storeRecord.name,
          file: file,
          tempFilePath: tempFilePath,
          displayName: fileRecord.file_name,
          mimeType: fileRecord.mime_type,
        })

        console.log('[knowledge-file-index] Provider upload successful:', uploadResult)
      } catch (error: any) {
        throw Object.assign(
          new Error(`Failed to upload file to provider '${provider}': ${error.message}`),
          { code: ErrorCodes.INTERNAL_ERROR, status: 500 }
        )
      } finally {
        // Cleanup temp file
        await Deno.remove(tempFilePath).catch((e: any) =>
          console.error('[knowledge-file-index] Failed to remove temp file:', e)
        )
      }

      // 2-5. Create knowledge_files record
      let knowledgeFile
      try {
        knowledgeFile = await repos.knowledgeFile.create({
          file_id: input.file_id,
          store_id: storeRecord.id,
          provider_file_name: uploadResult.fileName,
          indexing_status: 'completed',
        })
      } catch (error: any) {
        console.error('[knowledge-file-index] Failed to create knowledge_file record:', error)
        throw Object.assign(
          new Error(`Failed to save knowledge file to database: ${error.message}`),
          { code: ErrorCodes.INTERNAL_ERROR, status: 500 }
        )
      }

      console.log('[knowledge-file-index] Indexing completed:', {
        knowledgeFileId: knowledgeFile.id,
        fileId: input.file_id,
        storeId: storeRecord.id,
      })

      return {
        knowledge_file: {
          id: knowledgeFile.id,
          file_id: knowledgeFile.file_id,
          store_id: knowledgeFile.store_id,
          provider_file_name: knowledgeFile.provider_file_name,
          indexing_status: knowledgeFile.indexing_status,
          created_at: knowledgeFile.created_at,
        },
        store: {
          id: storeRecord.id,
          name: storeRecord.name,
          display_name: storeRecord.display_name,
          provider: storeRecord.provider,
        },
      }
    },
  })
})
