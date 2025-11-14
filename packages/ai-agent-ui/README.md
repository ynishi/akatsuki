# @akatsuki/ai-agent-ui

AI Agent UI integration library for Akatsuki project.

## 概要

このライブラリは、Akatsukiプロジェクト向けのAIエージェント統合UIライブラリです。
UIコンポーネントに✨アイコンを表示し、ユーザーが1クリックでAIによるコンテンツ生成・修正を利用できる機能を提供します。

## コンセプト

- **ヘッドレスアプローチ**: ロジックとUIを完全に分離（Tanstackスタイル）
- **既存AIServiceの活用**: EdgeFunctionService経由でSupabase Edge Functionsを利用
- **UI特化型インターフェース**: `generate`/`refine`に特化したシンプルなAPI

## 構成

```
@akatsuki/ai-agent-ui/
├── core/               # ヘッドレスロジック
│   ├── types.ts       # 型定義
│   ├── hooks/         # React Hooks
│   └── context/       # React Context
├── providers/         # プロバイダー層
│   ├── IAIAgentProvider.ts        # インターフェース
│   └── akatsuki/                  # Akatsuki実装
│       └── AkatsukiAgentProvider.ts
└── ui/                # React UIコンポーネント
    ├── components/    # UIコンポーネント
    └── hooks/         # UI状態管理
```

## 使用例（予定）

```tsx
import { AIProvider, useAIRegister } from '@akatsuki/ai-agent-ui';
import { AkatsukiAgentProvider } from '@akatsuki/ai-agent-ui/providers';
import { AITrigger, AIIconSet } from '@akatsuki/ai-agent-ui/ui';

function App() {
  const provider = new AkatsukiAgentProvider();

  return (
    <AIProvider provider={provider}>
      <UserProfileForm />
    </AIProvider>
  );
}

function UserProfileForm() {
  const [bio, setBio] = useState('');

  const ai = useAIRegister({
    context: {
      scope: 'UserProfile.Bio',
      type: 'long_text',
      maxLength: 500
    },
    getValue: () => bio,
    setValue: (newValue) => setBio(newValue)
  });

  return (
    <div className="relative">
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder="自己紹介を入力..."
      />

      {/* ✨ AI機能トリガー */}
      <AITrigger {...ai.triggerProps} />

      {/* [💫 🖌️ ← 🗒️ 🏷️ 💬] アイコンセット */}
      {ai.menuProps.isOpen && (
        <AIIconSet
          actions={ai.actions}
          state={ai.state}
          onClose={ai.menuProps.onClose}
        />
      )}
    </div>
  );
}
```

## 実装ステータス

### Phase 1.1: コア型定義とインターフェース ✅
- [x] `core/types.ts`
- [x] `providers/IAIAgentProvider.ts`
- [x] `providers/akatsuki/AkatsukiAgentProvider.ts`

### Phase 1.2: コアフックとContext ✅
- [x] `core/context/AIAgentContext.tsx`
- [x] `core/hooks/useAIRegister.ts`
- [x] `core/hooks/useAIUndo.ts`

### Phase 1.3: UI基本コンポーネント 📅
- [ ] `ui/components/AITrigger.tsx`
- [ ] `ui/components/AIIconSet.tsx`
- [ ] `ui/components/AIDirectionMenu.tsx`

### Phase 1.4: 高度な機能 📅
- [ ] `ui/components/AIChatPanel.tsx`
- [ ] `ui/components/AIHistoryList.tsx`
- [ ] `core/hooks/useAIHistory.ts`

## ライセンス

MIT
