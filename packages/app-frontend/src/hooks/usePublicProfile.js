/**
 * usePublicProfile Hook
 * Manages public profile state and operations
 *
 * Usage:
 * ```javascript
 * const { profile, loading, error, refresh, updateProfile } = usePublicProfile(userId)
 * ```
 */

import { useState, useEffect, useCallback } from 'react'
import { PublicProfileRepository } from '../repositories/PublicProfileRepository'
import { PublicProfile } from '../models/PublicProfile'

export function usePublicProfile(userId, { autoLoad = true } = {}) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Load public profile
   */
  const loadProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await PublicProfileRepository.findByUserId(userId)

      if (fetchError) throw fetchError

      const profileModel = data ? PublicProfile.fromDatabase(data) : null
      setProfile(profileModel)
    } catch (err) {
      console.error('usePublicProfile.loadProfile error:', err)
      setError(err.message || 'Failed to load public profile')
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [userId])

  /**
   * Refresh profile
   */
  const refresh = useCallback(() => {
    loadProfile()
  }, [loadProfile])

  /**
   * Update public profile
   */
  const updateProfile = useCallback(
    async (updates) => {
      if (!userId) {
        throw new Error('User ID is required to update profile')
      }

      setLoading(true)
      setError(null)

      try {
        const { data, error: updateError } = await PublicProfileRepository.update(userId, updates)

        if (updateError) throw updateError

        const updatedProfile = PublicProfile.fromDatabase(data)
        setProfile(updatedProfile)

        return { data: updatedProfile, error: null }
      } catch (err) {
        console.error('usePublicProfile.updateProfile error:', err)
        const errorMessage = err.message || 'Failed to update public profile'
        setError(errorMessage)
        return { data: null, error: err }
      } finally {
        setLoading(false)
      }
    },
    [userId]
  )

  /**
   * Create public profile
   */
  const createProfile = useCallback(
    async (profileData) => {
      setLoading(true)
      setError(null)

      try {
        const { data, error: createError } = await PublicProfileRepository.create(profileData)

        if (createError) throw createError

        const newProfile = PublicProfile.fromDatabase(data)
        setProfile(newProfile)

        return { data: newProfile, error: null }
      } catch (err) {
        console.error('usePublicProfile.createProfile error:', err)
        const errorMessage = err.message || 'Failed to create public profile'
        setError(errorMessage)
        return { data: null, error: err }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  /**
   * Delete public profile
   */
  const deleteProfile = useCallback(async () => {
    if (!userId) {
      throw new Error('User ID is required to delete profile')
    }

    setLoading(true)
    setError(null)

    try {
      const { error: deleteError } = await PublicProfileRepository.delete(userId)

      if (deleteError) throw deleteError

      setProfile(null)

      return { error: null }
    } catch (err) {
      console.error('usePublicProfile.deleteProfile error:', err)
      const errorMessage = err.message || 'Failed to delete public profile'
      setError(errorMessage)
      return { error: err }
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Auto-load on mount or when userId changes
  useEffect(() => {
    if (autoLoad) {
      loadProfile()
    }
  }, [autoLoad, loadProfile])

  return {
    profile,
    loading,
    error,
    refresh,
    updateProfile,
    createProfile,
    deleteProfile,
  }
}

/**
 * usePublicProfileByUsername Hook
 * Load public profile by username
 */
export function usePublicProfileByUsername(username, { autoLoad = true } = {}) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadProfile = useCallback(async () => {
    if (!username) {
      setProfile(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await PublicProfileRepository.findByUsername(username)

      if (fetchError) throw fetchError

      const profileModel = data ? PublicProfile.fromDatabase(data) : null
      setProfile(profileModel)
    } catch (err) {
      console.error('usePublicProfileByUsername.loadProfile error:', err)
      setError(err.message || 'Failed to load public profile')
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [username])

  useEffect(() => {
    if (autoLoad) {
      loadProfile()
    }
  }, [autoLoad, loadProfile])

  return {
    profile,
    loading,
    error,
    refresh: loadProfile,
  }
}
