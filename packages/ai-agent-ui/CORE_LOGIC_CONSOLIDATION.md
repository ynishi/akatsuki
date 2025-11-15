# Core Logic Consolidation Design

## 🎯 目的

UI層に残っているビジネスロジックとUI状態管理をCore層に集約し、完全なHeadless UI Libraryとして機能するようにする。

## 📊 現状分析

### ✅ 既にCore層にあるもの

#### 1. ビジネスロジック（useAIRegister）
- ✅ generate, refine, executeCommand
- ✅ Multi-Run状態管理（selectedModelIds, toggleModelSelection）
- ✅ 履歴管理（history, undo/redo, jumpToHistory）
- ✅ Direction管理（directions）
- ✅ Token管理（tokenUsage, tokenLimits）
- ✅ Prompt管理（savedPrompts, savePrompt, deletePrompt, updatePrompt）
- ✅ システムコマンド管理（systemCommands, executeSystemCommand）

#### 2. UI状態管理（useAIUI）
- ✅ isMenuOpen（メインメニューの開閉）
- ✅ showHistoryPanel（履歴パネルの表示）
- ✅ showCommandPanel（コマンドパネルの表示）

### ❌ まだUI層に残っているもの

#### 1. AIIconSet内のサブメニュー状態管理
**場所**: `src/ui/components/AIIconSet.tsx:90`

```typescript
const [openMenu, setOpenMenu] = useState<'direction' | 'model' | 'token' | null>(null);
```

**問題点**:
- Direction/Model/Tokenのサブメニュー状態がUIコンポーネント内で管理されている
- useAIUIで管理されている`showHistoryPanel`や`showCommandPanel`と同じレベルの状態なのに、管理場所が異なる
- **不整合**: 同じ性質の状態が異なる場所で管理されている

#### 2. AICommandPanel内のローカル状態
**場所**: `src/ui/components/AICommandPanel.tsx:64-68`

```typescript
const [tab, setTab] = useState<'free' | 'system' | 'saved'>('free');
const [command, setCommand] = useState('');
const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
const [editLabel, setEditLabel] = useState('');
const [editPrompt, setEditPrompt] = useState('');
```

**判定**:
- これらは**Presentation層の責務として妥当**
- タブ選択、入力値、編集状態などはUIコンポーネント固有の一時的な状態
- Core層に移動する必要はない

## 🎨 設計方針

### 原則: Separation of Concerns

```
┌─────────────────────────────────────────┐
│         UI Layer (Presentation)         │
│  - Component-specific local state       │
│  - Rendering logic                      │
│  - Event handlers (delegate to Core)    │
└─────────────────────────────────────────┘
                    ↓↑
┌─────────────────────────────────────────┐
│         Core Layer (Business Logic)     │
│  - Business logic state                 │
│  - UI state management                  │
│  - Actions and state transitions        │
└─────────────────────────────────────────┘
                    ↓↑
┌─────────────────────────────────────────┐
│    Provider Layer (Data Access)         │
│  - AI provider integration              │
│  - Registry management                  │
└─────────────────────────────────────────┘
```

### Core層に統合すべき状態の判定基準

**Core層に置くべき状態**:
1. 複数のコンポーネント間で共有される状態
2. ビジネスロジックに関わる状態
3. 親コンポーネントがアクセスする必要がある状態
4. Undo/Redo対象となる状態
5. **排他制御が必要な状態**（← 今回の焦点）

**UI層に置いてよい状態**:
1. コンポーネント内部でのみ使用される一時的な状態
2. Presentationロジックに関わる状態（タブ選択、入力値、編集状態など）
3. ユーザーアクション完了後に破棄される状態

## 🔧 リファクタリング計画

### Phase 1: useAIUIの拡張

#### 1.1 サブメニュー状態の追加

**Before** (AIIconSet.tsx):
```typescript
const [openMenu, setOpenMenu] = useState<'direction' | 'model' | 'token' | null>(null);
```

