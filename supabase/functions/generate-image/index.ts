// Image Generation Edge Function
// Multi-provider image generation endpoint with authentication

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'npm:openai@4'
import { GoogleGenAI } from 'npm:@google/genai@1.28.0'
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
    if (userError) {
      throw new Error(`Unauthorized: ${userError.message}`)
    }

    // Parse request
    let requestBody
    try {
      const contentType = req.headers.get('content-type')
      console.log('[generate-image] Request content-type:', contentType)

      requestBody = await req.json()
      console.log('[generate-image] Parsed request body:', requestBody)
    } catch (parseError) {
      console.error('[generate-image] Failed to parse request body:', parseError)
      throw new Error(`Invalid request body: ${parseError.message}`)
    }

    const {
      provider = 'dalle',
      prompt,
      size = '1024x1024',
      quality = 'standard',
      style = 'vivid',
      model,
    } = requestBody

    if (!prompt) {
      throw new Error('Prompt is required')
    }

    let imageUrl: string
    let revisedPrompt: string | undefined
    let usedModel: string

    // Provider-specific image generation
    switch (provider) {
      case 'dalle':
      case 'openai': {
        const apiKey = Deno.env.get('OPENAI_API_KEY')
        if (!apiKey) {
          throw new Error('OPENAI_API_KEY not configured')
        }

        const openai = new OpenAI({ apiKey })
        const selectedModel = model || 'dall-e-3'

        // DALL-E 3 parameters
        const params: any = {
          model: selectedModel,
          prompt,
          n: 1,
          size: size as '1024x1024' | '1792x1024' | '1024x1792',
        }

        // DALL-E 3 specific parameters
        if (selectedModel === 'dall-e-3') {
          params.quality = quality
          params.style = style
        }

        const response = await openai.images.generate(params)

        imageUrl = response.data[0].url || ''
        revisedPrompt = response.data[0].revised_prompt
        usedModel = selectedModel
        break
      }

      case 'gemini': {
        const apiKey = Deno.env.get('GEMINI_API_KEY')
        if (!apiKey) {
          throw new Error('GEMINI_API_KEY not configured')
        }

        const ai = new GoogleGenAI({ apiKey })
        const selectedModel = model || 'gemini-2.5-flash-image'

        console.log('[generate-image] Generating with Gemini:', { model: selectedModel, prompt })

        const response = await ai.models.generateContent({
          model: selectedModel,
          contents: prompt,
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
        // Would require ComfyUI server setup and API endpoint
        const encodedPrompt = encodeURIComponent(prompt.substring(0, 100))
        imageUrl = `https://placehold.co/${size.replace('x', 'x')}/9333EA/FFFFFF.png?text=ComfyUI+(Coming+Soon)\n${encodedPrompt}`
        usedModel = 'comfyui-placeholder'

        console.log('ComfyUI image generation: Placeholder (not yet implemented)')
        break
      }

      default:
        throw new Error(`Unsupported provider: ${provider}`)
    }

    // === Step: Fetch image data and convert to base64 ===
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

    // Log the generation (optional - for usage tracking)
    const { error: logError } = await supabaseAdmin.from('llm_call_logs').insert({
      user_id: user.id,
      provider: provider === 'dalle' ? 'openai' : provider,
      model_id: usedModel,
      request_type: 'image_generation',
      success: true,
    })
    if (logError) {
      console.error('Failed to log image generation:', logError)
    }

    // Return image data as base64
    return new Response(JSON.stringify({
      success: true,
      image_data: imageBase64,
      mime_type: mimeType,
      revised_prompt: revisedPrompt,
      provider,
      model: usedModel,
      size,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Image generation error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
