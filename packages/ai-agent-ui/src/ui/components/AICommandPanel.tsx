import { useState } from 'react';

/**
 * AICommandPanelコンポーネントのProps
 */
export interface AICommandPanelProps {
  /** コマンド実行時のコールバック */
  onExecute: (command: string) => Promise<void>;
  /** 閉じるコールバック */
  onClose: () => void;
  /** ローディング中 */
  isLoading?: boolean;
  /** パネルの位置 */
  position?: 'left' | 'right' | 'center';
}

/**
 * 💬 AIコマンド入力パネルコンポーネント
 *
 * VSCode Copilotスタイルのコマンド入力UI
 * シンプルな1セッション実行（履歴管理なし）
 *
 * @example
 * ```tsx
 * <AICommandPanel
 *   onExecute={(command) => executeCommand(command)}
 *   onClose={() => setShowCommandPanel(false)}
 *   isLoading={isLoading}
 *   position="left"
 * />
 * ```
 */
export function AICommandPanel({
  onExecute,
  onClose,
  isLoading = false,
  position = 'center',
}: AICommandPanelProps) {
  const [command, setCommand] = useState('');

  // 位置に応じたクラス
  const positionClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || isLoading) return;

    await onExecute(command);
    setCommand('');
    onClose();
  };

  return (
    <>
      {/* オーバーレイ（クリックで閉じる） */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* コマンドパネル */}
      <div
        className={`absolute bottom-full mb-2 ${positionClasses[position]} z-50 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden`}
        style={{ width: '500px' }}
      >
        {/* ヘッダー */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              💬 AIコマンド
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="閉じる"
            >
              <span className="text-lg">✕</span>
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            自由にコマンドを入力してください
          </p>
        </div>

        {/* コマンド入力フォーム */}
        <form onSubmit={handleSubmit} className="p-4">
          <textarea
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="例: もっとフォーマルに書き直して"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            rows={3}
            disabled={isLoading}
            autoFocus
          />

          <div className="flex items-center justify-between mt-3">
            <div className="text-xs text-gray-500">
              💡 ヒント: 「箇条書きで要約」「簡潔にして」など
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isLoading}
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={!command.trim() || isLoading}
                className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? '実行中...' : '実行'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
