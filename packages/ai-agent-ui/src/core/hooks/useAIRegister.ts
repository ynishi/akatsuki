import { useState, useCallback, useMemo } from 'react';
import { useAIAgentContext } from '../context/AIAgentContext';
import { useAIUndo } from './useAIUndo';
import type {
  AIRegisterOptions,
  AIRegisterResult,
  AIActionOptions,
  AIHistoryEntry,
} from '../types';

/**
 * AIエージェント機能をUIコンポーネントに登録するフック
 *
 * このフックはUIコンポーネントとAIロジックを繋ぐ中核的な役割を果たす
 *
 * @param options - 登録オプション
 * @returns AIエージェント機能のプロパティとアクション
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
 *       <AITrigger {...ai.triggerProps} />
 *       {ai.menuProps.isOpen && (
 *         <AIIconSet
 *           actions={ai.actions}
 *           state={ai.state}
 *           onClose={ai.menuProps.onClose}
 *         />
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAIRegister(options: AIRegisterOptions): AIRegisterResult {
  const { provider } = useAIAgentContext();
  const { context, getValue, setValue, onError, onSuccess, directions } =
    options;

  // Undo/Redo管理
  const undoRedo = useAIUndo<string>(getValue());

  // UI状態
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [history, setHistory] = useState<AIHistoryEntry[]>([]);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [_showChatPanel, setShowChatPanel] = useState(false);

  // 方向性オプション（カスタムまたはデフォルト）
  const directionsOptions = useMemo(() => {
    if (directions && directions.length > 0) {
      return directions;
    }
    // デフォルトの方向性をインポート
    // NOTE: 循環参照を避けるため、ここで直接定義する
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
      try {
        setIsLoading(true);
        setError(null);

        const result = await provider.generate(context, actionOptions);

        // 値を設定
        setValue(result);
        undoRedo.setValue(result);

        // 履歴に追加
        addHistoryEntry('generate', result, actionOptions?.direction);

        // 成功コールバック
        onSuccess?.(result, 'generate');
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    },
    [provider, context, setValue, undoRedo, addHistoryEntry, onSuccess, onError]
  );

  /**
   * 🖌️ 修正アクション
   */
  const refine = useCallback(
    async (actionOptions?: AIActionOptions) => {
      try {
        setIsLoading(true);
        setError(null);

        const currentValue = getValue();
        const result = await provider.refine(currentValue, context, actionOptions);

        // 値を設定
        setValue(result);
        undoRedo.setValue(result);

        // 履歴に追加
        addHistoryEntry('refine', result, actionOptions?.direction);

        // 成功コールバック
        onSuccess?.(result, 'refine');
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    },
    [
      provider,
      context,
      getValue,
      setValue,
      undoRedo,
      addHistoryEntry,
      onSuccess,
      onError,
    ]
  );

  /**
   * ← 元に戻すアクション
   */
  const undo = useCallback(() => {
    if (undoRedo.canUndo) {
      undoRedo.undo();
      // Undo後の値を取得して設定
      // useAIUndoはundo()後に自動的にvalueが更新されるので、
      // 次のレンダリングでundoRedo.valueを使用する
      // ここでは即座に反映するためsetValueを呼ぶ
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
      // Redo後の値を取得して設定
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
      // ジャンプ後の値を取得して設定
      setTimeout(() => {
        setValue(undoRedo.value);
      }, 0);
    },
    [undoRedo, setValue]
  );

  /**
   * 🗒️ 履歴表示アクション
   */
  const showHistory = useCallback(() => {
    setShowHistoryPanel((prev) => !prev);
    setShowChatPanel(false); // チャットパネルは閉じる
  }, []);

  /**
   * 💬 コマンド実行アクション
   */
  const executeCommand = useCallback(
    async (command: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const currentValue = getValue();
        const result = await provider.executeCommand(command, currentValue, context);

        // 値を設定
        setValue(result);
        undoRedo.setValue(result);

        // 履歴に追加
        addHistoryEntry('chat', result);

        // 成功コールバック
        onSuccess?.(result, 'chat');
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    },
    [provider, context, getValue, setValue, undoRedo, addHistoryEntry, onSuccess, onError]
  );

  /**
   * 💬 コマンドパネル表示アクション
   */
  const showCommandPanel = useCallback(() => {
    setShowChatPanel((prev) => !prev);
    setShowHistoryPanel(false); // 履歴パネルは閉じる
  }, []);

  /**
   * メニューを開く
   */
  const openMenu = useCallback(() => {
    setIsMenuOpen(true);
  }, []);

  /**
   * メニューを閉じる
   */
  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  return {
    triggerProps: {
      onClick: openMenu,
      onMouseEnter: undefined, // ホバーで開く場合はここで設定
      isActive: isMenuOpen,
      'aria-label': 'AI機能を開く',
    },
    menuProps: {
      isOpen: isMenuOpen,
      onClose: closeMenu,
    },
    actions: {
      generate,
      refine,
      undo,
      redo,
      showHistory,
      jumpToHistory,
      executeCommand,
      showCommandPanel,
    },
    state: {
      isLoading,
      error,
      history,
      canUndo: undoRedo.canUndo,
      canRedo: undoRedo.canRedo,
      directions: directionsOptions,
      showHistoryPanel,
      showCommandPanel: _showChatPanel,
      currentIndex: undoRedo.currentIndex,
    },
  };
}
