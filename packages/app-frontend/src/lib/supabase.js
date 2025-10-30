import { createClient } from '@supabase/supabase-js'

// Supabase環境変数の取得
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 環境変数が設定されているか確認
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Supabase環境変数が設定されていません。.envファイルを確認してください。')
  console.error('必要な環境変数: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY')
}

// Supabaseクライアントの作成
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
