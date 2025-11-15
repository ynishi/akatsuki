// Token計算関連の型をre-export
export type { TokenWarningLevel, TokenUsageDetails } from './utils/tokenCalculations';

// Storage関連の型をre-export
export type { PromptStorage } from './storage/PromptStorage';
export type { HistoryStorage } from './storage/HistoryStorage';

/**
 * よく使われるプロバイダー名の定数
 *
 * Developerは独自のプロバイダー名を自由に定義できますが、
 * 一般的なプロバイダーについては以下の定数を使用することを推奨します。
 */
export const COMMON_PROVIDERS = {
  GEMINI: 'gemini',
  ANTHROPIC: 'anthropic',
  OPENAI: 'openai',
} as const;

/**
 * よく使われるプロバイダー名の型
 */
export type CommonProvider = typeof COMMON_PROVIDERS[keyof typeof COMMON_PROVIDERS];

// ============================================================================
// Type Definitions / Enums
// ============================================================================

/**
 * AI action types
 */
export type AIAction = 'generate' | 'refine' | 'chat';

/**
 * AI button identifiers for hideButtons prop
 */
export type AIButtonId =
  | 'generate'
  | 'refine'
  | 'undo'
  | 'direction'
  | 'model'
  | 'command'
  | 'history'
  | 'token'
  | 'close';

/**
 * Position for AIIconSet component
 */
export type AIIconSetPosition = 'top' | 'bottom' | 'left' | 'right';

/**
 * Position for panel components (AIModelSelector, AIHistoryList, etc.)
 */
export type AIPanelPosition = 'left' | 'right' | 'center';

/**
 * Position for AITrigger component
 */
export type AITriggerPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

/**
 * AI model types
 */
export type AIModelType = 'fast' | 'think' | 'vision';

/**
 * Trigger size variants
 */
export type AITriggerSize = 'sm' | 'md' | 'lg';

// ============================================================================
// Context and Configuration
// ============================================================================

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
 * AIモデル定義
 */
export interface AIModel {
  /** モデルID */
  id: string;

  /** プロバイダー名（任意の文字列、COMMON_PROVIDERS推奨） */
  provider: string;

  /** モデル名（APIで使用する名前） */
  name: string;

  /** 表示名 */
  displayName: string;

  /** モデルタイプ */
  type: AIModelType;

  /** 最大トークン数 */
  maxTokens: number;

  /** トークンあたりのコスト（オプション） */
  costPerToken?: {
    input: number;
    output: number;
  };
}

/**
 * Multi-Run結果
 */
export interface MultiRunResult {
  /** モデルID */
  modelId: string;

  /** モデル表示名 */
  modelDisplayName: string;

  /** 生成結果 */
  result: string;

  /** 実行時間（ミリ秒） */
  duration: number;

  /** 使用トークン数（オプション） */
  tokensUsed?: number;

  /** エラー（失敗時） */
  error?: Error;
}

/**
 * Token使用量
 */
export interface TokenUsage {
  /** 入力トークン数 */
  input: number;

  /** 出力トークン数 */
  output: number;

  /** 合計トークン数 */
  total: number;

  /** コスト（オプション） */
  cost?: number;

  /** プロバイダー別の使用量 */
  byProvider?: Record<string, {
    input: number;
    output: number;
    total: number;
    cost?: number;
  }>;
}

/**
 * Token制限値
 */
export interface TokenLimits {
  /** 最大トークン数（オプション） */
  maxTokens?: number;

  /** 最大コスト（オプション） */
  maxCost?: number;

  /** 警告閾値（オプション、0-1の範囲） */
  warningThreshold?: number;
}

/**
 * システムコマンド
 */
export interface SystemCommand {
  /** コマンドID */
  id: string;

  /** コマンドタイプ */
  type: 'hidden' | 'preset' | 'editable';

  /** 表示ラベル */
  label: string;

  /** プロンプト内容 */
  prompt: string;

  /** カテゴリ（オプション） */
  category?: string;

  /** 編集可能か */
  editable: boolean;

  /** UI表示するか */
  visible: boolean;

  /** 説明（オプション） */
  description?: string;
}

