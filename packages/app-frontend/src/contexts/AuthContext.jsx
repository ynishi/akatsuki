import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { UserProfileRepository } from '../repositories'
import { UserProfile } from '../models'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // プロフィール読み込み
  const loadProfile = async (userId) => {
    try {
      const data = await UserProfileRepository.findByUserId(userId)
      if (data) {
        setProfile(UserProfile.fromDatabase(data))
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
      setProfile(null)
    }
  }

  useEffect(() => {
    // 初期セッション取得
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        await loadProfile(session.user.id)
      }

      setLoading(false)
    })

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        await loadProfile(session.user.id)
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Email/Password サインアップ
  const signUp = async (email, password, metadata = {}) => {
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
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  // Magic Link ログイン
  const signInWithMagicLink = async (email) => {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })
    return { data, error }
  }

  // OAuth ログイン（拡張用）
  const signInWithOAuth = async (provider) => {
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
  const resetPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { data, error }
  }

  // パスワード更新
  const updatePassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    })
    return { data, error }
  }

  const value = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signInWithMagicLink,
    signInWithOAuth,
    signOut,
    resetPassword,
    updatePassword,
    isAdmin: profile?.isAdmin() ?? false,
    isModerator: profile?.isModerator() ?? false,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
