// Slack Notify Edge Function
// Akatsukiハンドラーパターンを使ったSlack通知エンドポイント
//
// 用途例:
// - エラー通知
// - システムアラート
// - ステータス更新通知
// - デプロイ完了通知

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createSystemHandler } from '../_shared/handler.ts'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'

// IN型定義（Zodスキーマ）
const InputSchema = z.object({
  // 必須
  text: z.string().min(1, 'Message text is required'),

  // オプション
  channel: z.string().optional(),
  username: z.string().optional().default('Akatsuki Bot'),
  icon_emoji: z.string().optional().default(':robot_face:'),

  // Slack attachments（リッチメッセージ用）
  attachments: z.array(z.object({
    color: z.string().optional(),
    title: z.string().optional(),
    text: z.string().optional(),
    fields: z.array(z.object({
      title: z.string(),
      value: z.string(),
      short: z.boolean().optional(),
    })).optional(),
  })).optional(),

  // ログ記録用（オプション）
  metadata: z.object({
    source: z.string().optional(), // 'github-actions', 'cron-job', etc.
    event_type: z.string().optional(),
  }).optional(),
})

type Input = z.infer<typeof InputSchema>

// OUT型定義
interface Output {
  sent: boolean
  timestamp: string
  webhook_response?: any
}

Deno.serve(async (req) => {
  return createSystemHandler<Input, Output>(req, {
    inputSchema: InputSchema,

    logic: async ({ input, adminClient }) => {
      // 1. Slack Webhook URL取得
      const webhookUrl = Deno.env.get('SLACK_WEBHOOK_URL')
      if (!webhookUrl) {
        throw new Error('SLACK_WEBHOOK_URL is not configured')
      }

      // 2. Slackメッセージペイロード構築
      const payload: any = {
        text: input.text,
        username: input.username,
        icon_emoji: input.icon_emoji,
      }

      if (input.channel) {
        payload.channel = input.channel
      }

      if (input.attachments && input.attachments.length > 0) {
        payload.attachments = input.attachments
      }

      console.log('[slack-notify] Sending message:', { text: input.text, channel: input.channel })

      // 3. Slack Webhook送信
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[slack-notify] Slack API error:', errorText)
        throw new Error(`Slack API error: ${response.status} - ${errorText}`)
      }

      const timestamp = new Date().toISOString()

      // 4. 通知ログ記録（オプション - notification_logsテーブルがある場合）
      try {
        await adminClient.from('notification_logs').insert({
          channel: 'slack',
          recipient: input.channel || 'default',
          message: input.text,
          status: 'sent',
          metadata: {
            username: input.username,
            source: input.metadata?.source,
            event_type: input.metadata?.event_type,
          },
          sent_at: timestamp,
        })
      } catch (error) {
        // ログテーブルがない場合はスキップ
        console.warn('[slack-notify] Failed to log notification (table may not exist):', error.message)
      }

      console.log('[slack-notify] Message sent successfully')

      return {
        sent: true,
        timestamp,
        webhook_response: await response.text(),
      }
    },
  })
})
