/**
 * AIエージェントに渡す文脈情報
 */
export interface AIAgentContext {
  /** スコープ識別子（例: "UserProfile.Bio"） */
  scope: string;

  /** コンテンツタイプ */
  type: 'string' | 'long_text' | 'markdown' | 'json' | 'code';

  /** 現在の値 */
  currentValue?: string;

  /** 最大文字数 */
  maxLength?: number;

  /** 関連データ（コンテキスト補助情報） */
  relatedData?: Record<string, unknown>;

  /** メタデータ */
  metadata?: {
    /** ユーザー情報 */
    user?: {
      id: string;
      name?: string;
    };
    /** アプリケーションコンテキスト */
    app?: Record<string, unknown>;
    /** カスタムメタデータ */
    [key: string]: unknown;
  };
}

/**
 * AI生成/修正のオプション
 */
export interface AIActionOptions {
  /** 方向性指定（例: "フォーマルに", "簡潔に"） */
  direction?: string;

  /** カスタムプロンプト */
  customPrompt?: string;

  /** ストリーミング有効化 */
  stream?: boolean;
}

/**
 * useAIRegisterフックのオプション
 */
export interface AIRegisterOptions {
  /** コンテキスト情報 */
  context: AIAgentContext;

  /** 現在の値を取得するコールバック */
  getValue: () => string;

  /** 値を設定するコールバック */
  setValue: (newValue: string) => void;

  /** エラーハンドラー */
  onError?: (error: Error) => void;

  /** 成功ハンドラー */
  onSuccess?: (value: string, action: 'generate' | 'refine') => void;

  /** 方向性のカスタムリスト（デフォルト提供） */
  directions?: DirectionOption[];
}

/**
 * 方向性オプション
 */
export interface DirectionOption {
  id: string;
  label: string;
  description?: string;
  prompt?: string; // カスタムプロンプトテンプレート
}

/**
 * useAIRegisterフックの戻り値
 */
export interface AIRegisterResult {
  /** トリガーアイコン用のプロパティ */
  triggerProps: {
    onClick: () => void;
    onMouseEnter?: () => void;
    isActive: boolean;
    'aria-label': string;
  };

  /** メニュー用のプロパティ */
  menuProps: {
    isOpen: boolean;
    onClose: () => void;
  };

  /** ヘッドレスアクション */
  actions: {
    /** 💫 生成 */
    generate: (options?: AIActionOptions) => Promise<void>;

    /** 🖌️ 修正 */
    refine: (options?: AIActionOptions) => Promise<void>;

    /** ← 元に戻す */
    undo: () => void;

    /** → やり直す */
    redo: () => void;

    /** 🗒️ 履歴表示 */
    showHistory: () => void;

    /** 💬 チャット表示 */
    showChat: () => void;
  };

  /** 現在の状態 */
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
  };
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
