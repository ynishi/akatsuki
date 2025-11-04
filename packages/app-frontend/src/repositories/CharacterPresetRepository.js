import { supabase } from '../lib/supabase'

/**
 * CharacterPreset Repository
 * Access to character_presets table
 */
export class CharacterPresetRepository {
  /**
   * Get all presets
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  static async findAll() {
    const { data, error } = await supabase
      .from('character_presets')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Failed to fetch character presets:', error)
      return { data: null, error }
    }

    return { data, error: null }
  }

  /**
   * Get presets by category
   * @param {string} category - Category name
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  static async findByCategory(category) {
    const { data, error } = await supabase
      .from('character_presets')
      .select('*')
      .eq('category', category)
      .order('display_order', { ascending: true })

    if (error) {
      console.error(`Failed to fetch presets for category ${category}:`, error)
      return { data: null, error }
    }

    return { data, error: null }
  }

  /**
   * Get presets grouped by category
   * @returns {Promise<{data: Object, error: Error|null}>}
   */
  static async findAllGroupedByCategory() {
    const { data, error } = await this.findAll()

    if (error) {
      return { data: null, error }
    }

    // Group by category
    const grouped = data.reduce((acc, preset) => {
      if (!acc[preset.category]) {
        acc[preset.category] = []
      }
      acc[preset.category].push(preset)
      return acc
    }, {})

    return { data: grouped, error: null }
  }

  /**
   * Get preset by ID
   * @param {string} id - Preset ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  static async findById(id) {
    const { data, error } = await supabase
      .from('character_presets')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: null }
      }
      console.error(`Failed to fetch preset ${id}:`, error)
      return { data: null, error }
    }

    return { data, error: null }
  }

  /**
   * Get multiple presets by IDs
   * @param {Array<string>} ids - Preset IDs
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  static async findByIds(ids) {
    if (!ids || ids.length === 0) {
      return { data: [], error: null }
    }

    const { data, error } = await supabase
      .from('character_presets')
      .select('*')
      .in('id', ids)

    if (error) {
      console.error('Failed to fetch presets by IDs:', error)
      return { data: null, error }
    }

    return { data, error: null }
  }

  /**
   * Create a new preset
   * @param {Object} presetData - Preset data
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  static async create(presetData) {
    const { data, error } = await supabase
      .from('character_presets')
      .insert(presetData)
      .select()
      .single()

    if (error) {
      console.error('Failed to create preset:', error)
      return { data: null, error }
    }

    return { data, error: null }
  }

  /**
   * Update a preset
   * @param {string} id - Preset ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  static async update(id, updates) {
    const { data, error } = await supabase
      .from('character_presets')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error(`Failed to update preset ${id}:`, error)
      return { data: null, error }
    }

    return { data, error: null }
  }

  /**
   * Delete a preset
   * @param {string} id - Preset ID
   * @returns {Promise<{data: null, error: Error|null}>}
   */
  static async delete(id) {
    const { error } = await supabase
      .from('character_presets')
      .delete()
      .eq('id', id)

    if (error) {
      console.error(`Failed to delete preset ${id}:`, error)
      return { data: null, error }
    }

    return { data: null, error: null }
  }
}