**After** (useAIUI.ts):
```typescript
export type SubMenuType = 'direction' | 'model' | 'token' | null;

export function useAIUI(): AIUIResult {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [showCommandPanel, setShowCommandPanel] = useState(false);
  const [openSubMenu, setOpenSubMenu] = useState<SubMenuType>(null); // NEW

  // 排他制御ロジック
  const openSubMenuExclusive = useCallback((menu: SubMenuType) => {
    setOpenSubMenu(menu);
    // サブメニューを開く時は、他のパネルを閉じる
    setShowHistoryPanel(false);
    setShowCommandPanel(false);
  }, []);

  const toggleSubMenu = useCallback((menu: 'direction' | 'model' | 'token') => {
    setOpenSubMenu(prev => prev === menu ? null : menu);
    // サブメニューを開く時は、他のパネルを閉じる
    setShowHistoryPanel(false);
    setShowCommandPanel(false);
  }, []);

  const closeAllMenus = useCallback(() => {
    setOpenSubMenu(null);
    setShowHistoryPanel(false);
    setShowCommandPanel(false);
  }, []);

  return {
    ui: {
      isMenuOpen,
      showHistoryPanel,
      showCommandPanel,
      openSubMenu, // NEW
    },
    handlers: {
      openMenu,
      closeMenu: () => {
        setIsMenuOpen(false);
        closeAllMenus();
      },
      toggleMenu,
      toggleHistoryPanel: () => {
        setShowHistoryPanel(prev => !prev);
        // 履歴を開く時は他を閉じる
        setShowCommandPanel(false);
        setOpenSubMenu(null);
      },
      toggleCommandPanel: () => {
        setShowCommandPanel(prev => !prev);
        // コマンドを開く時は他を閉じる
        setShowHistoryPanel(false);
        setOpenSubMenu(null);
      },
      toggleSubMenu, // NEW
      openSubMenuExclusive, // NEW
      closeAllMenus, // NEW
    },
  };
}
```

#### 1.2 型定義の更新

**src/core/types.ts**:
```typescript
export type SubMenuType = 'direction' | 'model' | 'token' | null;

export interface AIUIResult {
  ui: {
    /** メインメニューが開いているか */
    isMenuOpen: boolean;
    /** 履歴パネルが表示されているか */
    showHistoryPanel: boolean;
    /** コマンドパネルが表示されているか */
    showCommandPanel: boolean;
    /** 開いているサブメニュー（direction/model/token） */
    openSubMenu: SubMenuType; // NEW
  };
  handlers: {
    /** メニューを開く */
    openMenu: () => void;
    /** メニューを閉じる */
    closeMenu: () => void;
    /** メニューを開閉切り替え */
    toggleMenu: () => void;
    /** 履歴パネルを切り替え */
    toggleHistoryPanel: () => void;
    /** コマンドパネルを切り替え */
    toggleCommandPanel: () => void;
    /** サブメニューを切り替え（排他制御） */
    toggleSubMenu: (menu: 'direction' | 'model' | 'token') => void; // NEW
    /** サブメニューを開く（排他制御） */
    openSubMenuExclusive: (menu: SubMenuType) => void; // NEW
    /** すべてのメニュー/パネルを閉じる */
    closeAllMenus: () => void; // NEW
  };
}
```

### Phase 2: AIIconSetの更新

**Before**:
```typescript
const [openMenu, setOpenMenu] = useState<'direction' | 'model' | 'token' | null>(null);

// Direction menu
<TooltipButton
  onClick={() => {
    setOpenMenu(openMenu === 'direction' ? null : 'direction');
    if (uiState.showCommandPanel) {
      uiHandlers.toggleCommandPanel();
    }
    if (uiState.showHistoryPanel) {
      uiHandlers.toggleHistoryPanel();
    }
  }}
  // ...
/>
{openMenu === 'direction' && (
  <AIDirectionMenu ... />
)}
```

**After**:
```typescript
// ローカル状態を削除し、uiStateを使用
<TooltipButton
  onClick={() => uiHandlers.toggleSubMenu('direction')}
  // ...
/>
{uiState.openSubMenu === 'direction' && (
  <AIDirectionMenu ... />
)}
```

### Phase 3: UI層のPresentation状態の明確化

