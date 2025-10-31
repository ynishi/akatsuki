// Supabase Edge Function: hello-world
// Akatsukiハンドラーパターンを使ったシンプルなHello Worldサンプル

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createAkatsukiHandler } from '../_shared/handler.ts'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'

console.log("Hello from hello-world function!")

// IN/OUT型定義（Zodスキーマから自動推論）
const InputSchema = z.object({
  name: z.string().min(1, 'Name must not be empty').optional().default('Guest'),
})
type Input = z.infer<typeof InputSchema>

interface Output {
  message: string
  timestamp: string
  functionName: string
  userId?: string // 認証ユーザーがいる場合
}

Deno.serve(async (req) => {
  return createAkatsukiHandler<Input, Output>(req, {
    // 入力スキーマを渡す
    inputSchema: InputSchema,

    // 認証は任意（hello-worldなので）
    requireAuth: false,

    // ビジネスロジックを渡す
    logic: async ({ input, supabase }) => {
      // 認証ユーザーがいれば取得（任意）
      let userId: string | undefined
      try {
        const { data: { user } } = await supabase.auth.getUser()
        userId = user?.id
      } catch {
        // 認証エラーは無視（requireAuth: false のため）
      }

      return {
        message: `Hello, ${input.name}!`,
        timestamp: new Date().toISOString(),
        functionName: 'hello-world',
        userId,
      }
    },
  })
})

/*
ローカルテスト方法:

1. Supabase ローカル起動:
   supabase start

2. 関数デプロイ（開発環境）:
   supabase functions serve hello-world

3. cURLでテスト:
   curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/hello-world' \
     --header 'Authorization: Bearer YOUR_ANON_KEY' \
     --header 'Content-Type: application/json' \
     --data '{"name":"Akatsuki"}'

4. Frontendから呼び出し:
   import { callHelloFunction } from './services'
   const result = await callHelloFunction('Akatsuki')
   console.log(result.message) // "Hello, Akatsuki!"
*/
