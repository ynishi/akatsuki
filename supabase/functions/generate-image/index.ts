// Image Generation Edge Function
// Akatsukiハンドラーパターンを使ったMulti-provider image generation endpoint

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createAkatsukiHandler } from '../_shared/handler.ts'
import { ErrorCodes } from '../_shared/api_types.ts'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'
import OpenAI from 'https://esm.sh/openai@4'
import { GoogleGenAI } from 'https://esm.sh/@google/genai@1.28.0'

/**
 * Image Generation Modes (ユーザーの意図を表現、インフラ非依存)
 *
 * - text-to-image: テキストから画像を生成
 *   - prompt: 必須
 *   - image_url: 不要
 *   - サポート: DALL-E 3, DALL-E 2, Gemini
 *
 * - variation: 既存画像の自動バリエーション生成（プロンプト不要）
 *   - prompt: 不要（自動生成）
 *   - image_url: 必須
 *   - サポート: DALL-E 2, Gemini
 *   - 注意: DALL-E 3 は非サポート
 *
 * - edit: 既存画像をプロンプトで編集（Image-to-Image）
 *   - prompt: 必須（編集指示）
 *   - image_url: 必須（将来的に複数画像対応予定）
 *   - サポート: Gemini のみ
 *   - 注意: DALL-E は非サポート（DALL-E 2 の Inpainting は別途実装が必要）
 *
 * Provider/Model はオプション:
 * - デフォルト値で動作
 * - 特定のプロバイダーを使いたい場合のみ指定
 * - 内部でモデルの制約を自動的に吸収
 */
const InputSchema = z.object({
  provider: z.enum(['dalle', 'openai', 'gemini', 'comfyui']).optional().default('dalle'),
  mode: z.enum(['text-to-image', 'variation', 'edit']).optional().default('text-to-image'),
  prompt: z.string().optional().default(''),
  size: z.string().optional().default('1024x1024'),
  quality: z.enum(['standard', 'hd']).optional().default('standard'),
  style: z.enum(['vivid', 'natural']).optional().default('vivid'),
  model: z.string().optional(),
  image_url: z.string().url().optional(),
}).refine(
  (data) => {
    // text-to-image / edit: prompt 必須
    if (data.mode === 'text-to-image' || data.mode === 'edit') {
      return data.prompt && data.prompt.length > 0
    }
    // variation: prompt 不要（自動生成）
    return true
  },
  {
    message: 'Prompt is required for text-to-image and edit modes',
    path: ['prompt'],
  }
).refine(
  (data) => {
    // variation / edit: image_url 必須
    if (data.mode === 'variation' || data.mode === 'edit') {
      return !!data.image_url
    }
    return true
  },
  {
    message: 'image_url is required for variation and edit modes',
    path: ['image_url'],
  }
)

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

          let response: any

          console.log('[generate-image] DALL-E mode:', input.mode)

          // Mode別処理
          if (input.mode === 'variation') {
            // Variation (バリエーション生成) - プロンプト不要、DALL-E 2 のみ
            console.log('[generate-image] DALL-E Variation mode')
            const imageResponse = await fetch(input.image_url!)
            if (!imageResponse.ok) {
              throw new Error(`Failed to fetch source image: ${imageResponse.statusText}`)
            }
            const imageBlob = await imageResponse.blob()
            const imageFile = new File([imageBlob], 'source.png', { type: 'image/png' })

            response = await openai.images.createVariation({
              model: selectedModel === 'dall-e-3' ? 'dall-e-2' : selectedModel, // DALL-E 3 doesn't support variation
              image: imageFile,
              n: 1,
              size: input.size as '1024x1024' | '512x512' | '256x256',
            })
          } else if (input.mode === 'edit') {
            // Edit mode: DALL-E は非サポート（DALL-E 2 の Inpainting は mask_url が必要なため別途実装）
            throw new Error('Edit mode is not supported for DALL-E provider. Use Gemini for image editing.')
          } else {
            // Text-to-Image (通常の生成)
            console.log('[generate-image] DALL-E Text-to-Image mode')
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

            response = await openai.images.generate(params)
          }

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

          console.log('[generate-image] Gemini mode:', input.mode)

          // Image-to-Image モード（Variation / Edit）
          if (input.mode === 'variation' || input.mode === 'edit') {
            console.log('[generate-image] Gemini Image-to-Image mode:', input.mode)

            // 画像をfetchしてbase64に変換
            const imageResponse = await fetch(input.image_url)
            if (!imageResponse.ok) {
              throw new Error(`Failed to fetch source image: ${imageResponse.statusText}`)
            }
            const imageBlob = await imageResponse.blob()
            const imageBuffer = await imageBlob.arrayBuffer()
            const imageBytes = new Uint8Array(imageBuffer)

            // Base64エンコード
            let binaryString = ''
            for (let i = 0; i < imageBytes.length; i++) {
              binaryString += String.fromCharCode(imageBytes[i])
            }
            const base64Image = btoa(binaryString)
            const mimeType = imageBlob.type || 'image/png'

            // Gemini の contents 形式でプロンプト + 画像を送信
            const contents = [
              {
                role: 'user',
                parts: [
                  { text: input.prompt },
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: base64Image,
                    },
                  },
                ],
              },
            ]

            console.log('[generate-image] Gemini Image-to-Image request:', { model: selectedModel, promptLength: input.prompt.length, imageSize: imageBytes.length })

            const response = await ai.models.generateContent({
              model: selectedModel,
              contents: contents,
            })

            console.log('[generate-image] Gemini Image-to-Image response:', JSON.stringify(response, null, 2))

            // レスポンスから画像を抽出
            const parts = response.candidates?.[0]?.content?.parts

            if (!parts || parts.length === 0) {
              console.error('[generate-image] No parts in Gemini response')
              throw new Error('Gemini did not return any content parts')
            }

            // 画像パートを探す
            let imagePart = null
            for (const part of parts) {
              if (part.inlineData) {
                imagePart = part
                break
              }
            }

            if (imagePart?.inlineData) {
              const base64Data = imagePart.inlineData.data
              const responseMimeType = imagePart.inlineData.mimeType || 'image/png'
              imageUrl = `data:${responseMimeType};base64,${base64Data}`
              usedModel = selectedModel
              console.log('[generate-image] Gemini Image-to-Image generated successfully', { mimeType: responseMimeType, dataLength: base64Data.length })
            } else {
              console.error('[generate-image] No inlineData in Gemini response parts')
              throw new Error('Gemini did not return image data in expected format')
            }
          } else {
            // Text-to-Image モード（通常生成）
            console.log('[generate-image] Gemini Text-to-Image mode:', { model: selectedModel, prompt: input.prompt })

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
