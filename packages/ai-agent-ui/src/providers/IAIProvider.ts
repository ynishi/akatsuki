import type { AIAgentContext, AIActionOptions, TokenUsage, AIModel } from '../core/types';

// AIModelを再export
export type { AIModel };

/**
 * AI生成結果
 */
export interface AIGenerateResult {
  /** 生成されたテキスト */
  text: string;

  /** Token使用量（オプション） */
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };

  /** モデルID */
  modelId: string;

  /** プロバイダーID */
  providerId: string;

  /** 実行時間（ミリ秒、オプション） */
  duration?: number;
}

/**
 * AIプロバイダーインターフェース
 * 各LLMサービス（Gemini, Anthropic, OpenAIなど）がこれを実装
 */
export interface IAIProvider {
  /**
   * プロバイダーID（例: "gemini", "anthropic", "openai"）
   */
  readonly id: string;

  /**
   * プロバイダー表示名（例: "Google Gemini", "Anthropic Claude"）
   */
  readonly name: string;

  /**
   * プロバイダーの説明
   */
  readonly description?: string;

  /**
   * 利用可能状態
   */
  readonly isAvailable: boolean;

  /**
   * このプロバイダーが提供するモデル一覧
   */
  getSupportedModels(): AIModel[];

  /**
   * コンテンツ生成
   *
   * @param modelId - 使用するモデルID
   * @param context - コンテキスト情報
   * @param options - 生成オプション
   * @returns 生成結果
   */
  generate(
    modelId: string,
    context: AIAgentContext,
    options?: AIActionOptions
  ): Promise<AIGenerateResult>;

  /**
   * コンテンツ修正
   *
   * @param modelId - 使用するモデルID
   * @param currentValue - 現在のテキスト
   * @param context - コンテキスト情報
   * @param options - 修正オプション
   * @returns 修正結果
   */
  refine(
    modelId: string,
    currentValue: string,
    context: AIAgentContext,
    options?: AIActionOptions
  ): Promise<AIGenerateResult>;

  /**
   * カスタムコマンド実行
   *
   * @param modelId - 使用するモデルID
   * @param command - ユーザーが入力したコマンド（自由形式）
   * @param currentValue - 現在のテキスト
   * @param context - コンテキスト情報
   * @returns 実行結果のテキスト
   */
  executeCommand(
    modelId: string,
    command: string,
    currentValue: string,
    context: AIAgentContext
  ): Promise<AIGenerateResult>;

  /**
   * ストリーミング生成（オプション）
   *
   * @param modelId - 使用するモデルID
   * @param context - コンテキスト情報
   * @param onChunk - チャンクコールバック
   * @param options - 生成オプション
   */
  generateStream?(
    modelId: string,
    context: AIAgentContext,
    onChunk: (chunk: string) => void,
    options?: AIActionOptions
  ): Promise<void>;

  /**
   * ストリーミング修正（オプション）
   *
   * @param modelId - 使用するモデルID
   * @param currentValue - 現在のテキスト
   * @param context - コンテキスト情報
   * @param onChunk - チャンクコールバック
   * @param options - 修正オプション
   */
  refineStream?(
    modelId: string,
    currentValue: string,
    context: AIAgentContext,
    onChunk: (chunk: string) => void,
    options?: AIActionOptions
  ): Promise<void>;

  /**
   * このプロバイダーのToken使用量を取得
   *
   * @returns Token使用量
   */
  getTokenUsage(): TokenUsage;

  /**
   * Token使用量をリセット
   */
  resetTokenUsage(): void;
}

/**
 * プロバイダー情報付きモデル
 */
export interface AIModelWithProvider extends AIModel {
  /** プロバイダーID */
  providerId: string;

  /** プロバイダー名 */
  providerName: string;
}
