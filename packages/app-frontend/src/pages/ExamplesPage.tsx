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
import { AIServiceAdapter } from '../services/ai/AIServiceAdapter'
import { PublicStorageService } from '../services/PublicStorageService'
import { PrivateStorageService } from '../services/PrivateStorageService'
import { FileUtils } from '../utils/FileUtils'
import { useAuth } from '../contexts/AuthContext'
import { useImageGeneration, useEventListener, usePublicStorage, useUrlAlias } from '../hooks'
import { PublicProfile } from '../models/PublicProfile'
import { uuidToBase62, base62ToUuid } from '../utils/base62'
// eslint-disable-next-line no-restricted-imports
import { PublicProfileRepository } from '../repositories/PublicProfileRepository'
import { WebSearchCard } from '../components/features/search/WebSearchCard'
import { FileSearchDemo } from '../components/features/file-search/FileSearchDemo'
import { JobProgress } from '../components/common/JobProgress'
import { AIAgentProvider, useAIRegister, useAIUI } from '../../../ai-agent-ui/src/core'
import {
  GeminiProvider as AIGeminiProvider,
  AnthropicProvider,
  OpenAIProvider,
} from '../../../ai-agent-ui/src/providers'
import { AIFieldTrigger } from '../components/features/ai'
import { WasmRuntimeService } from '../services/WasmRuntimeService'

/**
 * AIエージェントUIデモカード（内部実装）
 * useAIRegisterフックはAIAgentProvider内で使用する必要があるため分離
 */
