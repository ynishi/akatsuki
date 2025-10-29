import { useState } from 'react'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Badge } from './components/ui/badge'
import { Progress } from './components/ui/progress'
import { Slider } from './components/ui/slider'
import { Input } from './components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog'
import { UserProfileRepository } from './repositories'
import { UserProfile } from './models'
import { callHelloFunction } from './services'

function App() {
  const [count, setCount] = useState(0)
  const [sliderValue, setSliderValue] = useState([50])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [helloResult, setHelloResult] = useState(null)
  const [helloLoading, setHelloLoading] = useState(false)

  // Repository使用例: プロフィール作成
  // 注: このサンプルは実際のユーザー認証が必要です
  // profilesテーブルはRLS有効なので、認証済みユーザーIDが必要
  const handleCreateProfile = async () => {
    try {
      setLoading(true)
      const newProfile = new UserProfile({
        userId: 'example-user-id',
        username: 'sample_user',
        displayName: 'Sample User',
        bio: 'Hello, Akatsuki!',
      })
      const savedData = await UserProfileRepository.create(newProfile.toDatabase())
      const userProfile = UserProfile.fromDatabase(savedData)
      setProfile(userProfile)
    } catch (error) {
      console.error('プロフィール作成エラー:', error)
      setProfile({ error: 'RLS有効のため認証が必要です' })
    } finally {
      setLoading(false)
    }
  }

  // Edge Function使用例: hello-world呼び出し
  const handleCallHelloFunction = async () => {
    try {
      setHelloLoading(true)
      const result = await callHelloFunction('Akatsuki')
      setHelloResult(result)
    } catch (error) {
      console.error('Edge Function呼び出しエラー:', error)
      setHelloResult({ error: error.message })
    } finally {
      setHelloLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center space-y-4">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-transparent bg-clip-text">
            Akatsuki UI Components
          </h1>
          <p className="text-gray-600">shadcn/ui コンポーネントのデモ</p>
        </header>

        {/* Buttons & Badges */}
        <Card>
          <CardHeader>
            <CardTitle>Buttons & Badges</CardTitle>
            <CardDescription>様々なスタイルのボタンとバッジ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button>Default</Button>
              <Button variant="gradient">Gradient</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="gradient">Gradient</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Counter Demo */}
        <Card>
          <CardHeader>
            <CardTitle>Interactive Counter</CardTitle>
            <CardDescription>ボタンをクリックしてカウントアップ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-gray-800 mb-4">{count}</p>
              <Button variant="gradient" size="lg" onClick={() => setCount(count + 1)}>
                Count Up! 🎉
              </Button>
            </div>
            <Progress value={(count % 100)} className="w-full" />
          </CardContent>
        </Card>

        {/* Slider Demo */}
        <Card>
          <CardHeader>
            <CardTitle>Slider</CardTitle>
            <CardDescription>スライダーで値を調整</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Slider
              value={sliderValue}
              onValueChange={setSliderValue}
              max={100}
              step={1}
            />
            <p className="text-center text-gray-600">Value: {sliderValue[0]}</p>
          </CardContent>
        </Card>

        {/* Tabs Demo */}
        <Card>
          <CardHeader>
            <CardTitle>Tabs</CardTitle>
            <CardDescription>タブで切り替え</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="account" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="password">Password</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="account" className="space-y-4">
                <Input placeholder="Enter your name" />
                <Input placeholder="Enter your email" type="email" />
              </TabsContent>
              <TabsContent value="password" className="space-y-4">
                <Input placeholder="Current password" type="password" />
                <Input placeholder="New password" type="password" />
              </TabsContent>
              <TabsContent value="settings" className="space-y-4">
                <p className="text-gray-600">Settings content here</p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Dialog Demo */}
        <Card>
          <CardHeader>
            <CardTitle>Dialog</CardTitle>
            <CardDescription>モーダルダイアログを表示</CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="gradient">Open Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Welcome to Akatsuki! 🌸</DialogTitle>
                  <DialogDescription>
                    これはshadcn/uiのDialogコンポーネントのデモです。
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-gray-600">
                    プリクラ風アプリを作る準備が整いました！
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Repository Pattern Example */}
        <Card>
          <CardHeader>
            <CardTitle>Repository Pattern 📁</CardTitle>
            <CardDescription>
              models/ と repositories/ を使ったデータアクセス例
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg text-sm font-mono text-gray-700">
              <div>const profile = new UserProfile(&#123;...&#125;)</div>
              <div>const data = await UserProfileRepository.create(profile.toDatabase())</div>
              <div>const saved = UserProfile.fromDatabase(data)</div>
            </div>
            <Button variant="gradient" onClick={handleCreateProfile} disabled={loading}>
              {loading ? 'Creating...' : 'Create Profile Example'}
            </Button>
            {profile && (
              <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-4 rounded-lg">
                {profile.error ? (
                  <>
                    <p className="font-bold mb-2 text-orange-600">⚠️ Note:</p>
                    <p className="text-sm text-gray-700">{profile.error}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      認証機能実装後に動作します
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-bold mb-2">✅ Profile Created:</p>
                    <p className="text-sm text-gray-700">
                      <strong>Display:</strong> {profile.getDisplayName()}
                    </p>
                    <p className="text-sm text-gray-700">
                      <strong>Username:</strong> {profile.username}
                    </p>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edge Function Example */}
        <Card>
          <CardHeader>
            <CardTitle>Edge Function ⚡</CardTitle>
            <CardDescription>
              services/ を使った Supabase Edge Functions 呼び出し例
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg text-sm font-mono text-gray-700">
              <div>import &#123; callHelloFunction &#125; from './services'</div>
              <div>const result = await callHelloFunction('Akatsuki')</div>
              <div>console.log(result.message)</div>
            </div>
            <Button variant="gradient" onClick={handleCallHelloFunction} disabled={helloLoading}>
              {helloLoading ? 'Calling...' : 'Call hello-world Function'}
            </Button>
            {helloResult && (
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg">
                {helloResult.error ? (
                  <>
                    <p className="font-bold mb-2 text-red-600">❌ Error:</p>
                    <p className="text-sm text-gray-700">{helloResult.error}</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold mb-2">✅ Response:</p>
                    <p className="text-sm text-gray-700">
                      <strong>Message:</strong> {helloResult.message}
                    </p>
                    <p className="text-sm text-gray-700">
                      <strong>Function:</strong> {helloResult.functionName}
                    </p>
                    <p className="text-sm text-gray-700">
                      <strong>Timestamp:</strong> {helloResult.timestamp}
                    </p>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default App
