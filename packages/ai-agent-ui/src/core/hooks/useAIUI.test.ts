import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAIUI } from './useAIUI';

describe('useAIUI', () => {
  describe('初期状態', () => {
    it('すべてのUI要素が閉じた状態で初期化される', () => {
      const { result } = renderHook(() => useAIUI());

      expect(result.current.ui.isMenuOpen).toBe(false);
      expect(result.current.ui.showHistoryPanel).toBe(false);
      expect(result.current.ui.showCommandPanel).toBe(false);
      expect(result.current.ui.openSubMenu).toBe(null);
    });

    it('すべてのハンドラーが関数として提供される', () => {
      const { result } = renderHook(() => useAIUI());

      expect(typeof result.current.handlers.openMenu).toBe('function');
      expect(typeof result.current.handlers.closeMenu).toBe('function');
      expect(typeof result.current.handlers.toggleMenu).toBe('function');
      expect(typeof result.current.handlers.toggleHistoryPanel).toBe('function');
      expect(typeof result.current.handlers.toggleCommandPanel).toBe('function');
      expect(typeof result.current.handlers.toggleSubMenu).toBe('function');
      expect(typeof result.current.handlers.openSubMenuExclusive).toBe('function');
      expect(typeof result.current.handlers.closeAllMenus).toBe('function');
    });
  });

  describe('メインメニューの開閉', () => {
    it('openMenu でメニューを開ける', () => {
      const { result } = renderHook(() => useAIUI());

      act(() => {
        result.current.handlers.openMenu();
      });

      expect(result.current.ui.isMenuOpen).toBe(true);
    });

    it('closeMenu でメニューを閉じる', () => {
      const { result } = renderHook(() => useAIUI());

      act(() => {
        result.current.handlers.openMenu();
      });

      expect(result.current.ui.isMenuOpen).toBe(true);

      act(() => {
        result.current.handlers.closeMenu();
      });

      expect(result.current.ui.isMenuOpen).toBe(false);
    });

    it('toggleMenu でメニューを開閉できる', () => {
      const { result } = renderHook(() => useAIUI());

      // 閉じた状態から開く
      act(() => {
        result.current.handlers.toggleMenu();
      });

      expect(result.current.ui.isMenuOpen).toBe(true);

      // 開いた状態から閉じる
      act(() => {
        result.current.handlers.toggleMenu();
      });

      expect(result.current.ui.isMenuOpen).toBe(false);
    });

    it('closeMenu を呼ぶとすべてのパネルとサブメニューも閉じる', () => {
      const { result } = renderHook(() => useAIUI());

      // メニューを開く
      act(() => {
        result.current.handlers.openMenu();
      });

      // 履歴パネルを開く（コマンドは閉じられる）
      act(() => {
        result.current.handlers.toggleHistoryPanel();
      });

      // サブメニューを開く（履歴は閉じられる）
      act(() => {
        result.current.handlers.toggleSubMenu('direction');
      });

      expect(result.current.ui.isMenuOpen).toBe(true);
      expect(result.current.ui.showHistoryPanel).toBe(false); // サブメニューを開いたので履歴は閉じている
      expect(result.current.ui.openSubMenu).toBe('direction');

      // メニューを閉じる
      act(() => {
        result.current.handlers.closeMenu();
      });

      // すべて閉じている
      expect(result.current.ui.isMenuOpen).toBe(false);
      expect(result.current.ui.showHistoryPanel).toBe(false);
      expect(result.current.ui.showCommandPanel).toBe(false);
      expect(result.current.ui.openSubMenu).toBe(null);
    });
  });

  describe('履歴パネルの切り替え', () => {
    it('toggleHistoryPanel で履歴パネルを開閉できる', () => {
      const { result } = renderHook(() => useAIUI());

      // 開く
      act(() => {
        result.current.handlers.toggleHistoryPanel();
      });

      expect(result.current.ui.showHistoryPanel).toBe(true);

      // 閉じる
      act(() => {
        result.current.handlers.toggleHistoryPanel();
      });

      expect(result.current.ui.showHistoryPanel).toBe(false);
    });

    it('履歴パネルを開くとコマンドパネルとサブメニューが閉じる', () => {
      const { result } = renderHook(() => useAIUI());

      // コマンドパネルを開く
      act(() => {
        result.current.handlers.toggleCommandPanel();
      });

      expect(result.current.ui.showCommandPanel).toBe(true);

      // サブメニューを開く（コマンドパネルが閉じる）
      act(() => {
        result.current.handlers.toggleSubMenu('model');
      });

      expect(result.current.ui.showCommandPanel).toBe(false);
      expect(result.current.ui.openSubMenu).toBe('model');

      // 履歴パネルを開く
      act(() => {
        result.current.handlers.toggleHistoryPanel();
      });

      // 履歴パネルのみ開いている
      expect(result.current.ui.showHistoryPanel).toBe(true);
      expect(result.current.ui.showCommandPanel).toBe(false);
      expect(result.current.ui.openSubMenu).toBe(null);
    });
  });

  describe('コマンドパネルの切り替え', () => {
    it('toggleCommandPanel でコマンドパネルを開閉できる', () => {
      const { result } = renderHook(() => useAIUI());

      // 開く
      act(() => {
        result.current.handlers.toggleCommandPanel();
      });

      expect(result.current.ui.showCommandPanel).toBe(true);

      // 閉じる
      act(() => {
        result.current.handlers.toggleCommandPanel();
      });

      expect(result.current.ui.showCommandPanel).toBe(false);
    });

    it('コマンドパネルを開くと履歴パネルとサブメニューが閉じる', () => {
      const { result } = renderHook(() => useAIUI());

      // 履歴パネルを開く
      act(() => {
        result.current.handlers.toggleHistoryPanel();
      });

      expect(result.current.ui.showHistoryPanel).toBe(true);

      // サブメニューを開く（履歴パネルが閉じる）
      act(() => {
        result.current.handlers.toggleSubMenu('token');
      });

      expect(result.current.ui.showHistoryPanel).toBe(false);
      expect(result.current.ui.openSubMenu).toBe('token');

      // コマンドパネルを開く
      act(() => {
        result.current.handlers.toggleCommandPanel();
      });

      // コマンドパネルのみ開いている
      expect(result.current.ui.showCommandPanel).toBe(true);
      expect(result.current.ui.showHistoryPanel).toBe(false);
      expect(result.current.ui.openSubMenu).toBe(null);
    });
  });

  describe('サブメニューの切り替え', () => {
    it('toggleSubMenu でサブメニューを開閉できる', () => {
      const { result } = renderHook(() => useAIUI());

      // direction を開く
      act(() => {
        result.current.handlers.toggleSubMenu('direction');
      });

      expect(result.current.ui.openSubMenu).toBe('direction');

      // 同じメニューを再度トグルすると閉じる
      act(() => {
        result.current.handlers.toggleSubMenu('direction');
      });

      expect(result.current.ui.openSubMenu).toBe(null);
    });

    it('異なるサブメニューを開くと前のが閉じる（排他制御）', () => {
      const { result } = renderHook(() => useAIUI());

      // direction を開く
      act(() => {
        result.current.handlers.toggleSubMenu('direction');
      });

      expect(result.current.ui.openSubMenu).toBe('direction');

      // model を開く
      act(() => {
        result.current.handlers.toggleSubMenu('model');
      });

      // direction が閉じて model が開く
      expect(result.current.ui.openSubMenu).toBe('model');
    });

    it('サブメニューを開くと他のパネルが閉じる', () => {
      const { result } = renderHook(() => useAIUI());

      // 履歴パネルを開く
      act(() => {
        result.current.handlers.toggleHistoryPanel();
      });

      expect(result.current.ui.showHistoryPanel).toBe(true);

      // コマンドパネルを開く（履歴が閉じる）
      act(() => {
        result.current.handlers.toggleCommandPanel();
      });

      expect(result.current.ui.showHistoryPanel).toBe(false);
      expect(result.current.ui.showCommandPanel).toBe(true);

      // サブメニューを開く
      act(() => {
        result.current.handlers.toggleSubMenu('direction');
      });

      // サブメニューのみ開いている
      expect(result.current.ui.openSubMenu).toBe('direction');
      expect(result.current.ui.showHistoryPanel).toBe(false);
      expect(result.current.ui.showCommandPanel).toBe(false);
    });

    it('3種類のサブメニュー（direction, model, token）をすべて切り替えられる', () => {
      const { result } = renderHook(() => useAIUI());

      // direction
      act(() => {
        result.current.handlers.toggleSubMenu('direction');
      });
      expect(result.current.ui.openSubMenu).toBe('direction');

      // model
      act(() => {
        result.current.handlers.toggleSubMenu('model');
      });
      expect(result.current.ui.openSubMenu).toBe('model');

      // token
      act(() => {
        result.current.handlers.toggleSubMenu('token');
      });
      expect(result.current.ui.openSubMenu).toBe('token');
    });
  });

  describe('openSubMenuExclusive', () => {
    it('指定したサブメニューを直接開ける', () => {
      const { result } = renderHook(() => useAIUI());

      act(() => {
        result.current.handlers.openSubMenuExclusive('model');
      });

      expect(result.current.ui.openSubMenu).toBe('model');
    });

    it('null を渡すとサブメニューを閉じる', () => {
      const { result } = renderHook(() => useAIUI());

      act(() => {
        result.current.handlers.openSubMenuExclusive('direction');
      });

      expect(result.current.ui.openSubMenu).toBe('direction');

      act(() => {
        result.current.handlers.openSubMenuExclusive(null);
      });

      expect(result.current.ui.openSubMenu).toBe(null);
    });

    it('サブメニューを開くと他のパネルが閉じる', () => {
      const { result } = renderHook(() => useAIUI());

      // 履歴パネルを開く
      act(() => {
        result.current.handlers.toggleHistoryPanel();
      });

      expect(result.current.ui.showHistoryPanel).toBe(true);

      // コマンドパネルを開く（履歴が閉じる）
      act(() => {
        result.current.handlers.toggleCommandPanel();
      });

      expect(result.current.ui.showHistoryPanel).toBe(false);
      expect(result.current.ui.showCommandPanel).toBe(true);

      act(() => {
        result.current.handlers.openSubMenuExclusive('token');
      });

      expect(result.current.ui.openSubMenu).toBe('token');
      expect(result.current.ui.showHistoryPanel).toBe(false);
      expect(result.current.ui.showCommandPanel).toBe(false);
    });
  });

  describe('closeAllMenus', () => {
    it('すべてのパネルとサブメニューを閉じる', () => {
      const { result } = renderHook(() => useAIUI());

      // 履歴パネルを開く
      act(() => {
        result.current.handlers.toggleHistoryPanel();
      });

      expect(result.current.ui.showHistoryPanel).toBe(true);

      // コマンドパネルを開く（履歴が閉じる）
      act(() => {
        result.current.handlers.toggleCommandPanel();
      });

      expect(result.current.ui.showHistoryPanel).toBe(false);
      expect(result.current.ui.showCommandPanel).toBe(true);

      // サブメニューを開く（コマンドが閉じる）
      act(() => {
        result.current.handlers.toggleSubMenu('direction');
      });

      expect(result.current.ui.showCommandPanel).toBe(false);
      expect(result.current.ui.openSubMenu).toBe('direction');

      // すべて閉じる
      act(() => {
        result.current.handlers.closeAllMenus();
      });

      expect(result.current.ui.showHistoryPanel).toBe(false);
      expect(result.current.ui.showCommandPanel).toBe(false);
      expect(result.current.ui.openSubMenu).toBe(null);
    });

    it('メインメニューは閉じない', () => {
      const { result } = renderHook(() => useAIUI());

      act(() => {
        result.current.handlers.openMenu();
        result.current.handlers.toggleHistoryPanel();
      });

      expect(result.current.ui.isMenuOpen).toBe(true);
      expect(result.current.ui.showHistoryPanel).toBe(true);

      act(() => {
        result.current.handlers.closeAllMenus();
      });

      // メインメニューは開いたまま、パネルのみ閉じる
      expect(result.current.ui.isMenuOpen).toBe(true);
      expect(result.current.ui.showHistoryPanel).toBe(false);
    });
  });

  describe('複合的なUI操作シナリオ', () => {
    it('複数のパネルを連続して切り替えても正しく動作する', () => {
      const { result } = renderHook(() => useAIUI());

      // シナリオ: ユーザーが色々なパネルを開いたり閉じたりする
      act(() => {
        result.current.handlers.openMenu();
      });
      expect(result.current.ui.isMenuOpen).toBe(true);

      act(() => {
        result.current.handlers.toggleHistoryPanel();
      });
      expect(result.current.ui.showHistoryPanel).toBe(true);

      act(() => {
        result.current.handlers.toggleSubMenu('direction');
      });
      expect(result.current.ui.openSubMenu).toBe('direction');
      expect(result.current.ui.showHistoryPanel).toBe(false); // 履歴が閉じる

      act(() => {
        result.current.handlers.toggleCommandPanel();
      });
      expect(result.current.ui.showCommandPanel).toBe(true);
      expect(result.current.ui.openSubMenu).toBe(null); // サブメニューが閉じる

      act(() => {
        result.current.handlers.closeMenu();
      });
      // すべて閉じる
      expect(result.current.ui.isMenuOpen).toBe(false);
      expect(result.current.ui.showCommandPanel).toBe(false);
      expect(result.current.ui.showHistoryPanel).toBe(false);
      expect(result.current.ui.openSubMenu).toBe(null);
    });
  });
});
