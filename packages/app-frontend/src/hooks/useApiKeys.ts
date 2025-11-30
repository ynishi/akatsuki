/**
 * useApiKeys Hook
 * React Query hook for API Key management
 *
 * VibeCoding Standard:
 * - useQuery for fetching
 * - useMutation for create/update/delete
 * - Automatic cache invalidation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiKeyRepository } from '../repositories/ApiKeyRepository'
import { useAuth } from '../contexts/AuthContext'
import type { ApiKeyCreateInput, ApiKeyOperation } from '../models/ApiKey'

const QUERY_KEY = 'api-keys'

interface UseApiKeysOptions {
  entityName?: string
}

export function useApiKeys(options: UseApiKeysOptions = {}) {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  // ==========================================================================
  // Queries
  // ==========================================================================

  const {
    data: apiKeys,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, options.entityName],
    queryFn: async () => {
      if (options.entityName) {
        return apiKeyRepository.listByEntity(options.entityName)
      }
      return apiKeyRepository.list()
    },
    enabled: !!user,
  })

  // ==========================================================================
  // Mutations
  // ==========================================================================

  const createMutation = useMutation({
    mutationFn: async (input: ApiKeyCreateInput) => {
      if (!user) throw new Error('Not authenticated')
      return apiKeyRepository.create(input, user.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: {
        name?: string
        description?: string | null
        allowedOperations?: ApiKeyOperation[]
        rateLimitPerMinute?: number
        rateLimitPerDay?: number
        expiresAt?: string | null
        isActive?: boolean
      }
    }) => {
      return apiKeyRepository.update(id, updates)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiKeyRepository.toggleActive(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiKeyRepository.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })

  // ==========================================================================
  // Convenience functions
  // ==========================================================================

  const createApiKey = (input: ApiKeyCreateInput) => {
    return createMutation.mutateAsync(input)
  }

  const updateApiKey = (id: string, updates: Parameters<typeof updateMutation.mutateAsync>[0]['updates']) => {
    return updateMutation.mutateAsync({ id, updates })
  }

  const toggleApiKeyActive = (id: string) => {
    return toggleActiveMutation.mutateAsync(id)
  }

  const deleteApiKey = (id: string) => {
    return deleteMutation.mutateAsync(id)
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  const totalKeys = apiKeys?.length ?? 0
  const activeKeys = apiKeys?.filter((k) => k.isActive && !k.isExpired()).length ?? 0
  const totalRequests = apiKeys?.reduce((sum, k) => sum + k.requestCount, 0) ?? 0

  return {
    // Data
    apiKeys,
    isLoading,
    error,
    refetch,

    // Mutations
    createApiKey,
    isCreating: createMutation.isPending,
    createError: createMutation.error,

    updateApiKey,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,

    toggleApiKeyActive,
    isToggling: toggleActiveMutation.isPending,

    deleteApiKey,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,

    // Statistics
    totalKeys,
    activeKeys,
    totalRequests,
  }
}

// ==========================================================================
// Single API Key Hook
// ==========================================================================

export function useApiKey(id: string | null) {
  const queryClient = useQueryClient()

  const {
    data: apiKey,
    isLoading,
    error,
  } = useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: async () => {
      if (!id) return null
      return apiKeyRepository.get(id)
    },
    enabled: !!id,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
  }

  return {
    apiKey,
    isLoading,
    error,
    invalidate,
  }
}
