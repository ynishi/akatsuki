import { useState, useCallback } from 'react'
import { ImageGenerationService } from '../services/ImageGenerationService'

/**
 * 画像生成専用カスタムフック
 * ImageGenerationService をラップし、画像生成からStorage保存までを自動化
 *
 * @param {Object} defaultOptions - デフォルトオプション
 * @param {string} defaultOptions.provider - デフォルトプロバイダー ('dalle' | 'gemini')
 * @param {string} defaultOptions.quality - デフォルト品質 ('standard' | 'hd')
 * @param {string} defaultOptions.size - デフォルトサイズ ('1024x1024' | '1792x1024' | '1024x1792')
 * @param {string} defaultOptions.style - デフォルトスタイル ('vivid' | 'natural')
 * @param {string} defaultOptions.storage - デフォルトストレージ ('public' | 'private')
 *
 * @returns {Object} { generate, generateVariation, generateEdit, loading, error, result, sizeOptions, qualityOptions, styleOptions, providerOptions }
 *
 * @example
 * // 基本的な使用
 * function MyComponent() {
 *   const { generate, loading, error, result } = useImageGeneration()
 *
 *   const handleGenerate = async () => {
 *     const image = await generate({
 *       prompt: 'A cute cat playing with yarn',
 *       quality: 'hd'
 *     })
 *     console.log(image.publicUrl)
 *   }
 *
 *   if (loading) return <Skeleton />
 *   if (error) return <p>Error: {error.message}</p>
 *
 *   return (
 *     <div>
 *       <button onClick={handleGenerate}>Generate Image</button>
 *       {result && <img src={result.publicUrl} alt="Generated" />}
 *     </div>
 *   )
 * }
 *
 * @example
 * // デフォルトオプション付き
 * function MyComponent() {
 *   const { generate, sizeOptions, qualityOptions } = useImageGeneration({
 *     provider: 'dalle',
 *     quality: 'hd',
 *     style: 'vivid'
 *   })
 *
 *   return (
 *     <div>
 *       <select>
 *         {sizeOptions.map(opt => (
 *           <option key={opt.value} value={opt.value}>
 *             {opt.label}
 *           </option>
 *         ))}
 *       </select>
 *     </div>
 *   )
 * }
 */
export function useImageGeneration(defaultOptions = {}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  /**
   * 画像を生成してStorage保存
   *
   * @param {Object} options - 生成オプション
   * @param {string} options.prompt - プロンプト（必須）
   * @param {string} options.provider - プロバイダー ('dalle' | 'gemini')
   * @param {string} options.size - サイズ ('1024x1024' | '1792x1024' | '1024x1792')
   * @param {string} options.quality - 品質 ('standard' | 'hd')
   * @param {string} options.style - スタイル ('vivid' | 'natural')
   * @param {Object} options.metadata - 追加メタデータ
   * @returns {Promise<Object>} { id, publicUrl, storagePath, revisedPrompt, provider, model, size, metadata }
   */
  const generate = useCallback(
    async (options) => {
      // Variation モード（sourceImage あり）の場合はプロンプト不要
      // Text-to-Image / Inpainting の場合はプロンプト必須
      if (!options.sourceImage && !options.prompt) {
        const err = new Error('Prompt is required for text-to-image generation')
        setError(err)
        throw err
      }

      setLoading(true)
      setError(null)

      try {
        const data = await ImageGenerationService.generate({
          ...defaultOptions,
          ...options,
        })
        setResult(data)
        return data
      } catch (err) {
        setError(err)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [defaultOptions]
  )

  /**
   * DALL-E で画像生成（ショートカット）
   */
  const generateWithDallE = useCallback(
    async (prompt, options = {}) => {
      return generate({
        prompt,
        provider: 'dalle',
        ...options,
      })
    },
    [generate]
  )

  /**
   * Gemini で画像生成（ショートカット）
   */
  const generateWithGemini = useCallback(
    async (prompt, options = {}) => {
      return generate({
        prompt,
        provider: 'gemini',
        ...options,
      })
    },
    [generate]
  )

  /**
   * バリエーション生成（既存画像から類似画像を生成）
   *
   * Note: DALL-E の Variation API はプロンプト不要（画像のみ）
   * Gemini はプロンプトで指示可能
   *
   * @param {string} sourceImageUrl - 元画像URL
   * @param {Object} options - オプション
   * @returns {Promise<Object>}
   *
   * @example
   * // DALL-E: プロンプト不要
   * const image = await generateVariation(existingImageUrl, { provider: 'dalle' })
   *
   * // Gemini: プロンプトで指示可能
   * const image = await generateVariation(existingImageUrl, {
   *   provider: 'gemini',
   *   prompt: 'Make it look like a watercolor painting'
   * })
   */
  const generateVariation = useCallback(
    async (sourceImageUrl, options = {}) => {
      // Gemini の場合はプロンプトで編集指示可能
      const provider = options.provider || defaultOptions.provider || 'dalle'
      const defaultPrompt = provider === 'gemini'
        ? 'Create a variation of this image'
        : '' // DALL-E は空文字列（プロンプト不要）

      return generate({
        mode: 'variation', // 明示的に mode を指定
        prompt: options.prompt || defaultPrompt,
        sourceImage: sourceImageUrl,
        ...options,
      })
    },
    [generate, defaultOptions]
  )

  /**
   * Edit（画像をプロンプトで編集）
   * Image-to-Image 編集機能（Gemini のみサポート）
   *
   * @param {string} sourceImageUrl - 元画像URL
   * @param {string} prompt - 編集内容の説明
   * @param {Object} options - オプション
   * @returns {Promise<Object>}
   *
   * @example
   * // Gemini で画像編集
   * const image = await generateEdit(imageUrl, 'Add a wizard hat to the cat', { provider: 'gemini' })
   */
  const generateEdit = useCallback(
    async (sourceImageUrl, prompt, options = {}) => {
      return generate({
        mode: 'edit',
        prompt,
        sourceImage: sourceImageUrl,
        provider: 'gemini', // Edit mode は Gemini のみサポート
        ...options,
      })
    },
    [generate]
  )

  return {
    // メソッド
    generate,
    generateWithDallE,
    generateWithGemini,
    generateVariation,
    generateEdit,

    // 状態
    loading,
    error,
    result,

    // オプションヘルパー
    sizeOptions: ImageGenerationService.getSizeOptions(),
    qualityOptions: ImageGenerationService.getQualityOptions(),
    styleOptions: ImageGenerationService.getStyleOptions(),
    providerOptions: ImageGenerationService.getProviderOptions(),
  }
}
