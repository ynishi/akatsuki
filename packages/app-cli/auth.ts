/**
 * Supabase Authentication Helper for CLI
 * PoC: HEADLESS API Generator
 *
 * CLI ToolからSupabase Authを使ってログイン・認証を行う
 */

import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js'
import * as readline from 'readline'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables')
  console.error('Please create .env file in project root with:')
  console.error('SUPABASE_URL=https://xxxxx.supabase.co')
  console.error('SUPABASE_ANON_KEY=your-anon-key')
  process.exit(1)
}

export class SupabaseAuth {
  private client: SupabaseClient

  constructor() {
    this.client = createClient(supabaseUrl!, supabaseAnonKey!)
  }

  /**
   * Login with email/password
   */
  async login(email: string, password: string): Promise<Session> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      throw new Error(`Login failed: ${error.message}`)
    }

    if (!data.session) {
      throw new Error('Login failed: No session returned')
    }

    return data.session
  }

  /**
   * Interactive login (prompts for email/password)
   */
  async loginInteractive(): Promise<Session> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const question = (prompt: string): Promise<string> => new Promise((resolve) => {
      rl.question(prompt, resolve)
    })

    console.log('🔐 Supabase Authentication')
    const email = await question('Email: ')
    const password = await question('Password: ')
    rl.close()

    return this.login(email, password)
  }

  /**
   * Get current session
   */
  async getSession(): Promise<Session | null> {
    const { data, error } = await this.client.auth.getSession()
    if (error) throw error
    return data.session
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    const { error } = await this.client.auth.signOut()
    if (error) throw error
  }

  /**
   * Get current user
   */
  async getUser(): Promise<User | null> {
    const { data, error } = await this.client.auth.getUser()
    if (error) throw error
    return data.user
  }
}
