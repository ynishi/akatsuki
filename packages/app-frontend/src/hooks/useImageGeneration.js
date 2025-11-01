import { useMutation } from '@tanstack/react-query'
import { ImageGenerationService } from '../services/ImageGenerationService'

/**
 * 画像生成専用カスタムフック (React Query版)
 * ImageGenerationService をラップし、画像生成からStorage保存までを自動化
 *
 * @param {Object} defaultOptions - デフォルトオプション
 * @param {string} defaultOptions.provider - デフォルトプロバイダー ('dalle' | 'gemini')
 * @param {string} defaultOptions.quality - デフォルト品質 ('standard' | 'hd')
 * @param {string} defaultOptions.size - デフォルトサイズ ('1024x1024' | '1792x1024' | '1024x1792')
 * @param {string} defaultOptions.style - デフォルトスタイル ('vivid' | 'natural')
 * @param {string} defaultOptions.storage - デフォルトストレージ ('public' | 'private')
 *
 * @returns {Object} { generate, generateAsync, isPending, isError, error, data, reset, ... }
 *
 * @example
 * // ✅ 方法1: Fire-and-forget（結果は data で取得）
 * function MyComponent() {
 *   const { generate, isPending, isError, error, data } = useImageGeneration()
 *
 *   const handleGenerate = () => {
 *     generate({
 *       prompt: 'A cute cat playing with yarn',
 *       quality: 'hd'
 *     })
 *   }
 *
 *   if (isPending) return <Skeleton />
 *   if (isError) return <p>Error: {error.message}</p>
 *
 *   return (
 *     <div>
 *       <button onClick={handleGenerate}>Generate Image</button>
 *       {data && <img src={data.publicUrl} alt="Generated" />}
 *     </div>
 *   )
 * }
 *
 * @example
 * // ✅ 方法2: async/await で結果を直接取得
 * function MyComponent() {
 *   const { generateAsync, isPending } = useImageGeneration()
 *
 *   const handleGenerate = async () => {
 *     try {
 *       const image = await generateAsync({ prompt: 'A cat' })
 *       console.log(image.publicUrl)  // 結果を直接使用
 *     } catch (error) {
 *       console.error(error)
 *     }
 *   }
 * }
 *
 * @example
 * // ❌ 間違い: mutate() の結果を await しようとする
 * function MyComponent() {
 *   const { generate } = useImageGeneration()
 *
 *   const handleGenerate = async () => {
 *     const result = await generate({ prompt: 'A cat' })  // undefined
 *     console.log(result.publicUrl)  // エラー！
 *   }
 * }
 */
export function useImageGeneration(defaultOptions = {}) {
  // React Query Mutation
  const mutation = useMutation({
    mutationFn: async (options) => {
      const { data, error } = await ImageGenerationService.generate({
        ...defaultOptions,
        ...options,
      })

      if (error) throw error
      return data
    },
  })

  return {
    // 基本メソッド
    generate: mutation.mutate,
    generateAsync: mutation.mutateAsync,

    // ショートカット
    generateWithDallE: (prompt, options = {}) => {
      return mutation.mutateAsync({ prompt, provider: 'dalle', ...options })
    },
    generateWithGemini: (prompt, options = {}) => {
      return mutation.mutateAsync({ prompt, provider: 'gemini', ...options })
    },
    generateVariation: (sourceImageUrl, options = {}) => {
      const provider = options.provider || defaultOptions.provider || 'dalle'
      const defaultPrompt = provider === 'gemini' ? 'Create a variation of this image' : ''
      return mutation.mutateAsync({
        mode: 'variation',
        prompt: options.prompt || defaultPrompt,
        sourceImage: sourceImageUrl,
        ...options,
      })
    },
    generateEdit: (sourceImageUrl, prompt, options = {}) => {
      return mutation.mutateAsync({
        mode: 'edit',
        prompt,
        sourceImage: sourceImageUrl,
        provider: 'gemini',
        ...options,
      })
    },

    // React Query 状態
    isPending: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,

    // 互換性のため（既存コードが使用）
    loading: mutation.isPending,
    result: mutation.data,

    // オプションヘルパー
    sizeOptions: ImageGenerationService.getSizeOptions(),
    qualityOptions: ImageGenerationService.getQualityOptions(),
    styleOptions: ImageGenerationService.getStyleOptions(),
    providerOptions: ImageGenerationService.getProviderOptions(),
  }
}
