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
 * デフォルトのOpenAIモデル定義
 */
const OPENAI_MODELS: AIModel[] = [
  {
    id: 'gpt-4-turbo',
    provider: 'openai',
    name: 'gpt-4-turbo',
    displayName: 'GPT-4 Turbo',
    type: 'fast',
    maxTokens: 128000,
    costPerToken: {
      input: 0.00001,
      output: 0.00003,
    },
  },
  {
    id: 'gpt-4o',
    provider: 'openai',
    name: 'gpt-4o',
    displayName: 'GPT-4o',
    type: 'think',
    maxTokens: 128000,
    costPerToken: {
      input: 0.000005,
      output: 0.000015,
    },
  },
];

/**
 * OpenAI GPT プロバイダー
 *
 * OpenAIのGPTモデル群を提供するプロバイダー
 */
export class OpenAIProvider implements IAIProvider {
  readonly id = 'openai';
  readonly name = 'OpenAI GPT';
  readonly description = 'OpenAI の GPT モデル';
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
   * OpenAIProviderのコンストラクタ
   *
   * @param aiService - AIServiceインスタンス
   * @param models - 提供するモデル一覧（オプション、デフォルトはOPENAI_MODELS）
   */
  constructor(aiService: AIService, models?: AIModel[]) {
    this.aiService = aiService;
    this.models = models || OPENAI_MODELS;
    this.isAvailable = true;
  }

  getSupportedModels(): AIModel[] {
    return this.models;
  }

  async generate(
    modelId: string,
    context: AIAgentContext,
    options?: AIActionOptions
  ): Promise<AIGenerateResult> {
    const model = this.getModel(modelId);
    const prompt = this.buildGeneratePrompt(context, options);
    const startTime = Date.now();

    const response = await this.aiService.chat(prompt, {
      provider: 'openai',
      model: model.name,
      temperature: 0.7,
      maxTokens: model.maxTokens,
    });

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
      provider: 'openai',
      model: model.name,
      temperature: 0.7,
      maxTokens: model.maxTokens,
    });

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
      provider: 'openai',
      model: model.name,
      temperature: 0.7,
      maxTokens: model.maxTokens,
    });

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

  async generateStream(
    modelId: string,
    context: AIAgentContext,
    onChunk: (chunk: string) => void,
    options?: AIActionOptions
  ): Promise<void> {
    const model = this.getModel(modelId);
    const prompt = this.buildGeneratePrompt(context, options);

    await this.aiService.chatStream(prompt, onChunk, {
      provider: 'openai',
      model: model.name,
      temperature: 0.7,
      maxTokens: model.maxTokens,
    });
  }

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
      provider: 'openai',
      model: model.name,
      temperature: 0.7,
      maxTokens: model.maxTokens,
    });
  }

  getTokenUsage(): TokenUsage {
    return { ...this.tokenUsage };
  }

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

  private getModel(modelId: string): AIModel {
    const model = this.models.find((m) => m.id === modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }
    return model;
  }

  private updateTokenUsage(
    inputTokens: number,
    outputTokens: number,
    model: AIModel
  ): void {
    this.tokenUsage.input += inputTokens;
    this.tokenUsage.output += outputTokens;
    this.tokenUsage.total += inputTokens + outputTokens;

    if (model.costPerToken) {
      const cost =
        inputTokens * model.costPerToken.input +
        outputTokens * model.costPerToken.output;
      this.tokenUsage.cost = (this.tokenUsage.cost || 0) + cost;
    }
  }

  private buildGeneratePrompt(
    context: AIAgentContext,
    options?: AIActionOptions
  ): string {
    if (options?.customPrompt) {
      return options.customPrompt;
    }

    const parts: string[] = [];
    parts.push(`以下のコンテキストに基づいて、適切な内容を生成してください。`);
    parts.push(`\n【コンテキスト】`);
    parts.push(`- スコープ: ${context.scope}`);
    parts.push(`- タイプ: ${context.type}`);

    if (context.relatedData && Object.keys(context.relatedData).length > 0) {
      parts.push(
        `- 関連情報: ${JSON.stringify(context.relatedData, null, 2)}`
      );
    }

    if (options?.direction) {
      parts.push(`\n【スタイル】`);
      parts.push(`${options.direction}スタイルで作成してください。`);
    }

    if (context.maxLength) {
      parts.push(`\n【重要】`);
      parts.push(`必ず${context.maxLength}文字以内で生成してください。`);
    }

    parts.push(
      `\n生成されたテキストのみを返してください。説明や追加のコメントは一切不要です。`
    );

    return parts.join('\n');
  }

  private buildRefinePrompt(
    currentValue: string,
    context: AIAgentContext,
    options?: AIActionOptions
  ): string {
    if (options?.customPrompt) {
      return options.customPrompt;
    }

    const parts: string[] = [];
    parts.push(`以下のテキストを改善してください。`);
    parts.push(`\n【現在のテキスト】`);
    parts.push(currentValue);
    parts.push(`\n【コンテキスト】`);
    parts.push(`- スコープ: ${context.scope}`);
    parts.push(`- タイプ: ${context.type}`);

    if (options?.direction) {
      parts.push(`\n【改善の方向性】`);
      parts.push(`${options.direction}ように修正してください。`);
    } else {
      parts.push(`\n【改善の方向性】`);
      parts.push(
        `文法、表現、トーンを改善し、より洗練された内容にしてください。`
      );
    }

    if (context.maxLength) {
      parts.push(`\n【重要】`);
      parts.push(`改善後のテキストは必ず${context.maxLength}文字以内にしてください。`);
    }

    parts.push(
      `\n改善されたテキストのみを返してください。説明や追加のコメントは一切不要です。`
    );

    return parts.join('\n');
  }

  private buildCommandPrompt(
    command: string,
    currentValue: string,
    context: AIAgentContext
  ): string {
    const parts: string[] = [];
    parts.push(`以下のコマンドに従って、テキストを処理してください。`);
    parts.push(`\n【コマンド】`);
    parts.push(command);

    if (currentValue) {
      parts.push(`\n【対象テキスト】`);
      parts.push(currentValue);
    }

    parts.push(`\n【コンテキスト】`);
    parts.push(`- スコープ: ${context.scope}`);
    parts.push(`- タイプ: ${context.type}`);

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
 * OpenAIProviderを作成するヘルパー関数
 */
export function createOpenAIProvider(aiService: AIService): OpenAIProvider {
  return new OpenAIProvider(aiService);
}
