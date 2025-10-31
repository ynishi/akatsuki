// Image Generation Edge Function
// Akatsukiハンドラーパターンを使ったMulti-provider image generation endpoint

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createAkatsukiHandler } from '../_shared/handler.ts'
import { ErrorCodes } from '../_shared/api_types.ts'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'
import OpenAI from 'https://esm.sh/openai@4'
import { GoogleGenAI } from 'https://esm.sh/@google/genai@1.28.0'

// IN型定義（Zodスキーマ）
const InputSchema = z.object({
  provider: z.enum(['dalle', 'openai', 'gemini', 'comfyui']).optional().default('dalle'),
  prompt: z.string().min(1, 'Prompt is required'),
  size: z.string().optional().default('1024x1024'),
  quality: z.enum(['standard', 'hd']).optional().default('standard'),
  style: z.enum(['vivid', 'natural']).optional().default('vivid'),
  model: z.string().optional(),
})

type Input = z.infer<typeof InputSchema>

// OUT型定義
interface Output {
  image_data: string
  mime_type: string
  revised_prompt?: string
  provider: string
  model: string
  size: string
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

      let imageUrl: string
      let revisedPrompt: string | undefined
      let usedModel: string

      // 2. Provider別の画像生成
      switch (input.provider) {
        case 'dalle':
        case 'openai': {
          const apiKey = Deno.env.get('OPENAI_API_KEY')
          if (!apiKey) throw new Error('OPENAI_API_KEY not configured')

          const openai = new OpenAI({ apiKey })
          const selectedModel = input.model || 'dall-e-3'

          // DALL-E 3 parameters
          const params: any = {
            model: selectedModel,
            prompt: input.prompt,
            n: 1,
            size: input.size as '1024x1024' | '1792x1024' | '1024x1792',
          }

          // DALL-E 3 specific parameters
          if (selectedModel === 'dall-e-3') {
            params.quality = input.quality
            params.style = input.style
          }

          const response = await openai.images.generate(params)

          imageUrl = response.data[0].url || ''
          revisedPrompt = response.data[0].revised_prompt
          usedModel = selectedModel
          break
        }

        case 'gemini': {
          const apiKey = Deno.env.get('GEMINI_API_KEY')
          if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

          const ai = new GoogleGenAI({ apiKey })
          const selectedModel = input.model || 'gemini-2.5-flash-image'

          console.log('[generate-image] Generating with Gemini:', { model: selectedModel, prompt: input.prompt })

          const response = await ai.models.generateContent({
            model: selectedModel,
            contents: input.prompt,
          })

          console.log('[generate-image] Gemini raw response:', JSON.stringify(response, null, 2))

          // Gemini returns image as base64 in parts[0].inlineData
          const parts = response.candidates?.[0]?.content?.parts

          if (!parts || parts.length === 0) {
            console.error('[generate-image] No parts in Gemini response')
            throw new Error('Gemini did not return any content parts')
          }

          // Find the image part
          let imagePart = null
          for (const part of parts) {
            if (part.inlineData) {
              imagePart = part
              break
            }
          }

          if (imagePart?.inlineData) {
            // Base64 encoded image data
            const base64Data = imagePart.inlineData.data
            const mimeType = imagePart.inlineData.mimeType || 'image/png'

            // Create data URL for frontend to fetch
            imageUrl = `data:${mimeType};base64,${base64Data}`
            usedModel = selectedModel

            console.log('[generate-image] Gemini image generated successfully', { mimeType, dataLength: base64Data.length })
          } else {
            console.error('[generate-image] No inlineData in Gemini response parts')
            throw new Error('Gemini did not return image data in expected format')
          }

          break
        }

        case 'comfyui': {
          // ComfyUI integration - Placeholder for future implementation
          const encodedPrompt = encodeURIComponent(input.prompt.substring(0, 100))
          imageUrl = `https://placehold.co/${input.size.replace('x', 'x')}/9333EA/FFFFFF.png?text=ComfyUI+(Coming+Soon)\n${encodedPrompt}`
          usedModel = 'comfyui-placeholder'

          console.log('ComfyUI image generation: Placeholder (not yet implemented)')
          break
        }

        default:
          throw new Error(`Unsupported provider: ${input.provider}`)
      }

      // 3. 画像データをbase64に変換
      let imageBase64: string
      let mimeType = 'image/png'

      if (imageUrl.startsWith('data:')) {
        // Already data URL: extract base64
        console.log('[generate-image] Image is data URL, extracting base64')
        const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/)
        if (!matches) {
          throw new Error('Invalid data URL format')
        }
        mimeType = matches[1]
        imageBase64 = matches[2]
      } else {
        // HTTP URL: fetch and convert to base64
        console.log('[generate-image] Fetching image from external URL')
        const imageResponse = await fetch(imageUrl)
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.statusText}`)
        }

        const imageBuffer = await imageResponse.arrayBuffer()
        mimeType = imageResponse.headers.get('content-type') || 'image/png'

        // Convert ArrayBuffer to base64
        const bytes = new Uint8Array(imageBuffer)
        let binary = ''
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i])
        }
        imageBase64 = btoa(binary)

        console.log('[generate-image] Image fetched and converted to base64, size:', imageBuffer.byteLength, 'bytes')
      }

      // 4. ログ記録（adminClient経由）
      await repos.llmCallLog.create({
        user_id: user.id,
        provider: input.provider === 'dalle' ? 'openai' : input.provider,
        model_id: usedModel,
        request_type: 'image_generation',
        success: true,
      })

      // 5. レスポンス返却
      return {
        image_data: imageBase64,
        mime_type: mimeType,
        revised_prompt: revisedPrompt,
        provider: input.provider,
        model: usedModel,
        size: input.size,
      }
    },
  })
})
