// Knowledge File Upload Edge Function
// File Search (RAG) 用のファイルアップロード + Corpus管理

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createAkatsukiHandler } from '../_shared/handler.ts'
import { ErrorCodes } from '../_shared/api_types.ts'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.21.0'

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

Deno.serve(async (req) => {
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

      const provider = input.provider

      // Gemini API クライアント初期化
      const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
      if (!geminiApiKey) {
        throw Object.assign(
          new Error('GEMINI_API_KEY not configured'),
          { code: ErrorCodes.INTERNAL_ERROR, status: 500 }
        )
      }
      const genAI = new GoogleGenerativeAI(geminiApiKey)

      // === Mode 1: Store作成のみ ===
      if (input.mode === 'create_store') {
        // Gemini Corpus 作成
        const corpus = await genAI.corpora.create({
          displayName: input.display_name,
        })

        // DB に Store を保存（Repository使用）
        let storeRecord
        try {
          storeRecord = await repos.fileSearchStore.create({
            user_id: user.id,
            name: corpus.name, // "corpora/xxx"
            display_name: input.display_name,
            provider: provider,
          })
        } catch (error) {
          // DB保存失敗時は Gemini Corpus を削除（ロールバック）
          try {
            await genAI.corpora.delete(corpus.name)
          } catch (e) {
            console.error('Failed to rollback Gemini Corpus:', e)
          }
          throw Object.assign(
            new Error(`Failed to save store: ${error.message}`),
            { code: ErrorCodes.DATABASE_ERROR, status: 500 }
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
        const corpus = await genAI.corpora.create({ displayName })

        try {
          storeRecord = await repos.fileSearchStore.create({
            user_id: user.id,
            name: corpus.name,
            display_name: displayName,
            provider: provider,
          })
        } catch (error) {
          try {
            await genAI.corpora.delete(corpus.name)
          } catch (e) {
            console.error('Failed to rollback Gemini Corpus:', e)
          }
          throw Object.assign(
            new Error(`Failed to save store: ${error.message}`),
            { code: ErrorCodes.DATABASE_ERROR, status: 500 }
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
          { code: ErrorCodes.STORAGE_ERROR, status: 500 }
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
          { code: ErrorCodes.DATABASE_ERROR, status: 500 }
        )
      }

      // 2-4. Gemini File Search APIにアップロード
      // Signed URL取得
      const { data: signedUrlData, error: signedUrlError } = await adminClient.storage
        .from('private_uploads')
        .createSignedUrl(storagePath, 3600) // 1時間有効

      if (signedUrlError || !signedUrlData) {
        throw Object.assign(
          new Error('Failed to create signed URL'),
          { code: ErrorCodes.STORAGE_ERROR, status: 500 }
        )
      }

      // Gemini APIにファイルをアップロード
      const fileBlob = await fetch(signedUrlData.signedUrl).then(r => r.blob())
      const uploadedFile = await genAI.corpora.uploadDocument(
        storeRecord.name,
        {
          displayName: input.file.name,
          mimeType: input.file.type,
        },
        fileBlob
      )

      // 2-5. knowledge_filesテーブルに記録（Repository使用）
      let knowledgeFileRecord
      try {
        knowledgeFileRecord = await repos.knowledgeFile.create({
          store_id: storeRecord.id,
          file_id: fileRecord.id,
          gemini_file_name: uploadedFile.name, // "corpora/xxx/documents/xxx"
          user_id: user.id,
        })
      } catch (error) {
        // Gemini Document削除（ロールバック）
        try {
          await genAI.documents.delete(uploadedFile.name)
        } catch (e) {
          console.error('Failed to rollback Gemini document:', e)
        }
        throw Object.assign(
          new Error(`Failed to save knowledge file: ${error.message}`),
          { code: ErrorCodes.DATABASE_ERROR, status: 500 }
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
          gemini_file_name: uploadedFile.name,
        },
      }
    },
  })
})
