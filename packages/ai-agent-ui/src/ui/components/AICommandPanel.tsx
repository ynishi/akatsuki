import { useState } from 'react';
import type { SystemCommand, SavedPrompt } from '../../core/types';

/**
 * AICommandPanelコンポーネントのProps
 */
export interface AICommandPanelProps {
  /** コマンド実行時のコールバック */
  onExecute: (command: string) => Promise<void>;
  /** システムコマンド実行時のコールバック */
  onExecuteSystemCommand?: (commandId: string) => Promise<void>;
  /** Prompt保存時のコールバック */
  onSavePrompt?: (label: string, prompt: string, category?: string) => void;
  /** Prompt削除時のコールバック */
  onDeletePrompt?: (promptId: string) => void;
  /** Prompt更新時のコールバック */
  onUpdatePrompt?: (promptId: string, updates: Partial<Pick<SavedPrompt, 'label' | 'prompt' | 'category'>>) => void;
  /** システムコマンド一覧 */
  systemCommands?: SystemCommand[];
  /** 保存済みPrompt一覧 */
  savedPrompts?: SavedPrompt[];
  /** 閉じるコールバック */
  onClose: () => void;
  /** ローディング中 */
  isLoading?: boolean;
  /** パネルの位置 */
  position?: 'left' | 'right' | 'center';
}

/**
 * 💬 AIコマンド入力パネルコンポーネント（拡張版）
 *
 * タブUI形式で以下をサポート：
 * - フリーコマンド: 自由なテキスト入力
 * - システムコマンド: preset/editableコマンド
 * - 保存済みPrompt: ユーザーが保存したPrompt
 *
 * @example
 * ```tsx
 * <AICommandPanel
 *   onExecute={(command) => executeCommand(command)}
 *   onExecuteSystemCommand={(id) => executeSystemCommand(id)}
 *   systemCommands={state.systemCommands}
 *   savedPrompts={state.savedPrompts}
 *   onSavePrompt={actions.savePrompt}
 *   onDeletePrompt={actions.deletePrompt}
 *   onUpdatePrompt={actions.updatePrompt}
 *   onClose={() => setShowCommandPanel(false)}
 * />
 * ```
 */
export function AICommandPanel({
  onExecute,
  onExecuteSystemCommand,
  onSavePrompt,
  onDeletePrompt,
  onUpdatePrompt,
  systemCommands = [],
  savedPrompts = [],
  onClose,
  isLoading = false,
  position = 'center',
}: AICommandPanelProps) {
  const [tab, setTab] = useState<'free' | 'system' | 'saved'>('free');
  const [command, setCommand] = useState('');
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editPrompt, setEditPrompt] = useState('');

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

  const handleSaveCurrentCommand = () => {
    if (!command.trim() || !onSavePrompt) return;
    const inputLabel = prompt('Promptの名前を入力してください（空欄の場合は自動生成）:');

    // キャンセルの場合は何もしない
    if (inputLabel === null) return;

    // 空欄または空白のみの場合は、Promptの最初の部分から自動生成
    const label = inputLabel.trim() || command.trim().slice(0, 30) + (command.trim().length > 30 ? '...' : '');

    onSavePrompt(label, command.trim());
    setCommand('');
  };

  const handleEditPrompt = (p: SavedPrompt) => {
    setEditingPromptId(p.id);
    setEditLabel(p.label);
    setEditPrompt(p.prompt);
  };

  const handleUpdatePrompt = () => {
    if (!editingPromptId || !onUpdatePrompt) return;
    onUpdatePrompt(editingPromptId, {
      label: editLabel,
      prompt: editPrompt,
    });
    setEditingPromptId(null);
  };

  // 表示対象のシステムコマンド（visibleなもののみ）
  const visibleSystemCommands = systemCommands.filter((c) => c.visible);

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
          <div className="flex items-center justify-between mb-2">
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

          {/* タブ */}
          <div className="flex border-b border-gray-200 -mb-px">
            <button
              onClick={() => setTab('free')}
              className={`
                flex-1 px-3 py-2 text-sm font-medium transition-all
                ${tab === 'free'
                  ? 'text-purple-700 bg-white border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              ✍️ フリー
            </button>
            <button
              onClick={() => setTab('system')}
              className={`
                flex-1 px-3 py-2 text-sm font-medium transition-all
                ${tab === 'system'
                  ? 'text-purple-700 bg-white border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              🎯 システム
            </button>
            <button
              onClick={() => setTab('saved')}
              className={`
                flex-1 px-3 py-2 text-sm font-medium transition-all
                ${tab === 'saved'
                  ? 'text-purple-700 bg-white border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              💾 保存済み ({savedPrompts.length})
            </button>
          </div>
        </div>

        {/* フリーコマンドタブ */}
        {tab === 'free' && (
          <form onSubmit={handleSubmit} className="p-4">
            <textarea
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="例: もっとフォーマルに書き直して"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={4}
              disabled={isLoading}
              autoFocus
            />

            <div className="flex items-center justify-between mt-3">
              <button
                type="button"
                onClick={handleSaveCurrentCommand}
                disabled={!command.trim() || !onSavePrompt}
                className="text-xs text-purple-600 hover:text-purple-700 disabled:opacity-50"
              >
                💾 このコマンドを保存
              </button>
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
        )}

        {/* システムコマンドタブ */}
        {tab === 'system' && (
          <div className="max-h-80 overflow-y-auto p-2">
            {visibleSystemCommands.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                システムコマンドがありません
              </div>
            ) : (
              visibleSystemCommands.map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={async () => {
                    if (onExecuteSystemCommand) {
                      await onExecuteSystemCommand(cmd.id);
                      onClose();
                    }
                  }}
                  disabled={isLoading}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 disabled:opacity-50"
                >
                  <div className="font-medium text-sm text-gray-900">
                    {cmd.label}
                  </div>
                  {cmd.description && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      {cmd.description}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        )}

        {/* 保存済みPromptタブ */}
        {tab === 'saved' && (
          <div className="max-h-80 overflow-y-auto p-2">
            {savedPrompts.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                保存されたPromptがありません
                <br />
                フリータブでコマンドを入力して保存してください
              </div>
            ) : (
              savedPrompts.map((p) => (
                <div
                  key={p.id}
                  className="px-4 py-3 border-b border-gray-100 last:border-b-0"
                >
                  {editingPromptId === p.id ? (
                    /* 編集モード */
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="ラベル"
                      />
                      <textarea
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleUpdatePrompt}
                          className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setEditingPromptId(null)}
                          className="px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* 表示モード */
                    <>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900">
                            {p.label}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {p.prompt}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            使用回数: {p.usageCount}回
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={async () => {
                              if (onExecuteSystemCommand) {
                                await onExecuteSystemCommand(p.id);
                                onClose();
                              }
                            }}
                            disabled={isLoading}
                            className="px-2 py-1 text-xs text-purple-600 hover:bg-purple-50 rounded"
                          >
                            実行
                          </button>
                          {p.editable && onUpdatePrompt && (
                            <button
                              onClick={() => handleEditPrompt(p)}
                              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                            >
                              編集
                            </button>
                          )}
                          {p.editable && onDeletePrompt && (
                            <button
                              onClick={() => onDeletePrompt(p.id)}
                              className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                            >
                              削除
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}
