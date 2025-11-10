import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../ui/button'
import { useAuth } from '../../contexts/AuthContext'
import { Home, BookOpen, LogIn, LogOut, LayoutDashboard } from 'lucide-react'

/**
 * TopNavigation コンポーネント
 *
 * 全画面共通のトップナビゲーションバー
 * - ロゴ/ホームリンク
 * - ナビゲーションリンク
 * - 認証状態に応じたボタン表示
 */
export function TopNavigation() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Home Link */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-transparent bg-clip-text group-hover:opacity-80 transition-opacity">
              Akatsuki
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            <Link to="/" className="group">
              <Button variant="ghost" size="sm" className="gap-2 group-hover:shadow-md">
                <Home className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline">Home</span>
              </Button>
            </Link>
            <Link to="/examples" className="group">
              <Button variant="ghost" size="sm" className="gap-2 group-hover:shadow-md">
                <BookOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline">Examples</span>
              </Button>
            </Link>

            {/* Auth-dependent Buttons */}
            {user ? (
              <>
                <Link to="/admin" className="group">
                  <Button variant="ghost" size="sm" className="gap-2 group-hover:shadow-md">
                    <LayoutDashboard className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="gap-2 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" className="group">
                  <Button variant="ghost" size="sm" className="gap-2 group-hover:shadow-md">
                    <LogIn className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span className="hidden sm:inline">Login</span>
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button variant="gradient" size="sm">
                    <span className="hidden sm:inline">Sign Up</span>
                    <span className="sm:hidden">Join</span>
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
