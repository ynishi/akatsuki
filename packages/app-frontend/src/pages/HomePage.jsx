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

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="border-2 hover:border-pink-300 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <CardTitle>AIGen 標準搭載</CardTitle>
              <CardDescription>
                画像生成、LLMチャット、Agent実行のAPIが最初から組み込まれています
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-purple-300 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-4">
                <Code className="w-6 h-6 text-white" />
              </div>
              <CardTitle>モノレポ構成</CardTitle>
              <CardDescription>
                packages/ がNPM Workspacesで連携済み。共通コンポーネントを簡単に管理
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-blue-300 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <CardTitle>Supabase連携</CardTitle>
              <CardDescription>
                認証、DB、Storage、Edge Functionsが即座に利用可能
              </CardDescription>
            </CardHeader>
          </Card>
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
              <Link to="/examples">
                <Button variant="outline" size="lg" className="gap-2">
                  <BookOpen className="w-5 h-5" />
                  実装例を見る
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
              <Link to="/examples">
                <Button variant="ghost" size="lg" className="gap-2">
                  <BookOpen className="w-5 h-5" />
                  実装例を見る
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Tech Stack */}
        <div className="mt-20 text-center">
          <h2 className="text-2xl font-bold text-gray-700 mb-8">技術スタック</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {['React', 'Vite', 'Tailwind CSS', 'Rust', 'Axum', 'Shuttle', 'Supabase', 'PostgreSQL'].map((tech) => (
              <div
                key={tech}
                className="px-4 py-2 bg-white/70 backdrop-blur-sm rounded-lg border border-gray-200 text-gray-700 font-medium"
              >
                {tech}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
