import type { IAIAgentProvider } from '../IAIAgentProvider';
import type { AIAgentContext, AIActionOptions, AIModel, TokenUsage } from '../../core/types';

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
  ) => Promise<{ text: string }>;
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

// 実際のAIServiceは実行時に注入される
let AIServiceInstance: AIService | null = null;

/**
 * AIServiceインスタンスを設定
 * app-frontendから使用する際に呼び出す
 */
export function setAIService(service: AIService): void {
  AIServiceInstance = service;
}

/**
 * AIServiceを取得
 */
function getAIService(): AIService {
  if (!AIServiceInstance) {
    throw new Error(
      'AIService is not initialized. Call setAIService() first.'
    );
  }
  return AIServiceInstance;
}

/**
 * デフォルトのモデル定義
 */
const DEFAULT_MODELS: AIModel[] = [
  {
    id: 'gemini-2.5-flash',
    provider: 'gemini',
    name: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    type: 'fast',
    maxTokens: 65536,
  },
  {
    id: 'gemini-2.5-pro',
    provider: 'gemini',
    name: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    type: 'think',
    maxTokens: 65536,
  },
];

/**
 * Akatsuki AIエージェントプロバイダー
 *
 * 既存のAIServiceをラップして、IAIAgentProviderインターフェースを実装
 * EdgeFunctionService経由でSupabase Edge Functionsを利用
 */
export class AkatsukiAgentProvider implements IAIAgentProvider {
  private currentModelId: string = DEFAULT_MODELS[0].id;
  private models: AIModel[] = DEFAULT_MODELS;
  private tokenUsage: TokenUsage = {
    input: 1250,
    output: 830,
    total: 2080,
    cost: 0.0042,
    byProvider: {
      gemini: {
        input: 1250,
        output: 830,
        total: 2080,
        cost: 0.0042,
      },
    },
  };
  /**
   * コンテンツ生成
   */
  async generate(
    context: AIAgentContext,
    options?: AIActionOptions
  ): Promise<string> {
    const prompt = this.buildGeneratePrompt(context, options);
    const AIService = getAIService();
    const model = options?.modelId
      ? this.models.find((m) => m.id === options.modelId) || this.getCurrentModel()
      : this.getCurrentModel();

    const response = await AIService.chat(prompt, {
      provider: model.provider,
      model: model.name,
      temperature: 0.7,
      maxTokens: model.maxTokens,
    });

    return response.text;
  }

  /**
   * コンテンツ修正
   */
  async refine(
    currentValue: string,
    context: AIAgentContext,
    options?: AIActionOptions
  ): Promise<string> {
    const prompt = this.buildRefinePrompt(currentValue, context, options);
    const AIService = getAIService();
    const model = options?.modelId
      ? this.models.find((m) => m.id === options.modelId) || this.getCurrentModel()
      : this.getCurrentModel();

    const response = await AIService.chat(prompt, {
      provider: model.provider,
      model: model.name,
      temperature: 0.7,
      maxTokens: model.maxTokens,
    });

    return response.text;
  }

  /**
   * ストリーミング生成
   */
  async generateStream(
    context: AIAgentContext,
    onChunk: (chunk: string) => void,
    options?: AIActionOptions
  ): Promise<void> {
    const prompt = this.buildGeneratePrompt(context, options);
    const AIService = getAIService();

    await AIService.chatStream(prompt, onChunk, {
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      temperature: 0.7,
      maxTokens: this.getMaxTokens(context),
    });
  }

  /**
   * ストリーミング修正
   */
  async refineStream(
    currentValue: string,
    context: AIAgentContext,
    onChunk: (chunk: string) => void,
    options?: AIActionOptions
  ): Promise<void> {
    const prompt = this.buildRefinePrompt(currentValue, context, options);
    const AIService = getAIService();

    await AIService.chatStream(prompt, onChunk, {
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      temperature: 0.7,
      maxTokens: this.getMaxTokens(context),
    });
  }

  // === プライベートメソッド ===

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
   * カスタムコマンド実行
   */
  async executeCommand(
    command: string,
    currentValue: string,
    context: AIAgentContext
  ): Promise<string> {
    const prompt = this.buildCommandPrompt(command, currentValue, context);
    const AIService = getAIService();
    const model = this.getCurrentModel();
    const response = await AIService.chat(prompt, {
      provider: model.provider,
      model: model.name,
      temperature: 0.7,
      maxTokens: model.maxTokens,
    });
    return response.text;
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

  /**
   * コンテキストに応じた最大トークン数を取得
   *
   * Gemini 2.5 Flashは最大65,536トークンまでサポート
   */
  private getMaxTokens(_context: AIAgentContext): number {
    // Gemini 2.5 Flashの上限を使用
    return 65536;
  }

  /**
   * 利用可能なモデル一覧を取得
   */
  getSupportedModels(): AIModel[] {
    return this.models;
  }

  /**
   * 現在選択中のモデルを取得
   */
  getCurrentModel(): AIModel {
    const model = this.models.find((m) => m.id === this.currentModelId);
    if (!model) {
      throw new Error(`Model not found: ${this.currentModelId}`);
    }
    return model;
  }

  /**
   * モデルを切り替え
   */
  setModel(modelId: string): void {
    const model = this.models.find((m) => m.id === modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }
    this.currentModelId = modelId;
  }

  /**
   * 現在のToken使用量を取得
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
      byProvider: {},
    };
  }

  /**
   * Token使用量を更新（内部用）
   *
   * 注: 現在のAIServiceはToken使用量を返さないため、
   * このメソッドは将来的にAIServiceが拡張された際に使用する予定
   *
   * @param input - 入力トークン数
   * @param output - 出力トークン数
   * @param provider - プロバイダー名（オプション、デフォルトは現在のモデルのプロバイダー）
   */
  updateTokenUsage(input: number, output: number, provider?: string): void {
    const currentModel = this.getCurrentModel();
    const providerName = provider || currentModel.provider;

    // 全体の使用量を更新
    this.tokenUsage.input += input;
    this.tokenUsage.output += output;
    this.tokenUsage.total = this.tokenUsage.input + this.tokenUsage.output;

    // プロバイダー別の使用量を更新
    if (!this.tokenUsage.byProvider) {
      this.tokenUsage.byProvider = {};
    }
    if (!this.tokenUsage.byProvider[providerName]) {
      this.tokenUsage.byProvider[providerName] = {
        input: 0,
        output: 0,
        total: 0,
        cost: 0,
      };
    }
    this.tokenUsage.byProvider[providerName].input += input;
    this.tokenUsage.byProvider[providerName].output += output;
    this.tokenUsage.byProvider[providerName].total += input + output;

    // コスト計算（モデルのcostPerTokenが設定されている場合）
    if (currentModel.costPerToken) {
      const inputCost = input * currentModel.costPerToken.input;
      const outputCost = output * currentModel.costPerToken.output;
      const totalCost = inputCost + outputCost;

      this.tokenUsage.cost = (this.tokenUsage.cost || 0) + totalCost;
      this.tokenUsage.byProvider[providerName].cost =
        (this.tokenUsage.byProvider[providerName].cost || 0) + totalCost;
    }
  }
}
