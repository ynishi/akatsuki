import type { AIAgentContext, AIActionOptions, AIModel } from '../core/types';

/**
 * AIエージェントプロバイダーインターフェース
 *
 * 既存のBaseProviderとは異なる、UI特化型のインターフェース
 * AIエージェント機能（生成、修正）に特化した抽象化を提供
 */
export interface IAIAgentProvider {
  /**
   * コンテンツ生成（全く新しい内容を生成）
   *
   * @param context - コンテキスト情報
   * @param options - 生成オプション
   * @returns 生成されたテキスト
   */
  generate(context: AIAgentContext, options?: AIActionOptions): Promise<string>;

  /**
   * コンテンツ修正（既存の内容を改善）
   *
   * @param currentValue - 現在のテキスト
   * @param context - コンテキスト情報
   * @param options - 修正オプション
   * @returns 修正されたテキスト
   */
  refine(
    currentValue: string,
    context: AIAgentContext,
    options?: AIActionOptions
  ): Promise<string>;

  /**
   * ストリーミング生成（オプション）
   *
   * @param context - コンテキスト情報
   * @param onChunk - チャンクコールバック
   * @param options - 生成オプション
   */
  generateStream?(
    context: AIAgentContext,
    onChunk: (chunk: string) => void,
    options?: AIActionOptions
  ): Promise<void>;

  /**
   * ストリーミング修正（オプション）
   *
   * @param currentValue - 現在のテキスト
   * @param context - コンテキスト情報
   * @param onChunk - チャンクコールバック
   * @param options - 修正オプション
   */
  refineStream?(
    currentValue: string,
    context: AIAgentContext,
    onChunk: (chunk: string) => void,
    options?: AIActionOptions
  ): Promise<void>;

  /**
   * カスタムコマンド実行
   *
   * @param command - ユーザーが入力したコマンド（自由形式）
   * @param currentValue - 現在のテキスト
   * @param context - コンテキスト情報
   * @returns 実行結果のテキスト
   */
  executeCommand(
    command: string,
    currentValue: string,
    context: AIAgentContext
  ): Promise<string>;

  /**
   * 利用可能なモデル一覧を取得
   *
   * @returns モデル一覧
   */
  getSupportedModels(): AIModel[];

  /**
   * 現在選択中のモデルを取得
   *
   * @returns 現在のモデル
   */
  getCurrentModel(): AIModel;

  /**
   * モデルを切り替え
   *
   * @param modelId - 切り替え先のモデルID
   */
  setModel(modelId: string): void;
}
