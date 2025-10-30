import { EdgeFunctionService } from './EdgeFunctionService'
import { PublicStorageService } from './PublicStorageService'

/**
 * Image Generation Service
 * AI画像生成とStorage保存を統合管理
 *
 * フロー:
 * 1. Edge Function で画像生成（DALL-E, Gemini, ComfyUIなど）
 * 2. 生成された画像URLからfetch
 * 3. PublicStorageService で永続化（DALL-E URLは1時間で期限切れ対策）
 * 4. files テーブルの metadata に生成情報を保存
 *
 * @example
 * import { ImageGenerationService } from '@/services/ImageGenerationService'
 *
 * const result = await ImageGenerationService.generate({
 *   prompt: 'A beautiful sunset over mountains',
 *   provider: 'dalle',
 *   size: '1024x1024',
 *   quality: 'hd',
 *   style: 'vivid'
 * })
 *
 * console.log(result.publicUrl) // 恒久的な公開URL
 * console.log(result.revisedPrompt) // DALL-Eが修正したプロンプト
 */
export class ImageGenerationService {
  /**
   * AI画像を生成してStorageに保存
   *
   * @param {Object} options - 生成オプション
   * @param {string} options.prompt - 画像生成プロンプト（必須）
   * @param {string} options.provider - プロバイダー ('dalle' | 'gemini' | 'comfyui', デフォルト: 'dalle')
   * @param {string} options.size - 画像サイズ ('1024x1024' | '1792x1024' | '1024x1792', デフォルト: '1024x1024')
   * @param {string} options.quality - 品質 ('standard' | 'hd', デフォルト: 'standard')
   * @param {string} options.style - スタイル ('vivid' | 'natural', デフォルト: 'vivid')
   * @param {string} options.model - モデル名（オプション）
   * @param {Object} options.metadata - 追加メタデータ（オプション）
   * @returns {Promise<Object>} { id, publicUrl, storagePath, revisedPrompt, provider, model, size, metadata }
   * @throws {Error} プロンプト未指定、生成失敗、保存失敗
   *
   * @example
   * // 基本的な使用
   * const result = await ImageGenerationService.generate({
   *   prompt: 'A cute cat playing with yarn'
   * })
   *
   * // 高品質・横長
   * const result = await ImageGenerationService.generate({
   *   prompt: 'A landscape of futuristic city',
   *   size: '1792x1024',
   *   quality: 'hd',
   *   style: 'natural'
   * })
   */
  static async generate(options) {
    const {
      prompt,
      provider = 'dalle',
      size = '1024x1024',
      quality = 'standard',
      style = 'vivid',
      model,
      metadata: additionalMetadata = {},
    } = options

    if (!prompt) {
      throw new Error('Prompt is required')
    }

    try {
      console.log('[ImageGenerationService] Generating image with:', { prompt, provider, size, quality, style })

      // === Step 1: Edge Function で画像生成 ===
      const generationResult = await EdgeFunctionService.invoke('generate-image', {
        prompt,
        provider,
        size,
        quality,
        style,
        model,
      })

      console.log('[ImageGenerationService] Generation result:', generationResult)

      if (!generationResult.success || !generationResult.image_data) {
        throw new Error('Image generation failed: No image data returned')
      }

      // === Step 2: base64データをBlobに変換 ===
      console.log('[ImageGenerationService] Converting base64 to blob')

      const base64Data = generationResult.image_data
      const mimeType = generationResult.mime_type || 'image/png'

      const binaryData = atob(base64Data)
      const bytes = new Uint8Array(binaryData.length)
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i)
      }
      const imageBlob = new Blob([bytes], { type: mimeType })

      const imageFile = new File(
        [imageBlob],
        `generated-${Date.now()}.png`,
        { type: mimeType }
      )

      console.log('[ImageGenerationService] Image converted to file:', {
        size: imageFile.size,
        type: imageFile.type,
      })