/**
 * 保存されたPrompt（Editableタイプ）
 */
export interface SavedPrompt extends SystemCommand {
  /** タイプは必ずeditable */
  type: 'editable';

  /** 作成日時 */
  createdAt: number;

  /** 更新日時 */
  updatedAt: number;

  /** 使用回数 */
  usageCount: number;
}

/**
 * AIアクションのオプション
 */
export interface AIActionOptions {
  /** 方向性（例: "フォーマルに", "簡潔に"） */
  direction?: string;

  /** カスタムプロンプト */
  customPrompt?: string;

  /** 使用するモデルID（指定しない場合は現在選択中のモデル） */
  modelId?: string;
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
  action: AIAction;
  direction?: string;
  value: string;
  context: AIAgentContext;

  /** 使用したモデルID */
  modelId: string;

  /** 使用したプロバイダー名 */
  provider: string;

  /** カスタムプロンプト（指定された場合） */
  customPrompt?: string;

  /** 使用トークン数（取得できた場合） */
  tokensUsed?: number;

  /** 実行時間（ミリ秒） */
  duration?: number;

  /** その他のメタデータ */
  metadata?: Record<string, unknown>;
}

/**
 * Default direction options (English)
 */
export const DEFAULT_DIRECTIONS: DirectionOption[] = [
  {
    id: 'formal',
    label: 'Formal',
    description: 'Polite expression suitable for business or official situations',
  },
  {
    id: 'casual',
    label: 'Casual',
    description: 'Friendly and relaxed expression',
  },
  {
    id: 'concise',
    label: 'Concise',
    description: 'Brief expression focused on key points',
  },
  {
    id: 'detailed',
    label: 'Detailed',
    description: 'Expression with detailed explanations and examples',
  },
  {
    id: 'professional',
    label: 'Professional',
    description: 'Technical expression using professional terminology',
  },
  {
    id: 'friendly',
    label: 'Friendly',
    description: 'Warm and approachable expression',
  },
];

/**
 * Default direction options (Japanese)
 */
