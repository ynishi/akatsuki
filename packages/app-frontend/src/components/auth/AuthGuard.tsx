import { useAuth } from '../../contexts/AuthContext'
import { Navigate } from 'react-router-dom'
import { ReactNode } from 'react'

interface AuthGuardProps {
  children: ReactNode
}

/**
 * 認証が必要なルートを保護するガードコンポーネント
 * 未ログインユーザーをログインページにリダイレクト
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth()

  // ローディング中は何も表示しない（フラッシュ防止）
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // 未ログインの場合はログインページへリダイレクト
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // ログイン済みの場合は子コンポーネントを表示
  return children
}