      // === Step 3: PublicStorageService で永続化 ===
      const uploadResult = await PublicStorageService.uploadImage(imageFile, {
        folder: 'generated-images',
        metadata: {
          type: 'generated_image',
          prompt: prompt,
          revised_prompt: generationResult.revised_prompt,
          provider: generationResult.provider,
          model: generationResult.model,
          size: generationResult.size,
          quality: quality,
          style: style,
          ...additionalMetadata,
        },
      })

      console.log('[ImageGenerationService] Upload complete:', uploadResult)

      return {
        id: uploadResult.id, // files テーブルの ID
        publicUrl: uploadResult.publicUrl, // 恒久的な公開URL
        storagePath: uploadResult.storagePath,
        revisedPrompt: generationResult.revised_prompt, // DALL-Eが修正したプロンプト
        provider: generationResult.provider,
        model: generationResult.model,
        size: generationResult.size,
        metadata: uploadResult.metadata,
        success: true,
      }
    } catch (error) {
      console.error('[ImageGenerationService] Error:', error)
      throw new Error(`画像生成に失敗しました: ${error.message}`)
    }
  }

  /**
   * DALL-E で画像を生成
   *
   * @param {string} prompt - プロンプト
   * @param {Object} options - オプション
   * @returns {Promise<Object>}
   *
   * @example
   * const result = await ImageGenerationService.generateWithDallE(
   *   'A serene Japanese garden',
   *   { quality: 'hd', style: 'natural' }
   * )
   */
  static async generateWithDallE(prompt, options = {}) {
    return this.generate({
      prompt,
      provider: 'dalle',
      ...options,
    })
  }

  /**
   * Gemini で画像を生成
   *
   * @param {string} prompt - プロンプト
   * @param {Object} options - オプション
   * @returns {Promise<Object>}
   *
   * @example
   * const result = await ImageGenerationService.generateWithGemini(
   *   'A futuristic robot'
   * )
   */
  static async generateWithGemini(prompt, options = {}) {
    return this.generate({
      prompt,
      provider: 'gemini',
      ...options,
    })
  }

  /**
   * ComfyUI で画像を生成（準備中）
   *
   * @param {string} prompt - プロンプト
   * @param {Object} options - オプション
   * @returns {Promise<Object>}
   *
   * @example
   * const result = await ImageGenerationService.generateWithComfyUI(
   *   'A fantasy landscape'
   * )
   */
  static async generateWithComfyUI(prompt, options = {}) {
    return this.generate({
      prompt,
      provider: 'comfyui',
      ...options,
    })
  }

  /**
   * サイズオプション一覧を取得
   * @returns {Array<Object>}
   */
  static getSizeOptions() {
    return [
      { value: '1024x1024', label: 'Square (1024x1024)', description: '正方形' },
      { value: '1792x1024', label: 'Landscape (1792x1024)', description: '横長' },
      { value: '1024x1792', label: 'Portrait (1024x1792)', description: '縦長' },
    ]
  }

  /**
   * 品質オプション一覧を取得
   * @returns {Array<Object>}
   */
  static getQualityOptions() {
    return [
      { value: 'standard', label: 'Standard', description: '標準品質（速い）' },
      { value: 'hd', label: 'HD', description: '高品質（遅い）' },
    ]
  }

  /**
   * スタイルオプション一覧を取得
   * @returns {Array<Object>}
   */
  static getStyleOptions() {
    return [
      { value: 'vivid', label: 'Vivid', description: '鮮やか・ドラマチック' },
      { value: 'natural', label: 'Natural', description: '自然・リアル' },
    ]
  }

  /**
   * プロバイダーオプション一覧を取得
   * @returns {Array<Object>}
   */
  static getProviderOptions() {
    return [
      { value: 'dalle', label: 'DALL-E 3', description: 'OpenAI DALL-E 3', available: true },
      { value: 'gemini', label: 'Gemini 2.0 Flash', description: 'Google Gemini Image Generation', available: true },
      { value: 'comfyui', label: 'ComfyUI', description: 'ComfyUI（準備中）', available: false },
    ]
  }
}
