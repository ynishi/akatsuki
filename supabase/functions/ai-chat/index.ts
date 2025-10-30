// AI Chat Edge Function
// Multi-provider LLM chat endpoint with authentication and rate limiting

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Authentication check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }
    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt)
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: `Unauthorized: ${userError?.message || 'Invalid token'}` }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get or create user quota record
    const currentMonth = new Date().toISOString().slice(0, 7)
    let { data: quotaRecords, error: quotaError } = await supabaseAdmin
      .from('user_quotas')
      .select('*')
      .eq('user_id', user.id)
      .eq('current_month', currentMonth)

    if (quotaError) throw new Error(`DB error (select quota): ${quotaError.message}`)

    let userQuota = quotaRecords?.[0]
    if (!userQuota) {
      const { data: newQuota, error: createError } = await supabaseAdmin
        .from('user_quotas')
        .insert({
          user_id: user.id,
          plan_type: 'free',
          monthly_request_limit: 100,
          current_month: currentMonth,
          requests_used: 0,
        })
        .select()
        .single()
      if (createError) throw new Error(`DB error (insert quota): ${createError.message}`)
      userQuota = newQuota
    }

    // Rate limit check
    if (userQuota.requests_used >= userQuota.monthly_request_limit) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `月間LLMコール上限 (${userQuota.monthly_request_limit}回) に達しました。`,
          usage: {
            current: userQuota.requests_used,
            limit: userQuota.monthly_request_limit,
            remaining: 0,
          },
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const {
      provider,
      prompt,
      model,
      temperature = 0.7,
      maxTokens = 1000,
      responseJson = false,
      messages
    } = await req.json()

    if (!provider) {
      return new Response(
        JSON.stringify({ error: 'provider is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!prompt && !messages) {
      return new Response(
        JSON.stringify({ error: 'prompt or messages is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Increment quota usage
    const { error: updateError } = await supabaseAdmin
      .from('user_quotas')
      .update({ requests_used: userQuota.requests_used + 1 })
      .eq('id', userQuota.id)
    if (updateError) throw new Error(`DB error (update quota): ${updateError.message}`)

    let responseText: string
    let usedModel: string
    let inputTokens: number | undefined
    let outputTokens: number | undefined
    let totalTokens: number | undefined
    let callSuccess = true
    let errorMsg: string | undefined

    // Provider-specific API calls
    try {
      switch (provider) {
        case 'openai': {
        const apiKey = Deno.env.get('OPENAI_API_KEY')
        if (!apiKey) {
          throw new Error('OPENAI_API_KEY not configured')
        }

        const openai = new OpenAI({ apiKey })
        const selectedModel = model || 'gpt-4o-mini'
        const params: OpenAI.Chat.ChatCompletionCreateParams = {
          model: selectedModel,
          messages: messages || [{ role: 'user', content: prompt }],
          temperature,
          max_tokens: maxTokens,
        }
        if (responseJson) {
          params.response_format = { type: 'json_object' }
        }

        const completion = await openai.chat.completions.create(params)
        responseText = completion.choices[0].message.content || ''
        usedModel = selectedModel

        // Extract token usage
        if (completion.usage) {
          inputTokens = completion.usage.prompt_tokens
          outputTokens = completion.usage.completion_tokens
          totalTokens = completion.usage.total_tokens
        }
        break
      }

      case 'anthropic': {
        const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
        if (!apiKey) {
          throw new Error('ANTHROPIC_API_KEY not configured')
        }

        const anthropic = new Anthropic({ apiKey })
        const selectedModel = model || 'claude-sonnet-4-5-20250929'

        let systemPrompt = 'You are a helpful assistant.'
        if (responseJson) {
          systemPrompt += ' Your response must be in valid JSON format.'
        }

        const message = await anthropic.messages.create({
          model: selectedModel,
          max_tokens: maxTokens,
          temperature,
          system: systemPrompt,
          messages: messages || [{ role: 'user', content: prompt }],
        })

        responseText = message.content[0].text
        usedModel = selectedModel

        // Extract token usage
        if (message.usage) {
          inputTokens = message.usage.input_tokens
          outputTokens = message.usage.output_tokens
          totalTokens = (message.usage.input_tokens || 0) + (message.usage.output_tokens || 0)
        }
        break
      }

      case 'gemini': {
        const apiKey = Deno.env.get('GEMINI_API_KEY')
        if (!apiKey) {
          throw new Error('GEMINI_API_KEY not configured')
        }

        const genAI = new GoogleGenerativeAI(apiKey)
        const selectedModel = model || 'gemini-2.5-flash'
        const geminiModel = genAI.getGenerativeModel({ model: selectedModel })

        const generationConfig = responseJson
          ? { responseMimeType: 'application/json', temperature, maxOutputTokens: maxTokens }
          : { temperature, maxOutputTokens: maxTokens }

        const result = await geminiModel.generateContent({
          contents: messages || [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig,
        })

        responseText = result.response.text()
        usedModel = selectedModel

        // Gemini token usage (usageMetadata)
        const usageMetadata = result.response.usageMetadata
        if (usageMetadata) {
          inputTokens = usageMetadata.promptTokenCount
          outputTokens = usageMetadata.candidatesTokenCount
          totalTokens = usageMetadata.totalTokenCount
        }
        break
      }

        default:
          throw new Error(`Unknown provider: ${provider}`)
      }
    } catch (error) {
      callSuccess = false
      errorMsg = error.message
      throw error  // Re-throw to be caught by outer try-catch
    } finally {
      // Log the API call (always, even on failure)
      await supabaseAdmin
        .from('llm_call_logs')
        .insert({
          user_id: user.id,
          provider,
          model_id: usedModel || model || 'unknown',
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: totalTokens,
          request_type: 'chat',
          success: callSuccess,
          error_message: errorMsg,
        })
        .select()
    }

    // Parse JSON response if requested
    const finalResponse = responseJson && responseText
      ? JSON.parse(responseText)
      : responseText

    return new Response(
      JSON.stringify({
        success: true,
        response: finalResponse,
        model: usedModel,
        usage: {
          current: userQuota.requests_used + 1,
          limit: userQuota.monthly_request_limit,
          remaining: userQuota.monthly_request_limit - (userQuota.requests_used + 1),
        },
        tokens: totalTokens ? {
          input: inputTokens,
          output: outputTokens,
          total: totalTokens,
        } : undefined,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('AI Chat error:', error)

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
