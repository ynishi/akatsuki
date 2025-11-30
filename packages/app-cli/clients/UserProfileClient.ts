/**
 * UserProfile API Client (app-cli)
 * Default client for CLI typecheck verification
 *
 * Usage:
 * ```typescript
 * import { AkatsukiClient } from '../client.js'
 * import { UserProfileClient } from './UserProfileClient.js'
 *
 * const client = new AkatsukiClient()
 * await client.login(email, password)
 *
 * const profileClient = new UserProfileClient(client)
 * const profile = await profileClient.getMyProfile()
 * ```
 */

import { AkatsukiClient } from '../client.js'

/**
 * UserProfile type
 */
export interface UserProfile {
  id: string
  user_id: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

/**
 * UserProfile create input
 */
export interface UserProfileCreateInput {
  displayName?: string
  avatarUrl?: string
  bio?: string
}

/**
 * UserProfile update input
 */
export interface UserProfileUpdateInput {
  displayName?: string
  avatarUrl?: string
  bio?: string
}

/**
 * UserProfile API Client
 */
export class UserProfileClient {
  constructor(private client: AkatsukiClient) {}

  /**
   * Get my profile
   */
  async getMyProfile(): Promise<UserProfile> {
    return this.client.invoke<UserProfile>('user-profiles-crud', {
      action: 'my',
    })
  }

  /**
   * Get profile by ID
   */
  async getById(id: string): Promise<UserProfile> {
    return this.client.invoke<UserProfile>('user-profiles-crud', {
      action: 'get',
      id,
    })
  }

  /**
   * Create profile
   */
  async create(data: UserProfileCreateInput): Promise<UserProfile> {
    return this.client.invoke<UserProfile>('user-profiles-crud', {
      action: 'create',
      data,
    })
  }

  /**
   * Update profile
   */
  async update(id: string, data: UserProfileUpdateInput): Promise<UserProfile> {
    return this.client.invoke<UserProfile>('user-profiles-crud', {
      action: 'update',
      id,
      data,
    })
  }
}
