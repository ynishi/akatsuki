import type {
  IAIProvider,
  AIModel,
  AIModelWithProvider,
} from './IAIProvider';
import type { AIAgentContext, AIActionOptions, TokenUsage, MultiRunResult } from '../core/types';

/**
 * プロバイダーレジストリ
 * 複数のAIプロバイダーを管理し、統一的なアクセスを提供
 */
export class ProviderRegistry {
  private providers: Map<string, IAIProvider> = new Map();
  private enabledProviders: Set<string> = new Set();

  /**
   * プロバイダーを登録
   *
   * @param provider - 登録するプロバイダー
   */
  register(provider: IAIProvider): void {
    this.providers.set(provider.id, provider);
    // デフォルトで有効化（利用可能な場合のみ）
    if (provider.isAvailable) {
      this.enabledProviders.add(provider.id);
    }
  }

  /**
   * プロバイダーを登録解除
   *
   * @param providerId - 登録解除するプロバイダーID
   */
  unregister(providerId: string): void {
    this.providers.delete(providerId);
    this.enabledProviders.delete(providerId);
  }

  /**
   * プロバイダーを有効化
   *
   * @param providerId - 有効化するプロバイダーID
   */
  enable(providerId: string): void {
    if (this.providers.has(providerId)) {
      this.enabledProviders.add(providerId);
    }
  }

  /**
   * プロバイダーを無効化
   *
   * @param providerId - 無効化するプロバイダーID
   */
  disable(providerId: string): void {
    this.enabledProviders.delete(providerId);
  }

  /**
   * プロバイダーが有効かどうか
   *
   * @param providerId - 確認するプロバイダーID
   * @returns 有効な場合はtrue
   */
  isEnabled(providerId: string): boolean {
    return this.enabledProviders.has(providerId);
  }

  /**
   * すべての登録済みプロバイダーを取得
   *
   * @returns 登録済みプロバイダーの配列
   */
  getAllProviders(): IAIProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * 有効なプロバイダーのみ取得
   *
   * @returns 有効なプロバイダーの配列
   */
  getEnabledProviders(): IAIProvider[] {
    return Array.from(this.providers.values()).filter((p) =>
      this.enabledProviders.has(p.id)
    );
  }

  /**
   * 特定のプロバイダーを取得
   *
   * @param providerId - 取得するプロバイダーID
   * @returns プロバイダー（見つからない場合はundefined）
   */
  getProvider(providerId: string): IAIProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * すべての利用可能なモデルを取得（有効なプロバイダーのみ）
   *
   * @returns プロバイダー情報付きモデルの配列
   */
  getAllAvailableModels(): AIModelWithProvider[] {
    const models: AIModelWithProvider[] = [];

    for (const provider of this.getEnabledProviders()) {
      for (const model of provider.getSupportedModels()) {
        models.push({
          ...model,
          providerId: provider.id,
          providerName: provider.name,
        });
      }
    }

    return models;
  }

  /**
   * モデルIDからプロバイダーとモデルを特定
   *
   * @param modelId - モデルID
   * @returns プロバイダーとモデル（見つからない場合は空オブジェクト）
   */
  findProviderAndModel(modelId: string): {
    provider?: IAIProvider;
    model?: AIModel;
  } {
    for (const provider of this.getEnabledProviders()) {
      const model = provider.getSupportedModels().find((m) => m.id === modelId);
      if (model) {
        return { provider, model };
      }
    }
    return {};
  }

  /**
   * 複数モデルで並列生成（Multi-Run）
   *
   * @param modelIds - 実行するモデルIDの配列
   * @param context - コンテキスト情報
   * @param options - 生成オプション
   * @returns Multi-Run結果の配列
   */
  async generateMulti(
    modelIds: string[],
    context: AIAgentContext,
    options?: AIActionOptions
  ): Promise<MultiRunResult[]> {
    const promises = modelIds.map(async (modelId) => {
      const startTime = Date.now();

      // modelIdからプロバイダーとモデルを特定
      const { provider, model } = this.findProviderAndModel(modelId);

      if (!provider || !model) {
        return {
          modelId,
          modelDisplayName: modelId,
          result: '',
          duration: 0,
          error: new Error(`Model not found: ${modelId}`),
        };
      }

      try {
        const result = await provider.generate(modelId, context, options);
        return {
          modelId,
          modelDisplayName: model.displayName,
          result: result.text,
          duration: Date.now() - startTime,
          tokensUsed: result.usage
            ? result.usage.inputTokens + result.usage.outputTokens
            : undefined,
        };
      } catch (error) {
        return {
          modelId,
          modelDisplayName: model.displayName,
          result: '',
          duration: Date.now() - startTime,
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    });

    return Promise.all(promises); // ← 並列実行
  }

  /**
   * 全プロバイダーのToken使用量を集計
   *
   * @returns 集計されたToken使用量
   */
  getTotalTokenUsage(): TokenUsage {
    const total: TokenUsage = {
      input: 0,
      output: 0,
      total: 0,
      cost: 0,
      byProvider: {},
    };

    for (const provider of this.getAllProviders()) {
      const usage = provider.getTokenUsage();
      total.input += usage.input;
      total.output += usage.output;
      total.total += usage.total;
      total.cost = (total.cost || 0) + (usage.cost || 0);

      // プロバイダー別集計
      total.byProvider![provider.id] = {
        input: usage.input,
        output: usage.output,
        total: usage.total,
        cost: usage.cost,
      };
    }

    return total;
  }

  /**
   * すべてのプロバイダーのToken使用量をリセット
   */
  resetAllTokenUsage(): void {
    for (const provider of this.getAllProviders()) {
      provider.resetTokenUsage();
    }
  }

  /**
   * 特定のプロバイダーのToken使用量を取得
   *
   * @param providerId - プロバイダーID
   * @returns Token使用量（見つからない場合は0の使用量）
   */
  getTokenUsageByProvider(providerId: string): TokenUsage {
    const provider = this.getProvider(providerId);
    if (!provider) {
      return {
        input: 0,
        output: 0,
        total: 0,
        cost: 0,
      };
    }
    return provider.getTokenUsage();
  }
}