export const DEFAULT_DIRECTIONS_JA: DirectionOption[] = [
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
  onSuccess?: (result: string, action: AIAction) => void;

  /** カスタム方向性オプション */
  directions?: DirectionOption[];

  /** カスタムシステムコマンド（Developer指定） */
  systemCommands?: SystemCommand[];

  /** Token制限値 */
  tokenLimits?: TokenLimits;

  /**
   * Prompt永続化ストレージ（オプション）
   *
   * 提供しない場合、デフォルトのメモリ内ストレージを使用（リロードで消える）
   *
   * @example
   * ```typescript
   * // LocalStorage実装を使用
   * promptStorage: new LocalStoragePromptStorage('ai-prompts')
   *
   * // API実装を使用
   * promptStorage: new ApiPromptStorage('/api/prompts')
   * ```
   */
  promptStorage?: import('./storage/PromptStorage').PromptStorage;

  /**
   * ストレージのスコープ（オプション）
   *
   * Developer側でスコープを自由に定義可能。
   *
   * @example
   * ```typescript
   * // フォーム単位で保存
   * promptStorageScope: `form-${formId}`
   *
   * // ユーザー単位で保存
   * promptStorageScope: `user-${userId}`
   *
   * // サービス単位で保存
   * promptStorageScope: 'service-blog'
   *
   * // グローバルで保存
   * promptStorageScope: 'global'
   * ```
   */
  promptStorageScope?: string;

  /**
   * 履歴永続化ストレージ（オプション）
   *
   * 提供しない場合、デフォルトのメモリ内ストレージを使用（リロードで消える）
   *
   * @example
   * ```typescript
   * // LocalStorage実装を使用
   * historyStorage: new LocalStorageHistoryStorage('ai-history')
   *
   * // API実装を使用
   * historyStorage: new ApiHistoryStorage('/api/history')
   * ```
   */
  historyStorage?: import('./storage/HistoryStorage').HistoryStorage;

  /**
   * 履歴ストレージのスコープ（オプション）
   *
   * Developer側でスコープを自由に定義可能。
   * 基本的には履歴はForm限定が多いが、インターフェース自体は開けておく。
   *
   * @example
   * ```typescript
   * // フォーム単位で保存（推奨）
   * historyStorageScope: `form-${formId}`
   *
   * // User + Form単位で保存
   * historyStorageScope: `user-${userId}:form-${formId}`
   * ```
   */
  historyStorageScope?: string;
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

    /** 🎛️ モデル切り替え */
    setModel: (modelId: string) => void;

    /** 🔄 Multi-Run（複数モデルで同時実行） */
    generateMulti: (modelIds: string[]) => Promise<MultiRunResult[]>;

    /** Multi-Run用: モデル選択/解除 */
    toggleModelSelection: (modelId: string) => void;

    /** Multi-Run用: すべてのモデル選択をクリア */
    clearModelSelection: () => void;

    /** 💾 Promptを保存 */
    savePrompt: (label: string, prompt: string, category?: string) => void;

    /** 🗑️ Promptを削除 */
    deletePrompt: (promptId: string) => void;

    /** ✏️ Promptを更新 */
    updatePrompt: (promptId: string, updates: Partial<Pick<SavedPrompt, 'label' | 'prompt' | 'category'>>) => void;

    /** 🎯 System Commandを実行 */
    executeSystemCommand: (commandId: string) => Promise<void>;
  };

  /** 状態 */
  state: {
    /** ローディング中 */
    isLoading: boolean;

    /** Promptsローディング中 */
    isLoadingPrompts: boolean;

    /** 履歴ローディング中 */
    isLoadingHistory: boolean;

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

    /** 利用可能なモデル一覧（プロバイダー情報付き） */
    availableModels: any[]; // AIModelWithProviderですが、循環参照を避けるためanyに

    /** 現在選択中のモデル */
    currentModel: any | null; // AIModelWithProviderですが、循環参照を避けるためanyに

    /** Multi-Run選択中のモデルID一覧 */
    selectedModelIds: string[];

    /** Multi-Run結果（実行後のみ） */
    multiRunResults: MultiRunResult[] | null;

    /** Token使用量 */
    tokenUsage: TokenUsage;

    /** Token制限値 */
    tokenLimits: TokenLimits;

    /** Token使用量の詳細情報（計算済み） */
    tokenUsageDetails: import('./utils/tokenCalculations').TokenUsageDetails;

    /** システムコマンド一覧 */
    systemCommands: SystemCommand[];

    /** 保存されたPrompt一覧 */
    savedPrompts: SavedPrompt[];
  };
}

// ============================================================================
// UI状態管理フック: useAIUI
// ============================================================================

/**
 * サブメニューの種類
 */
export type SubMenuType = 'direction' | 'model' | 'token' | null;

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

    /** 開いているサブメニュー（direction/model/token） */
    openSubMenu: SubMenuType;
  };

  /** UI操作 */
  handlers: {
    /** メニューを開く */
    openMenu: () => void;

    /** メニューを閉じる */
    closeMenu: () => void;

    /** メニューをトグル（開閉切り替え） */
    toggleMenu: () => void;

    /** 履歴パネルを切り替え */
    toggleHistoryPanel: () => void;

    /** コマンドパネルを切り替え */
    toggleCommandPanel: () => void;

    /** サブメニューを切り替え（排他制御） */
    toggleSubMenu: (menu: 'direction' | 'model' | 'token') => void;

    /** サブメニューを開く（排他制御） */
    openSubMenuExclusive: (menu: SubMenuType) => void;

    /** すべてのメニュー/パネルを閉じる */
    closeAllMenus: () => void;
  };
}

// ============================================================================
// i18n / Localization
// ============================================================================

/**
 * UI labels for internationalization
 *
 * All labels are optional - if not provided, the default (Japanese) labels will be used.
 */
export interface AILabels {
  // === AIIconSet Button Labels ===
  /** "生成" button (default: "生成") */
  generate?: string;
  /** "修正" button (default: "修正") */
  refine?: string;
  /** "元に戻す" button (default: "元に戻す") */
  undo?: string;
  /** "方向性を指定" button (default: "方向性を指定") */
  direction?: string;
  /** "モデルを選択" button (default: "モデルを選択") */
  model?: string;
  /** "コマンド" button (default: "コマンド") */
  command?: string;
  /** "履歴" button (default: "履歴") */
  history?: string;
  /** "Token使用量" button (default: "Token使用量") */
  token?: string;
  /** "閉じる" button (default: "閉じる") */
  close?: string;

