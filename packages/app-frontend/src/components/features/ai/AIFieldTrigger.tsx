/**
 * AIFieldTrigger - AI生成機能のトリガーボタン＋アイコンセット
 *
 * ai-agent-uiの汎用コンポーネントをAkatsuki UIに統合するラッパー
 */

import type { AIRegisterResult, AIUIResult } from '../../../../../ai-agent-ui/src/core/types'
import { AIIconSet } from '../../../../../ai-agent-ui/src/ui'

export interface AIFieldTriggerProps {
  /** AI register結果（actions, state） */
  ai: AIRegisterResult
  /** AI UI結果（ui, handlers） */
  ui: AIUIResult
  /** アイコンセットの位置 */
  position?: 'top' | 'bottom' | 'left' | 'right'
}

/**
 * AIフィールドトリガー
 *
 * @example
 * ```tsx
 * const bioAI = useAIRegister({...})
 * const bioUI = useAIUI()
 *
 * <AIFieldTrigger ai={bioAI} ui={bioUI} />
 * ```
 */
export function AIFieldTrigger({
  ai,
  ui,
  position = 'bottom',
}: AIFieldTriggerProps) {
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={ui.handlers.toggleMenu}
        aria-label={ui.ui.isMenuOpen ? 'AI機能を閉じる' : 'AI機能を開く'}
        className="w-6 h-6 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
      >
        <span className="text-sm animate-pulse">✨</span>
      </button>

      {ui.ui.isMenuOpen && (
        <AIIconSet
          actions={ai.actions}
          state={ai.state}
          uiState={ui.ui}
          uiHandlers={ui.handlers}
          position={position}
        />
      )}
    </div>
  )
}
