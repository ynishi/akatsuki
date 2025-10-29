// Supabase Edge Function: hello-world
// シンプルな Hello World サンプル

import "jsr:@supabase/functions-js/edge-runtime.d.ts"

console.log("Hello from hello-world function!")

Deno.serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // リクエストボディからnameを取得（空の場合も対応）
    let name = 'Guest'
    try {
      const body = await req.json()
      name = body.name || 'Guest'
    } catch {
      // JSONパースエラーの場合はデフォルト値を使用
      name = 'Guest'
    }

    const userName = name

    // レスポンスデータ
    const data = {
      message: `Hello, ${userName}!`,
      timestamp: new Date().toISOString(),
      functionName: 'hello-world',
    }

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    })
  } catch (error) {
    console.error('Error in hello-world function:', error)

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  }
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