  // === AIDirectionMenu ===
  /** Direction menu title (default: "方向性を選択") */
  directionMenuTitle?: string;
  /** Direction menu description (default: "生成💫または修正🖌️を選んでください") */
  directionMenuDescription?: string;
  /** Direction "生成" button (default: "生成") */
  directionGenerate?: string;
  /** Direction "修正" button (default: "修正") */
  directionRefine?: string;

  // === AIModelSelector ===
  /** Model selector title (default: "モデル選択") */
  modelSelectorTitle?: string;
  /** Single mode tab (default: "🎯 単一") */
  modelSingle?: string;
  /** Multi mode tab (default: "🔄 Multi") */
  modelMulti?: string;
  /** Fast model button (default: "⚡ Fast") */
  modelFast?: string;
  /** Think model button (default: "🧠 Think") */
  modelThink?: string;
  /** Current model label (default: "現在:") */
  modelCurrent?: string;
  /** Multi-run button (default: "🔄 {count}個のモデルで実行") */
  modelMultiRun?: (count: number) => string;
  /** Running state (default: "実行中...") */
  modelRunning?: string;
  /** Selected models label (default: "選択中:") */
  modelSelected?: string;

  // === AICommandPanel ===
  /** Free command tab (default: "フリーコマンド") */
  commandFree?: string;
  /** System command tab (default: "システムコマンド") */
  commandSystem?: string;
  /** Saved prompts tab (default: "保存済みPrompt") */
  commandSaved?: string;
  /** Command input placeholder (default: "コマンドを入力") */
  commandPlaceholder?: string;
  /** Execute button (default: "実行") */
  execute?: string;
  /** Save button (default: "保存") */
  save?: string;
  /** Edit button (default: "編集") */
  edit?: string;
  /** Delete button (default: "削除") */
  delete?: string;
  /** Cancel button (default: "キャンセル") */
  cancel?: string;

  // === AIHistoryList ===
  /** History panel title (default: "履歴") */
  historyTitle?: string;
  /** History entry count (default: "{count}件の履歴 • 現在: {index}") */
  historyCount?: (count: number, index: number) => string;
  /** No history message (default: "履歴がありません") */
  historyEmpty?: string;
  /** Generate action label (default: "💫 生成") */
  historyGenerate?: string;
  /** Refine action label (default: "🖌️ 修正") */
  historyRefine?: string;
  /** Chat action label (default: "💬 チャット") */
  historyChat?: string;

  // === AITokenUsagePanel ===
  /** Token panel title (default: "📊 Token使用量") */
  tokenTitle?: string;
  /** Total label (default: "合計") */
  tokenTotal?: string;
  /** Input label (default: "入力") */
  tokenInput?: string;
  /** Output label (default: "出力") */
  tokenOutput?: string;
  /** By provider label (default: "プロバイダー別") */
  tokenByProvider?: string;
  /** Cost label (default: "コスト") */
  tokenCost?: string;
  /** Reset button (default: "リセット") */
  tokenReset?: string;
  /** Danger warning (default: "⚠️ 制限に達しました") */
  tokenWarningDanger?: string;
  /** Warning message (default: "⚠️ 制限値に近づいています") */
  tokenWarningWarning?: string;

  // === AITrigger ===
  /** Open AI features aria-label (default: "AI機能を開く") */
  triggerOpen?: string;
  /** Close AI features aria-label (default: "AI機能を閉じる") */
  triggerClose?: string;
}

/**
 * Predefined label sets
 */
