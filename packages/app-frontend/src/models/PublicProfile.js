/**
 * PublicProfile Model
 * Represents publicly accessible user profile information
 *
 * Design:
 * - This model represents data from the public_profiles table
 * - Only contains information that can be safely displayed to all users
 * - Used in galleries, comments, and other public displays
 * - For private profile data, use UserProfile model instead
 */

export class PublicProfile {
  constructor({
    id,
    userId,
    username,
    displayName,
    avatarUrl,
    bio,
    createdAt,
    updatedAt,
  }) {
    this.id = id
    this.userId = userId
    this.username = username
    this.displayName = displayName
    this.avatarUrl = avatarUrl
    this.bio = bio
    this.createdAt = createdAt
    this.updatedAt = updatedAt
  }

  /**
   * Convert database record to PublicProfile model
   * @param {Object} dbRecord - Database record
   * @returns {PublicProfile}
   */
  static fromDatabase(dbRecord) {
    if (!dbRecord) return null

    return new PublicProfile({
      id: dbRecord.id,
      userId: dbRecord.user_id,
      username: dbRecord.username,
      displayName: dbRecord.display_name,
      avatarUrl: dbRecord.avatar_url,
      bio: dbRecord.bio,
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at,
    })
  }

  /**
   * Convert PublicProfile model to database insert format
   * @returns {Object}
   */
  toDatabase() {
    return {
      user_id: this.userId,
      username: this.username,
      display_name: this.displayName,
      avatar_url: this.avatarUrl,
      bio: this.bio,
    }
  }

  /**
   * Convert PublicProfile model to database update format
   * @returns {Object}
   */
  toUpdateDatabase() {
    const updateData = {}

    if (this.username !== undefined) updateData.username = this.username
    if (this.displayName !== undefined) updateData.display_name = this.displayName
    if (this.avatarUrl !== undefined) updateData.avatar_url = this.avatarUrl
    if (this.bio !== undefined) updateData.bio = this.bio

    return updateData
  }

  /**
   * Get display name (priority: displayName > username > 'Anonymous')
   * @returns {string}
   */
  getDisplayName() {
    return this.displayName || this.username || 'Anonymous'
  }

  /**
   * Get avatar URL or return null if not set
   * @returns {string|null}
   */
  getAvatarUrl() {
    return this.avatarUrl || null
  }

  /**
   * Check if profile has complete information
   * @returns {boolean}
   */
  isComplete() {
    return !!(this.username && this.displayName)
  }

  /**
   * Get formatted creation date
   * @returns {string}
   */
  getFormattedDate() {
    if (!this.createdAt) return ''
    return new Date(this.createdAt).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }
}
