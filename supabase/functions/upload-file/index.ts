import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * Upload File Edge Function
 *
 * ファイルアップロードと DB メタデータ保存を原子的に処理
 *
 * フロー:
 * 1. Storage にファイルをアップロード（Storage先行）
 * 2. files テーブルに metadata を INSERT (status: 'uploading')
 * 3. アップロード成功 → status を 'active' に更新
 * 4. DB INSERT 失敗 → Storage のファイルを削除（ロールバック）
 * 5. ロールバック失敗 → orphaned_files テーブルに記録
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Supabase Admin Client（SERVICE_ROLE_KEY使用）
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // 認証チェック
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt)
    if (userError || !user) {
      throw new Error(`Unauthorized: ${userError?.message}`)
    }

    // FormData からパラメータ取得
    const formData = await req.formData()
    const file = formData.get('file') as File
    const bucket = formData.get('bucket') as string || 'public_assets'
    const isPublic = formData.get('isPublic') === 'true'
    const folder = formData.get('folder') as string || ''
    const metadataJson = formData.get('metadata') as string || '{}'

    if (!file) {
      throw new Error('File not provided in FormData')
    }

    // メタデータをパース
    let customMetadata = {}
    try {
      customMetadata = JSON.parse(metadataJson)
    } catch (e) {
      console.warn('Failed to parse metadata:', e)
    }

    // ストレージパスを生成: user_id/[folder/]timestamp-filename
    const timestamp = Date.now()
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = folder
      ? `${user.id}/${folder}/${timestamp}-${sanitizedFilename}`
      : `${user.id}/${timestamp}-${sanitizedFilename}`

    // === ステップ1: Storage にファイルをアップロード（Storage先行） ===
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Storage upload error: ${uploadError.message}`)
    }

    // === ステップ2: DB に metadata を INSERT ===
    let fileRecord
    try {
      const { data: insertData, error: insertError } = await supabaseAdmin
        .from('files')
        .insert({
          owner_id: user.id,
          storage_path: uploadData.path,
          bucket_name: bucket,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          is_public: isPublic,
          status: 'uploading', // 最初は uploading 状態
          metadata: customMetadata,
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      fileRecord = insertData

    } catch (dbError) {
      // === ステップ3: DB INSERT 失敗 → ロールバック処理 ===
      console.error('DB insert failed, rolling back storage upload:', dbError)

      // Storage からファイルを削除
      try {
        const { error: deleteError } = await supabaseAdmin.storage
          .from(bucket)
          .remove([storagePath])

        if (deleteError) {
          console.error('Rollback deletion failed:', deleteError)

          // ロールバック失敗 → orphaned_files テーブルに記録
          try {
            await supabaseAdmin.from('orphaned_files').insert({
              storage_path: storagePath,
              bucket_name: bucket,
              error_message: `Rollback failed: ${deleteError.message}`,
            })
          } catch (orphanError) {
            console.error('Failed to record orphaned file:', orphanError)
          }
        } else {
          console.log('Successfully rolled back storage upload')
        }
      } catch (rollbackError) {
        console.error('Rollback error:', rollbackError)
      }

      throw new Error(`DB insert failed: ${dbError.message}`)
    }

    // === ステップ4: status を 'active' に更新 ===
    const { error: updateError } = await supabaseAdmin
      .from('files')
      .update({ status: 'active' })
      .eq('id', fileRecord.id)

    if (updateError) {
      console.error('Failed to update status to active:', updateError)
      // status 更新失敗は致命的ではないのでログだけ
    }

    // === ステップ5: レスポンス生成 ===
    let responseUrl
    if (isPublic) {
      // Public: 恒久的な公開URL
      const { data: publicUrlData } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(storagePath)
      responseUrl = publicUrlData.publicUrl
      console.log('[upload-file] Public URL generated:', responseUrl)
    } else {
      // Private: URL は返さない（後で署名付きURLを取得する）
      responseUrl = null
    }

    const responseBody = {
      success: true,
      file_id: fileRecord.id,
      storage_path: uploadData.path,
      public_url: responseUrl,
      bucket: bucket,
      metadata: fileRecord.metadata,
    }

    console.log('[upload-file] Sending response:', responseBody)

    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Upload file error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
