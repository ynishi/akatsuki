import { useState, useEffect } from 'react'
import { AIModelRepository } from '@/repositories/AIModelRepository'
import type { AIModel } from '@/models/AIModel'

/**
 * AI model filters
 */
export interface AIModelFilters {
  provider?: string
  isBasic?: boolean
  activeOnly?: boolean
}

/**
 * useAIModels hook return type
 */
export interface UseAIModelsReturn {
  models: AIModel[]
  loading: boolean
  error: Error | null
}

/**
 * useAIProviders hook return type
 */
export interface UseAIProvidersReturn {
  providers: string[]
  loading: boolean
  error: Error | null
}

/**
 * AIモデル取得カスタムフック
 * ComponentsがRepositoryを直接使わないためのラッパー
 *
 * @param filters - フィルター条件
 * @returns Hook return object
 *
 * @example
 * const { models, loading, error } = useAIModels({ provider: 'openai', activeOnly: true })
 */
export function useAIModels(filters: AIModelFilters = {}): UseAIModelsReturn {
  const [models, setModels] = useState<AIModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoading(true)
        const data = await AIModelRepository.findByFilters(filters)
        setModels(data)
        setError(null)
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        console.error('Failed to fetch AI models:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchModels()
  }, [JSON.stringify(filters)]) // eslint-disable-line react-hooks/exhaustive-deps

  return { models, loading, error }
}

/**
 * AIプロバイダー一覧取得フック
 *
 * @returns Hook return object
 *
 * @example
 * const { providers } = useAIProviders()
 */
export function useAIProviders(): UseAIProvidersReturn {
  const [providers, setProviders] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        setLoading(true)
        const data = await AIModelRepository.getProviders()
        setProviders(data)
        setError(null)
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        console.error('Failed to fetch AI providers:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProviders()
  }, [])

  return { providers, loading, error }
}
