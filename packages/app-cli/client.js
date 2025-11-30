/**
 * Akatsuki CLI Client
 * PoC: HEADLESS API Generator
 *
 * Supabase Edge Functionを認証付きで呼び出す統一クライアント
 * Browser (Frontend) と同じAPIをCLIから利用可能
 */

import { createClient } from '@supabase/supabase-js'
import { SupabaseAuth } from './auth.js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set')
  process.exit(1)
}

export class AkatsukiClient {
  constructor() {
    this.client = createClient(supabaseUrl, supabaseAnonKey)
    this.auth = new SupabaseAuth()
    this.session = null
  }

  /**
   * Login and set session
   * @param {string} email
   * @param {string} password
   * @returns {Promise<object>} Session object
   */
  async login(email, password) {
    this.session = await this.auth.login(email, password)

    // Update client with auth header
    this.client = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${this.session.access_token}`
        }
      }
    })

    console.log(`✅ Logged in as: ${this.session.user.email}`)
    return this.session
  }

  /**
   * Interactive login
   */
  async loginInteractive() {
    this.session = await this.auth.loginInteractive()

    this.client = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${this.session.access_token}`
        }
      }
    })

    console.log(`✅ Logged in as: ${this.session.user.email}`)
    return this.session
  }

  /**
   * Call Edge Function (authenticated)
   * @param {string} functionName - Edge Function name (e.g., 'articles-crud')
   * @param {object} body - Request body
   * @returns {Promise<any>} Response data
   */
  async invoke(functionName, body) {
    if (!this.session) {
      throw new Error('Not authenticated. Please call login() first.')
    }

    const { data, error } = await this.client.functions.invoke(functionName, {
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      }
    })

    if (error) {
      throw new Error(`Edge Function error: ${error.message}`)
    }

    // Parse AkatsukiResponse
    if (data && typeof data === 'object' && 'success' in data) {
      if (!data.success) {
        const errorMsg = data.error?.message || 'Function call failed'
        throw new Error(errorMsg)
      }
      return data.result
    }

    return data
  }

  /**
   * Logout
   */
  async logout() {
    await this.auth.logout()
    this.session = null
    console.log('✅ Logged out')
  }

  /**
   * Get current user
   */
  async getCurrentUser() {
    if (!this.session) {
      throw new Error('Not authenticated')
    }
    return this.session.user
  }
}

/**
 * Articles API Client (convenience wrapper)
 */
export class ArticlesClient {
  constructor(akatsukiClient) {
    this.client = akatsukiClient
  }

  /**
   * Get my articles
   * @param {object} filters - Optional filters { status: 'draft' | 'published' }
   * @returns {Promise<Array>} Articles array
   */
  async getMyArticles(filters = {}) {
    return this.client.invoke('articles-crud', {
      action: 'my',
      filters
    })
  }

  /**
   * Get published articles
   * @param {number} limit - Max number of articles
   * @returns {Promise<Array>} Articles array
   */
  async getPublished(limit = 20) {
    return this.client.invoke('articles-crud', {
      action: 'published',
      limit
    })
  }

  /**
   * Get article by ID
   * @param {string} id - Article UUID
   * @returns {Promise<object>} Article object
   */
  async getById(id) {
    return this.client.invoke('articles-crud', {
      action: 'get',
      id
    })
  }

  /**
   * Create article
   * @param {object} data - Article data { title, content, status?, tags? }
   * @returns {Promise<object>} Created article
   */
  async create(data) {
    return this.client.invoke('articles-crud', {
      action: 'create',
      data
    })
  }

  /**
   * Update article
   * @param {string} id - Article UUID
   * @param {object} data - Update data { title?, content?, status?, tags? }
   * @returns {Promise<object>} Updated article
   */
  async update(id, data) {
    return this.client.invoke('articles-crud', {
      action: 'update',
      id,
      data
    })
  }

  /**
   * Delete article
   * @param {string} id - Article UUID
   * @returns {Promise<object>} Delete result
   */
  async delete(id) {
    return this.client.invoke('articles-crud', {
      action: 'delete',
      id
    })
  }

  /**
   * Publish article
   * @param {string} id - Article UUID
   * @returns {Promise<object>} Updated article
   */
  async publish(id) {
    return this.update(id, { status: 'published' })
  }

  /**
   * Unpublish article (set to draft)
   * @param {string} id - Article UUID
   * @returns {Promise<object>} Updated article
   */
  async unpublish(id) {
    return this.update(id, { status: 'draft' })
  }
}
