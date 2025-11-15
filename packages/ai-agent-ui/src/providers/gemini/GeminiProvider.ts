import type { IAIProvider, AIModel, AIGenerateResult } from '../IAIProvider';
import type { AIAgentContext, AIActionOptions, TokenUsage } from '../../core/types';

// 型定義（app-frontendから実際に参照する際に使用）
type AIService = {
  chat: (
    prompt: string,
    options?: {
      provider?: string;
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ) => Promise<{ text: string; usage?: { inputTokens: number; outputTokens: number } }>;
  chatStream: (
    prompt: string,
    onChunk: (chunk: string) => void,
    options?: {
      provider?: string;
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ) => Promise<void>;
};

/**
 * デフォルトのGeminiモデル定義
 */
const GEMINI_MODELS: AIModel[] = [
  {
    id: 'gemini-2.5-flash',
    provider: 'gemini',
    name: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    type: 'fast',
    maxTokens: 65536,
    costPerToken: {
      input: 0.000001,
      output: 0.000002,
    },
  },
  {
    id: 'gemini-2.5-pro',
    provider: 'gemini',
    name: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    type: 'think',
    maxTokens: 65536,
    costPerToken: {
      input: 0.000003,
      output: 0.000006,
    },
  },
];

/**
 * Google Gemini プロバイダー
 *
 * Google AIのGeminiモデル群を提供するプロバイダー
 */
export class GeminiProvider implements IAIProvider {
  readonly id = 'gemini';
  readonly name = 'Google Gemini';
  readonly description = 'Google AI の大規模言語モデル';
  readonly isAvailable: boolean;

  private aiService: AIService;
  private models: AIModel[];
  private tokenUsage: TokenUsage = {
    input: 0,
    output: 0,
    total: 0,
    cost: 0,
  };

  /**
   * GeminiProviderのコンストラクタ
   *
   * @param aiService - AIServiceインスタンス
   * @param models - 提供するモデル一覧（オプション、デフォルトはGEMINI_MODELS）
   */
  constructor(aiService: AIService, models?: AIModel[]) {
    this.aiService = aiService;
    this.models = models || GEMINI_MODELS;
    this.isAvailable = true; // 実際はAPI疎通確認などで判定
  }

  /**
   * このプロバイダーが提供するモデル一覧
   */
  getSupportedModels(): AIModel[] {
    return this.models;
  }

  /**
   * コンテンツ生成
   */
  async generate(
    modelId: string,
    context: AIAgentContext,
    options?: AIActionOptions
  ): Promise<AIGenerateResult> {
    const model = this.getModel(modelId);
    const prompt = this.buildGeneratePrompt(context, options);
    const startTime = Date.now();

    const response = await this.aiService.chat(prompt, {
      provider: 'gemini',
      model: model.name,
      temperature: 0.7,
      maxTokens: model.maxTokens,
    });

    // Token使用量を更新
    if (response.usage) {
      this.updateTokenUsage(
        response.usage.inputTokens,
        response.usage.outputTokens,
        model
      );
    }

    return {
      text: response.text,
      usage: response.usage,
      modelId,
      providerId: this.id,
      duration: Date.now() - startTime,
    };
  }

  /**
   * コンテンツ修正
   */
  async refine(
    modelId: string,
    currentValue: string,
    context: AIAgentContext,
    options?: AIActionOptions
  ): Promise<AIGenerateResult> {
    const model = this.getModel(modelId);
    const prompt = this.buildRefinePrompt(currentValue, context, options);
    const startTime = Date.now();

    const response = await this.aiService.chat(prompt, {
      provider: 'gemini',
      model: model.name,
      temperature: 0.7,
      maxTokens: model.maxTokens,
    });

    // Token使用量を更新
    if (response.usage) {
      this.updateTokenUsage(
        response.usage.inputTokens,
        response.usage.outputTokens,
        model
      );
    }

    return {
      text: response.text,
      usage: response.usage,
      modelId,
      providerId: this.id,
      duration: Date.now() - startTime,
    };
  }

  /**
   * カスタムコマンド実行
   */
  async executeCommand(
    modelId: string,
    command: string,
    currentValue: string,
    context: AIAgentContext
  ): Promise<AIGenerateResult> {
    const model = this.getModel(modelId);
    const prompt = this.buildCommandPrompt(command, currentValue, context);
    const startTime = Date.now();

    const response = await this.aiService.chat(prompt, {
      provider: 'gemini',
      model: model.name,
      temperature: 0.7,
      maxTokens: model.maxTokens,
    });

    // Token使用量を更新
    if (response.usage) {
      this.updateTokenUsage(
        response.usage.inputTokens,
        response.usage.outputTokens,
        model
      );
    }

    return {
      text: response.text,
      usage: response.usage,
      modelId,
      providerId: this.id,
      duration: Date.now() - startTime,
    };
  }

  /**
   * ストリーミング生成
   */
  async generateStream(
    modelId: string,
    context: AIAgentContext,
    onChunk: (chunk: string) => void,
    options?: AIActionOptions
  ): Promise<void> {
    const model = this.getModel(modelId);
    const prompt = this.buildGeneratePrompt(context, options);

    await this.aiService.chatStream(prompt, onChunk, {
      provider: 'gemini',
      model: model.name,
      temperature: 0.7,
      maxTokens: model.maxTokens,
    });
  }

  /**
   * ストリーミング修正
   */
  async refineStream(
    modelId: string,
    currentValue: string,
    context: AIAgentContext,
    onChunk: (chunk: string) => void,
    options?: AIActionOptions
  ): Promise<void> {
    const model = this.getModel(modelId);
    const prompt = this.buildRefinePrompt(currentValue, context, options);

    await this.aiService.chatStream(prompt, onChunk, {
      provider: 'gemini',
      model: model.name,
      temperature: 0.7,
      maxTokens: model.maxTokens,
    });
  }

  /**
   * このプロバイダーのToken使用量を取得
   */
  getTokenUsage(): TokenUsage {
    return { ...this.tokenUsage };
  }

  /**
   * Token使用量をリセット
   */
  resetTokenUsage(): void {
    this.tokenUsage = {
      input: 0,
      output: 0,
      total: 0,
      cost: 0,
    };
  }

  // ============================================================================
  // Private メソッド
  // ============================================================================

  /**
   * モデルIDからモデルを取得
   *
   * @param modelId - モデルID
   * @returns モデル
   * @throws モデルが見つからない場合
   */
  private getModel(modelId: string): AIModel {
    const model = this.models.find((m) => m.id === modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }
    return model;
  }

  /**
   * Token使用量を更新
   *
   * @param inputTokens - 入力トークン数
   * @param outputTokens - 出力トークン数
   * @param model - 使用したモデル
   */
  private updateTokenUsage(
    inputTokens: number,
    outputTokens: number,
    model: AIModel
  ): void {
    this.tokenUsage.input += inputTokens;
    this.tokenUsage.output += outputTokens;
    this.tokenUsage.total += inputTokens + outputTokens;

    // コスト計算
    if (model.costPerToken) {
      const cost =
        inputTokens * model.costPerToken.input +
        outputTokens * model.costPerToken.output;
      this.tokenUsage.cost = (this.tokenUsage.cost || 0) + cost;
    }
  }

  /**
   * 生成用プロンプトを構築
   */
  private buildGeneratePrompt(
    context: AIAgentContext,
    options?: AIActionOptions
  ): string {
    if (options?.customPrompt) {
      return options.customPrompt;
    }

    const parts: string[] = [];

    // 基本指示
    parts.push(`以下のコンテキストに基づいて、適切な内容を生成してください。`);

    // コンテキスト情報
    parts.push(`\n【コンテキスト】`);
    parts.push(`- スコープ: ${context.scope}`);
    parts.push(`- タイプ: ${context.type}`);

    if (context.relatedData && Object.keys(context.relatedData).length > 0) {
      parts.push(
        `- 関連情報: ${JSON.stringify(context.relatedData, null, 2)}`
      );
    }

    // 方向性指定
    if (options?.direction) {
      parts.push(`\n【スタイル】`);
      parts.push(`${options.direction}スタイルで作成してください。`);
    }

    // 文字数制限（プロンプトで明示的に指示）
    if (context.maxLength) {
      parts.push(`\n【重要】`);
      parts.push(`必ず${context.maxLength}文字以内で生成してください。`);
    }

    parts.push(
      `\n生成されたテキストのみを返してください。説明や追加のコメントは一切不要です。`
    );

    return parts.join('\n');
  }

  /**
   * 修正用プロンプトを構築
   */
  private buildRefinePrompt(
    currentValue: string,
    context: AIAgentContext,
    options?: AIActionOptions
  ): string {
    if (options?.customPrompt) {
      return options.customPrompt;
    }

    const parts: string[] = [];

    // 基本指示
    parts.push(`以下のテキストを改善してください。`);

    // 現在のテキスト
    parts.push(`\n【現在のテキスト】`);
    parts.push(currentValue);

    // コンテキスト情報
    parts.push(`\n【コンテキスト】`);
    parts.push(`- スコープ: ${context.scope}`);
    parts.push(`- タイプ: ${context.type}`);

    // 方向性指定
    if (options?.direction) {
      parts.push(`\n【改善の方向性】`);
      parts.push(`${options.direction}ように修正してください。`);
    } else {
      parts.push(`\n【改善の方向性】`);
      parts.push(
        `文法、表現、トーンを改善し、より洗練された内容にしてください。`
      );
    }

    // 文字数制限（プロンプトで明示的に指示）
    if (context.maxLength) {
      parts.push(`\n【重要】`);
      parts.push(`改善後のテキストは必ず${context.maxLength}文字以内にしてください。`);
    }

    parts.push(
      `\n改善されたテキストのみを返してください。説明や追加のコメントは一切不要です。`
    );

    return parts.join('\n');
  }

  /**
   * コマンド用プロンプトを構築
   */
  private buildCommandPrompt(
    command: string,
    currentValue: string,
    context: AIAgentContext
  ): string {
    const parts: string[] = [];

    // ユーザーコマンド
    parts.push(`以下のコマンドに従って、テキストを処理してください。`);
    parts.push(`\n【コマンド】`);
    parts.push(command);

    // 現在のテキスト
    if (currentValue) {
      parts.push(`\n【対象テキスト】`);
      parts.push(currentValue);
    }

    // コンテキスト情報
    parts.push(`\n【コンテキスト】`);
    parts.push(`- スコープ: ${context.scope}`);
    parts.push(`- タイプ: ${context.type}`);

    // 文字数制限
    if (context.maxLength) {
      parts.push(`\n【重要】`);
      parts.push(`結果は必ず${context.maxLength}文字以内にしてください。`);
    }

    parts.push(
      `\n処理結果のテキストのみを返してください。説明や追加のコメントは一切不要です。`
    );

    return parts.join('\n');
  }
}

/**
 * AIServiceインスタンスを設定するためのヘルパー関数
 * GeminiProviderを作成する際に使用
 */
export function createGeminiProvider(aiService: AIService): GeminiProvider {
  return new GeminiProvider(aiService);
}
