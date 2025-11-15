import type { DirectionOption, AILabels } from '../../core/types';
import { AI_LABELS } from '../../core/types';

/**
 * AIDirectionMenuコンポーネントのProps
 */
export interface AIDirectionMenuProps {
  /** 方向性オプション */
  directions: DirectionOption[];
  /** 生成アクション */
  onGenerate: (direction: string) => void;
  /** 修正アクション */
  onRefine: (direction: string) => void;
  /** 閉じるコールバック */
  onClose: () => void;
  /** ローディング中 */
  isLoading?: boolean;
  /** UIラベル（i18n対応） */
  labels?: AILabels;
}

/**
 * 🏷️ AI方向性メニューコンポーネント
 *
 * 「フォーマルに」「簡潔に」などの方向性を選択し、
 * それぞれに💫（生成）と🖌️（修正）のアクションを提供
 *
 * @example
 * ```tsx
 * <AIDirectionMenu
 *   directions={state.directions}
 *   onGenerate={(direction) => actions.generate({ direction })}
 *   onRefine={(direction) => actions.refine({ direction })}
 *   onClose={() => setShowMenu(false)}
 * />
 * ```
 */
export function AIDirectionMenu({
  directions,
  onGenerate,
  onRefine,
  onClose,
  isLoading = false,
  labels,
}: AIDirectionMenuProps) {
  // ラベルをマージ（ユーザー提供のラベル > デフォルト英語ラベル）
  const l = { ...AI_LABELS.en, ...labels };

  return (
    <>
      {/* オーバーレイ（クリックで閉じる） */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* メニュー */}
      <div className="absolute bottom-full mb-2 left-0 z-50 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 max-h-96 overflow-y-auto">
        {/* ヘッダー */}
        <div className="px-4 py-2 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              {l.directionMenuTitle}
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
          <p className="text-xs text-gray-500 mt-0.5">
            {l.directionMenuDescription}
          </p>
        </div>

        {/* 方向性リスト */}
        <div className="py-1">
          {directions.map((direction) => (
            <div
              key={direction.id}
              className="px-4 py-2 hover:bg-gray-50 transition-colors"
            >
              {/* 方向性ラベルと説明 */}
              <div className="mb-1.5">
                <div className="text-sm font-medium text-gray-900">
                  {direction.label}
                </div>
                {direction.description && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {direction.description}
                  </div>
                )}
              </div>

              {/* アクションボタン */}
              <div className="flex items-center gap-2">
                {/* 💫 生成 */}
                <button
                  type="button"
                  onClick={() => onGenerate(direction.label)}
                  disabled={isLoading}
                  className="
                    flex-1
                    flex items-center justify-center gap-1
                    px-3 py-1.5
                    text-xs font-medium
                    bg-purple-50 text-purple-700
                    hover:bg-purple-100
                    active:bg-purple-200
                    rounded
                    transition-colors
                    disabled:opacity-50
                    disabled:cursor-not-allowed
                  "
                  aria-label={`${direction.label} - ${l.directionGenerate}`}
                >
                  <span>💫</span>
                  <span>{l.directionGenerate}</span>
                </button>

                {/* 🖌️ 修正 */}
                <button
                  type="button"
                  onClick={() => onRefine(direction.label)}
                  disabled={isLoading}
                  className="
                    flex-1
                    flex items-center justify-center gap-1
                    px-3 py-1.5
                    text-xs font-medium
                    bg-blue-50 text-blue-700
                    hover:bg-blue-100
                    active:bg-blue-200
                    rounded
                    transition-colors
                    disabled:opacity-50
                    disabled:cursor-not-allowed
                  "
                  aria-label={`${direction.label} - ${l.directionRefine}`}
                >
                  <span>🖌️</span>
                  <span>{l.directionRefine}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