**AICommandPanel内の状態**:
```typescript
// これらはPresentation層の責務として残す
const [tab, setTab] = useState<'free' | 'system' | 'saved'>('free');
const [command, setCommand] = useState('');
const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
const [editLabel, setEditLabel] = useState('');
const [editPrompt, setEditPrompt] = useState('');
```

**理由**:
1. **タブ選択** (`tab`): UIコンポーネント内部でのみ使用される表示制御
2. **入力値** (`command`, `editLabel`, `editPrompt`): フォーム入力の一時的な状態
3. **編集状態** (`editingPromptId`): UI内での編集モードの制御

これらは実行ボタンを押すまで外部に影響しない一時的な状態であり、UI層の責務。

## 📝 実装手順

### Step 1: useAIUIの拡張
- [ ] SubMenuType型定義を追加
- [ ] openSubMenu状態を追加
- [ ] toggleSubMenu, openSubMenuExclusive, closeAllMenus handlers を実装
- [ ] 既存のtoggleHistoryPanel, toggleCommandPanelに排他制御ロジックを追加

### Step 2: 型定義の更新
- [ ] AIUIResultインターフェースを更新
- [ ] SubMenuType型をexport

### Step 3: AIIconSetの更新
- [ ] ローカルのopenMenu状態を削除
- [ ] uiState.openSubMenuとuiHandlers.toggleSubMenuを使用するように変更
- [ ] すべてのサブメニュー（direction, model, token）で同じパターンを適用

### Step 4: テストと検証
- [ ] メニューの排他制御が正しく動作することを確認
- [ ] メインメニューを閉じた時にすべてのサブメニューが閉じることを確認
- [ ] ビルドとTypeCheckが通ることを確認

### Step 5: ドキュメント更新
- [ ] README.mdの使用例を更新
- [ ] API仕様を更新

## 🎯 期待される効果

### 1. アーキテクチャの一貫性向上
- すべてのメニュー/パネル状態がCore層で一元管理される
- UI層とCore層の責務分離が明確になる

### 2. 保守性の向上
- メニューの排他制御ロジックが一箇所に集約される
- 新しいメニュー/パネルを追加する際のパターンが明確になる

### 3. テスタビリティの向上
- UI状態管理ロジックをCore層でテスト可能になる
- UIコンポーネントはPresentation層の責務に集中できる

### 4. Headless UI Libraryとしての完成度向上
- Core層が完全にUI実装から独立する
- 異なるUIフレームワークでの再利用が容易になる

## 🔍 補足: UI層に残すべき状態の例

以下のような状態は**UI層に残すべき**:

### ✅ OK: UI層に置く状態
```typescript
// フォーム入力の一時値
const [inputValue, setInputValue] = useState('');

// タブ選択（コンポーネント内部でのみ使用）
const [activeTab, setActiveTab] = useState<'tab1' | 'tab2'>('tab1');

// 編集モード（コンポーネント内部での切り替え）
const [isEditing, setIsEditing] = useState(false);

// ホバー状態、フォーカス状態
const [isHovered, setIsHovered] = useState(false);

// アニメーション制御
const [isAnimating, setIsAnimating] = useState(false);
```

### ❌ NG: Core層に置くべき状態
```typescript
// ビジネスロジックに関わる選択状態
const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

// 複数コンポーネント間で共有される状態
const [isMenuOpen, setIsMenuOpen] = useState(false);

// 排他制御が必要な状態
const [openPanel, setOpenPanel] = useState<'history' | 'command' | null>(null);

// Undo/Redo対象となる状態
const [value, setValue] = useState('');
```

## 📚 参考: 類似ライブラリの設計

### TanStack Table
- Core: Table state, sorting, filtering logic
- UI: Cell rendering, custom styling

### React Hook Form
- Core: Form state, validation, submission
- UI: Input components, error display

### Downshift (Headless UI)
- Core: Combobox state, keyboard navigation
- UI: Custom dropdown rendering

本設計も同様に、**Core層がすべての状態管理とロジックを担当**し、**UI層は純粋なPresentation**に徹する。
