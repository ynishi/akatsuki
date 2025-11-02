/**
 * sync-comfyui-models Edge Function
 *
 * RunPodのComfyUIインスタンスからモデル一覧を取得してDBに同期します。
 * - 新規モデルを自動追加
 * - 存在しないモデルを非アクティブ化
 * - 定期的にCron実行することを推奨
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createSystemHandler } from '../_shared/handler.ts'
import { createRunPodClient } from '../_shared/runpod_client.ts'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'

// Input schema (empty - no parameters needed)
const InputSchema = z.object({})

type Input = z.infer<typeof InputSchema>

// Output type
interface Output {
  synced: number
  added: number
  deactivated: number
  models: string[]
  timestamp: string
}

Deno.serve(async (req) => {
  return createSystemHandler<Input, Output>(req, {
    inputSchema: InputSchema,

    logic: async ({ input, adminClient, repos }) => {
      console.log('[sync-comfyui-models] Starting sync from RunPod')

      // 1. RunPodからモデル一覧を取得
      const client = createRunPodClient()
      const models = await client.getAvailableModels()

      console.log('[sync-comfyui-models] Found', models.length, 'models on RunPod')

      // 2. 既存のDBモデルを取得
      const { data: existingModels, error: fetchError } = await adminClient
        .from('comfyui_models')
        .select('filename, is_active')

      if (fetchError) {
        throw new Error(`Failed to fetch existing models: ${fetchError.message}`)
      }

      const existingFilenames = new Set(existingModels?.map(m => m.filename) || [])
      const runpodFilenames = new Set(models)

      // 3. 新規モデルを追加
      const newModels = models.filter(filename => !existingFilenames.has(filename))
      let addedCount = 0

      if (newModels.length > 0) {
        const modelsToInsert = newModels.map(filename => ({
          filename,
          display_name: filename.replace('.safetensors', ''),
          category: 'other', // デフォルトカテゴリ（手動で分類推奨）
          last_synced_at: new Date().toISOString(),
        }))

        const { error: insertError } = await adminClient
          .from('comfyui_models')
          .insert(modelsToInsert)

        if (insertError) {
          console.error('[sync-comfyui-models] Failed to insert new models:', insertError)
        } else {
          addedCount = newModels.length
          console.log('[sync-comfyui-models] Added', addedCount, 'new models')
        }
      }

      // 4. RunPodに存在しないモデルを非アクティブ化
      const modelsToDeactivate = existingModels
        ?.filter(m => !runpodFilenames.has(m.filename) && m.is_active)
        .map(m => m.filename) || []

      let deactivatedCount = 0

      if (modelsToDeactivate.length > 0) {
        const { error: deactivateError } = await adminClient
          .from('comfyui_models')
          .update({ is_active: false })
          .in('filename', modelsToDeactivate)

        if (deactivateError) {
          console.error('[sync-comfyui-models] Failed to deactivate models:', deactivateError)
        } else {
          deactivatedCount = modelsToDeactivate.length
          console.log('[sync-comfyui-models] Deactivated', deactivatedCount, 'models')
        }
      }

      // 5. 既存モデルのlast_synced_atを更新
      const { error: updateError } = await adminClient
        .from('comfyui_models')
        .update({ last_synced_at: new Date().toISOString() })
        .in('filename', models)

      if (updateError) {
        console.error('[sync-comfyui-models] Failed to update sync timestamp:', updateError)
      }

      console.log('[sync-comfyui-models] Sync completed successfully')

      return {
        synced: models.length,
        added: addedCount,
        deactivated: deactivatedCount,
        models: models,
        timestamp: new Date().toISOString(),
      }
    },
  })
})
