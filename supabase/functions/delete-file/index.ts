import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * Delete File Edge Function
 *
 * ファイルを削除（DB + Storage）
 *
 * フロー:
 * 1. fileId を受け取る
 * 2. files テーブルから DELETE（RLS で権限チェック）
 * 3. Storage Hooks が自動的に Storage のファイルも削除
 *
 * 注意:
 * - RLS により、所有者のみが削除可能
 * - DB の DELETE トリガーが Storage のファイルも削除
 * - トリガーが失敗した場合、orphaned_files テーブルに記録される
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

    // リクエストボディから fileId を取得
    const { fileId } = await req.json()

    if (!fileId) {
      throw new Error('fileId is required')
    }

    // === ステップ1: files テーブルから DELETE（RLS で権限チェック） ===
    // RLS により、所有者のみが削除可能
    // DELETE トリガーが Storage のファイルも自動削除
    const { error: deleteError } = await supabaseUser
      .from('files')
      .delete()
      .eq('id', fileId)

    if (deleteError) {
      // PGRST116: レコードが見つからない（存在しないか権限がない）
      if (deleteError.code === 'PGRST116') {
        throw new Error('File not found or access denied')
      }
      throw new Error(`Failed to delete file: ${deleteError.message}`)
    }

    // 削除成功
    return new Response(JSON.stringify({
      success: true,
      deleted_at: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Delete file error:', error)

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
