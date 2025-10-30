import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Progress } from '../components/ui/progress'
import { Slider } from '../components/ui/slider'
import { Input } from '../components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { UserProfileRepository, UserQuotaRepository } from '../repositories'
import { UserProfile } from '../models'
import { callHelloFunction, ImageGenerationService } from '../services'
import { GeminiProvider } from '../services/ai/providers/GeminiProvider'
import { PublicStorageService } from '../services/PublicStorageService'
import { PrivateStorageService } from '../services/PrivateStorageService'
import { FileUtils } from '../utils/FileUtils'
import { useAuth } from '../contexts/AuthContext'

export function HomePage() {
  const { user } = useAuth()
  const [count, setCount] = useState(0)
  const [sliderValue, setSliderValue] = useState([50])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [helloResult, setHelloResult] = useState(null)
  const [helloLoading, setHelloLoading] = useState(false)

  // LLM Chat states
  const [llmPrompt, setLlmPrompt] = useState('')
  const [llmResult, setLlmResult] = useState(null)
  const [llmLoading, setLlmLoading] = useState(false)
  const [quota, setQuota] = useState(null)

  // Public Storage states
  const [publicFile, setPublicFile] = useState(null)
  const [publicUploadResult, setPublicUploadResult] = useState(null)
  const [publicUploading, setPublicUploading] = useState(false)

  // Private Storage states
  const [privateFile, setPrivateFile] = useState(null)
  const [privateUploadResult, setPrivateUploadResult] = useState(null)
  const [privateUploading, setPrivateUploading] = useState(false)
  const [privateFileUrl, setPrivateFileUrl] = useState(null)
  const [urlLoading, setUrlLoading] = useState(false)

  // Image Generation states
  const [imagePrompt, setImagePrompt] = useState('')
  const [generatedImage, setGeneratedImage] = useState(null)
  const [imageGenerating, setImageGenerating] = useState(false)

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

  // LLM Chat: Gemini API呼び出し
  const handleLLMChat = async () => {
    if (!llmPrompt.trim()) {
      setLlmResult({ error: 'プロンプトを入力してください' })
      return
    }

    if (!user) {
      setLlmResult({ error: 'ログインが必要です' })
      return
    }

    try {
      setLlmLoading(true)
      const gemini = new GeminiProvider({ model: 'gemini-2.5-flash' })
      const result = await gemini.chat(llmPrompt)
      setLlmResult(result)

      // Quota情報も取得
      const quotaInfo = await UserQuotaRepository.checkQuotaAvailability(user.id)
      setQuota(quotaInfo)
    } catch (error) {
      console.error('LLM Chat エラー:', error)
      setLlmResult({ error: error.message })
    } finally {
      setLlmLoading(false)
    }
  }

  // Public Storage: アバター画像アップロード
  const handlePublicUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!user) {
      setPublicUploadResult({ error: 'ログインが必要です' })
      return
    }

    // バリデーション
    if (!FileUtils.validateFileSize(file, 2)) {
      setPublicUploadResult({ error: 'ファイルサイズは2MB以下にしてください' })
      return
    }

    if (!FileUtils.isImage(file)) {
      setPublicUploadResult({ error: '画像ファイルのみアップロード可能です' })
      return
    }

    try {
      setPublicUploading(true)
      setPublicFile(file)

      const result = await PublicStorageService.uploadAvatar(file, {
        metadata: { uploadedBy: user.email }
      })

      setPublicUploadResult(result)
    } catch (error) {
      console.error('Public upload error:', error)
      setPublicUploadResult({ error: error.message })
    } finally {
      setPublicUploading(false)
    }
  }

  // Private Storage: PDFアップロード
  const handlePrivateUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!user) {
      setPrivateUploadResult({ error: 'ログインが必要です' })
      return
    }

    // バリデーション
    if (!FileUtils.validateFileSize(file, 10)) {
      setPrivateUploadResult({ error: 'ファイルサイズは10MB以下にしてください' })
      return
    }

    try {
      setPrivateUploading(true)
      setPrivateFile(file)
      setPrivateFileUrl(null)

      const result = await PrivateStorageService.uploadDocument(file, {
        folder: 'documents',
        metadata: { uploadedBy: user.email }
      })

      setPrivateUploadResult(result)
    } catch (error) {
      console.error('Private upload error:', error)
      setPrivateUploadResult({ error: error.message })
    } finally {
      setPrivateUploading(false)
    }
  }

  // Private Storage: 署名付きURL取得
  const handleGetSignedUrl = async () => {
    if (!privateUploadResult?.id) return

    try {
      setUrlLoading(true)
      const result = await PrivateStorageService.getSignedUrl(privateUploadResult.id)
      setPrivateFileUrl(result.signedUrl)
    } catch (error) {
      console.error('Get signed URL error:', error)
      setPrivateFileUrl(null)
      setPrivateUploadResult({ ...privateUploadResult, error: error.message })
    } finally {
      setUrlLoading(false)
    }
  }

  // Image Generation
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return

    try {
      setImageGenerating(true)
      setGeneratedImage(null)

      const result = await ImageGenerationService.generate({
        prompt: imagePrompt,
        quality: 'standard',
        style: 'vivid',
      })

      setGeneratedImage(result)
    } catch (error) {
      console.error('Image generation error:', error)
      setGeneratedImage({ error: error.message })
    } finally {
      setImageGenerating(false)
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
          <div className="flex gap-4 justify-center">
            <Link to="/login">
              <Button variant="outline">ログイン</Button>
            </Link>
            <Link to="/admin">
              <Button variant="gradient">管理画面へ</Button>
            </Link>
          </div>
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
                Count Up!
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
                  <DialogTitle>Welcome to Akatsuki!</DialogTitle>
                  <DialogDescription>
                    これはshadcn/uiのDialogコンポーネントのデモです。
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-gray-600">
                    VibeCoding テンプレートで高速開発！
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Repository Pattern Example */}
        <Card>
          <CardHeader>
            <CardTitle>Repository Pattern</CardTitle>
            <CardDescription>
              models/ と repositories/ を使ったデータアクセス例
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="bg-gray-50 p-4 rounded-lg text-sm font-mono text-gray-700 overflow-x-auto">
              <code>{`const profile = new UserProfile({...})
const data = await UserProfileRepository.create(profile.toDatabase())
const saved = UserProfile.fromDatabase(data)`}</code>
            </pre>
            <Button variant="gradient" onClick={handleCreateProfile} disabled={loading}>
              {loading ? 'Creating...' : 'Create Profile Example'}
            </Button>
            {profile && (
              <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-4 rounded-lg">
                {profile.error ? (
                  <>
                    <p className="font-bold mb-2 text-orange-600">Note:</p>
                    <p className="text-sm text-gray-700">{profile.error}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      認証機能実装後に動作します
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-bold mb-2">Profile Created:</p>
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
            <CardTitle>Edge Function</CardTitle>
            <CardDescription>
              services/ を使った Supabase Edge Functions 呼び出し例
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="bg-gray-50 p-4 rounded-lg text-sm font-mono text-gray-700 overflow-x-auto">
              <code>{`import { callHelloFunction } from './services'
const result = await callHelloFunction('Akatsuki')
console.log(result.message)`}</code>
            </pre>
            <Button variant="gradient" onClick={handleCallHelloFunction} disabled={helloLoading}>
              {helloLoading ? 'Calling...' : 'Call hello-world Function'}
            </Button>
            {helloResult && (
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg">
                {helloResult.error ? (
                  <>
                    <p className="font-bold mb-2 text-red-600">Error:</p>
                    <p className="text-sm text-gray-700">{helloResult.error}</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold mb-2">Response:</p>
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

        {/* LLM Chat Example with Gemini */}
        <Card>
          <CardHeader>
            <CardTitle>LLM Chat (Gemini)</CardTitle>
            <CardDescription>
              新しいai-chat Edge Functionを使ったGemini API呼び出し例
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="bg-gray-50 p-4 rounded-lg text-sm font-mono text-gray-700 overflow-x-auto">
              <code>{`const gemini = new GeminiProvider()
const result = await gemini.chat(prompt)
// Response: { text, usage, tokens, model }`}</code>
            </pre>

            {quota && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold">API Quota:</span>
                  <span className="text-gray-700">
                    {quota.remaining} / {quota.limit} remaining
                  </span>
                </div>
                <Progress
                  value={((quota.limit - quota.remaining) / quota.limit) * 100}
                  className="mt-2"
                />
              </div>
            )}

            <div className="space-y-2">
              <Input
                placeholder="プロンプトを入力 (例: こんにちは！)"
                value={llmPrompt}
                onChange={(e) => setLlmPrompt(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLLMChat()}
              />
              <Button
                variant="gradient"
                onClick={handleLLMChat}
                disabled={llmLoading || !user}
                className="w-full"
              >
                {llmLoading ? 'Generating...' : user ? 'Send to Gemini' : 'Login Required'}
              </Button>
            </div>

            {llmResult && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg">
                {llmResult.error ? (
                  <>
                    <p className="font-bold mb-2 text-red-600">Error:</p>
                    <p className="text-sm text-gray-700">{llmResult.error}</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold mb-2">Response:</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">
                      {llmResult.text}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-white/50 p-2 rounded">
                      <div>
                        <strong>Model:</strong> {llmResult.model}
                      </div>
                      {llmResult.tokens && (
                        <div>
                          <strong>Tokens:</strong> {llmResult.tokens.total}
                        </div>
                      )}
                      {llmResult.usage && (
                        <>
                          <div>
                            <strong>Used:</strong> {llmResult.usage.current}
                          </div>
                          <div>
                            <strong>Remaining:</strong> {llmResult.usage.remaining}
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {!user && (
              <div className="bg-orange-50 p-3 rounded-lg text-sm text-gray-700">
                <strong>Note:</strong> LLM機能を使用するには
                <Link to="/login" className="text-blue-600 hover:underline mx-1">
                  ログイン
                </Link>
                が必要です
              </div>
            )}
          </CardContent>
        </Card>

        {/* Public Storage Example */}
        <Card>
          <CardHeader>
            <CardTitle>Public Storage (Avatar Upload)</CardTitle>
            <CardDescription>
              PublicStorageService を使った公開ファイルアップロード例
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="bg-gray-50 p-4 rounded-lg text-sm font-mono text-gray-700 overflow-x-auto">
              <code>{`import { PublicStorageService } from './services/PublicStorageService'
const result = await PublicStorageService.uploadAvatar(file)
console.log(result.publicUrl) // 恒久的な公開URL`}</code>
            </pre>

            <div className="space-y-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  画像ファイルを選択 (最大2MB)
                </span>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handlePublicUpload}
                  disabled={publicUploading || !user}
                  className="mt-1"
                />
              </label>

              {publicFile && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Badge variant="outline">{FileUtils.formatFileSize(publicFile.size)}</Badge>
                  <span>{publicFile.name}</span>
                </div>
              )}
            </div>

            {publicUploadResult && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg">
                {publicUploadResult.error ? (
                  <>
                    <p className="font-bold mb-2 text-red-600">Error:</p>
                    <p className="text-sm text-gray-700">{publicUploadResult.error}</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold mb-2 text-green-600">Upload Success!</p>
                    <div className="space-y-2">
                      {publicUploadResult.publicUrl && (
                        <div className="flex items-center gap-2">
                          <img
                            src={publicUploadResult.publicUrl}
                            alt="Uploaded"
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <p className="text-xs text-gray-600 break-all">
                              <strong>Public URL:</strong> {publicUploadResult.publicUrl}
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-white/50 p-2 rounded">
                        <div>
                          <strong>File ID:</strong> {publicUploadResult.id?.substring(0, 8)}...
                        </div>
                        <div>
                          <strong>Bucket:</strong> {publicUploadResult.bucket}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {!user && (
              <div className="bg-orange-50 p-3 rounded-lg text-sm text-gray-700">
                <strong>Note:</strong> ファイルアップロードには
                <Link to="/login" className="text-blue-600 hover:underline mx-1">
                  ログイン
                </Link>
                が必要です
              </div>
            )}

            {publicUploading && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full" />
                <span>Uploading...</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Private Storage Example */}
        <Card>
          <CardHeader>
            <CardTitle>Private Storage (Document Upload)</CardTitle>
            <CardDescription>
              PrivateStorageService を使った非公開ファイルアップロード例
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="bg-gray-50 p-4 rounded-lg text-sm font-mono text-gray-700 overflow-x-auto">
              <code>{`import { PrivateStorageService } from './services/PrivateStorageService'
const result = await PrivateStorageService.uploadDocument(file)
const { signedUrl } = await PrivateStorageService.getSignedUrl(result.id)`}</code>
            </pre>

            <div className="space-y-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  ドキュメントファイルを選択 (最大10MB)
                </span>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handlePrivateUpload}
                  disabled={privateUploading || !user}
                  className="mt-1"
                />
              </label>

              {privateFile && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Badge variant="outline">{FileUtils.formatFileSize(privateFile.size)}</Badge>
                  <span>{privateFile.name}</span>
                </div>
              )}
            </div>

            {privateUploadResult && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg space-y-3">
                {privateUploadResult.error ? (
                  <>
                    <p className="font-bold mb-2 text-red-600">Error:</p>
                    <p className="text-sm text-gray-700">{privateUploadResult.error}</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-blue-600">Upload Success!</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-white/50 p-2 rounded">
                      <div>
                        <strong>File ID:</strong> {privateUploadResult.id?.substring(0, 8)}...
                      </div>
                      <div>
                        <strong>Bucket:</strong> {privateUploadResult.bucket}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGetSignedUrl}
                      disabled={urlLoading}
                      className="w-full"
                    >
                      {urlLoading ? 'Generating URL...' : 'Get Signed URL (1時間有効)'}
                    </Button>

                    {privateFileUrl && (
                      <div className="bg-white/70 p-3 rounded">
                        <p className="text-xs font-semibold mb-1">Signed URL:</p>
                        <p className="text-xs text-gray-600 break-all mb-2">{privateFileUrl}</p>
                        <Button
                          variant="gradient"
                          size="sm"
                          onClick={() => window.open(privateFileUrl, '_blank')}
                          className="w-full"
                        >
                          Open File
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {!user && (
              <div className="bg-orange-50 p-3 rounded-lg text-sm text-gray-700">
                <strong>Note:</strong> ファイルアップロードには
                <Link to="/login" className="text-blue-600 hover:underline mx-1">
                  ログイン
                </Link>
                が必要です
              </div>
            )}

            {privateUploading && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full" />
                <span>Uploading...</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Image Generation Example */}
        <Card>
          <CardHeader>
            <CardTitle>AI Image Generation (DALL-E)</CardTitle>
            <CardDescription>
              ImageGenerationService を使った画像生成 + Storage保存の統合例
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="bg-gray-50 p-4 rounded-lg text-sm font-mono text-gray-700 overflow-x-auto">
              <code>{`import { ImageGenerationService } from './services/ImageGenerationService'
const result = await ImageGenerationService.generate({
  prompt: 'A beautiful sunset',
  quality: 'hd',
  style: 'vivid'
})
console.log(result.publicUrl) // 永続化された画像URL`}</code>
            </pre>

            <div className="space-y-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  画像生成プロンプト（英語推奨）
                </span>
                <Input
                  type="text"
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="A serene Japanese garden with cherry blossoms"
                  disabled={imageGenerating || !user}
                  className="mt-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !imageGenerating && user) {
                      handleGenerateImage()
                    }
                  }}
                />
              </label>

              <Button
                variant="gradient"
                onClick={handleGenerateImage}
                disabled={imageGenerating || !imagePrompt.trim() || !user}
                className="w-full"
              >
                {imageGenerating ? 'Generating...' : 'Generate Image'}
              </Button>
            </div>

            {generatedImage && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg space-y-3">
                {generatedImage.error ? (
                  <>
                    <p className="font-bold mb-2 text-red-600">Error:</p>
                    <p className="text-sm text-gray-700">{generatedImage.error}</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-purple-600">Generation Success!</p>

                    {generatedImage.publicUrl && (
                      <div className="flex flex-col gap-3">
                        <img
                          src={generatedImage.publicUrl}
                          alt="Generated"
                          className="w-full rounded-lg shadow-lg"
                        />

                        <div className="bg-white/70 p-3 rounded space-y-2">
                          {generatedImage.revisedPrompt && (
                            <div>
                              <p className="text-xs font-semibold text-gray-700">Revised Prompt:</p>
                              <p className="text-xs text-gray-600">{generatedImage.revisedPrompt}</p>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                            <div>
                              <strong>Provider:</strong> {generatedImage.provider}
                            </div>
                            <div>
                              <strong>Model:</strong> {generatedImage.model}
                            </div>
                            <div>
                              <strong>Size:</strong> {generatedImage.size}
                            </div>
                            <div>
                              <strong>File ID:</strong> {generatedImage.id?.substring(0, 8)}...
                            </div>
                          </div>

                          <a
                            href={generatedImage.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline block"
                          >
                            Open in new tab →
                          </a>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {!user && (
              <div className="bg-orange-50 p-3 rounded-lg text-sm text-gray-700">
                <strong>Note:</strong> 画像生成には
                <Link to="/login" className="text-blue-600 hover:underline mx-1">
                  ログイン
                </Link>
                が必要です
              </div>
            )}

            {imageGenerating && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-purple-600 rounded-full" />
                <span>Generating image... (通常10-30秒)</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
