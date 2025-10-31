// AI Chat Edge Function
// Akatsukiハンドラーパターンを使ったMulti-provider LLM chat endpoint

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createAkatsukiHandler } from '../_shared/handler.ts'
import { ErrorCodes } from '../_shared/api_types.ts'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'
import OpenAI from 'https://esm.sh/openai@4'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.24.3'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.12.0'

// IN型定義（Zodスキーマ）
const InputSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'gemini'], {
    errorMap: () => ({ message: 'Provider must be openai, anthropic, or gemini' }),
  }),
  prompt: z.string().min(1).optional(),
  messages: z.array(z.any()).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  maxTokens: z.number().positive().optional().default(1000),
  responseJson: z.boolean().optional().default(false),
}).refine(data => data.prompt || data.messages, {
  message: 'Either prompt or messages is required',
})

type Input = z.infer<typeof InputSchema>

// OUT型定義
interface Output {
  response: any
  model: string
  usage: {
    current: number
    limit: number
    remaining: number
  }
  tokens?: {
    input?: number
    output?: number
    total?: number
  }
}

Deno.serve(async (req) => {
  return createAkatsukiHandler<Input, Output>(req, {
    inputSchema: InputSchema,
    requireAuth: true,

    logic: async ({ input, userClient, adminClient, repos }) => {
      // 1. ユーザー取得（userClient使用、RLS有効）
      const { data: { user }, error: userError } = await userClient.auth.getUser()
      if (userError || !user) {
        throw Object.assign(
          new Error(`Unauthorized: ${userError?.message || 'Invalid token'}`),
          { code: ErrorCodes.UNAUTHORIZED, status: 401 }
        )
      }

      // 2. クォータ取得または作成（adminClient経由のRepos使用、改ざん防止）
      const currentMonth = new Date().toISOString().slice(0, 7)
      let userQuota = await repos.userQuota.findCurrentMonthQuota(user.id)

      if (!userQuota) {
        console.log(`[ai-chat] Creating new quota record for user ${user.id}`)
        userQuota = await repos.userQuota.create({
          user_id: user.id,
          plan_type: 'free',
          monthly_request_limit: 100,
          current_month: currentMonth,
          requests_used: 0,
        })
      }

      // 3. クォータチェック（adminClient経由、改ざん防止）
      if (userQuota.requests_used >= userQuota.monthly_request_limit) {
        throw Object.assign(
          new Error(`月間LLMコール上限 (${userQuota.monthly_request_limit}回) に達しました。`),
          { code: ErrorCodes.QUOTA_EXCEEDED, status: 429 }
        )
      }

      // 4. クォータ使用量をインクリメント（adminClient経由、先にインクリメントして二重実行を防ぐ）
      await repos.userQuota.incrementUsage(userQuota.id)

      let responseText: string = ''
      let usedModel: string = ''
      let inputTokens: number | undefined
      let outputTokens: number | undefined
      let totalTokens: number | undefined
      let callSuccess = true
      let errorMsg: string | undefined

      try {
        // 5. Provider別のLLM API呼び出し
        switch (input.provider) {
          case 'openai': {
            const apiKey = Deno.env.get('OPENAI_API_KEY')
            if (!apiKey) throw new Error('OPENAI_API_KEY not configured')

            const openai = new OpenAI({ apiKey })
            const selectedModel = input.model || 'gpt-4o-mini'
            const params: OpenAI.Chat.ChatCompletionCreateParams = {
              model: selectedModel,
              messages: input.messages || [{ role: 'user', content: input.prompt! }],
              temperature: input.temperature,
              max_tokens: input.maxTokens,
            }
            if (input.responseJson) {
              params.response_format = { type: 'json_object' }
            }

            const completion = await openai.chat.completions.create(params)
            responseText = completion.choices[0].message.content || ''
            usedModel = selectedModel

            if (completion.usage) {
              inputTokens = completion.usage.prompt_tokens
              outputTokens = completion.usage.completion_tokens
              totalTokens = completion.usage.total_tokens
            }
            break
          }

          case 'anthropic': {
            const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
            if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

            const anthropic = new Anthropic({ apiKey })
            const selectedModel = input.model || 'claude-sonnet-4-5-20250929'

            let systemPrompt = 'You are a helpful assistant.'
            if (input.responseJson) {
              systemPrompt += ' Your response must be in valid JSON format.'
            }

            const message = await anthropic.messages.create({
              model: selectedModel,
              max_tokens: input.maxTokens,
              temperature: input.temperature,
              system: systemPrompt,
              messages: input.messages || [{ role: 'user', content: input.prompt! }],
            })

            responseText = message.content[0].text
            usedModel = selectedModel

            if (message.usage) {
              inputTokens = message.usage.input_tokens
              outputTokens = message.usage.output_tokens
              totalTokens = (message.usage.input_tokens || 0) + (message.usage.output_tokens || 0)
            }
            break
          }

          case 'gemini': {
            const apiKey = Deno.env.get('GEMINI_API_KEY')
            if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

            const genAI = new GoogleGenerativeAI(apiKey)
            const selectedModel = input.model || 'gemini-2.5-flash'
            const geminiModel = genAI.getGenerativeModel({ model: selectedModel })

            const generationConfig = input.responseJson
              ? { responseMimeType: 'application/json', temperature: input.temperature, maxOutputTokens: input.maxTokens }
              : { temperature: input.temperature, maxOutputTokens: input.maxTokens }

            const result = await geminiModel.generateContent({
              contents: input.messages || [{ role: 'user', parts: [{ text: input.prompt! }] }],
              generationConfig,
            })

            responseText = result.response.text()
            usedModel = selectedModel

            const usageMetadata = result.response.usageMetadata
            if (usageMetadata) {
              inputTokens = usageMetadata.promptTokenCount
              outputTokens = usageMetadata.candidatesTokenCount
              totalTokens = usageMetadata.totalTokenCount
            }
            break
          }

          default:
            throw new Error(`Unknown provider: ${input.provider}`)
        }
      } catch (error) {
        callSuccess = false
        errorMsg = error.message
        console.error(`[ai-chat] LLM API call failed:`, error)
        throw error // Re-throw to outer handler
      } finally {
        // 6. ログ記録（adminClient経由、成功・失敗問わず）
        await repos.llmCallLog.create({
          user_id: user.id,
          provider: input.provider,
          model_id: usedModel || input.model || 'unknown',
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: totalTokens,
          request_type: 'chat',
          success: callSuccess,
          error_message: errorMsg,
        })
      }

      // 7. レスポンス整形
      const finalResponse = input.responseJson && responseText
        ? JSON.parse(responseText)
        : responseText

      return {
        response: finalResponse,
        model: usedModel,
        usage: {
          current: userQuota.requests_used + 1,
          limit: userQuota.monthly_request_limit,
          remaining: userQuota.monthly_request_limit - (userQuota.requests_used + 1),
        },
        tokens: totalTokens
          ? {
              input: inputTokens,
              output: outputTokens,
              total: totalTokens,
            }
          : undefined,
      }
    },
  })
})
