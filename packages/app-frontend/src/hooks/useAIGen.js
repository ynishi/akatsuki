import { useState, useCallback } from 'react'
import { AIService } from '../services/ai'

/**
 * AI生成カスタムフック
 * プロバイダー切り替え可能なAI統合フック
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
export function useAIGen(defaultProvider = 'openai') {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [provider, setProvider] = useState(defaultProvider)

  /**
   * チャット補完
   */
  const chat = useCallback(
    async (prompt, options = {}) => {
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
        setError(err)
        throw err
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
    async (prompt, onChunk, options = {}) => {
      setLoading(true)
      setError(null)

      try {
        await AIService.chatStream(prompt, onChunk, {
          ...options,
          provider: options.provider || provider,
        })
      } catch (err) {
        setError(err)
        throw err
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
    async (prompt, options = {}) => {
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
        setError(err)
        throw err
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
    async (imageUrl, prompt, options = {}) => {
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
        setError(err)
        throw err
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
    async (text, options = {}) => {
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
        setError(err)
        throw err
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
