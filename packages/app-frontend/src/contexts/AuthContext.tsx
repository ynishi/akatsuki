import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { User, Session, AuthError } from '@supabase/supabase-js'

/**
 * Sign up metadata
 */
export interface SignUpMetadata {
  [key: string]: unknown
}

/**
 * Auth response with data and error
 */
export interface AuthResponse<T = unknown> {
  data: T
  error: AuthError | null
}

/**
 * Sign out response
 */
export interface SignOutResponse {
  error: AuthError | null
}

/**
 * OAuth provider type
 */
export type OAuthProvider = 'google' | 'github' | 'gitlab' | 'bitbucket' | 'azure' | 'facebook' | 'twitter'

/**
 * Auth context value
 */
export interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, metadata?: SignUpMetadata) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signInWithMagicLink: (email: string) => Promise<any>
  signInWithOAuth: (provider: OAuthProvider) => Promise<any>
  signOut: () => Promise<any>
  resetPassword: (email: string) => Promise<any>
  updatePassword: (newPassword: string) => Promise<any>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/**
 * Auth provider props
 */
export interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 初期セッション取得
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Email/Password サインアップ
  const signUp = async (
    email: string,
    password: string,
    metadata: SignUpMetadata = {}
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    })
    return { data, error }
  }

  // Email/Password ログイン
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  // Magic Link ログイン
  const signInWithMagicLink = async (email: string) => {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })
    return { data, error }
  }

  // OAuth ログイン（拡張用）
  const signInWithOAuth = async (provider: OAuthProvider) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    })
    return { data, error }
  }

  // ログアウト
  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  // パスワードリセットメール送信
  const resetPassword = async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { data, error }
  }

  // パスワード更新
  const updatePassword = async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    })
    return { data, error }
  }

  const value: AuthContextValue = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithMagicLink,
    signInWithOAuth,
    signOut,
    resetPassword,
    updatePassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * useAuth hook
 * @returns Auth context value
 * @throws Error if used outside AuthProvider
 */
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
