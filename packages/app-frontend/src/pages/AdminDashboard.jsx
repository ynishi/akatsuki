import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'

export function AdminDashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-transparent bg-clip-text">
              管理画面
            </h1>
            <p className="text-sm text-gray-600">Akatsuki Admin Dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{user?.email}</p>
              <Badge variant="gradient" className="mt-1">管理者</Badge>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              ログアウト
            </Button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto p-8 space-y-8">
        {/* ウェルカムカード */}
        <Card>
          <CardHeader>
            <CardTitle>ようこそ、管理画面へ！</CardTitle>
            <CardDescription>
              このページは認証済みユーザーのみアクセス可能です
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-4 rounded-lg">
              <p className="font-bold mb-2">✅ 認証情報</p>
              <div className="text-sm space-y-1">
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>User ID:</strong> {user?.id}</p>
                <p><strong>認証済み:</strong> {user?.email_confirmed_at ? 'はい' : 'いいえ'}</p>
                <p><strong>作成日:</strong> {new Date(user?.created_at).toLocaleString('ja-JP')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">総ユーザー数</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-purple-600">1</p>
              <p className="text-sm text-gray-600 mt-2">現在ログイン中のユーザー</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">システム状態</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-lg font-bold">正常稼働中</p>
              </div>
              <p className="text-sm text-gray-600 mt-2">全サービス稼働中</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">セッション</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-blue-600">1</p>
              <p className="text-sm text-gray-600 mt-2">アクティブなセッション</p>
            </CardContent>
          </Card>
        </div>

        {/* 機能サンプル */}
        <Card>
          <CardHeader>
            <CardTitle>管理機能</CardTitle>
            <CardDescription>
              ここに管理機能を追加できます
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button variant="gradient" className="w-full">
                ユーザー管理
              </Button>
              <Button variant="outline" className="w-full">
                コンテンツ管理
              </Button>
              <Button variant="secondary" className="w-full">
                設定
              </Button>
              <Button variant="ghost" className="w-full">
                レポート
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* デモメッセージ */}
        <Card className="border-dashed border-2 border-purple-300">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-lg font-bold text-purple-600">
                このページは AuthGuard で保護されています
              </p>
              <p className="text-sm text-gray-600">
                未ログインユーザーは自動的にログインページにリダイレクトされます
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
