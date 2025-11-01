import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Sparkles, Code, Rocket, BookOpen } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { TopNavigation } from '../components/layout/TopNavigation'

export function HomePage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100">
      <TopNavigation />

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-8 pt-32 pb-20">
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-transparent bg-clip-text">
            Welcome to Akatsuki
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            VITE + React + Shuttle (Axum) + Supabase + AIGen
          </p>
          <p className="text-lg text-gray-500">
            0→1フェーズの最速立ち上げに特化した開発テンプレート
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          {user ? (
            <>
              <Link to="/admin">
                <Button variant="gradient" size="lg" className="gap-2">
                  <Rocket className="w-5 h-5" />
                  管理画面へ
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/signup">
                <Button variant="gradient" size="lg" className="gap-2">
                  <Rocket className="w-5 h-5" />
                  始める
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg">
                  ログイン
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
