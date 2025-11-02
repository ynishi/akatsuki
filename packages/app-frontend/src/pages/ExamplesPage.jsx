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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { UserProfileRepository, UserQuotaRepository, ComfyUIWorkflowRepository, ComfyUIModelRepository } from '../repositories'
import { UserProfile } from '../models'
import { callHelloFunction, EdgeFunctionService, EventService } from '../services'
import { GeminiProvider } from '../services/ai/providers/GeminiProvider'
import { PublicStorageService } from '../services/PublicStorageService'
import { PrivateStorageService } from '../services/PrivateStorageService'
import { FileUtils } from '../utils/FileUtils'
import { useAuth } from '../contexts/AuthContext'
import { TopNavigation } from '../components/layout/TopNavigation'
import { useImageGeneration, useEventListener } from '../hooks'
import { PublicProfile } from '../models/PublicProfile'
import { PublicProfileRepository } from '../repositories/PublicProfileRepository'
import { WebSearchCard } from '../components/features/search/WebSearchCard'

export function ExamplesPage() {
  const { user } = useAuth()
  const [count, setCount] = useState(0)
  const [sliderValue, setSliderValue] = useState([50])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [helloResult, setHelloResult] = useState(null)
  const [helloLoading, setHelloLoading] = useState(false)

  // Public Profile - 動作確認用
  const [profileCount, setProfileCount] = useState(0)
  const [randomProfile, setRandomProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState(null)

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

  // Image Generation - useImageGeneration Hook
  const [imagePrompt, setImagePrompt] = useState('')
  const {
    generate: generateImage,
    loading: imageGenerating,
    result: generatedImage,
    error: imageError,
    sizeOptions,
    qualityOptions,
    styleOptions,
  } = useImageGeneration({
    quality: 'standard',
    style: 'vivid',
  })

  // Image Variation - 別のHookインスタンスを使用
  const {
    generateVariation,
    loading: variationGenerating,
    result: variationImage,
    error: variationError,
  } = useImageGeneration()

  // Image Edit - 別のHookインスタンスを使用
  const {
    generateEdit,
    loading: editGenerating,
    result: editedImage,
    error: editError,
  } = useImageGeneration()
  const [editPrompt, setEditPrompt] = useState('Add a wizard hat to the subject')

  // RunPod ComfyUI - 別のHookインスタンスを使用
  const {
    generate: generateComfyUI,
    loading: comfyUIGenerating,
    result: comfyUIImage,
    error: comfyUIError,
  } = useImageGeneration()
  const [comfyUIPrompt, setComfyUIPrompt] = useState('A serene Japanese garden with cherry blossoms in full bloom')
  const [workflows, setWorkflows] = useState([])
  const [selectedWorkflow, setSelectedWorkflow] = useState(null)
  const [workflowsLoading, setWorkflowsLoading] = useState(false)
  const [workflowFormOpen, setWorkflowFormOpen] = useState(false)
  const [newWorkflowName, setNewWorkflowName] = useState('')
  const [newWorkflowDescription, setNewWorkflowDescription] = useState('')
  const [newWorkflowJSON, setNewWorkflowJSON] = useState('')
  const [workflowCreating, setWorkflowCreating] = useState(false)
  const [comfyUISteps, setComfyUISteps] = useState([25])
  const [comfyUICfg, setComfyUICfg] = useState([7.0])
  const [comfyUISize, setComfyUISize] = useState('1024x1024')
  const [comfyUIModel, setComfyUIModel] = useState('bismuthIllustrious_v30.safetensors')
  const [availableModels, setAvailableModels] = useState([])
  const [modelsLoading, setModelsLoading] = useState(false)

  // External Integration states
  const [slackMessage, setSlackMessage] = useState('Hello from Akatsuki!')
  const [slackResult, setSlackResult] = useState(null)
  const [slackSending, setSlackSending] = useState(false)
  const [emailTo, setEmailTo] = useState('test@example.com')
  const [emailSubject, setEmailSubject] = useState('Test Email from Akatsuki')
  const [emailBody, setEmailBody] = useState('This is a test email.')
  const [emailResult, setEmailResult] = useState(null)
  const [emailSending, setEmailSending] = useState(false)

  // Event System states
  const [eventType, setEventType] = useState('test.demo')
  const [eventPayload, setEventPayload] = useState('{"message": "Hello Event System!"}')
  const [eventResult, setEventResult] = useState(null)
  const [eventEmitting, setEventEmitting] = useState(false)
  const [receivedEvents, setReceivedEvents] = useState([])

  // Real-time event listener
  useEventListener(['test.demo', 'image.generated', 'quota.warning'], (event) => {
    setReceivedEvents(prev => [event, ...prev].slice(0, 10))
  })

  // Public Profile読み込み
  const loadPublicProfiles = async () => {
    try {
      setProfileLoading(true)
      setProfileError(null)

      // Get count
      const { count: totalCount, error: countError } = await PublicProfileRepository.count()
      if (countError) throw countError
      setProfileCount(totalCount)

      // Get random one
      const { data, error: profileError } = await PublicProfileRepository.getRandomOne()
      if (profileError) throw profileError

      const profile = data ? PublicProfile.fromDatabase(data) : null
      setRandomProfile(profile)
    } catch (error) {
      console.error('Load public profiles error:', error)
      setProfileError(error.message || 'Failed to load profiles')
    } finally {
      setProfileLoading(false)
    }
  }

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

  // Image Generation - using useImageGeneration Hook
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return

    try {
      await generateImage({
        prompt: imagePrompt,
      })
    } catch (error) {
      console.error('Image generation error:', error)
    }
  }

  // Image Variation - Generate variation from existing image
  const handleGenerateVariation = async () => {
    if (!generatedImage?.publicUrl) return

    try {
      await generateVariation(generatedImage.publicUrl, {
        provider: 'dalle', // DALL-E supports variation
      })
    } catch (error) {
      console.error('Variation generation error:', error)
    }
  }

  // Image Edit - Edit image with prompt (Gemini only)
  const handleEditImage = async () => {
    if (!generatedImage?.publicUrl || !editPrompt.trim()) return

    try {
      await generateEdit(generatedImage.publicUrl, editPrompt, {
        // provider: 'gemini' is automatically set
      })
    } catch (error) {
      console.error('Image edit error:', error)
    }
  }

  // RunPod ComfyUI - Load workflows
  const loadWorkflows = async () => {
    try {
      setWorkflowsLoading(true)
      const { data, error } = await ComfyUIWorkflowRepository.getAll()

      if (error) {
        console.error('Failed to load workflows:', error)
        return
      }

      setWorkflows(data || [])

      // Set default workflow if exists
      const defaultWorkflow = data?.find(w => w.is_default)
      if (defaultWorkflow) {
        setSelectedWorkflow(defaultWorkflow)
      }
    } catch (error) {
      console.error('Load workflows error:', error)
    } finally {
      setWorkflowsLoading(false)
    }
  }

  // RunPod ComfyUI - Load available models from DB
  const loadAvailableModels = async () => {
    try {
      setModelsLoading(true)
      const { data, error } = await ComfyUIModelRepository.getAll()

      if (error) {
        console.error('Failed to load models:', error)
        return
      }

      // ファイル名のみを抽出（既存のUIと互換性のため）
      const modelFilenames = data.map(model => model.filename)
      setAvailableModels(modelFilenames)
    } catch (error) {
      console.error('Load models error:', error)
    } finally {
      setModelsLoading(false)
    }
  }

  // RunPod ComfyUI - Create new workflow
  const handleCreateWorkflow = async () => {
    if (!newWorkflowName.trim() || !newWorkflowJSON.trim()) {
      alert('Name and Workflow JSON are required')
      return
    }

    if (!user) {
      alert('Login required')
      return
    }

    try {
      setWorkflowCreating(true)

      // Parse and validate JSON
      let workflowJson
      try {
        workflowJson = JSON.parse(newWorkflowJSON)
      } catch (e) {
        alert('Invalid JSON format')
        return
      }

      const { data, error } = await ComfyUIWorkflowRepository.create({
        name: newWorkflowName,
        description: newWorkflowDescription || null,
        workflow_json: workflowJson,
        is_active: true,
        is_default: false,
        tags: [],
      })

      if (error) {
        console.error('Create workflow error:', error)
        alert(`Failed to create workflow: ${error.message}`)
        return
      }

      // Success - reload workflows and close form
      alert('Workflow created successfully!')
      setNewWorkflowName('')
      setNewWorkflowDescription('')
      setNewWorkflowJSON('')
      setWorkflowFormOpen(false)
      await loadWorkflows()
    } catch (error) {
      console.error('Create workflow error:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setWorkflowCreating(false)
    }
  }

  // RunPod ComfyUI - Generate image with ComfyUI
  const handleGenerateComfyUI = async () => {
    if (!comfyUIPrompt.trim()) return

    try {
      await generateComfyUI({
        prompt: comfyUIPrompt,
        provider: 'comfyui',
        workflowId: selectedWorkflow?.id,
        size: comfyUISize,
        comfyui_config: {
          steps: comfyUISteps[0],
          cfg: comfyUICfg[0],
          ckpt_name: comfyUIModel,
        },
      })
    } catch (error) {
      console.error('ComfyUI generation error:', error)
    }
  }

  // Slack Notify
  const handleSlackNotify = async () => {
    if (!slackMessage.trim()) return

    setSlackSending(true)
    setSlackResult(null)

    const { data, error } = await EdgeFunctionService.invoke('slack-notify', {
      text: slackMessage,
      metadata: {
        source: 'homepage-test',
        event_type: 'manual_test',
      },
    })

    if (error) {
      console.error('Slack notify error:', error)
      setSlackResult({ success: false, error: error.message })
    } else {
      setSlackResult({ success: true, ...data })
    }

    setSlackSending(false)
  }

  // Send Email
  const handleSendEmail = async () => {
    if (!emailTo.trim() || !emailSubject.trim() || !emailBody.trim()) return

    setEmailSending(true)
    setEmailResult(null)

    const { data, error } = await EdgeFunctionService.invoke('send-email', {
      to: emailTo,
      subject: emailSubject,
      text: emailBody,
      metadata: {
        template: 'test',
      },
    })

    if (error) {
      console.error('Send email error:', error)
      setEmailResult({ success: false, error: error.message })
    } else {
      setEmailResult({ success: true, ...data })
    }

    setEmailSending(false)
  }

  // Event System: Emit event
  const handleEmitEvent = async () => {
    if (!eventType.trim()) return

    if (!user) {
      setEventResult({ error: 'ログインが必要です' })
      return
    }

    try {
      setEventEmitting(true)
      setEventResult(null)

      // Parse payload
      let payload
      try {
        payload = JSON.parse(eventPayload)
      } catch (e) {
        setEventResult({ error: 'Invalid JSON format' })
        setEventEmitting(false)
        return
      }

      const result = await EventService.emit(eventType, payload)
      setEventResult({ success: true, event: result })
    } catch (error) {
      console.error('Event emit error:', error)
      setEventResult({ error: error.message })
    } finally {
      setEventEmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100">
      <TopNavigation />
      <div className="max-w-6xl mx-auto px-8 pt-24 pb-8 space-y-8">
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

        {/* Public Profile Repository Example */}
        <Card>
          <CardHeader>
            <CardTitle>Public Profile Repository (VIEW)</CardTitle>
            <CardDescription>
              public_profiles VIEW からプロフィール総数とランダム1件を取得
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="bg-gray-50 p-4 rounded-lg text-sm font-mono text-gray-700 overflow-x-auto">
              <code>{`import { PublicProfileRepository } from '@/repositories/PublicProfileRepository'

// Get total count
const { count } = await PublicProfileRepository.count()

// Get random one profile
const { data } = await PublicProfileRepository.getRandomOne()
const profile = PublicProfile.fromDatabase(data)`}</code>
            </pre>

            <Button
              variant="gradient"
              onClick={loadPublicProfiles}
              disabled={profileLoading}
              className="w-full"
            >
              {profileLoading ? 'Loading...' : 'Load Public Profiles'}
            </Button>

            {/* Counter - Total Profiles */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg">
              <p className="font-bold mb-2">Total Public Profiles:</p>
              <div className="text-center">
                <p className="text-5xl font-bold text-gray-800 mb-2">{profileCount}</p>
                <Badge variant="gradient" className="text-sm">
                  {profileCount === 0 ? 'No profiles yet' : `${profileCount} user${profileCount > 1 ? 's' : ''} registered`}
                </Badge>
              </div>
            </div>

            {/* Random Profile Display */}
            {profileError && (
              <div className="bg-red-50 p-3 rounded-lg">
                <p className="font-bold mb-2 text-red-600">Error:</p>
                <p className="text-sm text-gray-700">{profileError}</p>
              </div>
            )}

            {randomProfile && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg">
                <p className="font-bold mb-3 text-green-600">Random Profile Sample:</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <strong className="text-gray-700 min-w-[100px]">Display Name:</strong>
                    <span className="text-gray-600">{randomProfile.getDisplayName()}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <strong className="text-gray-700 min-w-[100px]">Username:</strong>
                    <span className="text-gray-600">{randomProfile.username || 'Not set'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <strong className="text-gray-700 min-w-[100px]">Bio:</strong>
                    <span className="text-gray-600">{randomProfile.bio || 'No bio yet'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <strong className="text-gray-700 min-w-[100px]">User ID:</strong>
                    <span className="text-gray-600 font-mono text-xs">{randomProfile.userId?.substring(0, 8)}...</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <strong className="text-gray-700 min-w-[100px]">Created:</strong>
                    <span className="text-gray-600">{randomProfile.getFormattedDate()}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <strong className="text-gray-700 min-w-[100px]">Complete:</strong>
                    <Badge variant={randomProfile.isComplete() ? 'default' : 'secondary'}>
                      {randomProfile.isComplete() ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {!profileLoading && !randomProfile && !profileError && profileCount === 0 && (
              <div className="bg-yellow-50 p-3 rounded-lg text-sm text-gray-700">
                <strong>Note:</strong> まだプロフィールが登録されていません。ユーザー登録すると自動作成されます。
              </div>
            )}
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
              useImageGeneration フックを使った画像生成 + Storage保存の統合例
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="bg-gray-50 p-4 rounded-lg text-sm font-mono text-gray-700 overflow-x-auto">
              <code>{`import { useImageGeneration } from '@/hooks'

// ✅ 方法1: async/await で結果を直接取得
const { generateAsync, isPending } = useImageGeneration({
  quality: 'standard',
  style: 'vivid'
})

const image = await generateAsync({
  prompt: 'A beautiful sunset'
})
console.log(image.publicUrl) // 永続化された画像URL

// ✅ 方法2: Fire-and-forget（結果は result で取得）
const { generate, loading, result } = useImageGeneration()
generate({ prompt: 'A beautiful sunset' })
// result に画像が格納される

// ❌ 間違い: mutate() を await
const result = await generate({ prompt: 'A cat' }) // undefined`}</code>
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

            {(generatedImage || imageError) && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg space-y-3">
                {imageError ? (
                  <>
                    <p className="font-bold mb-2 text-red-600">Error:</p>
                    <p className="text-sm text-gray-700">{imageError.message}</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-purple-600">Generation Success!</p>

                    {generatedImage?.publicUrl && (
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

        {/* AI Image Variation Example */}
        <Card>
          <CardHeader>
            <CardTitle>AI Image Variation (Image-to-Image)</CardTitle>
            <CardDescription>
              既存画像からバリエーションを生成（DALL-E / Gemini Imagen対応）
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="bg-gray-50 p-4 rounded-lg text-sm font-mono text-gray-700 overflow-x-auto">
              <code>{`import { useImageGeneration } from '@/hooks'

// ✅ 正しい: generateAsync を使用
const { generateVariation } = useImageGeneration()

// 既存画像からバリエーション生成
const variation = await generateVariation(existingImageUrl, {
  provider: 'dalle'  // または 'gemini'
})
console.log(variation.publicUrl)`}</code>
            </pre>

            <div className="space-y-3">
              {generatedImage?.publicUrl ? (
                <>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm font-semibold mb-2">元画像:</p>
                    <img
                      src={generatedImage.publicUrl}
                      alt="Source"
                      className="w-full rounded-lg shadow max-h-48 object-cover"
                    />
                  </div>

                  <Button
                    variant="gradient"
                    onClick={handleGenerateVariation}
                    disabled={variationGenerating || !user}
                    className="w-full"
                  >
                    {variationGenerating ? 'Generating Variation...' : 'Generate Variation from Above Image'}
                  </Button>
                </>
              ) : (
                <div className="bg-yellow-50 p-3 rounded-lg text-sm text-gray-700">
                  <strong>Note:</strong> まず上の「AI Image Generation」で画像を生成してください。
                  その画像からバリエーションを作成できます。
                </div>
              )}

              {variationError && (
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="font-bold mb-2 text-red-600">Error:</p>
                  <p className="text-sm text-gray-700">{variationError.message}</p>
                </div>
              )}

              {variationImage && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg space-y-3">
                  <p className="font-bold text-green-600">Variation Generated!</p>

                  <div className="flex flex-col gap-3">
                    <img
                      src={variationImage.publicUrl}
                      alt="Variation"
                      className="w-full rounded-lg shadow-lg"
                    />

                    <div className="bg-white/70 p-3 rounded space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div>
                          <strong>Provider:</strong> {variationImage.provider}
                        </div>
                        <div>
                          <strong>Model:</strong> {variationImage.model}
                        </div>
                        <div>
                          <strong>Mode:</strong> variation
                        </div>
                        <div>
                          <strong>File ID:</strong> {variationImage.id?.substring(0, 8)}...
                        </div>
                      </div>

                      <a
                        href={variationImage.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline block"
                      >
                        Open in new tab →
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {!user && (
              <div className="bg-orange-50 p-3 rounded-lg text-sm text-gray-700">
                <strong>Note:</strong> 画像バリエーション生成には
                <Link to="/login" className="text-blue-600 hover:underline mx-1">
                  ログイン
                </Link>
                が必要です
              </div>
            )}

            {variationGenerating && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-green-600 rounded-full" />
                <span>Generating variation... (通常10-30秒)</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Image Edit Example */}
        <Card>
          <CardHeader>
            <CardTitle>AI Image Edit (Image-to-Image with Prompt)</CardTitle>
            <CardDescription>
              画像をプロンプトで編集（Gemini Imagen のみ対応）
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="bg-gray-50 p-4 rounded-lg text-sm font-mono text-gray-700 overflow-x-auto">
              <code>{`import { useImageGeneration } from '@/hooks'

// ✅ 正しい: generateAsync ベースのメソッドを使用
const { generateEdit } = useImageGeneration()

// 画像をプロンプトで編集
const edited = await generateEdit(imageUrl, 'Add a wizard hat', {
  // provider: 'gemini' (自動的に Gemini を使用)
})
console.log(edited.publicUrl)`}</code>
            </pre>

            <div className="space-y-3">
              {generatedImage?.publicUrl ? (
                <>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm font-semibold mb-2">元画像:</p>
                    <img
                      src={generatedImage.publicUrl}
                      alt="Source"
                      className="w-full rounded-lg shadow max-h-48 object-cover"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      編集指示（英語推奨）
                    </label>
                    <Input
                      placeholder="e.g., Add a wizard hat to the subject"
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                    />
                  </div>

                  <Button
                    variant="gradient"
                    onClick={handleEditImage}
                    disabled={editGenerating || !editPrompt.trim() || !user}
                    className="w-full"
                  >
                    {editGenerating ? 'Editing Image...' : 'Edit Image with Gemini'}
                  </Button>
                </>
              ) : (
                <div className="bg-yellow-50 p-3 rounded-lg text-sm text-gray-700">
                  <strong>Note:</strong> まず上の「AI Image Generation」で画像を生成してください。
                  その画像を編集できます。
                </div>
              )}

              {editError && (
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="font-bold mb-2 text-red-600">Error:</p>
                  <p className="text-sm text-gray-700">{editError.message}</p>
                </div>
              )}

              {editedImage && (
                <div className="space-y-3">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="font-bold mb-2 text-green-600">Edited Image Generated!</p>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold mb-2">編集結果:</p>
                        <img
                          src={editedImage.publicUrl}
                          alt="Edited"
                          className="w-full rounded-lg shadow"
                        />
                      </div>

                      <div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                          <div>
                            <strong>Provider:</strong> {editedImage.provider}
                          </div>
                          <div>
                            <strong>Model:</strong> {editedImage.model}
                          </div>
                          <div>
                            <strong>Size:</strong> {editedImage.size}
                          </div>
                          <div>
                            <strong>File ID:</strong> {editedImage.id?.substring(0, 8)}...
                          </div>
                        </div>

                        <a
                          href={editedImage.publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline block mt-2"
                        >
                          Open in new tab →
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {!user && (
              <div className="bg-orange-50 p-3 rounded-lg text-sm text-gray-700">
                <strong>Note:</strong> 画像編集には
                <Link to="/login" className="text-blue-600 hover:underline mx-1">
                  ログイン
                </Link>
                が必要です
              </div>
            )}

            {editGenerating && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full" />
                <span>Editing image with Gemini... (通常10-30秒)</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RunPod ComfyUI Example */}
        <Card>
          <CardHeader>
            <CardTitle>RunPod ComfyUI Image Generation</CardTitle>
            <CardDescription>
              RunPod上のComfyUIインスタンスで画像生成（GPU: NVIDIA A40）
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="bg-gray-50 p-4 rounded-lg text-sm font-mono text-gray-700 overflow-x-auto">
              <code>{`import { useImageGeneration } from '@/hooks'

const { generate, loading, result } = useImageGeneration()

// RunPod ComfyUIで画像生成
await generate({
  prompt: 'A serene Japanese garden',
  provider: 'comfyui'
})

console.log(result.publicUrl) // 生成された画像URL`}</code>
            </pre>

            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <p className="font-semibold mb-1">RunPod GPU Specs:</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                <div><strong>GPU:</strong> NVIDIA A40</div>
                <div><strong>VRAM:</strong> 47GB</div>
                <div><strong>ComfyUI:</strong> v0.3.62</div>
                <div><strong>PyTorch:</strong> 2.6.0+cu124</div>
              </div>
            </div>

            {/* Workflow Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium text-gray-700">
                  ComfyUIワークフロー
                </label>
                <div className="flex gap-2">
                  <Dialog open={workflowFormOpen} onOpenChange={setWorkflowFormOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        + New
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Create New Workflow</DialogTitle>
                        <DialogDescription>
                          Add a new ComfyUI workflow. Admin権限が必要です。
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <label className="text-sm font-medium">Name *</label>
                          <Input
                            placeholder="SDXL Basic Text-to-Image"
                            value={newWorkflowName}
                            onChange={(e) => setNewWorkflowName(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Description</label>
                          <Input
                            placeholder="Stable Diffusion XL basic workflow"
                            value={newWorkflowDescription}
                            onChange={(e) => setNewWorkflowDescription(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Workflow JSON *</label>
                          <textarea
                            className="w-full h-64 p-2 border rounded-md font-mono text-xs"
                            placeholder='{"3": {"inputs": {...}, "class_type": "KSampler"}, ...}'
                            value={newWorkflowJSON}
                            onChange={(e) => setNewWorkflowJSON(e.target.value)}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Tip: Use {"{{prompt}}"} as placeholder for dynamic prompt injection
                          </p>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            onClick={() => setWorkflowFormOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="gradient"
                            onClick={handleCreateWorkflow}
                            disabled={workflowCreating || !newWorkflowName.trim() || !newWorkflowJSON.trim()}
                          >
                            {workflowCreating ? 'Creating...' : 'Create Workflow'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadWorkflows}
                    disabled={workflowsLoading}
                  >
                    {workflowsLoading ? 'Loading...' : 'Reload'}
                  </Button>
                </div>
              </div>

              {workflows.length > 0 ? (
                <>
                  <Select
                    value={selectedWorkflow?.id}
                    onValueChange={(value) => {
                      const workflow = workflows.find(w => w.id === value)
                      setSelectedWorkflow(workflow)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a workflow" />
                    </SelectTrigger>
                    <SelectContent>
                      {workflows.map((workflow) => (
                        <SelectItem key={workflow.id} value={workflow.id}>
                          <div className="flex items-center gap-2">
                            <span>{workflow.name}</span>
                            {workflow.is_default && (
                              <Badge variant="outline" className="text-xs">Default</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedWorkflow && (
                    <div className="bg-gray-50 p-3 rounded text-xs text-gray-600">
                      <p className="font-semibold mb-1">{selectedWorkflow.name}</p>
                      {selectedWorkflow.description && (
                        <p className="mb-2">{selectedWorkflow.description}</p>
                      )}
                      {selectedWorkflow.tags && selectedWorkflow.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {selectedWorkflow.tags.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-yellow-50 p-3 rounded-lg text-sm text-gray-700">
                  <strong>Note:</strong> ワークフローをロードしてください
                </div>
              )}
            </div>

            {/* Dynamic Parameters */}
            <div className="space-y-3 bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Generation Parameters</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadAvailableModels}
                  disabled={modelsLoading}
                >
                  {modelsLoading ? 'Loading...' : 'Load Models'}
                </Button>
              </div>

              <div>
                <label className="text-xs text-gray-600">Model (Checkpoint)</label>
                <Select value={comfyUIModel} onValueChange={setComfyUIModel}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {availableModels.length > 0 ? (
                      availableModels.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="bismuthIllustrious_v30.safetensors">
                        bismuthIllustrious_v30.safetensors (Default)
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  {availableModels.length > 0
                    ? `${availableModels.length} models available`
                    : 'Click "Load Models" to fetch from RunPod'}
                </p>
              </div>

              <div>
                <label className="text-xs text-gray-600">Steps: {comfyUISteps[0]}</label>
                <Slider
                  value={comfyUISteps}
                  onValueChange={setComfyUISteps}
                  min={1}
                  max={50}
                  step={1}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Higher = more detailed (slower)</p>
              </div>

              <div>
                <label className="text-xs text-gray-600">CFG Scale: {comfyUICfg[0]}</label>
                <Slider
                  value={comfyUICfg}
                  onValueChange={setComfyUICfg}
                  min={1}
                  max={20}
                  step={0.5}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Higher = more faithful to prompt</p>
              </div>

              <div>
                <label className="text-xs text-gray-600">Size</label>
                <Select value={comfyUISize} onValueChange={setComfyUISize}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="512x512">512x512 (Square - Fast)</SelectItem>
                    <SelectItem value="768x768">768x768 (Square)</SelectItem>
                    <SelectItem value="1024x1024">1024x1024 (Square - Default)</SelectItem>
                    <SelectItem value="1024x1536">1024x1536 (Portrait)</SelectItem>
                    <SelectItem value="1536x1024">1536x1024 (Landscape)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  プロンプト（英語推奨）
                </span>
                <Input
                  type="text"
                  value={comfyUIPrompt}
                  onChange={(e) => setComfyUIPrompt(e.target.value)}
                  placeholder="A serene Japanese garden with cherry blossoms"
                  disabled={comfyUIGenerating || !user}
                  className="mt-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !comfyUIGenerating && user) {
                      handleGenerateComfyUI()
                    }
                  }}
                />
              </label>

              <Button
                variant="gradient"
                onClick={handleGenerateComfyUI}
                disabled={comfyUIGenerating || !comfyUIPrompt.trim() || !user}
                className="w-full"
              >
                {comfyUIGenerating ? 'Generating on RunPod...' : 'Generate with ComfyUI'}
              </Button>
            </div>

            {(comfyUIImage || comfyUIError) && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg space-y-3">
                {comfyUIError ? (
                  <>
                    <p className="font-bold mb-2 text-red-600">Error:</p>
                    <p className="text-sm text-gray-700">{comfyUIError.message}</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-purple-600">ComfyUI Generation Success!</p>

                    {comfyUIImage?.publicUrl && (
                      <div className="flex flex-col gap-3">
                        <img
                          src={comfyUIImage.publicUrl}
                          alt="Generated with ComfyUI"
                          className="w-full rounded-lg shadow-lg"
                        />

                        <div className="bg-white/70 p-3 rounded space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                            <div>
                              <strong>Provider:</strong> {comfyUIImage.provider}
                            </div>
                            <div>
                              <strong>Model:</strong> {comfyUIImage.model || 'ComfyUI Workflow'}
                            </div>
                            <div>
                              <strong>Size:</strong> {comfyUIImage.size || 'Default'}
                            </div>
                            <div>
                              <strong>File ID:</strong> {comfyUIImage.id?.substring(0, 8)}...
                            </div>
                          </div>

                          <a
                            href={comfyUIImage.publicUrl}
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
                <strong>Note:</strong> ComfyUI画像生成には
                <Link to="/login" className="text-blue-600 hover:underline mx-1">
                  ログイン
                </Link>
                が必要です
              </div>
            )}

            {comfyUIGenerating && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-purple-600 rounded-full" />
                <span>Generating on RunPod GPU... (通常30-60秒)</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Web Search Example */}
        <WebSearchCard />

        {/* Event System Example */}
        <Card>
          <CardHeader>
            <CardTitle>Event System (Real-time)</CardTitle>
            <CardDescription>
              EventServiceでイベント発行 + Realtime通知のデモ
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="bg-gray-50 p-4 rounded-lg text-sm font-mono text-gray-700 overflow-x-auto">
              <code>{`import { EventService } from './services/EventService'
import { useEventListener } from './hooks/useEventListener'

// イベント発行
await EventService.emit('test.demo', {
  message: 'Hello Event System!',
  timestamp: new Date().toISOString()
})

// リアルタイムリスナー
useEventListener(['test.demo'], (event) => {
  console.log('Received:', event.payload)
})`}</code>
            </pre>

            {/* Event Emission */}
            <div className="space-y-3 bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700">📤 Emit Event</h3>

              <div>
                <label className="text-sm font-medium text-gray-700">Event Type</label>
                <Input
                  placeholder="test.demo"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Payload (JSON)</label>
                <textarea
                  className="w-full p-2 border rounded-md font-mono text-xs mt-1"
                  rows={3}
                  placeholder='{"message": "Hello Event System!"}'
                  value={eventPayload}
                  onChange={(e) => setEventPayload(e.target.value)}
                />
              </div>

              <Button
                variant="gradient"
                onClick={handleEmitEvent}
                disabled={eventEmitting || !user}
                className="w-full"
              >
                {eventEmitting ? 'Emitting...' : user ? 'Emit Event' : 'Login Required'}
              </Button>

              {eventResult && (
                <div className={`p-3 rounded-lg text-sm ${
                  eventResult.success
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}>
                  {eventResult.success ? (
                    <>
                      <strong>✓ Event Emitted!</strong>
                      <div className="mt-2 text-xs space-y-1">
                        <div><strong>ID:</strong> {eventResult.event.id?.substring(0, 16)}...</div>
                        <div><strong>Type:</strong> {eventResult.event.event_type}</div>
                        <div><strong>Status:</strong> {eventResult.event.status}</div>
                        <div><strong>Created:</strong> {new Date(eventResult.event.created_at).toLocaleString()}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <strong>✗ Error:</strong> {eventResult.error}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Event Listener */}
            <div className="space-y-3 bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-700">📥 Real-time Listener</h3>
                <Badge variant="gradient">
                  🔴 Live ({receivedEvents.length})
                </Badge>
              </div>

              <p className="text-xs text-gray-600">
                Listening to: <strong>test.demo</strong>, <strong>image.generated</strong>, <strong>quota.warning</strong>
              </p>

              {receivedEvents.length === 0 ? (
                <div className="bg-white/70 p-4 rounded text-center text-sm text-gray-500">
                  Waiting for events... Try emitting an event above!
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {receivedEvents.map((event, index) => (
                    <div key={event.id || index} className="bg-white/70 p-3 rounded border-l-4 border-blue-500">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline">{event.event_type}</Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(event.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">
                        {JSON.stringify(event.payload, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-xs text-gray-500 bg-white/50 p-2 rounded">
                💡 Tip: イベントは自動でRealtime通知されます。別タブで発行しても即座に反映されます！
              </div>
            </div>

            {!user && (
              <div className="bg-orange-50 p-3 rounded-lg text-sm text-gray-700">
                <strong>Note:</strong> イベント発行には
                <Link to="/login" className="text-blue-600 hover:underline mx-1">
                  ログイン
                </Link>
                が必要です
              </div>
            )}
          </CardContent>
        </Card>

        {/* External Integrations Demo */}
        <Card>
          <CardHeader>
            <CardTitle>External Integrations</CardTitle>
            <CardDescription>外部連携のテスト (Slack, Email)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Slack Notify */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-700">Slack Notification</h3>
              <Input
                placeholder="Enter message"
                value={slackMessage}
                onChange={(e) => setSlackMessage(e.target.value)}
              />
              <Button
                onClick={handleSlackNotify}
                disabled={slackSending || !slackMessage.trim()}
                className="w-full"
              >
                {slackSending ? 'Sending...' : 'Send to Slack'}
              </Button>

              {slackResult && (
                <div className={`p-3 rounded-lg text-sm ${
                  slackResult.success
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}>
                  {slackResult.success ? (
                    <>
                      <strong>✓ Sent!</strong>
                      <div className="mt-1 text-xs">
                        Timestamp: {new Date(slackResult.timestamp).toLocaleString()}
                      </div>
                    </>
                  ) : (
                    <>
                      <strong>✗ Error:</strong> {slackResult.error}
                    </>
                  )}
                </div>
              )}

              <div className="bg-yellow-50 p-3 rounded-lg text-xs text-gray-700">
                <strong>Note:</strong> SLACK_WEBHOOK_URLの設定が必要です
              </div>
            </div>

            <div className="border-t pt-6" />

            {/* Send Email */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-700">Email Sending</h3>
              <Input
                placeholder="To: email@example.com"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                type="email"
              />
              <Input
                placeholder="Subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
              <textarea
                placeholder="Email body..."
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full p-2 border rounded-md min-h-[100px] text-sm"
              />
              <Button
                onClick={handleSendEmail}
                disabled={emailSending || !emailTo.trim() || !emailSubject.trim() || !emailBody.trim()}
                className="w-full"
              >
                {emailSending ? 'Sending...' : 'Send Email'}
              </Button>

              {emailResult && (
                <div className={`p-3 rounded-lg text-sm ${
                  emailResult.success
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}>
                  {emailResult.success ? (
                    <>
                      <strong>✓ Sent!</strong>
                      <div className="mt-1 text-xs">
                        Message ID: {emailResult.message_id?.substring(0, 20)}...
                      </div>
                      <div className="text-xs">
                        Timestamp: {new Date(emailResult.timestamp).toLocaleString()}
                      </div>
                    </>
                  ) : (
                    <>
                      <strong>✗ Error:</strong> {emailResult.error}
                    </>
                  )}
                </div>
              )}

              <div className="bg-yellow-50 p-3 rounded-lg text-xs text-gray-700">
                <strong>Note:</strong> RESEND_API_KEY と EMAIL_FROM の設定が必要です
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
