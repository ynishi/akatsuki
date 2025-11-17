import { AIService } from './AIService'
import type { AIServiceOptions } from './AIService'

/**
 * AIService Adapter for ai-agent-ui
 *
 * ai-agent-uiのプロバイダーが期待するインターフェースに適合させるアダプター
 * 主な変換:
 * - usage.promptTokens → usage.inputTokens
 * - usage.completionTokens → usage.outputTokens
 */
export class AIServiceAdapter {
  /**
   * チャット補完（ai-agent-ui互換）
   * @param prompt - プロンプト
   * @param options - オプション
   * @returns AI応答（usage形式を変換）
   */
  static async chat(
    prompt: string,
    options?: {
      provider?: string
      model?: string
      temperature?: number
      maxTokens?: number
    }
  ): Promise<{
    text: string
    usage?: { inputTokens: number; outputTokens: number }
  }> {
    const serviceOptions: AIServiceOptions = {
      provider: options?.provider,
      model: options?.model,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    }

    const response = await AIService.chat(prompt, serviceOptions)

    // usage フィールドを ai-agent-ui の期待する形式に変換
    const adaptedUsage = response.usage
      ? {
          inputTokens: response.usage.promptTokens || 0,
          outputTokens: response.usage.completionTokens || 0,
        }
      : undefined

    return {
      text: response.text,
      usage: adaptedUsage,
    }
  }

  /**
   * ストリーミングチャット補完（ai-agent-ui互換）
   * @param prompt - プロンプト
   * @param onChunk - チャンクコールバック
   * @param options - オプション
   */
  static async chatStream(
    prompt: string,
    onChunk: (chunk: string) => void,
    options?: {
      provider?: string
      model?: string
      temperature?: number
      maxTokens?: number
    }
  ): Promise<void> {
    const serviceOptions: AIServiceOptions = {
      provider: options?.provider,
      model: options?.model,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    }

    await AIService.chatStream(prompt, onChunk, serviceOptions)
  }
}
