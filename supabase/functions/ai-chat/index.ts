// AI Chat Edge Function
// Akatsukiハンドラーパターンを使ったMulti-provider LLM chat endpoint

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createAkatsukiHandler } from '../_shared/handler.ts'
import { ErrorCodes } from '../_shared/api_types.ts'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'
import OpenAI from 'https://esm.sh/openai@4'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.24.3'
import { GoogleGenAI } from 'npm:@google/genai@1.29.0'
import {
  loadFunctionDefinitions,
  toOpenAITools,
  toAnthropicTools,
  toGeminiFunctionDeclarations,
  findFunctionByName,
  registerFunctionCallAsJob,
} from './function_loader.ts'

// IN型定義（Zodスキーマ）
const InputSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'gemini'], {
    errorMap: () => ({ message: 'Provider must be openai, anthropic, or gemini' }),
  }),
  prompt: z.string().min(1).optional(),
  messages: z.array(z.any()).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  maxTokens: z.number().positive().optional().default(2000),
  responseJson: z.boolean().optional().default(false),
  enableFunctionCalling: z.boolean().optional().default(false),
  fileSearchStoreIds: z.array(z.string().uuid()).optional(), // File Search (RAG) 用のStore ID配列
  enableFileSearch: z.boolean().optional(), // File Searchを使用するかどうか
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
  functionCalls?: Array<{
    name: string
    arguments: Record<string, any>
    result: any
  }>
  grounding_metadata?: any // File Search (RAG) の引用情報
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
      let llmCallLogId: string | undefined
      let responseGroundingMetadata: any = null // File Search (RAG) grounding metadata
      const executedFunctionCalls: Array<{ name: string; arguments: Record<string, any>; result: any }> = []

      // Load Function Definitions from DB (if enabled)
      const availableFunctions = input.enableFunctionCalling
        ? await loadFunctionDefinitions(user.id, adminClient)
        : []
      const enableFileSearch = input.enableFileSearch ?? ((input.fileSearchStoreIds?.length ?? 0) > 0)

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
            if (input.enableFunctionCalling && availableFunctions.length > 0) {
              params.tools = toOpenAITools(availableFunctions)
            }

            // TODO: File Search (RAG) Integration - OpenAI
            // OpenAI uses Assistants API with file_search tool for RAG.
            // Implementation guide:
            // 1. Get store names from input.fileSearchStoreIds (similar to Gemini)
            // 2. Create Assistant with file_search tool enabled
            // 3. Create Thread with vector_store_ids
            // 4. Run Thread and retrieve response with citations
            // See: _shared/providers/openai-rag-client.ts for implementation details
            if (enableFileSearch && input.fileSearchStoreIds && input.fileSearchStoreIds.length > 0) {
              console.warn('[ai-chat] OpenAI File Search not implemented yet')
              // TODO: Implement OpenAI File Search integration
            }

            let completion = await openai.chat.completions.create(params)
            usedModel = selectedModel

            // Handle function calling (OpenAI)
            if (completion.choices[0].message.tool_calls) {
              for (const toolCall of completion.choices[0].message.tool_calls) {
                const funcName = toolCall.function.name
                const funcArgs = JSON.parse(toolCall.function.arguments)

                // Find function definition
                const funcDef = findFunctionByName(availableFunctions, funcName)
                if (!funcDef) {
                  console.error(`[ai-chat] Function not found: ${funcName}`)
                  continue
                }

                // Register to Job System
                const result = await registerFunctionCallAsJob(
                  funcDef,
                  funcArgs,
                  user.id,
                  adminClient,
                  llmCallLogId
                )

                executedFunctionCalls.push({
                  name: funcName,
                  arguments: funcArgs,
                  result: {
                    success: result.success,
                    event_id: result.eventId,
                    message: result.success
                      ? `Function '${funcName}' scheduled for execution (Job ID: ${result.eventId})`
                      : `Failed to schedule function: ${result.error}`,
                  },
                })

                // Add function result to messages and re-call LLM
                params.messages.push(completion.choices[0].message)
                params.messages.push({
                  role: 'tool',
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({
                    success: result.success,
                    message: result.success
                      ? `Function '${funcName}' has been scheduled for execution. Job ID: ${result.eventId}`
                      : `Error: ${result.error}`,
                  }),
                })
              }

              // Re-call with function results
              completion = await openai.chat.completions.create(params)
            }

            responseText = completion.choices[0].message.content || ''

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

            // TODO: File Search (RAG) Integration - Anthropic
            // Anthropic does not have built-in File Search like Gemini or OpenAI.
            // For RAG with Anthropic, we need to:
            // 1. Get store names from input.fileSearchStoreIds
            // 2. Use RAGProviderClient to search() for relevant documents
            // 3. Inject retrieved documents into system prompt or user message
            // 4. Let Claude generate response based on retrieved context
            //
            // Implementation strategy:
            // - Use createRAGProvider() to get provider client
            // - Call client.search() to retrieve relevant chunks
            // - Format chunks into context string
            // - Inject into system prompt: "Use the following context to answer..."
            if (enableFileSearch && input.fileSearchStoreIds && input.fileSearchStoreIds.length > 0) {
              console.warn('[ai-chat] Anthropic File Search not implemented yet')
              // TODO: Implement manual RAG integration for Anthropic
            }

            const messageParams: any = {
              model: selectedModel,
              max_tokens: input.maxTokens,
              temperature: input.temperature,
              system: systemPrompt,
              messages: input.messages || [{ role: 'user', content: input.prompt! }],
            }

            if (input.enableFunctionCalling && availableFunctions.length > 0) {
              messageParams.tools = toAnthropicTools(availableFunctions)
            }

            let message = await anthropic.messages.create(messageParams)
            usedModel = selectedModel

            // Handle function calling (Anthropic)
            while (message.stop_reason === 'tool_use') {
              const toolUseBlocks = message.content.filter((block: any) => block.type === 'tool_use')

              for (const toolUse of toolUseBlocks) {
                const funcName = toolUse.name
                const funcArgs = toolUse.input

                // Find function definition
                const funcDef = findFunctionByName(availableFunctions, funcName)
                if (!funcDef) {
                  console.error(`[ai-chat] Function not found: ${funcName}`)
                  continue
                }

                // Register to Job System
                const result = await registerFunctionCallAsJob(
                  funcDef,
                  funcArgs,
                  user.id,
                  adminClient,
                  llmCallLogId
                )

                executedFunctionCalls.push({
                  name: funcName,
                  arguments: funcArgs,
                  result: {
                    success: result.success,
                    event_id: result.eventId,
                    message: result.success
                      ? `Function '${funcName}' scheduled for execution (Job ID: ${result.eventId})`
                      : `Failed to schedule function: ${result.error}`,
                  },
                })

                // Add function result to messages and re-call
                messageParams.messages.push({ role: 'assistant', content: message.content })
                messageParams.messages.push({
                  role: 'user',
                  content: [{
                    type: 'tool_result',
                    tool_use_id: toolUse.id,
                    content: JSON.stringify({
                      success: result.success,
                      message: result.success
                        ? `Function '${funcName}' has been scheduled for execution. Job ID: ${result.eventId}`
                        : `Error: ${result.error}`,
                    }),
                  }],
                })
              }

              message = await anthropic.messages.create(messageParams)
            }

            responseText = message.content.find((block: any) => block.type === 'text')?.text || ''

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

            // 新しいSDKで初期化
            const genAI = new GoogleGenAI({ apiKey })
            const selectedModel = input.model || 'gemini-2.5-flash'

            // ============================================================================
            // File Search (RAG) Integration - Gemini
            // ============================================================================
            // Note: Gemini's File Search is integrated at the LLM generation level.
            // Unlike other providers, we don't need to manually retrieve documents.
            // The SDK handles document retrieval and grounding automatically.
            //
            // For provider abstraction, see: _shared/providers/gemini-rag-client.ts
            // ============================================================================
            let fileSearchStoreNames: string[] | undefined
            if (enableFileSearch && input.fileSearchStoreIds && input.fileSearchStoreIds.length > 0) {
              // Verify ownership and get store names
              const storeNames: string[] = []
              for (const storeId of input.fileSearchStoreIds) {
                const hasOwnership = await repos.fileSearchStore.checkOwnership(storeId, user.id)
                if (!hasOwnership) {
                  console.warn(`[ai-chat] User ${user.id} does not own store ${storeId}, skipping`)
                  continue
                }

                const store = await repos.fileSearchStore.findById(storeId)
                if (store && store.name) {
                  storeNames.push(store.name) // "corpora/xxx"
                }
              }

              if (storeNames.length > 0) {
                fileSearchStoreNames = storeNames
                console.log(`[ai-chat] File Search enabled with ${storeNames.length} stores:`, storeNames)
              } else {
                console.warn('[ai-chat] File Search requested but no accessible stores found, disabling File Search')
              }
            }

            // Tools configuration (Function Calling)
            const tools: any[] = []
            if (fileSearchStoreNames && fileSearchStoreNames.length > 0) {
              tools.push({ fileSearch: { fileSearchStoreNames } })
            }
            if (input.enableFunctionCalling && availableFunctions.length > 0) {
              tools.push({ functionDeclarations: toGeminiFunctionDeclarations(availableFunctions) })
            }

            // Prepare config
            // File Search使用時は大きなmaxOutputTokensが必要（取得したコンテンツ処理のため）
            const maxOutputTokens = fileSearchStoreNames && fileSearchStoreNames.length > 0
              ? Math.max(input.maxTokens, 4000)
              : input.maxTokens

            const config: any = {
              temperature: input.temperature,
              maxOutputTokens: maxOutputTokens,
            }

            if (input.responseJson) {
              config.responseMimeType = 'application/json'
            }

            if (tools.length > 0) {
              config.tools = tools
            }
            if (fileSearchStoreNames && fileSearchStoreNames.length > 0) {
              config.fileSearchConfig = { fileSearchStores: fileSearchStoreNames }
            }

            // Prepare contents
            const contents: any[] = [{
              role: 'user',
              parts: [{ text: input.messages?.[0]?.parts?.[0]?.text || input.prompt! }]
            }]

            // Generate content using new SDK
            let result = await genAI.models.generateContent({
              model: selectedModel,
              contents: contents,
              config: config
            })

            // Handle function calling (Gemini)
            while (result.functionCalls && result.functionCalls.length > 0) {
              const functionCalls = result.functionCalls

              // Add model's response to contents
              if (result.candidates && result.candidates[0]) {
                contents.push(result.candidates[0].content)
              }

              const functionResponseParts: any[] = []

              for (const funcCall of functionCalls) {
                const funcName = funcCall.name
                const funcArgs = funcCall.args

                // Find function definition
                const funcDef = findFunctionByName(availableFunctions, funcName)
                if (!funcDef) {
                  console.error(`[ai-chat] Function not found: ${funcName}`)
                  continue
                }

                // Register to Job System
                const execResult = await registerFunctionCallAsJob(
                  funcDef,
                  funcArgs,
                  user.id,
                  adminClient,
                  llmCallLogId
                )

                executedFunctionCalls.push({
                  name: funcName,
                  arguments: funcArgs,
                  result: {
                    success: execResult.success,
                    event_id: execResult.eventId,
                    message: execResult.success
                      ? `Function '${funcName}' scheduled for execution (Job ID: ${execResult.eventId})`
                      : `Failed to schedule function: ${execResult.error}`,
                  },
                })

                // Add function response
                functionResponseParts.push({
                  functionResponse: {
                    name: funcName,
                    response: {
                      success: execResult.success,
                      message: execResult.success
                        ? `Function '${funcName}' has been scheduled for execution. Job ID: ${execResult.eventId}`
                        : `Error: ${execResult.error}`,
                    }
                  }
                })
              }

              // Send function results back to model
              contents.push({
                role: 'user',
                parts: functionResponseParts
              })

              result = await genAI.models.generateContent({
                model: selectedModel,
                contents: contents,
                config: config
              })
            }

            // Debug: Log full result structure
            console.log('[ai-chat] Full Gemini result structure:', JSON.stringify(result, null, 2))

            // Get response text
            responseText = result.text || result.candidates?.[0]?.content?.parts?.[0]?.text || ''
            usedModel = selectedModel

            console.log('[ai-chat] Extracted response text:', responseText)
            console.log('[ai-chat] result.text:', result.text)
            console.log('[ai-chat] result.candidates:', result.candidates)

            // Check finish reason
            if (result.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
              console.error('[ai-chat] Response was cut off due to MAX_TOKENS limit!')
              throw new Error('Response was cut off due to token limit. Please increase maxTokens or simplify your query.')
            }

            // Extract usage metadata if available
            if (result.usageMetadata) {
              inputTokens = result.usageMetadata.promptTokenCount || 0
              outputTokens = result.usageMetadata.candidatesTokenCount || 0
              totalTokens = result.usageMetadata.totalTokenCount || 0
            }

            // Extract grounding metadata (File Search citations)
            if (result.candidates?.[0]?.groundingMetadata) {
              responseGroundingMetadata = result.candidates[0].groundingMetadata
              console.log('[ai-chat] File Search grounding metadata:', JSON.stringify(responseGroundingMetadata, null, 2))
            }

            console.log('[ai-chat] Gemini response:', {
              text: responseText,
              usage: { inputTokens, outputTokens, totalTokens },
              fileSearchUsed: config.fileSearchConfig,
              functionCallsExecuted: executedFunctionCalls.length,
              hasGroundingMetadata: !!responseGroundingMetadata
            })
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
        const logEntry = await repos.llmCallLog.create({
          user_id: user.id,
          provider: input.provider,
          model_id: usedModel || input.model || 'unknown',
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: totalTokens,
          request_type: input.enableFunctionCalling ? 'chat_with_functions' : 'chat',
          success: callSuccess,
          error_message: errorMsg,
        })

        if (logEntry) {
          llmCallLogId = logEntry.id
        }
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
        functionCalls: executedFunctionCalls.length > 0 ? executedFunctionCalls : undefined,
        grounding_metadata: responseGroundingMetadata, // File Search (RAG) 引用情報
      }
    },
  })
})
