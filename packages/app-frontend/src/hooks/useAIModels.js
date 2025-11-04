import { useState, useEffect } from 'react'
import { AIModelRepository } from '@/repositories/AIModelRepository'

/**
 * AIモデル取得カスタムフック
 * ComponentsがRepositoryを直接使わないためのラッパー
 *
 * @param {Object} filters - フィルター条件
 * @param {string} filters.provider - プロバイダー名
 * @param {boolean} filters.isBasic - Basic/Advanced
 * @param {boolean} filters.activeOnly - アクティブのみ
 * @returns {Object} { models, loading, error, providers }
 *
 * @example
 * const { models, loading, error } = useAIModels({ provider: 'openai', activeOnly: true })
 */
export function useAIModels(filters = {}) {
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoading(true)
        const data = await AIModelRepository.findByFilters(filters)
        setModels(data)
        setError(null)
      } catch (err) {
        setError(err)
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
 * @returns {Object} { providers, loading, error }
 *
 * @example
 * const { providers } = useAIProviders()
 */
export function useAIProviders() {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        setLoading(true)
        const data = await AIModelRepository.getProviders()
        setProviders(data)
        setError(null)
      } catch (err) {
        setError(err)
        console.error('Failed to fetch AI providers:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProviders()
  }, [])

  return { providers, loading, error }
}
