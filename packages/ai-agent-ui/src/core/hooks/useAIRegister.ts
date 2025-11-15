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
import { InMemoryPromptStorage } from '../storage/PromptStorage';
import { InMemoryHistoryStorage } from '../storage/HistoryStorage';

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
  const {
    context,
    getValue,
    setValue,
    onError,
    onSuccess,
    directions,
    systemCommands,
    tokenLimits,
    promptStorage,
    promptStorageScope,
    historyStorage,
    historyStorageScope,
  } = options;

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

  // Promptストレージ（提供されない場合はメモリ内ストレージ）
  const promptStorageInstance = useMemo(
    () => promptStorage || new InMemoryPromptStorage(),
    [promptStorage]
  );

  // 履歴ストレージ（提供されない場合はメモリ内ストレージ）
  const historyStorageInstance = useMemo(
    () => historyStorage || new InMemoryHistoryStorage(),
    [historyStorage]
  );

  // Promptをストレージから読み込み
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadPrompts = async () => {
      try {
        const prompts = await promptStorageInstance.load(promptStorageScope);
        if (!cancelled) {
          setSavedPrompts(prompts);
          setIsLoadingPrompts(false);
        }
      } catch (error) {
        console.error('Failed to load prompts:', error);
        if (!cancelled) {
          setIsLoadingPrompts(false);
        }
      }
    };

    loadPrompts();

    return () => {
      cancelled = true;
    };
  }, [promptStorageInstance, promptStorageScope]);

  // 履歴をストレージから読み込み
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      try {
        const loadedHistory = await historyStorageInstance.load(historyStorageScope);
        if (!cancelled) {
          setHistory(loadedHistory);
          setIsLoadingHistory(false);
        }
      } catch (error) {
        console.error('Failed to load history:', error);
        if (!cancelled) {
          setIsLoadingHistory(false);
        }
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [historyStorageInstance, historyStorageScope]);

  // システムコマンド（Developer指定 + デフォルト + 保存されたPrompt）
  const systemCommandsList = useMemo<SystemCommand[]>(() => {
    const defaultCommands: SystemCommand[] = [];
    const customCommands = systemCommands || [];
    // SavedPromptもSystemCommandとして扱う（editableタイプ）
    return [...defaultCommands, ...customCommands, ...savedPrompts];
  }, [systemCommands, savedPrompts]);

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
        label: 'Formal',
        description: 'Polite expression suitable for business or official situations',
      },
      {
        id: 'casual',
        label: 'Casual',
        description: 'Friendly and relaxed expression',
      },
      {
        id: 'concise',
        label: 'Concise',
        description: 'Brief expression focused on key points',
      },
      {
        id: 'detailed',
        label: 'Detailed',
        description: 'Expression with detailed explanations and examples',
      },
      {
        id: 'professional',
        label: 'Professional',
        description: 'Technical expression using professional terminology',
      },
      {
        id: 'friendly',
        label: 'Friendly',
        description: 'Warm and approachable expression',
      },
    ];
  }, [directions]);

  /**
   * 履歴にエントリを追加（非同期・ストレージに保存）
   */
  const addHistoryEntry = useCallback(
    async (params: {
      action: 'generate' | 'refine' | 'chat';
      value: string;
      modelId: string;
      provider: string;
      direction?: string;
      customPrompt?: string;
      tokensUsed?: number;
      duration?: number;
    }) => {
      const entry: AIHistoryEntry = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        action: params.action,
        direction: params.direction,
        value: params.value,
        context,
        modelId: params.modelId,
        provider: params.provider,
        customPrompt: params.customPrompt,
        tokensUsed: params.tokensUsed,
        duration: params.duration,
      };

      const updatedHistory = [entry, ...history].slice(0, 50); // 最大50件
      setHistory(updatedHistory);

      // ストレージに保存（非同期）
      try {
        await historyStorageInstance.save(updatedHistory, historyStorageScope);
      } catch (error) {
        console.error('Failed to save history:', error);
        // エラー時はロールバック
        setHistory(history);
      }
    },
    [context, history, historyStorageInstance, historyStorageScope]
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

      const startTime = Date.now();

      try {
        setIsLoading(true);
        setError(null);

        const { provider, model } = registry.findProviderAndModel(modelId);
        if (!provider || !model) {
          throw new Error(`Provider not found for model: ${modelId}`);
        }

        const result = await provider.generate(modelId, context, actionOptions);
        const duration = Date.now() - startTime;

        // 値を設定
        setValue(result.text);
        undoRedo.setValue(result.text);

        // 履歴に追加（詳細情報付き）
        await addHistoryEntry({
          action: 'generate',
          value: result.text,
          modelId,
          provider: model.provider,
          direction: actionOptions?.direction,
          customPrompt: actionOptions?.customPrompt,
          tokensUsed: result.usage
            ? result.usage.inputTokens + result.usage.outputTokens
            : undefined,
          duration,
        });

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

      const startTime = Date.now();

      try {
        setIsLoading(true);
        setError(null);

        const { provider, model } = registry.findProviderAndModel(modelId);
        if (!provider || !model) {
          throw new Error(`Provider not found for model: ${modelId}`);
        }

        const currentValue = getValue();
        const result = await provider.refine(modelId, currentValue, context, actionOptions);
        const duration = Date.now() - startTime;

        // 値を設定
        setValue(result.text);
        undoRedo.setValue(result.text);

        // 履歴に追加（詳細情報付き）
        await addHistoryEntry({
          action: 'refine',
          value: result.text,
          modelId,
          provider: model.provider,
          direction: actionOptions?.direction,
          customPrompt: actionOptions?.customPrompt,
          tokensUsed: result.usage
            ? result.usage.inputTokens + result.usage.outputTokens
            : undefined,
          duration,
        });

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

      const startTime = Date.now();

      try {
        setIsLoading(true);
        setError(null);

        const { provider, model } = registry.findProviderAndModel(modelId);
        if (!provider || !model) {
          throw new Error(`Provider not found for model: ${modelId}`);
        }

        const currentValue = getValue();
        const result = await provider.executeCommand(modelId, command, currentValue, context);
        const duration = Date.now() - startTime;

        // 値を設定
        setValue(result.text);
        undoRedo.setValue(result.text);

        // 履歴に追加（詳細情報付き）
        await addHistoryEntry({
          action: 'chat',
          value: result.text,
          modelId,
          provider: model.provider,
          customPrompt: command,
          tokensUsed: result.usage
            ? result.usage.inputTokens + result.usage.outputTokens
            : undefined,
          duration,
        });

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
    async (label: string, prompt: string, category?: string) => {
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

      const updatedPrompts = [newPrompt, ...savedPrompts];
      setSavedPrompts(updatedPrompts);

      // ストレージに保存（非同期）
      try {
        await promptStorageInstance.save(updatedPrompts, promptStorageScope);
      } catch (error) {
        console.error('Failed to save prompt:', error);
        // エラー時はロールバック
        setSavedPrompts(savedPrompts);
      }
    },
    [savedPrompts, promptStorageInstance, promptStorageScope]
  );

  /**
   * 🗑️ Promptを削除
   */
  const deletePrompt = useCallback(
    async (promptId: string) => {
      const updatedPrompts = savedPrompts.filter((p) => p.id !== promptId);
      setSavedPrompts(updatedPrompts);

      try {
        // deleteメソッドがある場合は使用
        if (promptStorageInstance.delete) {
          await promptStorageInstance.delete(promptId, promptStorageScope);
        } else {
          // ない場合はsaveで上書き
          await promptStorageInstance.save(updatedPrompts, promptStorageScope);
        }
      } catch (error) {
        console.error('Failed to delete prompt:', error);
        // エラー時はロールバック
        setSavedPrompts(savedPrompts);
      }
    },
    [savedPrompts, promptStorageInstance, promptStorageScope]
  );

  /**
   * ✏️ Promptを更新
   */
  const updatePrompt = useCallback(
    async (
      promptId: string,
      updates: Partial<Pick<SavedPrompt, 'label' | 'prompt' | 'category'>>
    ) => {
      const updatedPrompts = savedPrompts.map((p) =>
        p.id === promptId ? { ...p, ...updates, updatedAt: Date.now() } : p
      );
      setSavedPrompts(updatedPrompts);

      try {
        await promptStorageInstance.save(updatedPrompts, promptStorageScope);
      } catch (error) {
        console.error('Failed to update prompt:', error);
        // エラー時はロールバック
        setSavedPrompts(savedPrompts);
      }
    },
    [savedPrompts, promptStorageInstance, promptStorageScope]
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

      // SavedPromptの場合は使用回数をインクリメント＋ストレージに保存
      if (command.type === 'editable') {
        const updatedPrompts = savedPrompts.map((p) =>
          p.id === commandId ? { ...p, usageCount: p.usageCount + 1 } : p
        );
        setSavedPrompts(updatedPrompts);

        // ストレージに保存（非同期）
        try {
          await promptStorageInstance.save(updatedPrompts, promptStorageScope);
        } catch (error) {
          console.error('Failed to save usage count:', error);
          // エラー時はロールバック
          setSavedPrompts(savedPrompts);
        }
      }

      // executeCommandを使用してコマンドを実行
      await executeCommand(command.prompt);
    },
    [systemCommandsList, executeCommand, savedPrompts, promptStorageInstance, promptStorageScope]
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
      isLoadingPrompts,
      isLoadingHistory,
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
