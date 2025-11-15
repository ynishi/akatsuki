import type { AIHistoryEntry, AIPanelPosition, AILabels } from '../../core/types';
import { AI_LABELS } from '../../core/types';

/**
 * AIHistoryListコンポーネントのProps
 */
export interface AIHistoryListProps {
  /** 履歴エントリ */
  history: AIHistoryEntry[];
  /** 現在のインデックス */
  currentIndex: number;
  /** 履歴を選択したときのコールバック */
  onSelectHistory: (index: number) => void;
  /** 閉じるコールバック */
  onClose: () => void;
  /** ローディング中 */
  isLoading?: boolean;
  /** パネルの位置 */
  position?: AIPanelPosition;
  /** UIラベル（i18n対応） */
  labels?: AILabels;
}

/**
 * 🗒️ AI履歴一覧コンポーネント
 *
 * Undo/Redoの履歴を視覚的に表示し、クリックで特定の履歴に戻れる
 *
 * @example
 * ```tsx
 * <AIHistoryList
 *   history={state.history}
 *   currentIndex={currentIndex}
 *   onSelectHistory={(index) => jumpToHistory(index)}
 *   onClose={() => setShowHistory(false)}
 * />
 * ```
 */
export function AIHistoryList({
  history,
  currentIndex,
  onSelectHistory,
  onClose,
  isLoading = false,
  position = 'center',
  labels,
}: AIHistoryListProps) {
  // ラベルをマージ（ユーザー提供のラベル > デフォルト英語ラベル）
  const l = { ...AI_LABELS.en, ...labels };

  // 位置に応じたクラス
  const positionClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  };

  return (
    <>
      {/* オーバーレイ（クリックで閉じる） */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 履歴パネル */}
      <div className={`absolute bottom-full mb-2 ${positionClasses[position]} z-50 max-h-96 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden flex flex-col`} style={{ width: '600px' }}>
        {/* ヘッダー */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              {l.historyTitle}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={l.close}
            >
              <span className="text-lg">✕</span>
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {l.historyCount(history.length, currentIndex + 1)}
          </p>
        </div>

        {/* 履歴リスト */}
        <div className="overflow-y-auto flex-1">
          {history.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              {l.historyEmpty}
            </div>
          ) : (
            <div className="p-2">
              {history.map((entry, index) => {
                const isCurrent = index === currentIndex;
                const actionLabel = entry.action === 'generate' ? l.historyGenerate :
                                   entry.action === 'refine' ? l.historyRefine :
                                   l.historyChat;

                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => {
                      onSelectHistory(index);
                      onClose();
                    }}
                    disabled={isLoading || isCurrent}
                    className={`
                      w-full text-left px-3 py-2 rounded-lg mb-1
                      transition-colors
                      ${isCurrent
                        ? 'bg-purple-100 border-2 border-purple-400'
                        : 'hover:bg-gray-50 border-2 border-transparent'
                      }
                      ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {/* アクションとタイムスタンプ */}
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">
                        {actionLabel}
                        {entry.direction && (
                          <span className="ml-1 text-gray-500">
                            ({entry.direction})
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(entry.timestamp).toLocaleTimeString('ja-JP', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* プレビュー */}
                    <div className="text-sm text-gray-600 line-clamp-3">
                      {entry.value || '(空)'}
                    </div>

                    {/* 現在の履歴インジケーター */}
                    {isCurrent && (
                      <div className="text-xs text-purple-600 font-medium mt-1">
                        ← 現在の状態
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500">
            💡 履歴をクリックして戻る
          </p>
        </div>
      </div>
    </>
  );
}
