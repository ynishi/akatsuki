#!/usr/bin/env node
/**
 * Supabase CLI login checker
 *
 * - 成功条件:
 *   1. SUPABASE_ACCESS_TOKEN 環境変数がセットされている
 *   2. ~/.supabase/access-token が存在し、空でない
 *
 * どちらも満たさない場合は supabase login を促して終了コード 1 を返す。
 */

import fs from 'fs'
import os from 'os'
import path from 'path'

function hasEnvToken() {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  return typeof token === 'string' && token.trim().length > 0
}

function hasSavedToken() {
  try {
    const tokenPath = path.join(os.homedir(), '.supabase', 'access-token')
    const content = fs.readFileSync(tokenPath, 'utf8').trim()
    return content.length > 0
  } catch (error) {
    return false
  }
}

function main() {
  if (hasEnvToken() || hasSavedToken()) {
    process.exit(0)
  }

  console.error(
    [
      'Supabase CLI のログイン情報が見つかりません。',
      '以下のいずれかを実行してから再度お試しください:',
      '  1. `supabase login` を実行してブラウザでログインする',
      '  2. 環境変数 SUPABASE_ACCESS_TOKEN を設定する',
    ].join('\n')
  )
  process.exit(1)
}

main()
