import { useState, useCallback, useRef } from 'react';

/**
 * Undo/Redo機能を提供するフックの戻り値
 */
export interface UseAIUndoResult<T> {
  /** 現在の値 */
  value: T;
  /** 値を設定 */
  setValue: (newValue: T) => void;
  /** 元に戻す */
  undo: () => void;
  /** やり直す */
  redo: () => void;
  /** 特定の履歴にジャンプ */
  jumpTo: (index: number) => void;
  /** Undo可能か */
  canUndo: boolean;
  /** Redo可能か */
  canRedo: boolean;
  /** 履歴をクリア */
  clear: () => void;
  /** 履歴 */
  history: T[];
  /** 現在の履歴インデックス */
  currentIndex: number;
}

/**
 * Undo/Redo機能を提供するフック
 *
 * 値の変更履歴を管理し、Undo/Redo操作を可能にする
 *
 * @param initialValue - 初期値
 * @param maxHistory - 最大履歴数（デフォルト: 50）
 * @returns Undo/Redo機能
 *
 * @example
 * ```tsx
 * const { value, setValue, undo, redo, canUndo, canRedo } = useAIUndo('');
 *
 * // 値を変更
 * setValue('新しい値');
 *
 * // 元に戻す
 * if (canUndo) {
 *   undo();
 * }
 *
 * // やり直す
 * if (canRedo) {
 *   redo();
 * }
 * ```
 */
export function useAIUndo<T>(
  initialValue: T,
  maxHistory = 50
): UseAIUndoResult<T> {
  // 履歴スタック
  const [history, setHistory] = useState<T[]>([initialValue]);
  // 現在の位置（履歴の中でのインデックス）
  const [currentIndex, setCurrentIndex] = useState(0);
  // 内部フラグ（undo/redo中かどうか）
  const isUndoRedoRef = useRef(false);

  // 現在の値
  const value = history[currentIndex];

  /**
   * 値を設定
   */
  const setValue = useCallback(
    (newValue: T) => {
      // undo/redo中の場合は何もしない
      if (isUndoRedoRef.current) {
        return;
      }

      setHistory((prev) => {
        // 現在の位置以降の履歴を削除（新しい変更はRedoスタックをクリア）
        const newHistory = prev.slice(0, currentIndex + 1);

        // 新しい値を追加
        newHistory.push(newValue);

        // 最大履歴数を超えた場合は古い履歴を削除
        if (newHistory.length > maxHistory) {
          newHistory.shift();
          setCurrentIndex(newHistory.length - 1);
        } else {
          setCurrentIndex(newHistory.length - 1);
        }

        return newHistory;
      });
    },
    [currentIndex, maxHistory]
  );

  /**
   * 元に戻す
   */
  const undo = useCallback(() => {
    if (currentIndex > 0) {
      isUndoRedoRef.current = true;
      setCurrentIndex(currentIndex - 1);
      // 次のティックでフラグをリセット
      setTimeout(() => {
        isUndoRedoRef.current = false;
      }, 0);
    }
  }, [currentIndex]);

  /**
   * やり直す
   */
  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      isUndoRedoRef.current = true;
      setCurrentIndex(currentIndex + 1);
      // 次のティックでフラグをリセット
      setTimeout(() => {
        isUndoRedoRef.current = false;
      }, 0);
    }
  }, [currentIndex, history.length]);

  /**
   * 特定の履歴にジャンプ
   */
  const jumpTo = useCallback(
    (index: number) => {
      if (index >= 0 && index < history.length) {
        isUndoRedoRef.current = true;
        setCurrentIndex(index);
        // 次のティックでフラグをリセット
        setTimeout(() => {
          isUndoRedoRef.current = false;
        }, 0);
      }
    },
    [history.length]
  );

  /**
   * 履歴をクリア
   */
  const clear = useCallback(() => {
    setHistory([initialValue]);
    setCurrentIndex(0);
  }, [initialValue]);

  return {
    value,
    setValue,
    undo,
    redo,
    jumpTo,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    clear,
    history,
    currentIndex,
  };
}
