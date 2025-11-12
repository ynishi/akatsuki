// Knowledge File Upload Edge Function
// File Search (RAG) 用のファイルアップロード + Corpus管理

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createAkatsukiHandler } from '../_shared/handler.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { ErrorCodes } from '../_shared/api_types.ts'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'
import { GoogleGenAI } from 'npm:@google/genai@1.29.0'

// IN型定義
const InputSchema = z.discriminatedUnion('mode', [
  // Mode 1: Store作成のみ
  z.object({
    mode: z.literal('create_store'),
    display_name: z.string().min(1),
    provider: z.enum(['gemini']).optional().default('gemini'),
  }),
  // Mode 2: ファイルアップロード（Store自動作成 or 既存Store使用）
  z.object({
    mode: z.literal('upload_file'),
    file: z.instanceof(File),
    store_id: z.string().uuid().optional(), // 省略時は新規作成
    display_name: z.string().optional(), // Store名（新規作成時）
    provider: z.enum(['gemini']).optional().default('gemini'),
  }),
])

type Input = z.infer<typeof InputSchema>

// OUT型定義
interface Output {
  store: {
    id: string
    name: string // Corpus name (e.g., "corpora/xxx")
    display_name: string | null
  }
  file?: {
    id: string // knowledge_files.id
    file_id: string // files.id
    gemini_file_name: string // Document name (e.g., "corpora/xxx/documents/xxx")
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
        provider: provider as 'gemini',
      }
    } else if (display_name) {
      parsedInput = {
        mode: 'create_store' as const,
        display_name,
        provider: provider as 'gemini',
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

      const provider = input.provider;

      // https://www.npmjs.com/package/@google/genai#quickstart
      const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
      if (!GEMINI_API_KEY) {
        throw Object.assign(
          new Error(`InternalServerError: internal server error`),
          { code: ErrorCodes.INTERNAL_ERROR, status: 500 }
        )
      }

      const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});

      // === Mode 1: Store作成のみ ===
      if (input.mode === 'create_store') {
        // Gemini File Search Store 作成
        const fileSearchStore = await ai.fileSearchStores.create({
          config: { displayName: input.display_name }
        })

        // DB に Store を保存（Repository使用）
        let storeRecord
        try {
          storeRecord = await repos.fileSearchStore.create({
            user_id: user.id,
            name: fileSearchStore.name, // "corpora/xxx"
            display_name: input.display_name,
            provider: provider,
          })
        } catch (error: any) {
          // DB保存失敗時は Gemini Store を削除（ロールバック）
          try {
            await ai.fileSearchStores.delete({ name: fileSearchStore.name })
          } catch (e) {
            console.error('Failed to rollback Gemini File Search Store:', e)
          }
          throw Object.assign(
            new Error(`Failed to save store: ${error.message}`),
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
      } else {
        // 新規Store作成
        const displayName = input.display_name || 'My Knowledge Base'
        const fileSearchStore = await ai.fileSearchStores.create({
          config: { displayName }
        })

        try {
          storeRecord = await repos.fileSearchStore.create({
            user_id: user.id,
            name: fileSearchStore.name,
            display_name: displayName,
            provider: provider,
          })
        } catch (error: any) {
          try {
            await ai.fileSearchStores.delete({ name: fileSearchStore.name })
          } catch (e) {
            console.error('Failed to rollback Gemini File Search Store:', e)
          }
          throw Object.assign(
            new Error(`Failed to save store: ${error.message}`),
            { code: ErrorCodes.INTERNAL_ERROR, status: 500 }
          )
        }
      }

      // 2-2. Private Storageにファイルアップロード
      const timestamp = Date.now()
      const sanitizedFilename = input.file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const storagePath = `${user.id}/knowledge-base/${storeRecord.id}/${timestamp}-${sanitizedFilename}`

      const { data: uploadData, error: uploadError } = await adminClient.storage
        .from('private_uploads')
        .upload(storagePath, input.file, {
          contentType: input.file.type,
          upsert: false,
        })

      if (uploadError) {
        throw Object.assign(
          new Error(`Storage upload failed: ${uploadError.message}`),
          { code: ErrorCodes.INTERNAL_ERROR, status: 500 }
        )
      }

      // 2-3. filesテーブルに記録
      const { data: fileRecord, error: fileError } = await adminClient
        .from('files')
        .insert({
          owner_id: user.id,
          storage_path: uploadData.path,
          bucket_name: 'private_uploads',
          file_name: input.file.name,
          file_size: input.file.size,
          mime_type: input.file.type,
          is_public: false,
          status: 'active',
        })
        .select()
        .single()

      if (fileError) {
        // Storage削除（ロールバック）
        try {
          await adminClient.storage.from('private_uploads').remove([storagePath])
        } catch (e) {
          console.error('Failed to rollback storage:', e)
        }
        throw Object.assign(
          new Error(`Failed to save file metadata: ${fileError.message}`),
          { code: ErrorCodes.INTERNAL_ERROR, status: 500 }
        )
      }

      // 2-4. Gemini File Search APIにアップロード
      // ファイルをGemini File Search Storeにアップロード
      console.log('[knowledge-file-upload] Uploading to Gemini:', {
        storeName: storeRecord.name,
        fileName: input.file.name,
      })

      const operation = await ai.fileSearchStores.uploadToFileSearchStore({
        file: input.file,
        fileSearchStoreName: storeRecord.name,
        config: { displayName: input.file.name }
      })

      // アップロード完了を待機
      const uploadResult = await operation.response

      console.log('[knowledge-file-upload] Gemini file uploaded:', uploadResult)

      // Gemini file name を取得（uploadResult.name または uploadResult.file?.name など）
      const geminiFileName = uploadResult?.name || uploadResult?.file?.name || `${storeRecord.name}/files/${fileRecord.id}`

      // 2-5. knowledge_filesテーブルに記録（Repository使用）
      let knowledgeFileRecord
      try {
        knowledgeFileRecord = await repos.knowledgeFile.create({
          store_id: storeRecord.id,
          file_id: fileRecord.id,
          gemini_file_name: geminiFileName,
          user_id: user.id,
        })
      } catch (error: any) {
        // Gemini Document削除（ロールバック）
        // Note: Gemini API v1beta には document 個別削除APIがないため、
        // Corpus全体を削除するか、そのままにするかの判断が必要
        console.error('Failed to save knowledge file (Gemini document may remain):', error)
        throw Object.assign(
          new Error(`Failed to save knowledge file: ${error.message}`),
          { code: ErrorCodes.INTERNAL_ERROR, status: 500 }
        )
      }

      return {
        store: {
          id: storeRecord.id,
          name: storeRecord.name,
          display_name: storeRecord.display_name,
        },
        file: {
          id: knowledgeFileRecord.id,
          file_id: fileRecord.id,
          gemini_file_name: geminiFileName,
        },
      }
    },
  })
})
