// Knowledge File Upload Edge Function
// File Search (RAG) 用のファイルアップロード + Store管理
// Provider抽象化パターン採用

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createAkatsukiHandler } from '../_shared/handler.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { ErrorCodes } from '../_shared/api_types.ts'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'
import { createRAGProvider, type RAGProviderType } from '../_shared/providers/rag-provider-factory.ts'

// IN型定義
const InputSchema = z.discriminatedUnion('mode', [
  // Mode 1: Store作成のみ
  z.object({
    mode: z.literal('create_store'),
    display_name: z.string().min(1),
    provider: z.enum(['gemini', 'openai', 'pinecone', 'anythingllm', 'weaviate']).optional().default('gemini'),
  }),
  // Mode 2: ファイルアップロード（Store自動作成 or 既存Store使用）
  z.object({
    mode: z.literal('upload_file'),
    file: z.instanceof(File),
    store_id: z.string().uuid().optional(), // 省略時は新規作成
    display_name: z.string().optional(), // Store名（新規作成時）
    provider: z.enum(['gemini', 'openai', 'pinecone', 'anythingllm', 'weaviate']).optional().default('gemini'),
  }),
])

type Input = z.infer<typeof InputSchema>

// OUT型定義
interface Output {
  store: {
    id: string
    name: string // Provider-specific store identifier
    display_name: string | null
  }
  file?: {
    id: string // knowledge_files.id (if file was uploaded)
    file_id: string // files.id
    provider_file_name: string // Provider-specific file identifier
  }
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // FormData の場合は手動でパース
  let parsedInput: Input

  if (req.headers.get('content-type')?.includes('multipart/form-data')) {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const store_id = formData.get('store_id') as string | null
    const display_name = formData.get('display_name') as string | null
    const provider = (formData.get('provider') as string | null) || 'gemini'

    if (file) {
      parsedInput = {
        mode: 'upload_file' as const,
        file,
        store_id: store_id || undefined,
        display_name: display_name || undefined,
        provider: provider as RAGProviderType,
      }
    } else if (display_name) {
      parsedInput = {
        mode: 'create_store' as const,
        display_name,
        provider: provider as RAGProviderType,
      }
    } else {
      throw new Error('Either file or display_name must be provided')
    }
  } else {
    const body = await req.json()
    parsedInput = body.display_name && !body.file
      ? { mode: 'create_store' as const, ...body }
      : { mode: 'upload_file' as const, ...body }
  }

  return createAkatsukiHandler<Input, Output>(req, {
    inputSchema: InputSchema,
    requireAuth: true,
    // FormDataの場合は既にパース済み
    input: parsedInput,

    logic: async ({ input, userClient, adminClient, repos }) => {
      // 1. 認証チェック
      const { data: { user }, error: userError } = await userClient.auth.getUser()
      if (userError || !user) {
        throw Object.assign(
          new Error(`Unauthorized: ${userError?.message || 'Invalid token'}`),
          { code: ErrorCodes.UNAUTHORIZED, status: 401 }
        )
      }

      // 2. RAG Provider インスタンス作成
      const provider = input.provider
      let ragClient

      try {
        ragClient = createRAGProvider(provider)
      } catch (error: any) {
        throw Object.assign(
          new Error(`Failed to initialize provider '${provider}': ${error.message}`),
          { code: ErrorCodes.INTERNAL_ERROR, status: 500 }
        )
      }

      // === Mode 1: Store作成のみ ===
      if (input.mode === 'create_store') {
        let providerStore
        try {
          // Provider Client経由でStore作成
          providerStore = await ragClient.createStore(input.display_name)
        } catch (error: any) {
          throw Object.assign(
            new Error(`Failed to create store with provider '${provider}': ${error.message}`),
            { code: ErrorCodes.INTERNAL_ERROR, status: 500 }
          )
        }

        // DB に Store を保存（Repository使用）
        let storeRecord
        try {
          storeRecord = await repos.fileSearchStore.create({
            user_id: user.id,
            name: providerStore.name, // Provider-specific identifier
            display_name: input.display_name,
            provider: provider,
          })
        } catch (error: any) {
          // DB保存失敗時は Provider Store を削除（ロールバック）
          try {
            await ragClient.deleteStore(providerStore.name)
          } catch (e) {
            console.error(`[knowledge-file-upload] Failed to rollback provider store:`, e)
          }
          throw Object.assign(
            new Error(`Failed to save store to database: ${error.message}`),
            { code: ErrorCodes.INTERNAL_ERROR, status: 500 }
          )
        }

        return {
          store: {
            id: storeRecord.id,
            name: storeRecord.name,
            display_name: storeRecord.display_name,
          },
        }
      }

      // === Mode 2: ファイルアップロード ===
      let storeRecord: any

      // 2-1. Store取得 or 作成
      if (input.store_id) {
        // 既存Store使用（Repository使用 + 権限チェック）
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
            { code: ErrorCodes.BAD_REQUEST, status: 400 }
          )
        }
      } else {
        // 新規Store作成
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
            console.error(`[knowledge-file-upload] Failed to rollback provider store:`, e)
          }
          throw Object.assign(
            new Error(`Failed to save store to database: ${error.message}`),
            { code: ErrorCodes.INTERNAL_ERROR, status: 500 }
          )
        }
      }

      // 2-2. ファイルアップロード（一時ファイル経由）
      console.log('[knowledge-file-upload] Uploading file:', {
        fileName: input.file.name,
        fileSize: input.file.size,
        fileType: input.file.type,
        provider: provider,
      })

      // 一時ファイルに書き出し
      const tempFilePath = `/tmp/${Date.now()}-${input.file.name}`
      const fileBuffer = await input.file.arrayBuffer()
      await Deno.writeFile(tempFilePath, new Uint8Array(fileBuffer))

      try {
        // Provider Client経由でアップロード
        const uploadResult = await ragClient.uploadFile({
          storeName: storeRecord.name,
          file: input.file,
          tempFilePath: tempFilePath,
          displayName: input.file.name,
          mimeType: input.file.type,
        })

        console.log('[knowledge-file-upload] Upload successful:', uploadResult)

        // 一時ファイル削除
        await Deno.remove(tempFilePath).catch((e: any) =>
          console.error('[knowledge-file-upload] Failed to remove temp file:', e)
        )

        // TODO: Save file metadata to knowledge_files table if needed
        // For now, we return the provider file name directly

        return {
          store: {
            id: storeRecord.id,
            name: storeRecord.name,
            display_name: storeRecord.display_name,
          },
          file: {
            id: 'not-implemented', // TODO: Save to knowledge_files table
            file_id: 'not-implemented', // TODO: Save to files table
            provider_file_name: uploadResult.fileName,
          },
        }
      } catch (error: any) {
        // エラー時も一時ファイル削除
        await Deno.remove(tempFilePath).catch((e: any) =>
          console.error('[knowledge-file-upload] Failed to remove temp file:', e)
        )

        throw Object.assign(
          new Error(`Failed to upload file with provider '${provider}': ${error.message}`),
          { code: ErrorCodes.INTERNAL_ERROR, status: 500 }
        )
      }
    },
  })
})
