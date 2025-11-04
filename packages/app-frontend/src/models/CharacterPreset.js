/**
 * CharacterPreset Model
 * Character generation preset master data
 */
export class CharacterPreset {
  constructor({
    id = null,
    category,
    nameEn,
    nameJa,
    promptEn,
    thumbnailUrl = null,
    displayOrder = 0,
    createdAt = null,
  } = {}) {
    this.id = id
    this.category = category // 'hairstyle', 'body_type', 'costume', etc.
    this.nameEn = nameEn
    this.nameJa = nameJa
    this.promptEn = promptEn
    this.thumbnailUrl = thumbnailUrl
    this.displayOrder = displayOrder
    this.createdAt = createdAt
  }

  /**
   * Create instance from database record
   * @param {Object} data - Database record
   * @returns {CharacterPreset}
   */
  static fromDatabase(data) {
    return new CharacterPreset({
      id: data.id,
      category: data.category,
      nameEn: data.name_en,
      nameJa: data.name_ja,
      promptEn: data.prompt_en,
      thumbnailUrl: data.thumbnail_url,
      displayOrder: data.display_order,
      createdAt: data.created_at,
    })
  }

  /**
   * Check if this is a special preset (Random or No Preference)
   * @returns {boolean}
   */
  isSpecial() {
    return this.promptEn === 'RANDOM' || this.promptEn === 'NONE'
  }

  /**
   * Check if this is a random preset
   * @returns {boolean}
   */
  isRandom() {
    return this.promptEn === 'RANDOM'
  }

  /**
   * Check if this is a no preference preset
   * @returns {boolean}
   */
  isNoPreference() {
    return this.promptEn === 'NONE'
  }
}
