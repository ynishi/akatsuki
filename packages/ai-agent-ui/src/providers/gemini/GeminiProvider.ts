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
   * SystemPrompt定義
   *
   * 各アクションの基本的な振る舞いとルールを定義
   */
  private systemPrompts = {
    generate: `あなたは優秀なコンテンツ生成アシスタントです。
与えられたコンテキストと関連情報に基づいて、適切な内容を生成してください。
必ずコンテキストの制約（文字数制限、タイプ、スコープ）を守ってください。
生成されたテキストのみを返し、説明や追加のコメントは一切含めないでください。`,

    refine: `あなたは優秀な文章改善アシスタントです。
与えられたテキストを、コンテキストと関連情報に応じて改善してください。
必ずコンテキストの制約（文字数制限、タイプ、スコープ）を守ってください。
改善されたテキストのみを返し、説明や追加のコメントは一切含めないでください。`,

    command: `あなたは柔軟なテキスト処理アシスタントです。
ユーザーのコマンドに従って、テキストを処理してください。
必ずコンテキストの制約（文字数制限、タイプ、スコープ）を守ってください。
処理結果のテキストのみを返し、説明や追加のコメントは一切含めないでください。`
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
    const parts: string[] = [];

    // ✅ 1. SystemPrompt（常に含める）
    parts.push(this.systemPrompts.generate);

    // ✅ 2. コンテキスト情報（常に含める）
    parts.push(`\n【コンテキスト】`);
    parts.push(`- スコープ: ${context.scope}`);
    parts.push(`- タイプ: ${context.type}`);

    // ✅ 3. 関連データ（ユーザー入力などのフォーム状態を含む）
    if (context.relatedData && Object.keys(context.relatedData).length > 0) {
      parts.push(`\n【関連情報】`);
      // より読みやすい形式で出力
      Object.entries(context.relatedData).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          parts.push(`- ${key}: ${value}`);
        } else {
          parts.push(`- ${key}: ${JSON.stringify(value, null, 2)}`);
        }
      });
    }

    // ✅ 4. 現在の値（生成の参考情報として）
    if (context.currentValue) {
      parts.push(`\n【現在の値（参考）】`);
      parts.push(context.currentValue);
    }

    // ✅ 5. 文字数制限（重要な制約として強調）
    if (context.maxLength) {
      parts.push(`\n【重要な制約】`);
      parts.push(`生成するテキストは必ず${context.maxLength}文字以内にしてください。`);
    }

    // ✅ 6. 方向性指定（スタイル指示）
    if (options?.direction) {
      parts.push(`\n【スタイル指定】`);
      parts.push(`${options.direction}スタイルで作成してください。`);
    }

    // ✅ 7. CustomPrompt（追加の指示として扱う）
    if (options?.customPrompt) {
      parts.push(`\n【追加の指示】`);
      parts.push(options.customPrompt);
    }

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
    const parts: string[] = [];

    // ✅ 1. SystemPrompt（常に含める）
    parts.push(this.systemPrompts.refine);

    // ✅ 2. 現在のテキスト（必須）
    parts.push(`\n【現在のテキスト】`);
    parts.push(currentValue);

    // ✅ 3. コンテキスト情報（常に含める）
    parts.push(`\n【コンテキスト】`);
    parts.push(`- スコープ: ${context.scope}`);
    parts.push(`- タイプ: ${context.type}`);

    // ✅ 4. 関連データ（ユーザー入力などのフォーム状態を含む）
    if (context.relatedData && Object.keys(context.relatedData).length > 0) {
      parts.push(`\n【関連情報】`);
      Object.entries(context.relatedData).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          parts.push(`- ${key}: ${value}`);
        } else {
          parts.push(`- ${key}: ${JSON.stringify(value, null, 2)}`);
        }
      });
    }

    // ✅ 5. 文字数制限（重要な制約として強調）
    if (context.maxLength) {
      parts.push(`\n【重要な制約】`);
      parts.push(`改善後のテキストは必ず${context.maxLength}文字以内にしてください。`);
    }

    // ✅ 6. 改善の方向性（directionまたはデフォルト）
    if (options?.direction) {
      parts.push(`\n【改善の方向性】`);
      parts.push(`${options.direction}ように修正してください。`);
    } else {
      parts.push(`\n【改善の方向性】`);
      parts.push(`文法、表現、トーンを改善し、より洗練された内容にしてください。`);
    }

    // ✅ 7. CustomPrompt（追加の指示として扱う）
    if (options?.customPrompt) {
      parts.push(`\n【追加の指示】`);
      parts.push(options.customPrompt);
    }

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

    // ✅ 1. SystemPrompt（常に含める）
    parts.push(this.systemPrompts.command);

    // ✅ 2. ユーザーコマンド（最優先の指示）
    parts.push(`\n【コマンド】`);
    parts.push(command);

    // ✅ 3. 対象テキスト（存在する場合）
    if (currentValue) {
      parts.push(`\n【対象テキスト】`);
      parts.push(currentValue);
    }

    // ✅ 4. コンテキスト情報（常に含める）
    parts.push(`\n【コンテキスト】`);
    parts.push(`- スコープ: ${context.scope}`);
    parts.push(`- タイプ: ${context.type}`);

    // ✅ 5. 関連データ（ユーザー入力などのフォーム状態を含む）
    if (context.relatedData && Object.keys(context.relatedData).length > 0) {
      parts.push(`\n【関連情報】`);
      Object.entries(context.relatedData).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          parts.push(`- ${key}: ${value}`);
        } else {
          parts.push(`- ${key}: ${JSON.stringify(value, null, 2)}`);
        }
      });
    }

    // ✅ 6. 文字数制限（重要な制約として強調）
    if (context.maxLength) {
      parts.push(`\n【重要な制約】`);
      parts.push(`結果は必ず${context.maxLength}文字以内にしてください。`);
    }

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
