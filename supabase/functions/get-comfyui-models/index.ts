/**
 * get-comfyui-models Edge Function
 *
 * RunPodのComfyUIインスタンスから利用可能なモデル（チェックポイント）一覧を取得します。
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createAkatsukiHandler } from '../_shared/handler.ts'
import { createRunPodClient } from '../_shared/runpod_client.ts'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'

// Input schema (empty - no parameters needed)
const InputSchema = z.object({})

type Input = z.infer<typeof InputSchema>

// Output type
interface Output {
  models: string[]
  count: number
  message: string
}

Deno.serve(async (req) => {
  return createAkatsukiHandler<Input, Output>(req, {
    inputSchema: InputSchema,
    requireAuth: false, // Public endpoint to fetch available models

    logic: async ({ input, userClient, adminClient, repos }) => {
      console.log('[get-comfyui-models] Fetching available models from RunPod')

      // RunPod Client作成
      const client = createRunPodClient()

      // モデル一覧を取得
      const models = await client.getAvailableModels()

      console.log('[get-comfyui-models] Found', models.length, 'models')

      return {
        models,
        count: models.length,
        message: 'Available models fetched successfully',
      }
    },
  })
})
