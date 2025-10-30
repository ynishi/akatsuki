import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * Get Signed URL Edge Function
 *
 * Private ファイルの署名付き URL を取得
 *
 * フロー:
 * 1. fileId を受け取る
 * 2. files テーブルから fileId で検索（RLS で権限チェック）
 * 3. 権限があれば署名付き URL を生成
 * 4. 権限が無い/ファイルが存在しない場合はエラー
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 認証チェック
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    const jwt = authHeader.replace('Bearer ', '')

    // Supabase Admin Client（署名付きURL生成用）
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Supabase User Client（RLS チェック用）
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )

    // ユーザー認証確認
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(jwt)
    if (userError || !user) {
      throw new Error(`Unauthorized: ${userError?.message}`)
    }

    // リクエストボディから fileId と expiresIn を取得
    const { fileId, expiresIn = 3600 } = await req.json()

    if (!fileId) {
      throw new Error('fileId is required')
    }

    // === ステップ1: files テーブルから fileId で検索（RLS で権限チェック） ===
    const { data: fileRecord, error: selectError } = await supabaseUser
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single()

    if (selectError) {
      if (selectError.code === 'PGRST116') {
        // Not found
        throw new Error('File not found or access denied')
      }
      throw new Error(`Failed to fetch file metadata: ${selectError.message}`)
    }

    if (!fileRecord) {
      throw new Error('File not found or access denied')
    }

    // === ステップ2: 署名付き URL を生成 ===
    // Admin Client を使って署名付き URL を生成（RLS バイパス）
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from(fileRecord.bucket_name)
      .createSignedUrl(fileRecord.storage_path, expiresIn)

    if (signedUrlError) {
      throw new Error(`Failed to create signed URL: ${signedUrlError.message}`)
    }

    // 有効期限を計算
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    return new Response(JSON.stringify({
      success: true,
      signed_url: signedUrlData.signedUrl,
      expires_at: expiresAt,
      expires_in: expiresIn,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Get signed URL error:', error)

    // エラーメッセージに応じてステータスコードを変更
    let statusCode = 500
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      statusCode = 404
    } else if (error.message.includes('Unauthorized')) {
      statusCode = 401
    }

    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: statusCode,
    })
  }
})
