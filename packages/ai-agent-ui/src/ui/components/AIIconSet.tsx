import type { AIRegisterResult, AIUIResult } from '../../core/types';
import { AIDirectionMenu } from './AIDirectionMenu';
import { AIHistoryList } from './AIHistoryList';
import { AICommandPanel } from './AICommandPanel';
import { AIModelSelector } from './AIModelSelector';
import { AITokenUsagePanel } from './AITokenUsagePanel';
import * as Tooltip from '@radix-ui/react-tooltip';

/**
 * AIIconSetコンポーネントのProps
 */
export interface AIIconSetProps {
  /** アクション（useAIRegisterから取得） */
  actions: AIRegisterResult['actions'];
  /** 状態（useAIRegisterから取得） */
  state: AIRegisterResult['state'];
  /** UI状態（useAIUIから取得） */
  uiState: AIUIResult['ui'];
  /** UIハンドラー（useAIUIから取得） */
  uiHandlers: AIUIResult['handlers'];
  /** カスタムクラス名 */
  className?: string;
  /** 位置 */
  position?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Tooltipボタンコンポーネント（Radix UI Tooltip使用）
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
    <Tooltip.Root delayDuration={300}>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          className={className}
        >
          {children}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className="select-none rounded shadow-lg"
          sideOffset={5}
          style={{
            zIndex: 9999,
            backgroundColor: '#1f2937',
            color: 'white',
            padding: '0.5rem 0.75rem',
            fontSize: '0.75rem',
            fontWeight: 500,
          }}
        >
          {label}
          <Tooltip.Arrow style={{ fill: '#1f2937' }} />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
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
  uiState,
  uiHandlers,
  className = '',
  position = 'bottom',
}: AIIconSetProps) {
  // サブメニュー状態はCore層（useAIUI）で管理

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
    <Tooltip.Provider delayDuration={300}>
      <div
        className={`
          absolute ${positionClasses[position]}
          z-50
          ${className}
        `}
      >
        {/* アイコンセット */}
        <div className="flex items-center gap-2 p-2 bg-white rounded-lg shadow-lg border border-gray-200">
        {/* === 左半分: シンプル系 === */}
        {/* 💫 生成 */}
        <TooltipButton
          onClick={() => {
            actions.generate();
            uiHandlers.closeMenu();
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
            uiHandlers.closeMenu();
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

        {/* 区切り線 */}
        <div className="w-px h-8 bg-gray-200" />

        {/* === 右半分: 詳細指定系 === */}
        {/* 🎚️ 方向性指定 */}
        <div className="relative">
          <TooltipButton
            onClick={() => uiHandlers.toggleSubMenu('direction')}
            disabled={state.isLoading}
            label="方向性を指定"
            className={iconButtonClass}
          >
            <span className="text-xl">🎚️</span>
          </TooltipButton>

          {/* 方向性メニュー */}
          {uiState.openSubMenu === 'direction' && (
            <AIDirectionMenu
              directions={state.directions}
              onGenerate={(direction) => {
                actions.generate({ direction });
                uiHandlers.closeAllMenus();
                uiHandlers.closeMenu();
              }}
              onRefine={(direction) => {
                actions.refine({ direction });
                uiHandlers.closeAllMenus();
                uiHandlers.closeMenu();
              }}
              onClose={() => uiHandlers.toggleSubMenu('direction')}
              isLoading={state.isLoading}
            />
          )}
        </div>

        {/* 🎛️ モデル選択 */}
        <div className="relative">
          <TooltipButton
            onClick={() => uiHandlers.toggleSubMenu('model')}
            disabled={state.isLoading}
            label="モデルを選択"
            className={iconButtonClass}
          >
            <span className="text-xl">🎛️</span>
          </TooltipButton>

          {/* モデル選択パネル */}
          {uiState.openSubMenu === 'model' && (
            <AIModelSelector
              availableModels={state.availableModels}
              currentModel={state.currentModel}
              onSelectModel={(modelId) => {
                actions.setModel(modelId);
                uiHandlers.closeAllMenus();
              }}
              onMultiRun={async (modelIds) => {
                await actions.generateMulti(modelIds);
                uiHandlers.closeAllMenus();
              }}
              selectedModelIds={state.selectedModelIds}
              onToggleModelSelection={actions.toggleModelSelection}
              onClose={() => uiHandlers.toggleSubMenu('model')}
              isLoading={state.isLoading}
              position="left"
            />
          )}
        </div>

        {/* 💬 コマンド */}
        <div className="relative">
          <TooltipButton
            onClick={() => uiHandlers.toggleCommandPanel()}
            disabled={state.isLoading}
            label="コマンド"
            className={iconButtonClass}
          >
            <span className="text-xl">💬</span>
          </TooltipButton>

          {/* コマンドパネル */}
          {uiState.showCommandPanel && (
            <AICommandPanel
              onExecute={async (command) => {
                await actions.executeCommand(command);
              }}
              onExecuteSystemCommand={async (commandId) => {
                await actions.executeSystemCommand(commandId);
              }}
              systemCommands={state.systemCommands}
              savedPrompts={state.savedPrompts}
              onSavePrompt={actions.savePrompt}
              onDeletePrompt={actions.deletePrompt}
              onUpdatePrompt={actions.updatePrompt}
              onClose={() => uiHandlers.toggleCommandPanel()}
              isLoading={state.isLoading}
              position="left"
            />
          )}
        </div>

        {/* 🗒️ 履歴 */}
        <div className="relative">
          <TooltipButton
            onClick={() => uiHandlers.toggleHistoryPanel()}
            disabled={state.isLoading}
            label="履歴"
            className={iconButtonClass}
          >
            <span className="text-xl">🗒️</span>
          </TooltipButton>

          {/* 履歴パネル */}
          {uiState.showHistoryPanel && (
            <AIHistoryList
              history={state.history}
              currentIndex={state.currentIndex}
              onSelectHistory={(index) => {
                actions.jumpToHistory(index);
              }}
              onClose={() => uiHandlers.toggleHistoryPanel()}
              isLoading={state.isLoading}
              position="left"
            />
          )}
        </div>

        {/* 📊 Token使用量 */}
        <div className="relative">
          <TooltipButton
            onClick={() => uiHandlers.toggleSubMenu('token')}
            disabled={state.isLoading}
            label="Token使用量"
            className={iconButtonClass}
          >
            <span className="text-xl">📊</span>
          </TooltipButton>

          {/* Token使用量パネル */}
          {uiState.openSubMenu === 'token' && (
            <AITokenUsagePanel
              tokenUsageDetails={state.tokenUsageDetails}
              onClose={() => uiHandlers.toggleSubMenu('token')}
              position="left"
            />
          )}
        </div>

        {/* 閉じるボタン */}
        <div className="w-px h-8 bg-gray-200" />
        <TooltipButton
          onClick={uiHandlers.closeMenu}
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
    </Tooltip.Provider>
  );
}
