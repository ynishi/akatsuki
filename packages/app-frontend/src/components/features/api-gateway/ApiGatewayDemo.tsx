/**
 * API Gateway Demo Card
 * Interactive demo for Public API Gateway
 *
 * Features:
 * - Create API Key (as owner)
 * - Test API calls with generated key
 * - View response
 * - Delete test key
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { Input } from '../../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { useAuth } from '../../../contexts/AuthContext'
import { useApiKeys } from '../../../hooks/useApiKeys'
import { supabase } from '../../../lib/supabase'

type Operation = 'list' | 'get' | 'create' | 'update' | 'delete'

export function ApiGatewayDemo() {
  const { user } = useAuth()
  const { apiKeys, createApiKey, isCreating, deleteApiKey, isDeleting } = useApiKeys()

  // Demo state
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [generatedKeyId, setGeneratedKeyId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Test state
  const [testEntity, setTestEntity] = useState('articles')
  const [testOperation, setTestOperation] = useState<Operation>('list')
  const [testId, setTestId] = useState('')
  const [testResult, setTestResult] = useState<string | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  // Get demo keys (created in this session)
  const demoKey = apiKeys?.find((k) => k.id === generatedKeyId)

  const handleCreateDemoKey = async () => {
    if (!user) return

    try {
      const result = await createApiKey({
        name: `Demo Key - ${new Date().toLocaleTimeString()}`,
        description: 'Created from ExamplesPage demo',
        entityName: 'Article',
        tableName: 'articles',
        allowedOperations: ['list', 'get', 'create', 'update', 'delete'],
        rateLimitPerMinute: 30,
      })
      setGeneratedKey(result.fullKey)
      setGeneratedKeyId(result.apiKey.id)
      setTestResult(null)
    } catch (error) {
      console.error('Failed to create demo key:', error)
      setTestResult(`Error: ${error}`)
    }
  }

  const handleCopyKey = async () => {
    if (generatedKey) {
      await navigator.clipboard.writeText(generatedKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleTestApi = async () => {
    if (!generatedKey) {
      setTestResult('Error: No API key generated')
      return
    }

    setIsTesting(true)
    setTestResult(null)

    try {
      const baseUrl = supabase.supabaseUrl
      let url = `${baseUrl}/functions/v1/api-gateway/${testEntity}/${testOperation}`

      if ((testOperation === 'get' || testOperation === 'delete') && testId) {
        url += `?id=${testId}`
      }

      const options: RequestInit = {
        method: testOperation === 'list' || testOperation === 'get' ? 'GET' : 'POST',
        headers: {
          'X-API-Key': generatedKey,
          'Content-Type': 'application/json',
        },
      }

      // Add body for create/update
      if (testOperation === 'create') {
        options.body = JSON.stringify({
          title: `Test Article ${Date.now()}`,
          content: 'Created via API Gateway Demo',
          status: 'draft',
        })
      } else if (testOperation === 'update' && testId) {
        options.body = JSON.stringify({
          id: testId,
          title: `Updated ${Date.now()}`,
        })
      } else if (testOperation === 'delete' && testId) {
        options.body = JSON.stringify({ id: testId })
      }

      const response = await fetch(url, options)
      const data = await response.json()

      setTestResult(JSON.stringify(data, null, 2))
    } catch (error) {
      setTestResult(`Error: ${error}`)
    } finally {
      setIsTesting(false)
    }
  }

  const handleDeleteDemoKey = async () => {
    if (generatedKeyId) {
      await deleteApiKey(generatedKeyId)
      setGeneratedKey(null)
      setGeneratedKeyId(null)
      setTestResult(null)
    }
  }

  if (!user) {
    return (
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🔐</span>
            Public API Gateway
          </CardTitle>
          <CardDescription>
            API Key認証で外部からHEADLESS APIにアクセス
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">
            ログインするとAPI Keyを発行してテストできます
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">🔐</span>
          Public API Gateway Demo
        </CardTitle>
        <CardDescription>
          API Keyを発行して動作確認できます（Owner権限）
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step 1: Create API Key */}
        <div className="bg-white p-4 rounded-lg space-y-3">
          <h3 className="font-semibold text-gray-700">
            Step 1: API Key発行
          </h3>

          {!generatedKey ? (
            <Button
              onClick={handleCreateDemoKey}
              disabled={isCreating}
              className="w-full"
            >
              {isCreating ? '発行中...' : '🔑 デモ用API Keyを発行'}
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-green-500">
                  発行済み
                </Badge>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {demoKey?.keyPrefix}
                </code>
              </div>
              <div className="bg-gray-100 p-2 rounded text-xs font-mono break-all">
                {generatedKey}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={copied ? 'secondary' : 'outline'}
                  onClick={handleCopyKey}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDeleteDemoKey}
                  disabled={isDeleting}
                >
                  削除
                </Button>
              </div>
              <p className="text-xs text-orange-600">
                ⚠️ このキーはデモ用です。テスト後は削除してください。
              </p>
            </div>
          )}
        </div>

        {/* Step 2: Test API */}
        {generatedKey && (
          <div className="bg-white p-4 rounded-lg space-y-3">
            <h3 className="font-semibold text-gray-700">
              Step 2: API呼び出しテスト
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Entity</label>
                <Input
                  value={testEntity}
                  onChange={(e) => setTestEntity(e.target.value)}
                  placeholder="articles"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Operation</label>
                <Select
                  value={testOperation}
                  onValueChange={(v) => setTestOperation(v as Operation)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="list">list</SelectItem>
                    <SelectItem value="get">get</SelectItem>
                    <SelectItem value="create">create</SelectItem>
                    <SelectItem value="update">update</SelectItem>
                    <SelectItem value="delete">delete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(testOperation === 'get' ||
              testOperation === 'update' ||
              testOperation === 'delete') && (
              <div>
                <label className="text-xs text-gray-500">ID (UUID)</label>
                <Input
                  value={testId}
                  onChange={(e) => setTestId(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
              </div>
            )}

            <Button
              onClick={handleTestApi}
              disabled={isTesting}
              className="w-full"
            >
              {isTesting ? 'Testing...' : `🚀 ${testOperation.toUpperCase()} 実行`}
            </Button>

            {/* Request Preview */}
            <div className="text-xs">
              <p className="text-gray-500 mb-1">Request:</p>
              <pre className="bg-gray-50 p-2 rounded font-mono overflow-x-auto">
                {`${testOperation === 'list' || testOperation === 'get' ? 'GET' : 'POST'} /api-gateway/${testEntity}/${testOperation}${
                  testId && (testOperation === 'get' || testOperation === 'delete')
                    ? `?id=${testId}`
                    : ''
                }
X-API-Key: ${generatedKey.slice(0, 20)}...`}
              </pre>
            </div>
          </div>
        )}

        {/* Step 3: Response */}
        {testResult && (
          <div className="bg-white p-4 rounded-lg space-y-2">
            <h3 className="font-semibold text-gray-700">
              Step 3: Response
            </h3>
            <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs font-mono overflow-x-auto max-h-60">
              {testResult}
            </pre>
          </div>
        )}

        {/* Features */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">API Key認証</Badge>
          <Badge variant="outline">Rate Limiting</Badge>
          <Badge variant="outline">即時停止</Badge>
          <Badge variant="outline">使用統計</Badge>
          <Badge variant="outline">権限管理</Badge>
        </div>

        {/* Info */}
        <div className="bg-blue-50 p-3 rounded-lg text-sm text-gray-700">
          <p className="font-semibold mb-2">🎯 このデモでできること:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>API Keyをその場で発行（Owner権限）</li>
            <li>api-gateway経由でCRUD操作をテスト</li>
            <li>レスポンスを確認</li>
            <li>テスト後にキーを削除</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
