/**
 * Akatsuki CLI Client
 * PoC: HEADLESS API Generator
 *
 * Supabase Edge Functionを認証付きで呼び出す統一クライアント
 * Browser (Frontend) と同じAPIをCLIから利用可能
 */

import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js'
import { SupabaseAuth } from './auth.js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set')
  process.exit(1)
}

/**
 * AkatsukiResponse from Edge Function
 */
interface AkatsukiResponse<T = unknown> {
  success: boolean
  result?: T
  error?: {
    message: string
    code?: string
  }
}

export class AkatsukiClient {
  private client: SupabaseClient
  private auth: SupabaseAuth
  private session: Session | null = null

  constructor() {
    this.client = createClient(supabaseUrl!, supabaseAnonKey!)
    this.auth = new SupabaseAuth()
  }

  /**
   * Login and set session
   */
  async login(email: string, password: string): Promise<Session> {
    this.session = await this.auth.login(email, password)

    // Update client with auth header
    this.client = createClient(supabaseUrl!, supabaseAnonKey!, {
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
  async loginInteractive(): Promise<Session> {
    this.session = await this.auth.loginInteractive()

    this.client = createClient(supabaseUrl!, supabaseAnonKey!, {
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
   */
  async invoke<T = unknown>(functionName: string, body: Record<string, unknown>): Promise<T> {
    if (!this.session) {
      throw new Error('Not authenticated. Please call login() first.')
    }

    const { data, error } = await this.client.functions.invoke<AkatsukiResponse<T>>(functionName, {
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
      return data.result as T
    }

    return data as T
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await this.auth.logout()
    this.session = null
    console.log('✅ Logged out')
  }

  /**
   * Get current user
   */
  getCurrentUser(): User {
    if (!this.session) {
      throw new Error('Not authenticated')
    }
    return this.session.user
  }

  /**
   * Get current session
   */
  getSession(): Session | null {
    return this.session
  }
}
