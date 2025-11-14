import { useState } from 'react';
import type { AIRegisterResult } from '../../core/types';
import { AIDirectionMenu } from './AIDirectionMenu';
// @ts-ignore - Akatsuki専用パッケージなのでapp-frontendのコンポーネントを直接参照
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../../app-frontend/src/components/ui/tooltip';

/**
 * AIIconSetコンポーネントのProps
 */
export interface AIIconSetProps {
  /** アクション（useAIRegisterから取得） */
  actions: AIRegisterResult['actions'];
  /** 状態（useAIRegisterから取得） */
  state: AIRegisterResult['state'];
  /** 閉じるコールバック */
  onClose: () => void;
  /** カスタムクラス名 */
  className?: string;
  /** 位置 */
  position?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Tooltipボタンコンポーネント（shadcn/ui Tooltip使用）
 */
function TooltipButton({
  onClick,
  disabled,
  label,
  children,
  className = '',
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={className}
          aria-label={label}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * [💫 🖌️ ← 🗒️ 🎚️ 💬] AIアイコンセットコンポーネント
 *
 * AI機能のアイコンセットを表示する
 *
 * @example
 * ```tsx
 * {ai.menuProps.isOpen && (
 *   <AIIconSet
 *     actions={ai.actions}
 *     state={ai.state}
 *     onClose={ai.menuProps.onClose}
 *   />
 * )}
 * ```
 */
export function AIIconSet({
  actions,
  state,
  onClose,
  className = '',
  position = 'bottom',
}: AIIconSetProps) {
  const [showDirectionMenu, setShowDirectionMenu] = useState(false);

  const positionClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2',
  };

  /**
   * アイコンボタンの共通スタイル
   */
  const iconButtonClass = `
    w-10 h-10
    flex items-center justify-center
    rounded-lg
    bg-white
    text-gray-700
    hover:bg-gray-100
    active:bg-gray-200
    border border-gray-200
    shadow-sm
    hover:shadow-md
    transition-all duration-150
    cursor-pointer
    disabled:opacity-50
    disabled:cursor-not-allowed
  `;

  return (
    <TooltipProvider delayDuration={100}>
      <div
        className={`
          absolute ${positionClasses[position]}
          z-50
          ${className}
        `}
      >
        {/* アイコンセット */}
        <div className="flex items-center gap-2 p-2 bg-white rounded-lg shadow-lg border border-gray-200">
        {/* 💫 生成 */}
        <TooltipButton
          onClick={() => {
            actions.generate();
            onClose();
          }}
          disabled={state.isLoading}
          label="生成"
          className={iconButtonClass}
        >
          <span className="text-xl">💫</span>
        </TooltipButton>

        {/* 🖌️ 修正 */}
        <TooltipButton
          onClick={() => {
            actions.refine();
            onClose();
          }}
          disabled={state.isLoading}
          label="修正"
          className={iconButtonClass}
        >
          <span className="text-xl">🖌️</span>
        </TooltipButton>

        {/* ← 元に戻す */}
        <TooltipButton
          onClick={() => {
            actions.undo();
          }}
          disabled={!state.canUndo || state.isLoading}
          label="元に戻す"
          className={iconButtonClass}
        >
          <span className="text-xl">←</span>
        </TooltipButton>

        {/* 🗒️ 履歴 */}
        <TooltipButton
          onClick={() => {
            actions.showHistory();
          }}
          disabled={state.isLoading}
          label="履歴"
          className={iconButtonClass}
        >
          <span className="text-xl">🗒️</span>
        </TooltipButton>

        {/* 🎚️ 方向性指定 */}
        <div className="relative">
          <TooltipButton
            onClick={() => setShowDirectionMenu(!showDirectionMenu)}
            disabled={state.isLoading}
            label="方向性を指定"
            className={iconButtonClass}
          >
            <span className="text-xl">🎚️</span>
          </TooltipButton>

          {/* 方向性メニュー */}
          {showDirectionMenu && (
            <AIDirectionMenu
              directions={state.directions}
              onGenerate={(direction) => {
                actions.generate({ direction });
                setShowDirectionMenu(false);
                onClose();
              }}
              onRefine={(direction) => {
                actions.refine({ direction });
                setShowDirectionMenu(false);
                onClose();
              }}
              onClose={() => setShowDirectionMenu(false)}
              isLoading={state.isLoading}
            />
          )}
        </div>

        {/* 💬 チャット */}
        <TooltipButton
          onClick={() => {
            actions.showChat();
          }}
          disabled={state.isLoading}
          label="チャット"
          className={iconButtonClass}
        >
          <span className="text-xl">💬</span>
        </TooltipButton>

        {/* 閉じるボタン */}
        <div className="w-px h-8 bg-gray-200" />
        <TooltipButton
          onClick={onClose}
          label="閉じる"
          className={`${iconButtonClass} text-gray-400 hover:text-gray-600`}
        >
          <span className="text-sm">✕</span>
        </TooltipButton>
      </div>

      {/* ローディング表示 */}
      {state.isLoading && (
        <div className="absolute top-0 left-0 right-0 bottom-0 bg-white/50 backdrop-blur-sm rounded-lg flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent" />
        </div>
      )}

      {/* エラー表示 */}
      {state.error && (
        <div className="absolute top-full mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 max-w-xs">
          {state.error.message}
        </div>
      )}
      </div>
    </TooltipProvider>
  );
}
