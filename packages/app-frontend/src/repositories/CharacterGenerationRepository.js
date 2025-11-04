import { supabase } from '../lib/supabase'

/**
 * CharacterGeneration Repository
 * Access to character_generations table
 */
export class CharacterGenerationRepository {
  /**
   * Create new generation record
   * @param {Object} data - Generation data
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  static async create(data) {
    const { data: created, error } = await supabase
      .from('character_generations')
      .insert(data)
      .select()
      .single()

    if (error) {
      console.error('Failed to create character generation:', error)
      return { data: null, error }
    }

    return { data: created, error: null }
  }

  /**
   * Get user's generation history
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Limit
   * @param {number} options.offset - Offset
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  static async findByUserId(userId, { limit = 50, offset = 0 } = {}) {
    const { data, error } = await supabase
      .from('character_generations')
      .select(`
        *,
        files(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Failed to fetch character generations:', error)
      return { data: null, error }
    }

    return { data, error: null }
  }

  /**
   * Get generation by ID
   * @param {string} id - Generation ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  static async findById(id) {
    const { data, error } = await supabase
      .from('character_generations')
      .select(`
        *,
        files(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: null }
      }
      console.error(`Failed to fetch generation ${id}:`, error)
      return { data: null, error }
    }

    return { data, error: null }
  }

  /**
   * Delete generation
   * @param {string} id - Generation ID
   * @returns {Promise<{data: boolean, error: Error|null}>}
   */
  static async delete(id) {
    const { error } = await supabase
      .from('character_generations')
      .delete()
      .eq('id', id)

    if (error) {
      console.error(`Failed to delete generation ${id}:`, error)
      return { data: false, error }
    }

    return { data: true, error: null }
  }

  /**
   * Count user's generations
   * @param {string} userId - User ID
   * @returns {Promise<{data: number, error: Error|null}>}
   */
  static async countByUserId(userId) {
    const { count, error } = await supabase
      .from('character_generations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (error) {
      console.error('Failed to count generations:', error)
      return { data: 0, error }
    }

    return { data: count, error: null }
  }
}
