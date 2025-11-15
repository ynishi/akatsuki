/**
 * AITriggerコンポーネントのProps
 */
export interface AITriggerProps {
  /** メニューを開く/閉じる関数（useAIUIから取得） */
  onClick: () => void;
  /** カスタムクラス名 */
  className?: string;
  /** アイコンサイズ */
  size?: 'sm' | 'md' | 'lg';
  /** 位置 */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** アクティブ状態（メニューが開いているか） */
  isActive?: boolean;
}

/**
 * ✨ AIトリガーアイコンコンポーネント
 *
 * 入力フィールドの近くに表示され、AI機能を呼び出すトリガーとなる
 * クリックでメニューを開閉できる（toggleMenu推奨）
 *
 * @example
 * ```tsx
 * const aiUI = useAIUI();
 *
 * <div className="relative">
 *   <textarea value={text} onChange={...} />
 *   <AITrigger
 *     onClick={aiUI.handlers.toggleMenu}
 *     isActive={aiUI.ui.isMenuOpen}
 *   />
 * </div>
 * ```
 */
export function AITrigger({
  onClick,
  isActive = false,
  className = '',
  size = 'md',
  position = 'top-right',
}: AITriggerProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-sm',
    md: 'w-8 h-8 text-base',
    lg: 'w-10 h-10 text-lg',
  };

  const positionClasses = {
    'top-right': 'top-2 right-2',
    'top-left': 'top-2 left-2',
    'bottom-right': 'bottom-2 right-2',
    'bottom-left': 'bottom-2 left-2',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isActive ? 'AI機能を閉じる' : 'AI機能を開く'}
      className={`
        absolute ${positionClasses[position]} ${sizeClasses[size]}
        flex items-center justify-center
        rounded-full
        bg-gradient-to-br from-purple-500 to-pink-500
        text-white
        shadow-lg
        hover:shadow-xl
        hover:scale-110
        active:scale-95
        transition-all duration-200
        cursor-pointer
        ${isActive ? 'ring-2 ring-purple-300 ring-offset-2' : ''}
        ${className}
      `}
    >
      <span className="animate-pulse">✨</span>
    </button>
  );
}
