/**
 * AIエージェントのコンテキスト情報
 */
export interface AIAgentContext {
  /** スコープ（例: UserProfile.Bio, Article.Title） */
  scope: string;

  /** タイプ */
  type: 'string' | 'long_text' | 'markdown' | 'json' | 'code';

  /** 現在の値 */
  currentValue?: string;

  /** 最大文字数 */
  maxLength?: number;

  /** 関連データ */
  relatedData?: Record<string, unknown>;

  /** メタデータ */
  metadata?: Record<string, unknown>;
}

/**
 * AIアクションのオプション
 */
export interface AIActionOptions {
  /** 方向性（例: "フォーマルに", "簡潔に"） */
  direction?: string;

  /** カスタムプロンプト */
  customPrompt?: string;
}

/**
 * 方向性オプション
 */
export interface DirectionOption {
  id: string;
  label: string;
  description: string;
}

/**
 * AI履歴エントリ
 */
export interface AIHistoryEntry {
  id: string;
  timestamp: number;
  action: 'generate' | 'refine' | 'chat';
  direction?: string;
  value: string;
  context: AIAgentContext;
  metadata?: Record<string, unknown>;
}

/**
 * デフォルトの方向性オプション
 */
export const DEFAULT_DIRECTIONS: DirectionOption[] = [
  {
    id: 'formal',
    label: 'フォーマルに',
    description: 'ビジネスや公式な場面に適した丁寧な表現',
  },
  {
    id: 'casual',
    label: 'カジュアルに',
    description: '親しみやすく、リラックスした表現',
  },
  {
    id: 'concise',
    label: '簡潔に',
    description: '要点を絞った短い表現',
  },
  {
    id: 'detailed',
    label: '詳しく',
    description: '詳細な説明と具体例を含む表現',
  },
  {
    id: 'professional',
    label: '専門的に',
    description: '専門用語を使った技術的な表現',
  },
  {
    id: 'friendly',
    label: '友好的に',
    description: '温かみがあり、親しみやすい表現',
  },
];

// ============================================================================
// 純粋なロジックフック: useAIRegister
// ============================================================================

/**
 * useAIRegisterのオプション
 */
export interface AIRegisterOptions {
  /** AIエージェントのコンテキスト */
  context: AIAgentContext;

  /** 現在の値を取得する関数 */
  getValue: () => string;

  /** 値を設定する関数 */
  setValue: (value: string) => void;

  /** エラー時のコールバック */
  onError?: (error: Error) => void;

  /** 成功時のコールバック */
  onSuccess?: (result: string, action: 'generate' | 'refine' | 'chat') => void;

  /** カスタム方向性オプション */
  directions?: DirectionOption[];
}

/**
 * useAIRegisterの戻り値（純粋なロジックのみ）
 */
export interface AIRegisterResult {
  /** アクション */
  actions: {
    /** 💫 生成 */
    generate: (options?: AIActionOptions) => Promise<void>;

    /** 🖌️ 修正 */
    refine: (options?: AIActionOptions) => Promise<void>;

    /** ← 元に戻す */
    undo: () => void;

    /** → やり直す */
    redo: () => void;

    /** 特定の履歴にジャンプ */
    jumpToHistory: (index: number) => void;

    /** 💬 コマンド実行 */
    executeCommand: (command: string) => Promise<void>;
  };

  /** 状態 */
  state: {
    /** ローディング中 */
    isLoading: boolean;

    /** エラー */
    error: Error | null;

    /** 履歴 */
    history: AIHistoryEntry[];

    /** Undo可能か */
    canUndo: boolean;

    /** Redo可能か */
    canRedo: boolean;

    /** 方向性オプション */
    directions: DirectionOption[];

    /** 現在の履歴インデックス */
    currentIndex: number;
  };
}

// ============================================================================
// UI状態管理フック: useAIUI
// ============================================================================

/**
 * useAIUIの戻り値（UI状態のみ）
 */
export interface AIUIResult {
  /** UI状態 */
  ui: {
    /** メインメニューが開いているか */
    isMenuOpen: boolean;

    /** 履歴パネルが開いているか */
    showHistoryPanel: boolean;

    /** コマンドパネルが開いているか */
    showCommandPanel: boolean;
  };

  /** UI操作 */
  handlers: {
    /** メニューを開く */
    openMenu: () => void;

    /** メニューを閉じる */
    closeMenu: () => void;

    /** 履歴パネルを切り替え */
    toggleHistoryPanel: () => void;

    /** コマンドパネルを切り替え */
    toggleCommandPanel: () => void;
  };
}
