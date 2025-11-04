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

export interface PublicProfileData {
  id: string
  userId: string
  username: string | null
  displayName: string | null
  avatarUrl: string | null
  bio: string | null
  createdAt: string
  updatedAt: string
}

export interface PublicProfileDatabaseRecord {
  id: string
  user_id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

export class PublicProfile {
  id: string
  userId: string
  username: string | null
  displayName: string | null
  avatarUrl: string | null
  bio: string | null
  createdAt: string
  updatedAt: string

  constructor({
    id,
    userId,
    username,
    displayName,
    avatarUrl,
    bio,
    createdAt,
    updatedAt,
  }: PublicProfileData) {
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
   */
  static fromDatabase(dbRecord: PublicProfileDatabaseRecord | null): PublicProfile | null {
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
   */
  toUpdateDatabase() {
    const updateData: Partial<{
      username: string | null
      display_name: string | null
      avatar_url: string | null
      bio: string | null
    }> = {}

    if (this.username !== undefined) updateData.username = this.username
    if (this.displayName !== undefined) updateData.display_name = this.displayName
    if (this.avatarUrl !== undefined) updateData.avatar_url = this.avatarUrl
    if (this.bio !== undefined) updateData.bio = this.bio

    return updateData
  }

  /**
   * Get display name (priority: displayName > username > 'Anonymous')
   */
  getDisplayName(): string {
    return this.displayName || this.username || 'Anonymous'
  }

  /**
   * Get avatar URL or return null if not set
   */
  getAvatarUrl(): string | null {
    return this.avatarUrl || null
  }

  /**
   * Check if profile has complete information
   */
  isComplete(): boolean {
    return !!(this.username && this.displayName)
  }

  /**
   * Get formatted creation date
   */
  getFormattedDate(): string {
    if (!this.createdAt) return ''
    return new Date(this.createdAt).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }
}
