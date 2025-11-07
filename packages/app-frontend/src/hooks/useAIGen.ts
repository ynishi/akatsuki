import { useState, useCallback } from 'react'
import { AIService, ProviderName, ChatResponse, ImageResponse, AIServiceOptions } from '../services/ai'
import type { ImageGenerationOptions } from '../services/ai'

/**
 * useAIGen hook return type
 */
export interface UseAIGenReturn {
  chat: (prompt: string, options?: AIServiceOptions) => Promise<ChatResponse>
  chatStream: (prompt: string, onChunk: (chunk: string) => void, options?: AIServiceOptions) => Promise<void>
  generateImage: (prompt: string, options?: ImageGenerationOptions & { provider?: ProviderName }) => Promise<ImageResponse>
  editImage: (imageUrl: string, prompt: string, options?: ImageGenerationOptions & { provider?: ProviderName }) => Promise<ImageResponse>
  embed: (text: string, options?: Record<string, unknown> & { provider?: ProviderName }) => Promise<number[]>
  loading: boolean
  error: Error | null
  result: ChatResponse | ImageResponse | number[] | null
  provider: ProviderName
  setProvider: (provider: ProviderName) => void
}

/**
 * AI生成カスタムフック
 * プロバイダー切り替え可能なAI統合フック
 *
 * @param defaultProvider - デフォルトプロバイダー
 * @returns Hook return object
 *
 * @example
 * const { chat, generateImage, loading, error, result } = useAIGen('openai')
 *
 * // チャット
 * const response = await chat('こんにちは')
 *
 * // 画像生成
 * const image = await generateImage('猫の絵')
 */
export function useAIGen(defaultProvider: ProviderName = 'openai'): UseAIGenReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [result, setResult] = useState<ChatResponse | ImageResponse | number[] | null>(null)
  const [provider, setProvider] = useState<ProviderName>(defaultProvider)

  /**
   * チャット補完
   */
  const chat = useCallback(
    async (prompt: string, options: AIServiceOptions = {}): Promise<ChatResponse> => {
      setLoading(true)
      setError(null)

      try {
        const data = await AIService.chat(prompt, {
          ...options,
          provider: options.provider || provider,
        })
        setResult(data)
        return data
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        throw error
      } finally {
        setLoading(false)
      }
    },
    [provider]
  )

  /**
   * ストリーミングチャット補完
   */
  const chatStream = useCallback(
    async (prompt: string, onChunk: (chunk: string) => void, options: AIServiceOptions = {}): Promise<void> => {
      setLoading(true)
      setError(null)

      try {
        await AIService.chatStream(prompt, onChunk, {
          ...options,
          provider: options.provider || provider,
        })
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        throw error
      } finally {
        setLoading(false)
      }
    },
    [provider]
  )

  /**
   * 画像生成
   */
  const generateImage = useCallback(
    async (prompt: string, options: ImageGenerationOptions & { provider?: ProviderName } = {}): Promise<ImageResponse> => {
      setLoading(true)
      setError(null)

      try {
        const data = await AIService.generateImage(prompt, {
          ...options,
          provider: options.provider || provider,
        })
        setResult(data)
        return data
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        throw error
      } finally {
        setLoading(false)
      }
    },
    [provider]
  )

  /**
   * 画像編集
   */
  const editImage = useCallback(
    async (imageUrl: string, prompt: string, options: ImageGenerationOptions & { provider?: ProviderName } = {}): Promise<ImageResponse> => {
      setLoading(true)
      setError(null)

      try {
        const data = await AIService.editImage(imageUrl, prompt, {
          ...options,
          provider: options.provider || provider,
        })
        setResult(data)
        return data
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        throw error
      } finally {
        setLoading(false)
      }
    },
    [provider]
  )

  /**
   * 埋め込み生成
   */
  const embed = useCallback(
    async (text: string, options: Record<string, unknown> & { provider?: ProviderName } = {}): Promise<number[]> => {
      setLoading(true)
      setError(null)

      try {
        const data = await AIService.embed(text, {
          ...options,
          provider: options.provider || provider,
        })
        setResult(data)
        return data
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        throw error
      } finally {
        setLoading(false)
      }
    },
    [provider]
  )

  return {
    // メソッド
    chat,
    chatStream,
    generateImage,
    editImage,
    embed,

    // 状態
    loading,
    error,
    result,

    // プロバイダー管理
    provider,
    setProvider,
  }
}
