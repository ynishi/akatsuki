import { useState, useCallback } from 'react';
import type { AIUIResult, SubMenuType } from '../types';

/**
 * AI UI状態管理フック
 *
 * メニュー、パネルの表示/非表示などのUI状態のみを管理する。
 * ビジネスロジックは useAIRegister で管理し、このフックはUIレイヤーの状態のみを扱う。
 *
 * @returns UI状態と操作ハンドラー
 *
 * @example
 * ```tsx
 * function UserProfileForm() {
 *   const [bio, setBio] = useState('');
 *
 *   // ロジック層
 *   const ai = useAIRegister({
 *     context: { scope: 'UserProfile.Bio', type: 'long_text' },
 *     getValue: () => bio,
 *     setValue: (newValue) => setBio(newValue)
 *   });
 *
 *   // UI層
 *   const aiUI = useAIUI();
 *
 *   return (
 *     <div>
 *       <textarea value={bio} onChange={(e) => setBio(e.target.value)} />
 *
 *       <button onClick={aiUI.handlers.openMenu}>✨</button>
 *
 *       {aiUI.ui.isMenuOpen && (
 *         <AIIconSet
 *           actions={ai.actions}
 *           state={ai.state}
 *           uiState={aiUI.ui}
 *           uiHandlers={aiUI.handlers}
 *         />
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAIUI(): AIUIResult {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [showCommandPanel, setShowCommandPanel] = useState(false);
  const [openSubMenu, setOpenSubMenu] = useState<SubMenuType>(null);

  /**
   * すべてのメニュー/パネルを閉じる
   */
  const closeAllMenus = useCallback(() => {
    setOpenSubMenu(null);
    setShowHistoryPanel(false);
    setShowCommandPanel(false);
  }, []);

  /**
   * メニューを開く
   */
  const openMenu = useCallback(() => {
    setIsMenuOpen(true);
  }, []);

  /**
   * メニューを閉じる
   */
  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
    // メニューを閉じる時は全てのパネルとサブメニューも閉じる
    closeAllMenus();
  }, [closeAllMenus]);

  /**
   * メニューをトグル（開閉切り替え）
   */
  const toggleMenu = useCallback(() => {
    if (isMenuOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }, [isMenuOpen, openMenu, closeMenu]);

  /**
   * 履歴パネルを切り替え
   */
  const toggleHistoryPanel = useCallback(() => {
    setShowHistoryPanel((prev) => !prev);
    // 履歴を開く時は他のパネルとサブメニューを閉じる
    if (!showHistoryPanel) {
      setShowCommandPanel(false);
      setOpenSubMenu(null);
    }
  }, [showHistoryPanel]);

  /**
   * コマンドパネルを切り替え
   */
  const toggleCommandPanel = useCallback(() => {
    setShowCommandPanel((prev) => !prev);
    // コマンドを開く時は他のパネルとサブメニューを閉じる
    if (!showCommandPanel) {
      setShowHistoryPanel(false);
      setOpenSubMenu(null);
    }
  }, [showCommandPanel]);

  /**
   * サブメニューを切り替え（排他制御）
   */
  const toggleSubMenu = useCallback((menu: 'direction' | 'model' | 'token') => {
    setOpenSubMenu((prev) => (prev === menu ? null : menu));
    // サブメニューを開く時は他のパネルを閉じる
    setShowHistoryPanel(false);
    setShowCommandPanel(false);
  }, []);

  /**
   * サブメニューを開く（排他制御）
   */
  const openSubMenuExclusive = useCallback((menu: SubMenuType) => {
    setOpenSubMenu(menu);
    // サブメニューを開く時は他のパネルを閉じる
    setShowHistoryPanel(false);
    setShowCommandPanel(false);
  }, []);

  return {
    ui: {
      isMenuOpen,
      showHistoryPanel,
      showCommandPanel,
      openSubMenu,
    },
    handlers: {
      openMenu,
      closeMenu,
      toggleMenu,
      toggleHistoryPanel,
      toggleCommandPanel,
      toggleSubMenu,
      openSubMenuExclusive,
      closeAllMenus,
    },
  };
}
