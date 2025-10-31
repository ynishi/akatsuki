// Send Email Edge Function
// Akatsukiハンドラーパターンを使ったメール送信エンドポイント
//
// 用途例:
// - パスワードリセットメール
// - ウェルカムメール
// - 通知メール
// - レポート送信
//
// 使用サービス: Resend (https://resend.com/)

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createSystemHandler } from '../_shared/handler.ts'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'

// IN型定義（Zodスキーマ）
const InputSchema = z.object({
  // 必須
  to: z.union([
    z.string().email('Invalid email address'),
    z.array(z.string().email('Invalid email address')),
  ]),
  subject: z.string().min(1, 'Subject is required'),

  // 本文（text または html のいずれか必須）
  text: z.string().optional(),
  html: z.string().optional(),

  // オプション
  from: z.string().email().optional(),
  reply_to: z.string().email().optional(),
  cc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  bcc: z.union([z.string().email(), z.array(z.string().email())]).optional(),

  // 添付ファイル（Resend形式）
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.string(), // base64 encoded
    content_type: z.string().optional(),
  })).optional(),

  // ログ記録用（オプション）
  metadata: z.object({
    template: z.string().optional(), // 'welcome', 'password-reset', etc.
    user_id: z.string().optional(),
  }).optional(),
}).refine(data => data.text || data.html, {
  message: 'Either text or html is required',
})

type Input = z.infer<typeof InputSchema>

// OUT型定義
interface Output {
  sent: boolean
  message_id: string
  timestamp: string
}

Deno.serve(async (req) => {
  return createSystemHandler<Input, Output>(req, {
    inputSchema: InputSchema,

    logic: async ({ input, adminClient }) => {
      // 1. Resend API Key取得
      const apiKey = Deno.env.get('RESEND_API_KEY')
      if (!apiKey) {
        throw new Error('RESEND_API_KEY is not configured')
      }

      // 2. デフォルト送信元メールアドレス
      const defaultFrom = Deno.env.get('EMAIL_FROM') || 'noreply@example.com'
      const from = input.from || defaultFrom

      // 3. Resendメールペイロード構築
      const payload: any = {
        from,
        to: input.to,
        subject: input.subject,
      }

      if (input.text) {
        payload.text = input.text
      }

      if (input.html) {
        payload.html = input.html
      }

      if (input.reply_to) {
        payload.reply_to = input.reply_to
      }

      if (input.cc) {
        payload.cc = input.cc
      }

      if (input.bcc) {
        payload.bcc = input.bcc
      }

      if (input.attachments && input.attachments.length > 0) {
        payload.attachments = input.attachments.map(att => ({
          filename: att.filename,
          content: att.content,
          type: att.content_type,
        }))
      }

      console.log('[send-email] Sending email:', {
        to: input.to,
        subject: input.subject,
        template: input.metadata?.template,
      })

      // 4. Resend API呼び出し
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('[send-email] Resend API error:', errorData)
        throw new Error(`Resend API error: ${response.status} - ${JSON.stringify(errorData)}`)
      }

      const result = await response.json()
      const timestamp = new Date().toISOString()

      console.log('[send-email] Email sent successfully:', { id: result.id })

      // 5. メール送信ログ記録（オプション - email_logsテーブルがある場合）
      try {
        await adminClient.from('email_logs').insert({
          message_id: result.id,
          recipient: Array.isArray(input.to) ? input.to.join(', ') : input.to,
          subject: input.subject,
          template: input.metadata?.template,
          user_id: input.metadata?.user_id,
          status: 'sent',
          sent_at: timestamp,
        })
      } catch (error) {
        // ログテーブルがない場合はスキップ
        console.warn('[send-email] Failed to log email (table may not exist):', error.message)
      }

      return {
        sent: true,
        message_id: result.id,
        timestamp,
      }
    },
  })
})
