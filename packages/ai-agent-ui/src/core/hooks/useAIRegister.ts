import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAIAgentContext } from '../context/AIAgentContext';
import { useAIUndo } from './useAIUndo';
import type { AIModelWithProvider } from '../../providers/IAIProvider';
import type {
  AIRegisterOptions,
  AIRegisterResult,
  AIActionOptions,
  AIHistoryEntry,
  MultiRunResult,
  TokenUsage,
  TokenLimits,
  SystemCommand,
  SavedPrompt,
} from '../types';
import { calculateTokenUsageDetails } from '../utils/tokenCalculations';

/**
 * AIエージェント機能のコアロジックフック（純粋なロジックのみ）
 *
 * UI状態管理は含まない。generate/refine/undo/redoなどのロジックのみを提供。
 * UI状態管理が必要な場合は useAIUI と組み合わせて使用する。
 *
 * @param options - 登録オプション
 * @returns AIエージェント機能のロジック
 *
 * @example
 * ```tsx
 * function UserProfileForm() {
 *   const [bio, setBio] = useState('');
 *
 *   const ai = useAIRegister({
 *     context: {
 *       scope: 'UserProfile.Bio',
 *       type: 'long_text',
 *       maxLength: 500
 *     },
 *     getValue: () => bio,
 *     setValue: (newValue) => setBio(newValue)
 *   });
 *
 *   return (
 *     <div>
 *       <textarea
 *         value={bio}
 *         onChange={(e) => setBio(e.target.value)}
 *       />
 *       <button onClick={() => ai.actions.generate()}>生成</button>
 *       <button onClick={() => ai.actions.refine()}>修正</button>
 *       <button onClick={() => ai.actions.undo()} disabled={!ai.state.canUndo}>戻る</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAIRegister(options: AIRegisterOptions): AIRegisterResult {
  const { registry } = useAIAgentContext();
  const { context, getValue, setValue, onError, onSuccess, directions, systemCommands, tokenLimits } =
    options;

  // Undo/Redo管理
  const undoRedo = useAIUndo<string>(getValue());

  // ロジック状態のみ（UI状態は含まない）
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [history, setHistory] = useState<AIHistoryEntry[]>([]);
  const [multiRunResults, setMultiRunResults] = useState<MultiRunResult[] | null>(null);

  // 現在選択中のモデルID（単一選択モード）
  const [currentModelId, setCurrentModelId] = useState<string | null>(() => {
    const models = registry.getAllAvailableModels();
    return models.length > 0 ? models[0].id : null;
  });

  // Multi-Run選択中のモデルID（複数選択モード）
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);

  // モデル情報（有効なプロバイダーから取得）
  const availableModels = useMemo<AIModelWithProvider[]>(
    () => registry.getAllAvailableModels(),
    [registry]
  );

  // 現在選択中のモデル情報
  const currentModel = useMemo(
    () => (currentModelId ? availableModels.find((m) => m.id === currentModelId) || null : null),
    [currentModelId, availableModels]
  );

  // Token管理（全プロバイダーの合計）
  const [tokenUsage, setTokenUsage] = useState<TokenUsage>(() => registry.getTotalTokenUsage());
  const limits: TokenLimits = useMemo(() => tokenLimits || {}, [tokenLimits]);

  // Command管理
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);

  // システムコマンド（Developer指定 + デフォルト）
  const systemCommandsList = useMemo<SystemCommand[]>(() => {
    const defaultCommands: SystemCommand[] = [];
    const customCommands = systemCommands || [];
    return [...defaultCommands, ...customCommands];
  }, [systemCommands]);

  // Token使用量の定期更新
  useEffect(() => {
    const interval = setInterval(() => {
      setTokenUsage(registry.getTotalTokenUsage());
    }, 1000);
    return () => clearInterval(interval);
  }, [registry]);

  // 方向性オプション（カスタムまたはデフォルト）
  const directionsOptions = useMemo(() => {
    if (directions && directions.length > 0) {
      return directions;
    }
    // デフォルトの方向性
    return [
      {
        id: 'formal',
        label: 'フォーマルに',
        description: 'ビジネスや公式な場面に適した丁寧な表現',
      },
      {
        id: 'casual',
        label: 'カジュアルに',
        description: '親しみやすく、リラックスした表現',
      },
      {
        id: 'concise',
        label: '簡潔に',
        description: '要点を絞った短い表現',
      },
      {
        id: 'detailed',
        label: '詳しく',
        description: '詳細な説明と具体例を含む表現',
      },
      {
        id: 'professional',
        label: '専門的に',
        description: '専門用語を使った技術的な表現',
      },
      {
        id: 'friendly',
        label: '友好的に',
        description: '温かみがあり、親しみやすい表現',
      },
    ];
  }, [directions]);

  /**
   * 履歴にエントリを追加
   */
  const addHistoryEntry = useCallback(
    (
      action: 'generate' | 'refine' | 'chat',
      value: string,
      direction?: string
    ) => {
      const entry: AIHistoryEntry = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        action,
        direction,
        value,
        context,
      };
      setHistory((prev) => [entry, ...prev].slice(0, 50)); // 最大50件
    },
    [context]
  );

  /**
   * 💫 生成アクション
   */
  const generate = useCallback(
    async (actionOptions?: AIActionOptions) => {
      const modelId = actionOptions?.modelId || currentModelId;
      if (!modelId) {
        const error = new Error('No model selected');
        setError(error);
        onError?.(error);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const { provider } = registry.findProviderAndModel(modelId);
        if (!provider) {
          throw new Error(`Provider not found for model: ${modelId}`);
        }

        const result = await provider.generate(modelId, context, actionOptions);

        // 値を設定
        setValue(result.text);
        undoRedo.setValue(result.text);

        // 履歴に追加
        addHistoryEntry('generate', result.text, actionOptions?.direction);

        // 成功コールバック
        onSuccess?.(result.text, 'generate');
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    },
    [registry, currentModelId, context, setValue, undoRedo, addHistoryEntry, onSuccess, onError]
  );

  /**
   * 🖌️ 修正アクション
   */
  const refine = useCallback(
    async (actionOptions?: AIActionOptions) => {
      const modelId = actionOptions?.modelId || currentModelId;
      if (!modelId) {
        const error = new Error('No model selected');
        setError(error);
        onError?.(error);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const { provider } = registry.findProviderAndModel(modelId);
        if (!provider) {
          throw new Error(`Provider not found for model: ${modelId}`);
        }

        const currentValue = getValue();
        const result = await provider.refine(modelId, currentValue, context, actionOptions);

        // 値を設定
        setValue(result.text);
        undoRedo.setValue(result.text);

        // 履歴に追加
        addHistoryEntry('refine', result.text, actionOptions?.direction);

        // 成功コールバック
        onSuccess?.(result.text, 'refine');
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    },
    [registry, currentModelId, context, getValue, setValue, undoRedo, addHistoryEntry, onSuccess, onError]
  );

  /**
   * ← 元に戻すアクション
   */
  const undo = useCallback(() => {
    if (undoRedo.canUndo) {
      undoRedo.undo();
      setTimeout(() => {
        setValue(undoRedo.value);
      }, 0);
    }
  }, [undoRedo, setValue]);

  /**
   * → やり直すアクション
   */
  const redo = useCallback(() => {
    if (undoRedo.canRedo) {
      undoRedo.redo();
      setTimeout(() => {
        setValue(undoRedo.value);
      }, 0);
    }
  }, [undoRedo, setValue]);

  /**
   * 特定の履歴にジャンプ
   */
  const jumpToHistory = useCallback(
    (index: number) => {
      undoRedo.jumpTo(index);
      setTimeout(() => {
        setValue(undoRedo.value);
      }, 0);
    },
    [undoRedo, setValue]
  );

  /**
   * 💬 コマンド実行アクション
   */
  const executeCommand = useCallback(
    async (command: string) => {
      const modelId = currentModelId;
      if (!modelId) {
        const error = new Error('No model selected');
        setError(error);
        onError?.(error);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const { provider } = registry.findProviderAndModel(modelId);
        if (!provider) {
          throw new Error(`Provider not found for model: ${modelId}`);
        }

        const currentValue = getValue();
        const result = await provider.executeCommand(modelId, command, currentValue, context);

        // 値を設定
        setValue(result.text);
        undoRedo.setValue(result.text);

        // 履歴に追加
        addHistoryEntry('chat', result.text);

        // 成功コールバック
        onSuccess?.(result.text, 'chat');
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    },
    [registry, currentModelId, context, getValue, setValue, undoRedo, addHistoryEntry, onSuccess, onError]
  );

  /**
   * 🎛️ モデル切り替えアクション
   */
  const setModel = useCallback((modelId: string) => {
    setCurrentModelId(modelId);
  }, []);

  /**
   * 🔄 Multi-Run（複数モデルで同時実行）
   */
  const generateMulti = useCallback(
    async (modelIds: string[]): Promise<MultiRunResult[]> => {
      const results = await registry.generateMulti(modelIds, context);
      setMultiRunResults(results);
      return results;
    },
    [registry, context]
  );

  /**
   * Multi-Run用: モデル選択/解除
   */
  const toggleModelSelection = useCallback((modelId: string) => {
    setSelectedModelIds((prev) =>
      prev.includes(modelId) ? prev.filter((id) => id !== modelId) : [...prev, modelId]
    );
  }, []);

  /**
   * Multi-Run用: すべてのモデル選択をクリア
   */
  const clearModelSelection = useCallback(() => {
    setSelectedModelIds([]);
  }, []);

  /**
   * 💾 Promptを保存
   */
  const savePrompt = useCallback(
    (label: string, prompt: string, category?: string) => {
      const newPrompt: SavedPrompt = {
        id: `prompt-${Date.now()}-${Math.random()}`,
        type: 'editable',
        label,
        prompt,
        category,
        editable: true,
        visible: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0,
      };
      setSavedPrompts((prev) => [newPrompt, ...prev]);
    },
    []
  );

  /**
   * 🗑️ Promptを削除
   */
  const deletePrompt = useCallback((promptId: string) => {
    setSavedPrompts((prev) => prev.filter((p) => p.id !== promptId));
  }, []);

  /**
   * ✏️ Promptを更新
   */
  const updatePrompt = useCallback(
    (promptId: string, updates: Partial<Pick<SavedPrompt, 'label' | 'prompt' | 'category'>>) => {
      setSavedPrompts((prev) =>
        prev.map((p) =>
          p.id === promptId
            ? { ...p, ...updates, updatedAt: Date.now() }
            : p
        )
      );
    },
    []
  );

  /**
   * 🎯 System Commandを実行
   */
  const executeSystemCommand = useCallback(
    async (commandId: string) => {
      const command = systemCommandsList.find((c) => c.id === commandId);
      if (!command) {
        throw new Error(`System command not found: ${commandId}`);
      }

      // SavedPromptの場合は使用回数をインクリメント
      if (command.type === 'editable') {
        setSavedPrompts((prev) =>
          prev.map((p) =>
            p.id === commandId ? { ...p, usageCount: p.usageCount + 1 } : p
          )
        );
      }

      // executeCommandを使用してコマンドを実行
      await executeCommand(command.prompt);
    },
    [systemCommandsList, executeCommand]
  );

  // Token使用量の詳細を計算（useMemoで最適化）
  const tokenUsageDetails = useMemo(
    () => calculateTokenUsageDetails(tokenUsage, limits),
    [tokenUsage, limits]
  );

  return {
    actions: {
      generate,
      refine,
      undo,
      redo,
      jumpToHistory,
      executeCommand,
      setModel,
      generateMulti,
      toggleModelSelection,
      clearModelSelection,
      savePrompt,
      deletePrompt,
      updatePrompt,
      executeSystemCommand,
    },
    state: {
      isLoading,
      error,
      history,
      canUndo: undoRedo.canUndo,
      canRedo: undoRedo.canRedo,
      directions: directionsOptions,
      currentIndex: undoRedo.currentIndex,
      availableModels,
      currentModel,
      selectedModelIds,
      multiRunResults,
      tokenUsage,
      tokenLimits: limits,
      tokenUsageDetails,
      systemCommands: systemCommandsList,
      savedPrompts,
    },
  };
}
