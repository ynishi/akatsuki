import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { UserProfileRepository } from '../repositories'
import { FileUpload } from '../components/storage/FileUpload'
import { UserProfileDatabaseRecord } from '../models/UserProfile'
import { UploadResult } from '../services/PublicStorageService'

export function AdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfileDatabaseRecord | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadResult[]>([])

  // Load profile after page mount (after redirect)
  const loadProfile = useCallback(async () => {
    if (!user?.id) return

    setProfileLoading(true)
    setProfileError(null)

    try {
      const data = await UserProfileRepository.findByUserId(user.id)
      setProfile(data)
    } catch (error) {
      console.error('プロフィール読み込みエラー:', error)
      setProfileError(error instanceof Error ? error.message : 'エラーが発生しました')
    } finally {
      setProfileLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const handleManualFetch = () => {
    loadProfile()
  }

  const handleUploadComplete = (results: UploadResult[]) => {
    console.log('Upload complete:', results)
    setUploadedFiles([...uploadedFiles, ...results])
  }

  return (
    <div className="space-y-8">
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
                <p><strong>作成日:</strong> {user?.created_at ? new Date(user.created_at).toLocaleString('ja-JP') : 'N/A'}</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <p className="font-bold">👤 プロフィール情報</p>
                <Button
                  onClick={handleManualFetch}
                  variant="outline"
                  size="sm"
                  disabled={profileLoading}
                >
                  {profileLoading ? '取得中...' : '再取得'}
                </Button>
              </div>
              {profileLoading ? (
                <p className="text-sm text-gray-500">プロフィール読み込み中...</p>
              ) : profile ? (
                <div className="text-sm space-y-1">
                  <p><strong>Username:</strong> {profile.username}</p>
                  <p><strong>Display Name:</strong> {profile.display_name}</p>
                  <p><strong>Role:</strong> <Badge variant={profile.role === 'admin' ? 'gradient' : 'secondary'}>{profile.role}</Badge></p>
                  <p><strong>Bio:</strong> {profile.bio || '未設定'}</p>
                </div>
              ) : profileError ? (
                <p className="text-sm text-red-600">エラー: {profileError}</p>
              ) : (
                <p className="text-sm text-gray-500">プロフィールが見つかりません</p>
              )}
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

        {/* 管理機能 */}
        <Card>
          <CardHeader>
            <CardTitle>管理機能</CardTitle>
            <CardDescription>
              システム管理とコンテンツ管理
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="gradient"
                className="w-full"
                onClick={() => navigate('/admin/models')}
              >
                🎨 ComfyUI Models管理
              </Button>
              <Button
                variant="default"
                className="w-full"
                onClick={() => navigate('/admin/quotas')}
              >
                💎 LLM Quota管理
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/admin/events')}
              >
                🔴 Event Monitor
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/admin/webhooks')}
              >
                🔗 Webhook管理
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/admin/function-definitions')}
              >
                🤖 Function定義管理
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/admin/function-calls')}
              >
                📝 Function Call実行ログ
              </Button>
              <Button variant="secondary" className="w-full">
                📊 統計・レポート
              </Button>
              <Button variant="ghost" className="w-full">
                ⚙️ システム設定
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* File Upload Demo */}
        <Card>
          <CardHeader>
            <CardTitle>📁 ファイルアップロード</CardTitle>
            <CardDescription>
              Supabase Storageへのファイルアップロードデモ
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileUpload
              onUploadComplete={handleUploadComplete}
              options={{
                isPublic: true, // Use PublicStorageService
                folder: 'admin',
                maxSizeMB: 10,
                allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
                multiple: true,
              }}
            />

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="mt-6">
                <p className="font-bold mb-2">アップロード済みファイル:</p>
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="p-3 bg-green-50 border border-green-200 rounded-lg"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-green-900">
                          {file.storagePath}
                        </p>
                        <p className="text-xs text-gray-600">
                          ID: {file.id?.substring(0, 8)}... | Bucket: {file.bucket}
                        </p>
                      </div>
                      {file.publicUrl && (
                        <a
                          href={file.publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline inline-block mt-2"
                        >
                          ファイルを開く →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
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
    </div>
  )
}
