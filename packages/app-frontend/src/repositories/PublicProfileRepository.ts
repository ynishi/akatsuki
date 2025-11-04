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
 * ```typescript
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
import type { PublicProfileDatabaseRecord } from '../models/PublicProfile'

interface RepositoryResult<T> {
  data: T
  error: null
}

interface RepositoryError {
  data: null
  error: Error
}

type RepositoryResponse<T> = RepositoryResult<T> | RepositoryError

export class PublicProfileRepository {
  /**
   * Get public profile by user ID
   */
  static async findByUserId(userId: string): Promise<RepositoryResponse<PublicProfileDatabaseRecord | null>> {
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

      return { data: data as PublicProfileDatabaseRecord, error: null }
    } catch (error) {
      console.error('PublicProfileRepository.findByUserId error:', error)
      return { data: null, error: error as Error }
    }
  }

  /**
   * Get public profile by username
   */
  static async findByUsername(username: string): Promise<RepositoryResponse<PublicProfileDatabaseRecord | null>> {
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

      return { data: data as PublicProfileDatabaseRecord, error: null }
    } catch (error) {
      console.error('PublicProfileRepository.findByUsername error:', error)
      return { data: null, error: error as Error }
    }
  }

  /**
   * Get multiple public profiles by user IDs
   */
  static async findByUserIds(userIds: string[]): Promise<RepositoryResponse<PublicProfileDatabaseRecord[]>> {
    try {
      const { data, error } = await supabase
        .from('public_profiles')
        .select('*')
        .in('user_id', userIds)

      if (error) throw error

      return { data: (data || []) as PublicProfileDatabaseRecord[], error: null }
    } catch (error) {
      console.error('PublicProfileRepository.findByUserIds error:', error)
      return { data: [], error: error as Error }
    }
  }

  /**
   * Create a new public profile
   * Note: Writes to 'profiles' table directly (public_profiles is a VIEW)
   */
  static async create(profileData: Partial<PublicProfileDatabaseRecord>): Promise<RepositoryResponse<PublicProfileDatabaseRecord | null>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single()

      if (error) throw error

      return { data: data as PublicProfileDatabaseRecord, error: null }
    } catch (error) {
      console.error('PublicProfileRepository.create error:', error)
      return { data: null, error: error as Error }
    }
  }

  /**
   * Update a public profile
   * Note: Writes to 'profiles' table directly (public_profiles is a VIEW)
   */
  static async update(userId: string, updates: Partial<PublicProfileDatabaseRecord>): Promise<RepositoryResponse<PublicProfileDatabaseRecord | null>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error

      return { data: data as PublicProfileDatabaseRecord, error: null }
    } catch (error) {
      console.error('PublicProfileRepository.update error:', error)
      return { data: null, error: error as Error }
    }
  }

  /**
   * Delete a public profile
   * Note: Deletes from 'profiles' table directly (public_profiles is a VIEW)
   */
  static async delete(userId: string): Promise<RepositoryResponse<PublicProfileDatabaseRecord | null>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error

      return { data: data as PublicProfileDatabaseRecord, error: null }
    } catch (error) {
      console.error('PublicProfileRepository.delete error:', error)
      return { data: null, error: error as Error }
    }
  }

  /**
   * Check if username is available
   */
  static async isUsernameAvailable(username: string, excludeUserId: string | null = null): Promise<{ available: boolean; error: Error | null }> {
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
      return { available: false, error: error as Error }
    }
  }

  /**
   * Search public profiles by username pattern
   */
  static async searchByUsername(searchPattern: string, limit = 10): Promise<RepositoryResponse<PublicProfileDatabaseRecord[]>> {
    try {
      const { data, error } = await supabase
        .from('public_profiles')
        .select('*')
        .ilike('username', searchPattern)
        .limit(limit)

      if (error) throw error

      return { data: (data || []) as PublicProfileDatabaseRecord[], error: null }
    } catch (error) {
      console.error('PublicProfileRepository.searchByUsername error:', error)
      return { data: [], error: error as Error }
    }
  }

  /**
   * Get total count of public profiles
   */
  static async count(): Promise<{ count: number; error: Error | null }> {
    try {
      const { count, error } = await supabase
        .from('public_profiles')
        .select('*', { count: 'exact', head: true })

      if (error) throw error

      return { count: count || 0, error: null }
    } catch (error) {
      console.error('PublicProfileRepository.count error:', error)
      return { count: 0, error: error as Error }
    }
  }

  /**
   * Get one random public profile
   */
  static async getRandomOne(): Promise<RepositoryResponse<PublicProfileDatabaseRecord | null>> {
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

      return { data: data as PublicProfileDatabaseRecord, error: null }
    } catch (error) {
      console.error('PublicProfileRepository.getRandomOne error:', error)
      return { data: null, error: error as Error }
    }
  }
}