export const AI_LABELS = {
  /** Japanese labels (default) */
  ja: {
    // AIIconSet
    generate: '生成',
    refine: '修正',
    undo: '元に戻す',
    direction: '方向性を指定',
    model: 'モデルを選択',
    command: 'コマンド',
    history: '履歴',
    token: 'Token使用量',
    close: '閉じる',

    // AIDirectionMenu
    directionMenuTitle: '方向性を選択',
    directionMenuDescription: '生成💫または修正🖌️を選んでください',
    directionGenerate: '生成',
    directionRefine: '修正',

    // AIModelSelector
    modelSelectorTitle: 'モデル選択',
    modelSingle: '🎯 単一',
    modelMulti: '🔄 Multi',
    modelFast: '⚡ Fast',
    modelThink: '🧠 Think',
    modelCurrent: '現在:',
    modelMultiRun: (count: number) => `🔄 ${count}個のモデルで実行`,
    modelRunning: '実行中...',
    modelSelected: '選択中:',

    // AICommandPanel
    commandFree: 'フリーコマンド',
    commandSystem: 'システムコマンド',
    commandSaved: '保存済みPrompt',
    commandPlaceholder: 'コマンドを入力',
    execute: '実行',
    save: '保存',
    edit: '編集',
    delete: '削除',
    cancel: 'キャンセル',

    // AIHistoryList
    historyTitle: '履歴',
    historyCount: (count: number, index: number) => `${count}件の履歴 • 現在: ${index}`,
    historyEmpty: '履歴がありません',
    historyGenerate: '💫 生成',
    historyRefine: '🖌️ 修正',
    historyChat: '💬 チャット',

    // AITokenUsagePanel
    tokenTitle: '📊 Token使用量',
    tokenTotal: '合計',
    tokenInput: '入力',
    tokenOutput: '出力',
    tokenByProvider: 'プロバイダー別',
    tokenCost: 'コスト',
    tokenReset: 'リセット',
    tokenWarningDanger: '⚠️ 制限に達しました',
    tokenWarningWarning: '⚠️ 制限値に近づいています',

    // AITrigger
    triggerOpen: 'AI機能を開く',
    triggerClose: 'AI機能を閉じる',
  } as const satisfies AILabels,

  /** English labels */
  en: {
    // AIIconSet
    generate: 'Generate',
    refine: 'Refine',
    undo: 'Undo',
    direction: 'Direction',
    model: 'Model',
    command: 'Command',
    history: 'History',
    token: 'Token Usage',
    close: 'Close',

    // AIDirectionMenu
    directionMenuTitle: 'Select Direction',
    directionMenuDescription: 'Choose Generate 💫 or Refine 🖌️',
    directionGenerate: 'Generate',
    directionRefine: 'Refine',

    // AIModelSelector
    modelSelectorTitle: 'Model Selection',
    modelSingle: '🎯 Single',
    modelMulti: '🔄 Multi',
    modelFast: '⚡ Fast',
    modelThink: '🧠 Think',
    modelCurrent: 'Current:',
    modelMultiRun: (count: number) => `🔄 Run with ${count} model${count > 1 ? 's' : ''}`,
    modelRunning: 'Running...',
    modelSelected: 'Selected:',

    // AICommandPanel
    commandFree: 'Free Command',
    commandSystem: 'System Command',
    commandSaved: 'Saved Prompts',
    commandPlaceholder: 'Enter command',
    execute: 'Execute',
    save: 'Save',
    edit: 'Edit',
    delete: 'Delete',
    cancel: 'Cancel',

    // AIHistoryList
    historyTitle: 'History',
    historyCount: (count: number, index: number) => `${count} ${count > 1 ? 'entries' : 'entry'} • Current: ${index}`,
    historyEmpty: 'No history',
    historyGenerate: '💫 Generate',
    historyRefine: '🖌️ Refine',
    historyChat: '💬 Chat',

    // AITokenUsagePanel
    tokenTitle: '📊 Token Usage',
    tokenTotal: 'Total',
    tokenInput: 'Input',
    tokenOutput: 'Output',
    tokenByProvider: 'By Provider',
    tokenCost: 'Cost',
    tokenReset: 'Reset',
    tokenWarningDanger: '⚠️ Limit reached',
    tokenWarningWarning: '⚠️ Approaching limit',

    // AITrigger
    triggerOpen: 'Open AI features',
    triggerClose: 'Close AI features',
  } as const satisfies AILabels,
} as const;
