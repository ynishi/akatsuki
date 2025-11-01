/**
 * PublicProfileRepository
 * Handles CRUD operations for public_profiles table
 *
 * Design:
 * - public_profiles table stores publicly accessible user information
 * - Anyone can read (SELECT policy: TO authenticated, anon USING (true))
 * - Only owner can write (INSERT/UPDATE/DELETE policies: auth.uid() = user_id)
 *
 * Usage:
 * ```javascript
 * import { PublicProfileRepository } from '../repositories/PublicProfileRepository'
 * import { PublicProfile } from '../models/PublicProfile'
 *
 * // Get public profile by user ID
 * const { data, error } = await PublicProfileRepository.findByUserId(userId)
 * const profile = PublicProfile.fromDatabase(data)
 *
 * // Create new public profile
 * const newProfile = new PublicProfile({ userId, username, displayName, avatarUrl, bio })
 * await PublicProfileRepository.create(newProfile.toDatabase())
 * ```
 */

import { supabase } from '../lib/supabase'

export class PublicProfileRepository {
  /**
   * Get public profile by user ID
   * @param {string} userId - auth.users.id
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  static async findByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from('public_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Record not found
          return { data: null, error: null }
        }
        throw error
      }

      return { data, error: null }
    } catch (error) {
      console.error('PublicProfileRepository.findByUserId error:', error)
      return { data: null, error }
    }
  }

  /**
   * Get public profile by username
   * @param {string} username
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  static async findByUsername(username) {
    try {
      const { data, error } = await supabase
        .from('public_profiles')
        .select('*')
        .eq('username', username)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return { data: null, error: null }
        }
        throw error
      }

      return { data, error: null }
    } catch (error) {
      console.error('PublicProfileRepository.findByUsername error:', error)
      return { data: null, error }
    }
  }

  /**
   * Get multiple public profiles by user IDs
   * @param {Array<string>} userIds - Array of user IDs
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  static async findByUserIds(userIds) {
    try {
      const { data, error } = await supabase
        .from('public_profiles')
        .select('*')
        .in('user_id', userIds)

      if (error) throw error

      return { data: data || [], error: null }
    } catch (error) {
      console.error('PublicProfileRepository.findByUserIds error:', error)
      return { data: [], error }
    }
  }

  /**
   * Create a new public profile
   * Note: Writes to 'profiles' table directly (public_profiles is a VIEW)
   * @param {Object} profileData - Public profile data (DB format)
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  static async create(profileData) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single()

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      console.error('PublicProfileRepository.create error:', error)
      return { data: null, error }
    }
  }

  /**
   * Update a public profile
   * Note: Writes to 'profiles' table directly (public_profiles is a VIEW)
   * @param {string} userId - auth.users.id
   * @param {Object} updates - Update data (DB format)
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  static async update(userId, updates) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      console.error('PublicProfileRepository.update error:', error)
      return { data: null, error }
    }
  }

  /**
   * Delete a public profile
   * Note: Deletes from 'profiles' table directly (public_profiles is a VIEW)
   * @param {string} userId - auth.users.id
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  static async delete(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      console.error('PublicProfileRepository.delete error:', error)
      return { data: null, error }
    }
  }

  /**
   * Check if username is available
   * @param {string} username
   * @param {string} [excludeUserId] - Exclude this user ID (for update checks)
   * @returns {Promise<{available: boolean, error: Error|null}>}
   */
  static async isUsernameAvailable(username, excludeUserId = null) {
    try {
      let query = supabase
        .from('public_profiles')
        .select('user_id')
        .eq('username', username)

      if (excludeUserId) {
        query = query.neq('user_id', excludeUserId)
      }

      const { data, error } = await query

      if (error) throw error

      return { available: data.length === 0, error: null }
    } catch (error) {
      console.error('PublicProfileRepository.isUsernameAvailable error:', error)
      return { available: false, error }
    }
  }

  /**
   * Search public profiles by username pattern
   * @param {string} searchPattern - Search pattern (e.g., "john%")
   * @param {number} limit - Limit number of results
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  static async searchByUsername(searchPattern, limit = 10) {
    try {
      const { data, error } = await supabase
        .from('public_profiles')
        .select('*')
        .ilike('username', searchPattern)
        .limit(limit)

      if (error) throw error

      return { data: data || [], error: null }
    } catch (error) {
      console.error('PublicProfileRepository.searchByUsername error:', error)
      return { data: [], error }
    }
  }

  /**
   * Get total count of public profiles
   * @returns {Promise<{count: number, error: Error|null}>}
   */
  static async count() {
    try {
      const { count, error } = await supabase
        .from('public_profiles')
        .select('*', { count: 'exact', head: true })

      if (error) throw error

      return { count: count || 0, error: null }
    } catch (error) {
      console.error('PublicProfileRepository.count error:', error)
      return { count: 0, error }
    }
  }

  /**
   * Get one random public profile
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  static async getRandomOne() {
    try {
      // Get total count first
      const { count: totalCount, error: countError } = await this.count()
      if (countError) throw countError
      if (totalCount === 0) return { data: null, error: null }

      // Get random offset
      const randomOffset = Math.floor(Math.random() * totalCount)

      const { data, error } = await supabase
        .from('public_profiles')
        .select('*')
        .limit(1)
        .range(randomOffset, randomOffset)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return { data: null, error: null }
        }
        throw error
      }

      return { data, error: null }
    } catch (error) {
      console.error('PublicProfileRepository.getRandomOne error:', error)
      return { data: null, error }
    }
  }
}