function AIAgentUICardInner({ user }: { user: any }) {
  const [bio, setBio] = useState('')
  const [title, setTitle] = useState('')

  const bioAI = useAIRegister({
    context: {
      scope: 'UserProfile.Bio',
      type: 'long_text',
      maxLength: 500,
    },
    getValue: () => bio,
    setValue: (newValue) => setBio(newValue),
  })
  const bioUI = useAIUI()

  const titleAI = useAIRegister({
    context: {
      scope: 'Article.Title',
      type: 'string',
      maxLength: 100,
    },
    getValue: () => title,
    setValue: (newValue) => setTitle(newValue),
  })
  const titleUI = useAIUI()

  return (
      <Card>
        <CardHeader>
          <CardTitle>AI Agent UI (✨ AI統合ライブラリ)</CardTitle>
          <CardDescription>
            入力フィールドにAIエージェント機能を統合 - 1クリックで生成・修正
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
        <pre className="bg-gray-50 p-4 rounded-lg text-sm font-mono text-gray-700 overflow-x-auto">
          <code>{`import { AIAgentProvider, useAIRegister, useAIUI } from '@akatsuki/ai-agent-ui'
import { AIFieldTrigger } from '../components/features/ai'

const ai = useAIRegister({
  context: { scope: 'UserProfile.Bio', type: 'long_text' },
  getValue: () => bio,
  setValue: (newValue) => setBio(newValue)
})
const ui = useAIUI()

<AIFieldTrigger ai={ai} ui={ui} />`}</code>
        </pre>

        <div className="bg-blue-50 p-3 rounded-lg text-sm text-gray-700">
          <p className="font-semibold mb-2">✨ 機能:</p>
          <ul className="list-disc ml-4 space-y-1">
            <li>💫 新しいコンテンツを生成</li>
            <li>🖌️ 既存のコンテンツを改善</li>
            <li>🎚️ 方向性を指定（フォーマル、簡潔など）</li>
            <li>← Undo機能</li>
          </ul>
        </div>

        {/* 自己紹介フィールド */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm font-medium text-gray-700">
              自己紹介 (Bio)
            </label>
            <AIFieldTrigger ai={bioAI} ui={bioUI} position="bottom" />
          </div>
          <textarea
            value={bio}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBio(e.target.value)}
            placeholder="自己紹介を入力してください..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            rows={4}
          />
          <div className="flex items-center justify-between mt-1">
            <div className="text-xs text-gray-500">
              {bio.length} / 500文字
            </div>
            {bioAI.state.isLoading && (
              <p className="text-sm text-purple-600">生成中...</p>
            )}
          </div>
        </div>

        {/* 記事タイトルフィールド */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm font-medium text-gray-700">
              記事タイトル
            </label>
            <AIFieldTrigger ai={titleAI} ui={titleUI} position="bottom" />
          </div>
          <Input
            type="text"
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            placeholder="記事のタイトルを入力..."
            className="w-full"
          />
          <div className="text-xs text-gray-500 mt-1">
            {title.length} / 100文字
          </div>
        </div>

        {!user && (
          <div className="bg-orange-50 p-3 rounded-lg text-sm text-gray-700">
            <strong>Note:</strong> AI機能を使用するには
            <Link to="/login" className="text-blue-600 hover:underline mx-1">
              ログイン
            </Link>
            が必要です
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * AIエージェントUIデモカード
 * AIAgentProviderでラップして内部コンポーネントに渡す
 */
function AIAgentUICard({ user }: { user: any }) {
  // 複数のAIプロバイダーを登録
  // AIServiceAdapterを使用してai-agent-uiの期待するインターフェースに適合
  const providers = [
    new AIGeminiProvider(AIServiceAdapter),
    new AnthropicProvider(AIServiceAdapter),
    new OpenAIProvider(AIServiceAdapter),
  ]

  return (
    <AIAgentProvider providers={providers}>
      <AIAgentUICardInner user={user} />
    </AIAgentProvider>
  )
}

/**
 * WASM Runtime Demo Card
 * Demonstrates WebAssembly execution with WasmRuntimeService
 */
function WasmRuntimeCard() {
  const [selectedFunction, setSelectedFunction] = useState('add')
  const [arg1, setArg1] = useState('5')
  const [arg2, setArg2] = useState('3')
  const [result, setResult] = useState<{
    result: number
    executionTimeMs: number
    memoryUsedBytes: number | null
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExecute = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Fetch WASM file from public directory
      const response = await fetch('/sample.wasm')
      if (!response.ok) throw new Error('Failed to fetch WASM file')

      const wasmBytes = await response.arrayBuffer()

      // Load and instantiate WASM module
      const module = await WasmRuntimeService.loadModule(wasmBytes, 'sample-wasm')
      const instance = await WasmRuntimeService.instantiate(module)

      // Parse arguments
      const a = parseInt(arg1, 10)
      const b = parseInt(arg2, 10)

      if (isNaN(a) || isNaN(b)) {
        throw new Error('Arguments must be integers')
      }

      // Execute WASM function
      const { data: execResult, error: execError } = await WasmRuntimeService.execute(instance, {
        functionName: selectedFunction,
        args: [a, b],
        timeoutMs: 5000
      })

      if (execError || !execResult) {
        throw execError || new Error('Execution failed')
      }

      setResult({
        result: execResult.result as number,
        executionTimeMs: execResult.executionTimeMs,
        memoryUsedBytes: execResult.memoryUsedBytes
      })
    } catch (err) {
      console.error('[WasmRuntimeCard] Error:', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">⚡</span>
          WASM Runtime
        </CardTitle>
        <CardDescription>
          WebAssembly execution with safety guarantees (timeout, memory management, error handling)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white p-4 rounded-lg space-y-3">
          <h3 className="font-semibold text-gray-700">🚀 Execute WASM Function</h3>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Function</label>
              <select
                value={selectedFunction}
                onChange={(e) => setSelectedFunction(e.target.value)}
                className="w-full mt-1 p-2 border rounded"
              >
                <option value="add">add(a, b) - Addition</option>
                <option value="multiply">multiply(a, b) - Multiplication</option>
                <option value="fibonacci">fibonacci(n) - Fibonacci sequence</option>
              </select>
            </div>

            {selectedFunction !== 'fibonacci' ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">Argument A</label>
                  <Input
                    type="number"
                    value={arg1}
                    onChange={(e) => setArg1(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Argument B</label>
                  <Input
                    type="number"
                    value={arg2}
                    onChange={(e) => setArg2(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium text-gray-700">N (Warning: fibonacci(30+) is slow)</label>
                <Input
                  type="number"
                  value={arg1}
                  onChange={(e) => setArg1(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}

            <Button
              onClick={handleExecute}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {loading ? 'Executing...' : '⚡ Execute WASM'}
            </Button>

            {error && (
              <div className="bg-red-50 p-3 rounded-lg text-sm text-red-700">
                <strong>Error:</strong> {error}
              </div>
            )}

            {result && (
              <div className="bg-green-50 p-4 rounded-lg space-y-2">
                <p className="font-bold text-green-700">✓ Success!</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Result:</span>
                    <strong className="text-gray-900">{result.result}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Execution Time:</span>
                    <strong className="text-gray-900">{result.executionTimeMs} ms</strong>
                  </div>
                  {result.memoryUsedBytes && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Memory Used:</span>
                      <strong className="text-gray-900">
                        {(result.memoryUsedBytes / 1024).toFixed(1)} KB
                      </strong>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-blue-50 p-3 rounded-lg text-xs text-gray-700">
          <p className="font-semibold mb-1">💡 WASM Runtime Features:</p>
          <ul className="list-disc ml-4 space-y-1">
            <li>✅ Timeout control (prevents infinite loops)</li>
            <li>✅ Module caching (performance optimization)</li>
            <li>✅ Error handling (safe recovery)</li>
            <li>✅ Performance measurement</li>
            <li>✅ Memory tracking</li>
          </ul>
        </div>

        <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-3 rounded-lg">
          <p className="text-xs font-semibold text-gray-700 mb-2">📦 Sample WASM Module:</p>
          <div className="space-y-1 text-xs font-mono">
            <code className="block">add(a: i32, b: i32) → i32</code>
            <code className="block">multiply(a: i32, b: i32) → i32</code>
            <code className="block">fibonacci(n: i32) → i32</code>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ExamplesPage() {
  const { user } = useAuth()
  const [count, setCount] = useState(0)
  const [sliderValue, setSliderValue] = useState([50])
  const [profile, setProfile] = useState<UserProfile | { error: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [helloResult, setHelloResult] = useState<any>(null)
  const [helloLoading, setHelloLoading] = useState(false)

  // Public Profile - 動作確認用
  const [profileCount, setProfileCount] = useState(0)
  const [randomProfile, setRandomProfile] = useState<PublicProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  // LLM Chat states
  const [llmPrompt, setLlmPrompt] = useState('')
  const [llmResult, setLlmResult] = useState<any>(null)
  const [llmLoading, setLlmLoading] = useState(false)
  const [quota, setQuota] = useState<any>(null)

  // Public Storage states
  const [publicFile, setPublicFile] = useState<File | null>(null)
  const [publicUploadResult, setPublicUploadResult] = useState<any>(null)
  const [publicUploading, setPublicUploading] = useState(false)

  // Private Storage states
  const [privateFile, setPrivateFile] = useState<File | null>(null)
  const [privateUploadResult, setPrivateUploadResult] = useState<any>(null)
  const [privateUploading, setPrivateUploading] = useState(false)
  const [privateFileUrl, setPrivateFileUrl] = useState<string | null>(null)
  const [urlLoading, setUrlLoading] = useState(false)

  // Image Generation - useImageGeneration Hook
  const [imagePrompt, setImagePrompt] = useState('')
  const {
    generateAsync: generateImage,
    loading: imageGenerating,
    result: generatedImage,
    error: imageError,
    sizeOptions: _sizeOptions,
    qualityOptions: _qualityOptions,
    styleOptions: _styleOptions,
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
  const [workflows, setWorkflows] = useState<any[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null)
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
  const [availableModels, setAvailableModels] = useState<any[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)

  // External Integration states
  const [slackMessage, setSlackMessage] = useState('Hello from Akatsuki!')
  const [slackResult, setSlackResult] = useState<any>(null)
  const [slackSending, setSlackSending] = useState(false)
  const [emailTo, setEmailTo] = useState('test@example.com')
  const [emailSubject, setEmailSubject] = useState('Test Email from Akatsuki')
  const [emailBody, setEmailBody] = useState('This is a test email.')
  const [emailResult, setEmailResult] = useState<any>(null)
  const [emailSending, setEmailSending] = useState(false)

  // Event System states
  const [eventType, setEventType] = useState('test.demo')
  const [eventPayload, setEventPayload] = useState('{"message": "Hello Event System!"}')
  const [eventResult, setEventResult] = useState<any>(null)
  const [eventEmitting, setEventEmitting] = useState(false)
  const [receivedEvents, setReceivedEvents] = useState<any[]>([])

  // Async Job System states
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStarting, setJobStarting] = useState(false)
  const [reportType, setReportType] = useState('sales')
  const [startDate, setStartDate] = useState('2025-01-01')
  const [endDate, setEndDate] = useState('2025-01-31')

  // CDN Gateway Test states
  const [cdnUuidInput, setCdnUuidInput] = useState('550e8400-e29b-41d4-a716-446655440000')
  const [cdnBase62Input, setCdnBase62Input] = useState('')
  const [cdnConvertResult, setCdnConvertResult] = useState<any>(null)

  // CDN Upload & Alias with Hooks
  const { upload: cdnUpload, isPending: cdnUploading, data: cdnUploadData, error: cdnUploadError } = usePublicStorage({ folder: 'cdn-test' })
  const { createAlias, isPending: aliasCreating, data: aliasData, error: aliasError } = useUrlAlias()
  const [cdnShortCode, setCdnShortCode] = useState('')
  const [cdnSlug, setCdnSlug] = useState('')

  // Function Call Test states
  const [funcCallPrompt, setFuncCallPrompt] = useState('Say hello to Akatsuki')
  const [funcCallProvider, setFuncCallProvider] = useState('openai')
  const [funcCallLoading, setFuncCallLoading] = useState(false)
  const [funcCallResult, setFuncCallResult] = useState<any>(null)
  const [funcCallError, setFuncCallError] = useState<string | null>(null)

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
    } catch (error: unknown) {
      console.error('Load public profiles error:', error)
      setProfileError((error as Error).message || 'Failed to load profiles')
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
    } catch (error: unknown) {
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
      setHelloResult(null)
      const { data, error } = await callHelloFunction('Akatsuki')

      if (error) {
        setHelloResult({ error: (error as Error).message || 'Edge Function invocation failed' })
        return
      }

      if (!data || typeof data !== 'object') {
        setHelloResult({ error: 'Edge Function did not return a valid response' })
        return
      }

      setHelloResult(data)
    } catch (error: unknown) {
      console.error('Edge Function呼び出しエラー:', error)
      setHelloResult({ error: (error as Error).message })
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
    } catch (error: unknown) {
      console.error('LLM Chat エラー:', error)
      setLlmResult({ error: (error as Error).message })
    } finally {
      setLlmLoading(false)
    }
  }

  // Public Storage: アバター画像アップロード
  const handlePublicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    } catch (error: unknown) {
      console.error('Public upload error:', error)
      setPublicUploadResult({ error: (error as Error).message })
    } finally {
      setPublicUploading(false)
    }
  }

  // Private Storage: PDFアップロード
  const handlePrivateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    } catch (error: unknown) {
      console.error('Private upload error:', error)
      setPrivateUploadResult({ error: (error as Error).message })
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
    } catch (error: unknown) {
      console.error('Get signed URL error:', error)
      setPrivateFileUrl(null)
      setPrivateUploadResult({ ...privateUploadResult, error: (error as Error).message })
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
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
      } catch (_e) {
        alert('Invalid JSON format')
        return
      }

      const { data: _data, error } = await ComfyUIWorkflowRepository.create({
        name: newWorkflowName,
        description: newWorkflowDescription || null,
        workflowJson: workflowJson,
        is_active: true,
        is_default: false,
        tags: [],
      } as any)

      if (error) {
        console.error('Create workflow error:', error)
        alert(`Failed to create workflow: ${(error as Error).message}`)
        return
      }

      // Success - reload workflows and close form
      alert('Workflow created successfully!')
      setNewWorkflowName('')
      setNewWorkflowDescription('')
      setNewWorkflowJSON('')
      setWorkflowFormOpen(false)
      await loadWorkflows()
    } catch (error: unknown) {
      console.error('Create workflow error:', error)
      alert(`Error: ${(error as Error).message}`)
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
        size: comfyUISize as any,
        comfyui_config: {
          steps: comfyUISteps[0],
          cfg: comfyUICfg[0],
          ckpt_name: comfyUIModel,
        },
      } as any)
    } catch (error: unknown) {
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
      setSlackResult({ success: false, error: (error as Error).message })
    } else {
      setSlackResult({ success: true, ...(data as any) })
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
      setEmailResult({ success: false, error: (error as Error).message })
    } else {
      setEmailResult({ success: true, ...(data as any) })
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
      } catch (_e) {
        setEventResult({ error: 'Invalid JSON format' })
        setEventEmitting(false)
        return
      }

      const result = await EventService.emit(eventType, payload)
      setEventResult({ success: true, event: result })
      setReceivedEvents(prev => [result, ...prev].slice(0, 10))
    } catch (error: unknown) {
      console.error('Event emit error:', error)
      setEventResult({ error: (error as Error).message })
    } finally {
      setEventEmitting(false)
    }
  }

  // Async Job: Start job
  const handleStartJob = async () => {
    if (!user) {
      alert('ログインが必要です')
      return
    }

    try {
      setJobStarting(true)

      // Emit job event
      const event = await EventService.emit('job:generate-report', {
        reportType,
        startDate,
        endDate,
      })

      setJobId(event.id)
    } catch (error: unknown) {
      console.error('Job start error:', error)
      alert(`Error: ${(error as Error).message}`)
    } finally {
      setJobStarting(false)
    }
  }

  // CDN Gateway: Base62 Encode
  const handleBase62Encode = () => {
    try {
      const base62 = uuidToBase62(cdnUuidInput)
      setCdnBase62Input(base62)
      setCdnConvertResult({
        success: true,
        type: 'encode',
        input: cdnUuidInput,
        output: base62,
        compression: Math.round((1 - base62.length / cdnUuidInput.length) * 100),
      })
    } catch (error: unknown) {
      setCdnConvertResult({
        success: false,
        error: (error as Error).message,
      })
    }
  }

  // CDN Gateway: Base62 Decode
  const handleBase62Decode = () => {
    try {
      const uuid = base62ToUuid(cdnBase62Input)
      setCdnUuidInput(uuid)
      setCdnConvertResult({
        success: true,
        type: 'decode',
        input: cdnBase62Input,
        output: uuid,
      })
    } catch (error: unknown) {
      setCdnConvertResult({
        success: false,
        error: (error as Error).message,
      })
    }
  }

  // CDN Gateway: File Upload with Hooks
  const handleCdnUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!user) {
      alert('ログインが必要です')
      return
    }

    cdnUpload({ file })
  }

  // CDN Gateway: Create URL Alias
  const handleCreateAlias = () => {
    if (!cdnUploadData?.id) {
      alert('先にファイルをアップロードしてください')
      return
    }

    if (!cdnShortCode && !cdnSlug) {
      alert('Short Code または Slug を入力してください')
      return
    }

    createAlias({
      fileId: cdnUploadData.id,
      shortCode: cdnShortCode || undefined,
      slug: cdnSlug || undefined,
      ogTitle: 'CDN Gateway Test',
      ogDescription: 'Testing CDN URL alias functionality',
    })
  }

  // Function Call: Execute with enableFunctionCalling
  const handleFunctionCallTest = async () => {
    if (!user) {
      alert('ログインが必要です')
      return
    }

    setFuncCallLoading(true)
    setFuncCallError(null)
    setFuncCallResult(null)

    try {
      const { data, error } = await EdgeFunctionService.invoke('ai-chat', {
        provider: funcCallProvider,
        prompt: funcCallPrompt,
        enableFunctionCalling: true,
      })

      if (error) throw error

      setFuncCallResult(data)
    } catch (error: unknown) {
      console.error('[Function Call Test] Error:', error)
      setFuncCallError((error as Error).message || 'Unknown error')
    } finally {
      setFuncCallLoading(false)
    }
  }

  return (
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
                {'error' in profile ? (
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLlmPrompt(e.target.value)}
                onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleLLMChat()}
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

        {/* AI Agent UI Example */}
        <AIAgentUICard user={user} />

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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setImagePrompt(e.target.value)}
                  placeholder="A serene Japanese garden with cherry blossoms"
                  disabled={imageGenerating || !user}
                  className="mt-1"
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
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
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditPrompt(e.target.value)}
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
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewWorkflowName(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Description</label>
                          <Input
                            placeholder="Stable Diffusion XL basic workflow"
                            value={newWorkflowDescription}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewWorkflowDescription(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Workflow JSON *</label>
                          <textarea
                            className="w-full h-64 p-2 border rounded-md font-mono text-xs"
                            placeholder='{"3": {"inputs": {...}, "class_type": "KSampler"}, ...}'
                            value={newWorkflowJSON}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewWorkflowJSON(e.target.value)}
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
                    onValueChange={(value: string) => {
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
                          {selectedWorkflow.tags.map((tag: string, i: number) => (
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setComfyUIPrompt(e.target.value)}
                  placeholder="A serene Japanese garden with cherry blossoms"
                  disabled={comfyUIGenerating || !user}
                  className="mt-1"
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
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

        {/* Gemini File Search Demo (Phase 1) */}
        <FileSearchDemo />

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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEventType(e.target.value)}
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
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEventPayload(e.target.value)}
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

        {/* Async Job System Demo */}
        <Card>
          <CardHeader>
            <CardTitle>Async Job System (CRON-based)</CardTitle>
            <CardDescription>
              非同期ジョブ実行システム + 進捗トラッキングのデモ（CRON処理、最大1分待機）
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="bg-gray-50 p-4 rounded-lg text-sm font-mono text-gray-700 overflow-x-auto">
              <code>{`import { EventService } from './services/EventService'
import { useJob } from './hooks/useJob'
import { JobProgress } from './components/common/JobProgress'

// ジョブ起動（system_events にレコード作成）
const event = await EventService.emit('job:generate-report', {
  reportType: 'sales',
  startDate: '2025-01-01',
  endDate: '2025-01-31'
})

// 進捗監視（Realtimeで自動更新）
const { progress, isCompleted, result } = useJob(event.id, {
  onComplete: (result) => {
    console.log('Job completed!', result)
  }
})

// UI表示
<JobProgress jobId={event.id} title="Sales Report" />`}</code>
            </pre>

            <div className="bg-blue-50 p-3 rounded-lg text-sm space-y-2">
              <p className="font-semibold">システム概要:</p>
              <ul className="text-xs text-gray-700 space-y-1 ml-4 list-disc">
                <li>ジョブは <code>system_events</code> テーブルに保存（event_type: job:*）</li>
                <li>CRON（毎分実行）が自動的にジョブを検出して処理</li>
                <li>最大1分の待機時間で処理開始（Edge Function タイムアウトなし）</li>
                <li>進捗はRealtime経由でフロントエンドに自動配信（0-100%）</li>
                <li>完了時は結果をJSONで保存、Realtime通知</li>
              </ul>
            </div>

            {/* Job Creation Form */}
            <div className="space-y-3 bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700">📤 Start Job</h3>

              <div>
                <label className="text-sm font-medium text-gray-700">Report Type</label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Sales Report</SelectItem>
                    <SelectItem value="user-activity">User Activity</SelectItem>
                    <SelectItem value="financial">Financial Summary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <Button
                variant="gradient"
                onClick={handleStartJob}
                disabled={jobStarting || !user}
                className="w-full"
              >
                {jobStarting ? 'Starting Job...' : user ? 'Start Report Generation' : 'Login Required'}
              </Button>

              {jobId && (
                <div className="bg-green-50 p-3 rounded-lg text-sm">
                  <strong>✓ Job Created!</strong>
                  <div className="mt-1 text-xs">
                    <div><strong>Job ID:</strong> {jobId?.substring(0, 16)}...</div>
                    <div className="text-gray-600 mt-1">
                      💡 CRONが1分以内に処理を開始します。下記で進捗を確認できます。
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Job Progress Monitor */}
            {jobId && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-700">📊 Job Progress Monitor</h3>
                <JobProgress
                  jobId={jobId}
                  title={`${reportType.toUpperCase()} Report (${startDate} ~ ${endDate})`}
                  onComplete={(result) => {
                    console.log('Job completed!', result)
                  }}
                  renderResult={(result) => (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-white p-3 rounded">
                          <p className="text-xs text-gray-600">Records</p>
                          <p className="text-2xl font-bold text-blue-600">{result.records}</p>
                        </div>
                        <div className="bg-white p-3 rounded">
                          <p className="text-xs text-gray-600">Revenue</p>
                          <p className="text-2xl font-bold text-green-600">${result.revenue}</p>
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded text-xs text-gray-600">
                        <strong>Generated:</strong> {new Date(result.generatedAt).toLocaleString()}
                      </div>
                    </div>
                  )}
                />
              </div>
            )}

            {!user && (
              <div className="bg-orange-50 p-3 rounded-lg text-sm text-gray-700">
                <strong>Note:</strong> ジョブ実行には
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSlackMessage(e.target.value)}
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmailTo(e.target.value)}
                type="email"
              />
              <Input
                placeholder="Subject"
                value={emailSubject}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmailSubject(e.target.value)}
              />
              <textarea
                placeholder="Email body..."
                value={emailBody}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEmailBody(e.target.value)}
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

        {/* CDN Gateway Test */}
        <Card>
          <CardHeader>
            <CardTitle>CDN Gateway Test (Phase 1-3)</CardTitle>
            <CardDescription>
              Base62 URL短縮 + CDN経由配信 + URL Alias機能のE2Eテスト
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <pre className="bg-gray-50 p-4 rounded-lg text-sm font-mono text-gray-700 overflow-x-auto">
              <code>{`import { usePublicStorage, useUrlAlias } from '@/hooks'
import { uuidToBase62, base62ToUuid } from '@/utils/base62'

// ファイルアップロード + CDN URL自動生成
const { upload, data } = usePublicStorage({ folder: 'cdn-test' })
upload({ file })
// → data.cdnUrl = '/functions/v1/cdn-gateway/2qjb5Xk9lMz7w8PqRaE' (Base62圧縮)

// URL Alias作成（短縮URL or SEO slug）
const { createAlias, data: aliasData } = useUrlAlias()
createAlias({
  fileId: data.id,
  shortCode: 'cat123', // → /functions/v1/cdn-gateway/i/cat123
  slug: 'my-cat-2025'  // → /functions/v1/cdn-gateway/s/my-cat-2025
})`}</code>
            </pre>

            {/* Base62 Encode/Decode */}
            <div className="space-y-3 bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700">📦 Base62 Encode/Decode Test</h3>
              <p className="text-xs text-gray-600">
                UUID (36文字) ↔ Base62 (22文字) の相互変換テスト
              </p>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">UUID</label>
                <Input
                  placeholder="550e8400-e29b-41d4-a716-446655440000"
                  value={cdnUuidInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCdnUuidInput(e.target.value)}
                />
                <Button
                  variant="outline"
                  onClick={handleBase62Encode}
                  className="w-full"
                >
                  UUID → Base62 にエンコード
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Base62</label>
                <Input
                  placeholder="Base62文字列"
                  value={cdnBase62Input}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCdnBase62Input(e.target.value)}
                />
                <Button
                  variant="outline"
                  onClick={handleBase62Decode}
                  className="w-full"
                >
                  Base62 → UUID にデコード
                </Button>
              </div>

              {cdnConvertResult && (
                <div className={`p-3 rounded-lg text-sm ${
                  cdnConvertResult.success
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}>
                  {cdnConvertResult.success ? (
                    <>
                      <strong>✓ {cdnConvertResult.type === 'encode' ? 'エンコード' : 'デコード'}成功:</strong>
                      <div className="mt-2 text-xs space-y-1 font-mono">
                        <div><strong>Input:</strong> {cdnConvertResult.input}</div>
                        <div><strong>Output:</strong> {cdnConvertResult.output}</div>
                        {cdnConvertResult.compression && (
                          <div><strong>圧縮率:</strong> {cdnConvertResult.compression}% ({cdnConvertResult.input.length}文字 → {cdnConvertResult.output.length}文字)</div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <strong>✗ Error:</strong> {cdnConvertResult.error}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* File Upload + CDN URL */}
            <div className="space-y-3 bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700">📤 Upload + CDN URL Generation</h3>
              <p className="text-xs text-gray-600">
                usePublicStorage フックでアップロード → 自動的にCDN URLを生成
              </p>

              <div className="space-y-2">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">画像ファイルを選択</span>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleCdnUpload}
                    disabled={cdnUploading || !user}
                    className="mt-1"
                  />
                </label>

                {cdnUploading && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-purple-600 rounded-full" />
                    <span>Uploading...</span>
                  </div>
                )}

                {cdnUploadError && (
                  <div className="bg-red-50 p-3 rounded-lg text-sm text-red-700">
                    <strong>✗ Upload Error:</strong> {cdnUploadError.message}
                  </div>
                )}

                {cdnUploadData && (
                  <div className="bg-white p-4 rounded-lg space-y-3">
                    <p className="font-bold text-green-600">✓ Upload Success!</p>

                    {/* Image Preview */}
                    <img
                      src={cdnUploadData.cdnUrlFull}
                      alt="Uploaded"
                      className="w-full rounded-lg shadow max-h-64 object-cover"
                    />

                    {/* CDN URLs */}
                    <div className="space-y-2 text-xs">
                      <div className="bg-blue-50 p-2 rounded">
                        <strong>CDN URL (相対):</strong>
                        <div className="font-mono mt-1 break-all">{cdnUploadData.cdnUrl}</div>
                        <a
                          href={cdnUploadData.cdnUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline block mt-1"
                        >
                          🔗 Open in new tab
                        </a>
                      </div>

                      <div className="bg-green-50 p-2 rounded">
                        <strong>CDN URL (フル):</strong>
                        <div className="font-mono mt-1 break-all">{cdnUploadData.cdnUrlFull}</div>
                      </div>

                      <div className="bg-gray-50 p-2 rounded">
                        <strong>File ID:</strong>
                        <div className="font-mono mt-1">{cdnUploadData.id}</div>
                      </div>

                      <div className="bg-yellow-50 p-2 rounded">
                        <strong>Original Public URL:</strong>
                        <div className="font-mono mt-1 text-xs break-all">{cdnUploadData.publicUrl}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {!user && (
                <div className="bg-orange-50 p-3 rounded-lg text-sm text-gray-700">
                  <strong>Note:</strong> アップロードには
                  <Link to="/login" className="text-blue-600 hover:underline mx-1">
                    ログイン
                  </Link>
                  が必要です
                </div>
              )}
            </div>

            {/* URL Alias Creation */}
            {cdnUploadData && (
              <div className="space-y-3 bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-700">🔗 Create URL Alias</h3>
                <p className="text-xs text-gray-600">
                  アップロードした画像に短縮URLやSEO slugを追加
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Short Code</label>
                    <Input
                      placeholder="cat123"
                      value={cdnShortCode}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCdnShortCode(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">→ /functions/v1/cdn-gateway/i/cat123</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">SEO Slug</label>
                    <Input
                      placeholder="my-cat-2025"
                      value={cdnSlug}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCdnSlug(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">→ /functions/v1/cdn-gateway/s/my-cat-2025</p>
                  </div>
                </div>

                <Button
                  variant="gradient"
                  onClick={handleCreateAlias}
                  disabled={aliasCreating || (!cdnShortCode && !cdnSlug)}
                  className="w-full"
                >
                  {aliasCreating ? 'Creating Alias...' : 'Create URL Alias'}
                </Button>

                {aliasError && (
                  <div className="bg-red-50 p-3 rounded-lg text-sm text-red-700">
                    <strong>✗ Alias Error:</strong> {aliasError.message}
                  </div>
                )}

                {aliasData && (
                  <div className="bg-white p-4 rounded-lg space-y-2">
                    <p className="font-bold text-green-600">✓ URL Alias Created!</p>

                    {aliasData.cdnUrls?.short && (
                      <div className="bg-blue-50 p-2 rounded text-xs">
                        <strong>Short URL:</strong>
                        <div className="font-mono mt-1">{aliasData.cdnUrls.short}</div>
                        <a
                          href={aliasData.cdnUrls.short}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline block mt-1"
                        >
                          🔗 Open Short URL
                        </a>
                      </div>
                    )}

                    {aliasData.cdnUrls?.seo && (
                      <div className="bg-green-50 p-2 rounded text-xs">
                        <strong>SEO URL:</strong>
                        <div className="font-mono mt-1">{aliasData.cdnUrls.seo}</div>
                        <a
                          href={aliasData.cdnUrls.seo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline block mt-1"
                        >
                          🔗 Open SEO URL
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="bg-blue-50 p-3 rounded-lg text-xs text-gray-700">
              <p className="font-semibold mb-1">💡 CDN Gateway機能:</p>
              <ul className="list-disc ml-4 space-y-1">
                <li>UUID → Base62変換で36文字→22文字に圧縮 (約39%短縮)</li>
                <li>CDN URL: <code>/functions/v1/cdn-gateway/{'<base62>'}</code> 形式でアクセス</li>
                <li>URL Alias: 短縮URL (<code>/functions/v1/cdn-gateway/i/cat123</code>) やSEO slug (<code>/functions/v1/cdn-gateway/s/my-cat-2025</code>) を追加可能</li>
                <li>OGP対応、有効期限設定も可能（今後実装予定）</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Function Call Admin */}
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              Function Call System
            </CardTitle>
            <CardDescription>
              LLM Function Calling実行ログの管理画面
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white p-4 rounded-lg space-y-3">
              <h3 className="font-semibold text-gray-700">📊 管理画面</h3>
              <p className="text-sm text-gray-600">
                OpenAI/Anthropic/GeminiによるFunction Call実行履歴を確認・監視できます
              </p>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="bg-green-50">Sync</Badge>
                  <span className="text-gray-600">即座に実行される関数（例: query_database）</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="bg-purple-50">Async</Badge>
                  <span className="text-gray-600">Job Systemで非同期実行される関数（例: generate_image）</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Link to="/admin/function-definitions">
                  <Button className="w-full mt-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    Function 定義管理
                  </Button>
                </Link>
                <Link to="/admin/function-calls">
                  <Button className="w-full mt-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                    実行ログを確認
                  </Button>
                </Link>
              </div>
            </div>

            {/* Function Call Test UI */}
            <div className="bg-white p-4 rounded-lg space-y-3">
              <h3 className="font-semibold text-gray-700">🧪 Function Call テスト</h3>
              <p className="text-sm text-gray-600">
                enableFunctionCalling=true でAI Chatを実行し、LLMが関数を呼び出します
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Provider</label>
                  <select
                    value={funcCallProvider}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFuncCallProvider(e.target.value)}
                    className="w-full mt-1 p-2 border rounded"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="gemini">Gemini</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Prompt</label>
                  <Input
                    placeholder="Say hello to Akatsuki"
                    value={funcCallPrompt}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFuncCallPrompt(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    例: &quot;Say hello to Akatsuki&quot; → hello_world関数が呼ばれます
                  </p>
                </div>

                <Button
                  onClick={handleFunctionCallTest}
                  disabled={funcCallLoading || !user}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {funcCallLoading ? 'Executing...' : '🚀 Execute with Function Calling'}
                </Button>

                {!user && (
                  <div className="bg-orange-50 p-3 rounded-lg text-sm text-gray-700">
                    <strong>Note:</strong> Function Callには
                    <Link to="/login" className="text-blue-600 hover:underline mx-1">
                      ログイン
                    </Link>
                    が必要です
                  </div>
                )}

                {funcCallError && (
                  <div className="bg-red-50 p-3 rounded-lg text-sm text-red-700">
                    <strong>Error:</strong> {funcCallError}
                  </div>
                )}

                {funcCallResult && (
                  <div className="bg-green-50 p-4 rounded-lg space-y-2">
                    <p className="font-bold text-green-700">✓ Success!</p>
                    <div className="text-xs space-y-2">
                      <div>
                        <strong>Response:</strong>
                        <pre className="bg-white p-2 rounded mt-1 overflow-auto max-h-40">
                          {JSON.stringify(funcCallResult.response, null, 2)}
                        </pre>
                      </div>
                      {funcCallResult.functionCalls && funcCallResult.functionCalls.length > 0 && (
                        <div>
                          <strong>Function Calls:</strong>
                          {funcCallResult.functionCalls.map((fc: any, i: number) => (
                            <div key={i} className="bg-purple-50 p-2 rounded mt-1">
                              <div><strong>Function:</strong> {fc.name}</div>
                              <div><strong>Arguments:</strong> {JSON.stringify(fc.arguments)}</div>
                              <div><strong>Result:</strong> {JSON.stringify(fc.result)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg text-xs text-gray-700">
              <p className="font-semibold mb-1">💡 Function Call機能:</p>
              <ul className="list-disc ml-4 space-y-1">
                <li>LLMが自律的にシステム機能を呼び出し可能</li>
                <li>全実行ログを記録、エラー追跡・デバッグに活用</li>
                <li>Sync/Async実行タイプの選択可能</li>
                <li>LLM呼び出しログと紐付けて会話の文脈を追跡</li>
                <li>Job Systemと統合、長時間処理も安全に実行</li>
              </ul>
            </div>

            <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-3 rounded-lg">
              <p className="text-xs font-semibold text-gray-700 mb-2">🔧 利用可能な関数（例）:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <code className="bg-white px-2 py-1 rounded">send_webhook</code>
                <code className="bg-white px-2 py-1 rounded">query_database</code>
                <code className="bg-white px-2 py-1 rounded">send_notification</code>
                <code className="bg-white px-2 py-1 rounded">generate_image</code>
                <code className="bg-white px-2 py-1 rounded">aggregate_data</code>
                <code className="bg-white px-2 py-1 rounded">...</code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* WASM Runtime Demo Card */}
        <WasmRuntimeCard />
    </div>
  )
}
