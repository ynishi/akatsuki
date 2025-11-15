import { useState } from 'react';
import type { AIModel } from '../../core/types';

/**
 * AIModelSelectorコンポーネントのProps
 */
export interface AIModelSelectorProps {
  /** 利用可能なモデル一覧 */
  availableModels: AIModel[];
  /** 現在選択中のモデル */
  currentModel: AIModel | null;
  /** モデル切り替え時のコールバック */
  onSelectModel: (modelId: string) => void;
  /** Multi-Run時のコールバック（オプション） */
  onMultiRun?: (modelIds: string[]) => Promise<void>;
  /** 閉じる時のコールバック */
  onClose: () => void;
  /** ローディング状態 */
  isLoading?: boolean;
  /** 位置 */
  position?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * 🎛️ AIモデル選択コンポーネント
 *
 * Fast/Think切り替えやモデル一覧から選択できるUI
 *
 * @example
 * ```tsx
 * <AIModelSelector
 *   availableModels={ai.state.availableModels}
 *   currentModel={ai.state.currentModel}
 *   onSelectModel={(modelId) => ai.actions.setModel(modelId)}
 *   onClose={() => setShowModelSelector(false)}
 * />
 * ```
 */
export function AIModelSelector({
  availableModels,
  currentModel,
  onSelectModel,
  onMultiRun,
  onClose,
  isLoading = false,
  position = 'bottom',
}: AIModelSelectorProps) {
  const [mode, setMode] = useState<'single' | 'multi'>('single');
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);

  const positionClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2',
  };

  // Fast/Thinkモデルを分類
  const fastModels = availableModels.filter((m) => m.type === 'fast');
  const thinkModels = availableModels.filter((m) => m.type === 'think');

  const handleSelectModel = (modelId: string) => {
    onSelectModel(modelId);
    onClose();
  };

  const handleToggleModel = (modelId: string) => {
    setSelectedModelIds((prev) =>
      prev.includes(modelId)
        ? prev.filter((id) => id !== modelId)
        : [...prev, modelId]
    );
  };

  const handleMultiRun = async () => {
    if (onMultiRun && selectedModelIds.length > 0) {
      await onMultiRun(selectedModelIds);
      onClose();
    }
  };

  return (
    <div
      className={`
        absolute ${positionClasses[position]}
        z-50
        w-64
      `}
    >
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
        {/* ヘッダー */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">モデル選択</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="閉じる"
            >
              <span className="text-lg">✕</span>
            </button>
          </div>

          {/* モード切り替えタブ（Multi-Runが利用可能な場合のみ） */}
          {onMultiRun && (
            <div className="flex border-b border-gray-200 -mb-px">
              <button
                onClick={() => setMode('single')}
                className={`
                  flex-1 px-3 py-2 text-sm font-medium transition-all relative
                  ${mode === 'single'
                    ? 'text-purple-700 bg-white border-b-2 border-purple-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                🎯 単一
              </button>
              <button
                onClick={() => setMode('multi')}
                className={`
                  flex-1 px-3 py-2 text-sm font-medium transition-all relative
                  ${mode === 'multi'
                    ? 'text-purple-700 bg-white border-b-2 border-purple-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                🔄 Multi
              </button>
            </div>
          )}
        </div>

        {/* Fast/Think切り替えボタン（単一選択モード時のみ） */}
        {mode === 'single' && fastModels.length > 0 && thinkModels.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex gap-2">
              {fastModels.length > 0 && (
                <button
                  onClick={() => handleSelectModel(fastModels[0].id)}
                  disabled={isLoading || currentModel?.type === 'fast'}
                  className={`
                    flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all
                    ${
                      currentModel?.type === 'fast'
                        ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  ⚡ Fast
                </button>
              )}
              {thinkModels.length > 0 && (
                <button
                  onClick={() => handleSelectModel(thinkModels[0].id)}
                  disabled={isLoading || currentModel?.type === 'think'}
                  className={`
                    flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all
                    ${
                      currentModel?.type === 'think'
                        ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  🧠 Think
                </button>
              )}
            </div>
          </div>
        )}

        {/* モデル一覧 */}
        <div className="max-h-64 overflow-y-auto">
          {mode === 'single' ? (
            /* 単一選択モード */
            availableModels.map((model) => (
              <button
                key={model.id}
                onClick={() => handleSelectModel(model.id)}
                disabled={isLoading}
                className={`
                  w-full px-4 py-3 text-left transition-colors
                  ${
                    currentModel?.id === model.id
                      ? 'bg-purple-50 text-purple-700'
                      : 'hover:bg-gray-50 text-gray-700'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                  border-b border-gray-100 last:border-b-0
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{model.displayName}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {model.provider} · {model.type === 'fast' ? '⚡ Fast' : '🧠 Think'}
                    </div>
                  </div>
                  {currentModel?.id === model.id && (
                    <span className="text-purple-500 text-lg">✓</span>
                  )}
                </div>
              </button>
            ))
          ) : (
            /* Multi-Runモード */
            availableModels.map((model) => (
              <label
                key={model.id}
                className={`
                  w-full px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors
                  ${selectedModelIds.includes(model.id) ? 'bg-purple-50' : 'hover:bg-gray-50'}
                  border-b border-gray-100 last:border-b-0
                `}
              >
                <input
                  type="checkbox"
                  checked={selectedModelIds.includes(model.id)}
                  onChange={() => handleToggleModel(model.id)}
                  disabled={isLoading}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-700">{model.displayName}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {model.provider} · {model.type === 'fast' ? '⚡ Fast' : '🧠 Think'}
                  </div>
                </div>
              </label>
            ))
          )}
        </div>

        {/* フッター */}
        {mode === 'single' ? (
          /* 単一選択モード: 現在のモデル情報 */
          currentModel && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
              <div className="text-xs text-gray-600">
                現在: <span className="font-medium">{currentModel.displayName}</span>
              </div>
            </div>
          )
        ) : (
          /* Multi-Runモード: 実行ボタン */
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <button
              onClick={handleMultiRun}
              disabled={isLoading || selectedModelIds.length === 0}
              className={`
                w-full px-4 py-2 rounded-md text-sm font-medium transition-all
                ${
                  selectedModelIds.length > 0
                    ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
                disabled:opacity-50
              `}
            >
              {isLoading ? (
                '実行中...'
              ) : (
                `🔄 ${selectedModelIds.length}個のモデルで実行`
              )}
            </button>
            {selectedModelIds.length > 0 && (
              <div className="text-xs text-gray-500 mt-2 text-center">
                選択中: {selectedModelIds.map((id) =>
                  availableModels.find((m) => m.id === id)?.displayName
                ).join(', ')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
