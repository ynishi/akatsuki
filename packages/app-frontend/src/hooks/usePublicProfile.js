/**
 * usePublicProfile Hook (React Query版)
 * Manages public profile state and operations
 *
 * Usage:
 * ```javascript
 * const { profile, isLoading, error, refetch, updateProfile } = usePublicProfile(userId)
 * ```
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PublicProfileRepository } from '../repositories/PublicProfileRepository'
import { PublicProfile } from '../models/PublicProfile'

export function usePublicProfile(userId, { autoLoad = true } = {}) {
  const queryClient = useQueryClient()

  /**
   * Query: プロフィール取得
   */
  const query = useQuery({
    queryKey: ['publicProfile', userId],
    queryFn: async () => {
      const { data, error } = await PublicProfileRepository.findByUserId(userId)
      if (error) throw error
      return data ? PublicProfile.fromDatabase(data) : null
    },
    enabled: !!userId && autoLoad,
  })

  /**
   * Mutation: プロフィール更新
   */
  const updateMutation = useMutation({
    mutationFn: async (updates) => {
      const { data, error } = await PublicProfileRepository.update(userId, updates)
      if (error) throw error
      return PublicProfile.fromDatabase(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publicProfile', userId] })
    },
  })

  /**
   * Mutation: プロフィール作成
   */
  const createMutation = useMutation({
    mutationFn: async (profileData) => {
      const { data, error } = await PublicProfileRepository.create(profileData)
      if (error) throw error
      return PublicProfile.fromDatabase(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publicProfile', userId] })
    },
  })

  /**
   * Mutation: プロフィール削除
   */
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await PublicProfileRepository.delete(userId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publicProfile', userId] })
    },
  })

  return {
    // Query状態
    profile: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,

    // Mutation
    updateProfile: updateMutation.mutate,
    updateProfileAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,

    createProfile: createMutation.mutate,
    createProfileAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,

    deleteProfile: deleteMutation.mutate,
    deleteProfileAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,

    // 互換性のため（既存コードが使用）
    loading: query.isLoading,
    refresh: query.refetch,
  }
}

/**
 * usePublicProfileByUsername Hook (React Query版)
 * Load public profile by username
 */
export function usePublicProfileByUsername(username, { autoLoad = true } = {}) {
  const query = useQuery({
    queryKey: ['publicProfile', 'username', username],
    queryFn: async () => {
      const { data, error } = await PublicProfileRepository.findByUsername(username)
      if (error) throw error
      return data ? PublicProfile.fromDatabase(data) : null
    },
    enabled: !!username && autoLoad,
  })

  return {
    profile: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,

    // 互換性のため
    loading: query.isLoading,
    refresh: query.refetch,
  }
}
