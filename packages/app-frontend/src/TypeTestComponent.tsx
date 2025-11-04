/**
 * TypeScript Type Safety Test Component
 *
 * このコンポーネントは、型定義が正しく機能するかテストします。
 * 意図的なミスを含めて、TypeScriptがどのように検出するか確認します。
 */

import { useState } from 'react'
import { EdgeFunctionService } from './services/EdgeFunctionService'
import type {
  EdgeFunctionResponse,
  AIChatRequest,
  AIChatResponse,
  ImageGenerationRequest,
  ImageGenerationEdgeResponse,
} from './types'

export function TypeTestComponent() {
  const [result, setResult] = useState<string>('')

  // ============================================================
  // Test 1: 正しい使い方 - AI Chat
  // ============================================================
  const testCorrectUsage = async () => {
    const request: AIChatRequest = {
      message: 'Hello, TypeScript!',
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.7,
    }

    const { data, error }: EdgeFunctionResponse<AIChatResponse> =
      await EdgeFunctionService.invoke('ai-chat', request)

    if (error) {
      console.error('Error:', error.message)
      setResult(`Error: ${error.message}`)
      return
    }

    // ✅ 型チェックが効いている
    console.log('Response:', data.response)
    console.log('Model:', data.model)
    console.log('Provider:', data.provider)
    if (data.usage) {
      console.log('Tokens:', data.usage.totalTokens)
    }

    setResult(`Success: ${data.response}`)
  }

  // ============================================================
  // Test 2: よくあるミス1 - { data, error } を忘れる
  // ============================================================
  const testMissingDestructure = async () => {
    const request: AIChatRequest = {
      message: 'Test',
    }

    // ❌ ミス: { data, error } を忘れる
    // TypeScriptは result の型を EdgeFunctionResponse<AIChatResponse> と推論
    const result = await EdgeFunctionService.invoke('ai-chat', request)

    // ❌ これはエラーになる（result.response は存在しない）
    // @ts-expect-error - 意図的なエラー: Property 'response' does not exist on type 'EdgeFunctionResponse<AIChatResponse>'
    console.log(result.response)

    // ✅ 正しくは result.data.response
    if (!result.error && result.data) {
      console.log(result.data.response)
    }
  }

  // ============================================================
  // Test 3: よくあるミス2 - プロパティ名のタイポ
  // ============================================================
  const testPropertyTypo = async () => {
    const { data, error }: EdgeFunctionResponse<AIChatResponse> =
      await EdgeFunctionService.invoke('ai-chat', { message: 'Test' })

    if (error) {
      console.error(error.message)
      return
    }

    // ❌ タイポ: responce → response
    // @ts-expect-error - 意図的なエラー: Property 'responce' does not exist on type 'AIChatResponse'
    console.log(data.responce)

    // ✅ 正しいプロパティ名
    console.log(data.response)
  }

  // ============================================================
  // Test 4: よくあるミス3 - エラーチェック忘れ
  // ============================================================
  const testMissingErrorCheck = async () => {
    const { data, error }: EdgeFunctionResponse<AIChatResponse> =
      await EdgeFunctionService.invoke('ai-chat', { message: 'Test' })

    // ❌ エラーチェックせずに data にアクセス
    // TypeScriptは data が null の可能性を警告
    // @ts-expect-error - 意図的なエラー: Object is possibly 'null'
    console.log(data.response)

    // ✅ 正しいエラーチェック
    if (error) {
      console.error('Failed:', error.message)
      return
    }
    console.log('Success:', data.response) // ここでは data は non-null
  }

  // ============================================================
  // Test 5: よくあるミス4 - 間違った型の引数
  // ============================================================
  const testWrongArgumentType = async () => {
    // ❌ temperature は number のはずが string
    const request: AIChatRequest = {
      message: 'Test',
      // @ts-expect-error - 意図的なエラー: Type 'string' is not assignable to type 'number | undefined'
      temperature: '0.7', // Should be number
    }

    await EdgeFunctionService.invoke('ai-chat', request)
  }

  // ============================================================
  // Test 6: Image Generation - 正しい使い方
  // ============================================================
  const testImageGeneration = async () => {
    const request: ImageGenerationRequest = {
      prompt: 'A beautiful sunset',
      provider: 'dalle',
      size: '1024x1024',
      quality: 'hd',
      style: 'vivid',
    }

    const { data, error }: EdgeFunctionResponse<ImageGenerationEdgeResponse> =
      await EdgeFunctionService.invoke('generate-image', request)

    if (error) {
      console.error('Image generation failed:', error.message)
      setResult(`Error: ${error.message}`)
      return
    }

    // ✅ 型チェックが効いている
    console.log('Image URL:', data.imageUrl)
    console.log('Provider:', data.provider)
    console.log('Model:', data.model)
    if (data.revisedPrompt) {
      console.log('Revised prompt:', data.revisedPrompt)
    }

    setResult(`Image generated: ${data.imageUrl}`)
  }

  // ============================================================
  // Test 7: よくあるミス5 - 存在しないプロパティ
  // ============================================================
  const testNonexistentProperty = async () => {
    const { data, error }: EdgeFunctionResponse<ImageGenerationEdgeResponse> =
      await EdgeFunctionService.invoke('generate-image', {
        prompt: 'Test',
      })

    if (error) return

    // ❌ ImageGenerationEdgeResponse には publicUrl は存在しない
    // (それは ImageGenerationServiceResponse にのみ存在)
    // @ts-expect-error - 意図的なエラー: Property 'publicUrl' does not exist on type 'ImageGenerationEdgeResponse'
    console.log(data.publicUrl)

    // ✅ 正しいプロパティ
    console.log(data.imageUrl)
  }

  // ============================================================
  // Test 8: 正しい使い方 - 完全なエラーハンドリング
  // ============================================================
  const testCompleteErrorHandling = async () => {
    try {
      const request: AIChatRequest = {
        message: 'Explain TypeScript benefits',
        provider: 'openai',
        model: 'gpt-4',
      }

      const { data, error }: EdgeFunctionResponse<AIChatResponse> =
        await EdgeFunctionService.invoke('ai-chat', request)

      if (error) {
        console.error('Edge Function error:', error.message)
        setResult(`Error: ${error.message}`)
        return
      }

      // ここでは data は確実に non-null
      setResult(`
        Response: ${data.response}
        Model: ${data.model}
        Provider: ${data.provider}
        Tokens: ${data.usage?.totalTokens ?? 'N/A'}
      `)
    } catch (error) {
      console.error('Unexpected error:', error)
      setResult(`Unexpected error: ${error}`)
    }
  }

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">TypeScript Type Safety Test</h1>

      <div className="space-y-2">
        <button
          onClick={testCorrectUsage}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          ✅ Test 1: Correct Usage (AI Chat)
        </button>

        <button
          onClick={testMissingDestructure}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          ⚠️ Test 2: Missing Destructure (with @ts-expect-error)
        </button>

        <button
          onClick={testPropertyTypo}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          ⚠️ Test 3: Property Typo (with @ts-expect-error)
        </button>

        <button
          onClick={testMissingErrorCheck}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          ⚠️ Test 4: Missing Error Check (with @ts-expect-error)
        </button>

        <button
          onClick={testWrongArgumentType}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          ⚠️ Test 5: Wrong Argument Type (with @ts-expect-error)
        </button>

        <button
          onClick={testImageGeneration}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          ✅ Test 6: Image Generation (Correct)
        </button>

        <button
          onClick={testNonexistentProperty}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          ⚠️ Test 7: Nonexistent Property (with @ts-expect-error)
        </button>

        <button
          onClick={testCompleteErrorHandling}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          ✅ Test 8: Complete Error Handling
        </button>
      </div>

      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h2 className="font-semibold mb-2">Result:</h2>
          <pre className="whitespace-pre-wrap text-sm">{result}</pre>
        </div>
      )}

      <div className="mt-8 p-4 bg-blue-50 rounded border border-blue-200">
        <h2 className="font-semibold mb-2">📝 Notes:</h2>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li>
            <code>@ts-expect-error</code> コメントは意図的なエラーを示します
          </li>
          <li>このコメントがないと、TypeScriptビルドが失敗します</li>
          <li>
            これらのエラーは実際の開発で<strong>自動的に検出</strong>されます
          </li>
          <li>IDEでリアルタイムに赤い波線で警告されます</li>
        </ul>
      </div>
    </div>
  )
}
