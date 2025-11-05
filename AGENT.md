# 🤖 AGENT.md: Akatsuki 開発憲章

## 1. はじめに (Hello!)

こんにちは！
このドキュメントは、私たちチーム（AIと人間）が `Akatsuki` プロジェクトを「**安定性**」と「**輝き（スピード）**」を両立させながら成功に導くための「**憲法**」です。

コードレビューや設計提案を行う際は、常にこの`AGENT.md`のルールに基づきます。
新しい仲間が加わった際も、まずはこのドキュメントを共有してください。

## 2. プロジェクト理念 (Philosophy)

`Akatsuki` テンプレートの目的は、以下の3点を達成することです。

1. **0→1フェーズの最速立ち上げ** を実現する。
2. 開発者1〜2名体制での **開発体験（DX）を最大化** する。
3. 「AIGen（AI生成）」機能を息を吸うように導入できる開発基盤を提供する。

## 2.5. VibeCoding Quick Reference（チートシート）

実装開始前に確認する最速リファレンスです。詳細は各セクション参照。

**新機能実装の流れ:**
```
Step 1: 要件整理 → workspace/[feature]-design.md
Step 2: テンプレート参考 → L2018「8.9 Design Templates」で近いパターンを参考にする
Step 3: 設計（画面・DB・アーキテクチャ層）
Step 4: 実装（Model → Repository → Service → Hook → Component → Page）
Step 5: 動作確認（workspace/でダミーデータ生成）
Step 6: 振り返り（docs/に整理）

※ テンプレートは「参考」であり、要件に応じて自由にカスタマイズ
詳細 → L1402「6.4 VibeCoding実践ガイド」
```

**📍 よく使うセクション（行番号付き）:**
- 🚀 **実装開始時**: L1402「6.4 VibeCoding実践ガイド」
- 📋 **実装パターンテンプレート**: L2018「8.9 Design Templates」
- 🐛 **エラー対処**: L2359「9.2 よくあるトラブル」
- 🏗️ **Component設計**: L131「4.1 フロントエンドアーキテクチャ」
- 🗄️ **DB変更・マイグレーション**: L1204「6.1 ワークフロー」
- 🔐 **認証・RLS**: L574「4.2 認証アーキテクチャ」+ L2890「RLS ベストプラクティス」
- 📡 **Event System**: L2855「Event System（イベント駆動）」
- ⚙️ **Async Job System**: L2903「Async Job System（非同期ジョブ実行）」
- 🤖 **Function Call System**: 「LLM Function Calling統合」（後述）
- 📦 **技術スタック全体**: L131「4. 技術スタック」

**実装済みコンポーネント（すぐ使える）:**
- 認証: `AuthGuard`, `LoginForm`, `SignupForm`
- レイアウト: `Layout`, `PrivateLayout`, `NarrowLayout`, `FullWidthLayout`, `TopNavigation`
  - `Layout` - デフォルトレイアウト（メニュー・背景・パディング自動提供）
  - `PrivateLayout` - 認証必須ページ用（AuthGuard + Layout）
- ストレージ: `FileUpload`
- AI: `useAIGen`, `useImageGeneration`, `AIService`, `ImageGenerationService`
- Hooks: `usePublicProfile` (React Query)
- UI: shadcn/ui 44コンポーネント（`components/ui/`）

**Edge Functions（デプロイ済み）:**
- `ai-chat` - LLM統合（OpenAI/Anthropic/Gemini）
- `generate-image` - 画像生成（DALL-E）
- `upload-file` / `delete-file` - ファイル管理
- `get-signed-url` / `create-signed-url` - Private Storage
- `send-email` / `slack-notify` - 外部連携

**コマンド集:**
```bash
# Frontend
npm run dev:frontend              # 開発サーバー
npm run build:frontend            # 本番ビルド
npm run preview:frontend          # ビルド結果をプレビュー
npx tsc --noEmit                  # TypeScript型チェック（app-frontend内で実行）

# Backend (Rust)
npm run dev:backend               # 開発サーバー（Shuttle）
npm run build:backend             # リリースビルド
npm run check:backend             # 型チェック（cargo check）
npm run test:backend              # テスト実行
npm run deploy:backend            # Shuttleにデプロイ

# Supabase
npm run supabase:migration:new    # Migration作成
npm run supabase:push             # Migration適用
npm run supabase:function:deploy  # Edge Function デプロイ
npm run supabase:secrets:list     # Secrets一覧
npm run supabase:secrets:set      # Secrets設定

# Setup
npm run setup                     # 初回セットアップウィザード
npm run setup:check               # セットアップ状態確認

# workspace/ でダミーデータ生成
cd workspace && node generate-dummy-data.js
```

**トラブル時の診断:**
1. Edge Function エラー → `npx supabase functions logs <name> --tail`
2. RLS エラー → Supabase Dashboard → Database → Policies
3. TypeScript型エラー → `npx tsc --noEmit` で詳細確認
4. Model型エラー → Model の `fromDatabase()` 実装確認
5. 再レンダリング → useEffect 依存配列確認
6. ビルドエラー → `npm run build:frontend` で詳細確認

**🎯 よくあるシチュエーション別クイックジャンプ:**
- 「新しい画面を作りたい」 → L693「ルーティングパターン」（Layout使用） + L2018 Template 1: CRUD画面
- 「レイアウト・メニューを変更したい」 → L186「components/layout/」Layout.tsx, TopNavigation
- 「画像生成機能を追加したい」 → L783「5.1 AIGen統合」+ L2018 Template 3
- 「ファイルアップロードしたい」 → L783「5.1 AIGen統合」のStorage例
- 「ユーザー認証を実装したい」 → L574「4.2 認証アーキテクチャ」
- 「データベーステーブル追加したい」 → L1204「6.1 マイグレーション」
- 「React Queryのキャッシュがおかしい」 → L2359「9.2 よくあるトラブル」
- 「RLSポリシーでエラーになる」 → L2903「RLS ベストプラクティス」
- 「イベント駆動で通知したい」 → L2855「Event System」
- 「長時間ジョブを実行したい」 → L2903「Async Job System」

## 3. アーキテクチャ概要 (Architecture)

`Akatsuki` は、NPM Workspacesによる「**モノレポ構成**」を採用しています。
すべてのコードは単一のリポジトリで管理され、`packages/` 内の共通ライブラリは `workspace:*` プロトコルを通じて即座に参照されます。

```txt
akatsuki/
├── .gitignore
├── .nvmrc                  <-- Node.jsバージョン固定 (nvm用)
├── .tool-versions          <-- Node.js/Rustバージョン固定 (asdf/mise用)
├── package.json            <-- モノレポの起点
├── AGENT.md                <-- (このファイル) 開発憲章
├── README.md               <-- クイックスタート
├── issue.md                <-- プロジェクトマスタープラン
│
├── packages/               <-- アプリケーションと共通ライブラリ
│   ├── app-frontend/       <-- FE (VITE + React + Tailwind)
│   │   ├── src/
│   │   │   ├── components/     <-- UIコンポーネント
│   │   │   ├── pages/          <-- ページコンポーネント
│   │   │   ├── models/         <-- ドメインモデル層
│   │   │   ├── repositories/   <-- データアクセス層 (DB CRUD)
│   │   │   ├── services/       <-- サービス層 (Edge Functions等)
│   │   │   └── lib/            <-- インフラ層 (supabase.js等)
│   │   ├── .env            <-- (Git管理外) Frontend環境変数
│   │   ├── .env.example    <-- Frontend環境変数サンプル
│   │   └── package.json
│   │
│   ├── app-backend/        <-- BE (Shuttle + Axum)
│   │   ├── src/
│   │   │   ├── main.rs
│   │   │   └── db.rs       <-- Supabase連携
│   │   ├── .env            <-- (Git管理外) Backend環境変数
│   │   ├── .env.example    <-- Backend環境変数サンプル
│   │   └── Cargo.toml
│   │
│   └── (将来の拡張)
│       ├── ui-components/  <-- shadcn/ui の共通コンポーネント
│       └── aigen-hooks/    <-- useAIGen フック
│
├── supabase/               <-- Supabase設定・マイグレーション
│   ├── migrations/         <-- DBマイグレーションファイル
│   └── .temp/              <-- (Git管理外) CLI一時ファイル
│
├── docs/                   <-- ドキュメント
│   ├── guide/              <-- 【推奨】再利用可能な手順書
│   └── ...                 <-- 【フリー】設計メモ、ADR、議事録など
│
└── workspace/              <-- (Git管理外) 個人の作業場
    ├── .env (例)           <-- 個人用環境変数
    └── ...                 <-- メモ、下書きなど
```

## 4. 技術スタック (Tech Stack)

`Akatsuki` は、0→1フェーズで迷わないよう、以下の技術スタックで固定されています。

| 領域 | 技術選定 | 備考 |
| :--- | :--- | :--- |
| **フロントエンド** | **VITE + React + TypeScript + Tailwind CSS** | 0→1最速のデファクトスタンダード構成 |
| **型システム** | **TypeScript (段階的移行中)** | 新規ファイルは全て `.tsx`/`.ts` で作成 |
| **バックエンド** | **Shuttle + Axum (Rust)** | Rust BEのデファクトスタンダード |
| **データベース** | **Supabase (PostgreSQL)** | 開発環境は `Supabase-dev` を共有 |
| **リポジトリ** | **モノレポ (NPM Workspaces)** | ルートの `package.json` で全体管理 |

### 4.1. フロントエンドアーキテクチャパターン

Akatsuki では、保守性と拡張性を重視したレイヤードアーキテクチャを採用しています。

#### ディレクトリ構成と責務

```
src/
├── components/      # UIコンポーネント
│   ├── ui/          # 汎用UIコンポーネント（shadcn/ui）
│   ├── layout/      # 【NEW】レイアウトコンポーネント（Layout.tsx, TopNavigation等）
│   │                # Layout.tsx: 全ページ共通のレイアウト構造（メニュー、背景、パディング）
│   │                # PrivateLayout.tsx: 認証が必要なページ用Layout
│   ├── features/    # ドメイン固有のFeatureコンポーネント
│   │   ├── auth/    # 認証関連（AuthGuard, LoginForm等）
│   │   ├── ai/      # AI関連（ModelSelector等）
│   │   ├── storage/ # ストレージ関連（FileUpload等）
│   │   └── llm/     # LLM Chat関連
│   └── common/      # その他の共通コンポーネント
├── pages/          # ページコンポーネント（コンテンツのみ、Layoutは不要）
├── hooks/          # Custom Hooks（ビジネスロジック抽出）
├── contexts/       # Context API（グローバルState）
├── models/         # ドメインモデル層
├── repositories/   # データアクセス層（DB CRUD）
├── services/       # サービス層（Edge Functions等）
├── utils/          # ユーティリティ関数
└── lib/            # インフラ層（Supabaseクライアント等）
```

**各層の責務:**

1. **lib/** - インフラ層
   - Supabaseクライアントの初期化のみ
   - 外部サービスとの接続設定
   - **例:** `supabase.js`

2. **models/** - ドメインモデル層
   - ビジネスロジックとデータ構造の定義
   - DB形式 ↔ アプリ形式の変換（`fromDatabase()`, `toDatabase()`）
   - **例:** `UserProfile.js`, `Post.js`

3. **repositories/** - データアクセス層
   - Supabase（DB）への CRUD 操作を抽象化
   - エラーハンドリングの統一
   - **例:** `UserProfileRepository.js`
   - **パターン:**
     ```javascript
     // Repository でデータ取得
     const data = await UserProfileRepository.findByUserId(userId)
     // Model でドメインオブジェクトに変換
     const profile = UserProfile.fromDatabase(data)
     ```

4. **services/** - サービス層
   - Supabase Edge Functions の呼び出しを抽象化
   - 外部API連携
   - **例:** `EdgeFunctionService.js`, `AIGenerationService.js`
   - **レスポンス形式:** すべて `{ data, error }` 形式に統一
   - **パターン:**
     ```javascript
     // ✅ 正しい使い方（必ず分割代入）
     const { data, error } = await EdgeFunctionService.invoke('my-function', payload)
     if (error) {
       return { data: null, error }
     }
     console.log(data.someField)  // data は Edge Function の result

     // ❌ 間違い: 分割代入せずに使用
     const result = await EdgeFunctionService.invoke('my-function', payload)
     console.log(result.someField)  // undefined (result.data.someField が正しい)
     ```

5. **hooks/** - Custom Hooks（React Query）
   - **React Query** を使用した状態管理
   - Repository/Service を呼び出し、UIとビジネスロジックを分離
   - **例:** `useImageGeneration`, `usePublicProfile`
   - **パターン:**
     ```javascript
     // Query（データ取得）
     const { profile, isLoading, error, refetch } = usePublicProfile(userId)

     // Mutation（データ変更） - Fire-and-forget
     const { generate, isPending, data } = useImageGeneration()
     generate({ prompt: 'A cat' })  // 結果は data で取得

     // Mutation（データ変更） - async/await で結果を取得
     const { generateAsync, isPending } = useImageGeneration()
     const handleGenerate = async () => {
       const result = await generateAsync({ prompt: 'A cat' })
       console.log(result.publicUrl)  // 結果を直接使用
     }

     // ❌ 間違い: mutate() の結果を await
     const { generate } = useImageGeneration()
     const result = await generate({ prompt: 'A cat' })  // undefined
     ```

6. **components/** - UIコンポーネント
   - 再利用可能なUI部品
   - Presentationalコンポーネント
   - **例:** `Button.jsx`, `Card.jsx`, `UserCard.jsx`

7. **pages/** - ページコンポーネント
   - **コンテンツのみ**を返す（Layout, TopNavigation, 背景等は不要）
   - React Router の `<Outlet />` 経由で Layout.tsx 内にレンダリングされる
   - Containerコンポーネント（Hooksで状態管理）
   - **例:** `HomePage.jsx`, `ProfilePage.jsx`
   - **パターン:**
     ```javascript
     // ✅ 正しい: コンテンツのみを返す
     export function HomePage() {
       return (
         <div className="space-y-8">
           <h1>Welcome</h1>
           {/* コンテンツ */}
         </div>
       )
     }

     // ❌ 間違い: Layout要素を含める（Layout.tsxで自動提供される）
     export function HomePage() {
       return (
         <>
           <TopNavigation />  {/* 不要 */}
           <div className="min-h-screen bg-gradient...">  {/* 不要 */}
             <main className="max-w-7xl mx-auto px-8 pt-24">  {/* 不要 */}
               {/* コンテンツ */}
             </main>
           </div>
         </>
       )
     }
     ```

#### 実装例

**データフロー全体（React Query版）:**
```javascript
// hooks/useUserProfile.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserProfileRepository } from '../repositories'
import { UserProfile } from '../models'

export function useUserProfile(userId) {
  const queryClient = useQueryClient()

  // Query: プロフィール取得
  const query = useQuery({
    queryKey: ['userProfile', userId],
    queryFn: async () => {
      const { data, error } = await UserProfileRepository.findByUserId(userId)
      if (error) throw error
      return data ? UserProfile.fromDatabase(data) : null
    },
    enabled: !!userId,
  })

  // Mutation: プロフィール更新
  const updateMutation = useMutation({
    mutationFn: async (updates) => {
      const { data, error } = await UserProfileRepository.update(userId, updates)
      if (error) throw error
      return UserProfile.fromDatabase(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile', userId] })
    },
  })

  return {
    profile: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updateProfile: updateMutation.mutate,
  }
}

// pages/ProfilePage.jsx
function ProfilePage() {
  const { user } = useAuth()
  const { profile, isLoading, updateProfile } = useUserProfile(user?.id)

  if (isLoading) return <Skeleton />

  return <div>{profile.displayName}</div>
}
```

#### Component設計原則

Akatsukiでは、**Componentベースの設計**を徹底し、保守性と再利用性を最大化します。

**1. Component分類 (3つの役割)**

```
┌─────────────────────────────────────────────────┐
│ Pages (Container Component)                     │
│ - 画面全体の構成                                │
│ - Feature Componentの組み合わせ                  │
│ - 最小限のState管理                              │
└─────────────────────────────────────────────────┘
              ↓ 使用
┌─────────────────────────────────────────────────┐
│ Feature Components                              │
│ - ドメイン固有のビジネスロジック                 │
│ - Repository/Serviceとの連携                     │
│ - 複雑なState管理                                │
│ - 例: FileUpload, AuthGuard, ModelSelector      │
└─────────────────────────────────────────────────┘
              ↓ 使用
┌─────────────────────────────────────────────────┐
│ UI Components (Presentational Component)       │
│ - 見た目のみ（ロジックなし）                     │
│ - propsで完全に制御可能                          │
│ - 例: Button, Card, Input (shadcn/ui)           │
└─────────────────────────────────────────────────┘
```

**2. Pagesの責務（Container Component）**

Pagesは「画面の組み立て役」として振る舞います。

✅ **やるべきこと:**
- Feature Componentを組み合わせて画面を構成
- ページ固有のルーティングロジック
- グローバルStateの取得（Context経由）
- 最小限のローカルState（タブ切り替え等）

❌ **やってはいけないこと:**
- 複雑なビジネスロジックを直接記述
- Repository/Serviceを直接呼び出し（Feature Componentに委譲）
- 巨大なハンドラー関数を量産

**❌ 悪い例（Pages に全てのロジックを詰め込む）:**
- 複雑なState管理を全てPageに記述（useState を10個以上並べる）
- 50行以上のハンドラー関数を量産
- Repository/Serviceの直接呼び出しをPageに記述
- UIロジックとビジネスロジックが混在

**✅ 良い例（Feature Componentに分割）:**
```jsx
export function SomePage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <PageHeader />
      <LLMChatCard />              {/* Feature Component */}
      <ImageGenerationCard />      {/* Feature Component */}
      <PublicStorageCard />        {/* Feature Component */}
      <ExternalIntegrationsCard /> {/* Feature Component */}
    </div>
  )
}
```

**Note:**
- `HomePage (/)` - シンプルなWelcome画面（VibeCoding で自由に作り替え可能）
- `ExamplesPage (/examples)` - 全機能の実装例・動作確認用（参考資料）

**3. Feature Componentsの設計**

Feature Componentsは、特定のドメイン機能を持つ「スマートなComponent」です。

✅ **特徴:**
- Repository/Serviceとの連携
- 複雑なState管理（useState, useReducer）
- Custom Hooksの活用
- ドメインロジックのカプセル化

**実装パターン例:**

```jsx
// Feature Component: components/features/llm/LLMChatCard.jsx
export function LLMChatCard() {
  const { prompt, setPrompt, result, loading, sendMessage } = useLLMChat()

  return (
    <Card>
      <CardContent>
        <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <Button onClick={sendMessage} disabled={loading}>Send</Button>
        {result && <ChatResult result={result} />}
      </CardContent>
    </Card>
  )
}

// Custom Hook: hooks/useLLMChat.js
export function useLLMChat() {
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const sendMessage = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: chatError } = await AIService.chat(prompt)
      if (chatError) {
        setError(chatError)
        setResult(null)
      } else {
        setResult(data)
      }
    } finally {
      setLoading(false)
    }
  }

  return { prompt, setPrompt, result, error, loading, sendMessage }
}
```

**参考実装:** `src/pages/ExamplesPage.jsx` に実際の実装例があります。

**4. UI Components（Presentational Component）**

UI Componentsは「純粋な見た目のComponent」です。

✅ **原則:**
- ビジネスロジックを持たない
- propsで完全に制御可能
- Repository/Serviceを呼ばない
- State管理は最小限（開閉状態等のUI Stateのみ）

**参考実装:**
- `src/components/ui/` - shadcn/ui の UI Components（Button, Card, Input等）
- これらは既に実装済みで、そのまま使用できます

**5. Layout Components**

画面全体のレイアウトを管理するComponentです。

**例:** TopNavigation, Sidebar, Footer 等
- 実装が必要な場合は `src/components/layout/` に作成

**6. Custom Hooksの活用**

複雑なビジネスロジックはCustom Hooksに抽出します。

✅ **抽出すべきロジック:**
- Repository/Serviceの呼び出し
- 複雑なState管理
- 複数のComponentで再利用するロジック

**例:**
- `useLLMChat()` - LLMチャット機能
- `useImageGeneration()` - 画像生成機能
- `useFileUpload()` - ファイルアップロード機能
- `useAuth()` - 認証状態管理（実装済み）

**7. ディレクトリ移行ガイド**

既存のComponentを整理する際のガイドラインです。

```
現在の配置              → 推奨される配置
──────────────────────────────────────────────────
components/ui/         → components/ui/          (変更なし)
components/TopNavigation.jsx
                       → components/layout/TopNavigation.jsx
components/auth/       → components/features/auth/
components/ai/         → components/features/ai/
components/storage/    → components/features/storage/
```

#### ベストプラクティス

**Component設計:**

1. **1ファイル = 200行以内を目指す**
   - 超えたら分割を検討
   - Feature ComponentとCustom Hookに分ける

2. **Pagesは組み立てに専念**
   - Feature Componentの組み合わせのみ
   - ビジネスロジックは持たない

3. **Feature Componentはドメイン単位**
   - 1機能 = 1Feature Component
   - 例: LLMChat, ImageGeneration, FileUpload

4. **Custom Hooksで再利用性を高める**
   - 複数のFeature Componentで共通利用
   - テスト容易性の向上

5. **propsのバケツリレーを避ける**
   - 3階層以上のprops渡しはContext APIを検討
   - グローバルStateはContextに集約

#### Component分割の判断基準（The 200-Line Rule）

複雑化したComponentを適切なタイミングで分割することで、保守性を維持します。

**分割すべきタイミング:**

1. **200行を超えた** → Feature Component + Custom Hook に分割
2. **useState が5個以上** → Custom Hook に抽出
3. **同じロジックを2箇所で使った** → Custom Hook化
4. **ハンドラー関数が50行超え** → Service層 または Custom Hook へ

**分割不要なケース:**
- 初回実装時（まず動かす、後でリファクタ）
- 100行以下のシンプルなComponent
- 1回しか使わないロジック

**リファクタリング例:**

```jsx
// ❌ 悪い例: 300行のComponent、useState x8、複雑なハンドラー
function HeavyComponent() {
  const [state1, setState1] = useState()
  const [state2, setState2] = useState()
  // ... 8個のstate

  const handleComplexLogic = () => {
    // 50行の処理...
  }

  return (/* 200行のJSX */)
}

// ✅ 良い例: Custom Hookに分割
function useComplexLogic() {
  const [state1, setState1] = useState()
  const [state2, setState2] = useState()
  // ...

  const handleComplexLogic = () => {
    // 50行の処理...
  }

  return { state1, state2, handleComplexLogic }
}

function CleanComponent() {
  const logic = useComplexLogic()

  return (/* 50行のシンプルなJSX */)
}
```

**データアクセス:**

1. **lib/supabase.js は肥大化させない**
   - クライアント初期化のみに専念
   - テーブル操作は Repository へ
   - Edge Functions 呼び出しは Service へ

2. **Model は常に使う**
   - DBレコードを直接使わず、必ず Model 経由で変換
   - `fromDatabase()` と `toDatabase()` を必ず実装

3. **Repository はテーブル単位**
   - 1テーブル = 1Repository
   - 例: `profiles` テーブル → `UserProfileRepository`

4. **Service は機能単位**
   - Edge Functions のラッパー
   - 外部API連携

### 4.2. TypeScript

AkatsukiはTypeScriptを採用しています。一部既存のJSXファイルも実行可能になっています。

- 🔄 新規ファイルは全て `.tsx` / `.ts` で作成

#### 型定義の使い方

- 型定義はtypesにまとめて定義しています。`src/types/index.ts`
- 以下の例のように使用可能です。

**例： Edge Function呼び出し:**
```typescript
import type { EdgeFunctionResponse, AIChatResponse } from '@/types'

const { data, error }: EdgeFunctionResponse<AIChatResponse> =
  await EdgeFunctionService.invoke('ai-chat', { message: 'Hello' })

if (error) {
  console.error(error.message)  // TypeScriptが型チェック
  return
}

#### 主な型定義コンポーネント
* EdgeFunction 関連
* Async Job 関連

#### 参考資料

- 型定義一覧: `src/types/index.ts`
- 使用例とガイド: `src/types/README.md`
- テストコンポーネント: `/type-test` (開発サーバーでアクセス可能)

### 4.3. 認証アーキテクチャ (Authentication)

Akatsuki では、Supabase Auth を使用した公開/非公開ページ混在型の認証システムを標準実装しています。

#### 認証システム構成

```
src/
├── contexts/
│   └── AuthContext.jsx       # 認証状態管理（Context API）
├── components/
│   └── auth/
│       ├── AuthGuard.jsx     # Private ルート保護コンポーネント
│       ├── LoginForm.jsx     # ログインフォーム
│       └── SignupForm.jsx    # サインアップフォーム
├── pages/
│   ├── LoginPage.jsx         # ログインページ
│   ├── SignupPage.jsx        # サインアップページ
│   ├── AdminDashboard.jsx    # 管理画面（Private）
│   └── HomePage.jsx          # 公開ページ（Public）
└── App.jsx                   # ルーティング設定
```

#### ルーティングパターン

**Layout.tsx を使った階層化ルーティング:**

Akatsukiでは、`Layout.tsx` により全ページ共通のレイアウト（TopNavigation、背景、パディング）を自動提供します。

```javascript
// App.jsx
import { Layout } from './components/layout/Layout'
import { PrivateLayout } from './components/layout/PrivateLayout'

<BrowserRouter>
  <AuthProvider>
    <Routes>
      {/* Public Routes - Layout で自動的にメニュー・背景が提供される */}
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      {/* Private Routes - PrivateLayout で認証チェック + Layout */}
      <Route element={<PrivateLayout />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/character-generator" element={<CharacterGeneratorPage />} />
      </Route>
    </Routes>
  </AuthProvider>
</BrowserRouter>
```

**Layoutバリエーション:**
```javascript
// Layout.tsx - デフォルト（max-w-7xl）
<Route element={<Layout />}>
  <Route path="/dashboard" element={<DashboardPage />} />
</Route>

// NarrowLayout - 狭いコンテンツ用（max-w-4xl）
<Route element={<NarrowLayout />}>
  <Route path="/article" element={<ArticlePage />} />
</Route>

// FullWidthLayout - 全幅（w-full）
<Route element={<FullWidthLayout />}>
  <Route path="/canvas" element={<CanvasPage />} />
</Route>
```

**PrivateLayout の仕組み:**
```javascript
// PrivateLayout.tsx
export function PrivateLayout() {
  return (
    <AuthGuard>  {/* 認証チェック */}
      <Layout />   {/* 認証OKなら通常Layout */}
    </AuthGuard>
  )
}
```

#### 認証機能

**AuthContext が提供する機能:**
- `user` - 現在のログインユーザー情報
- `session` - Supabase セッション情報
- `loading` - 認証状態ローディング
- `signUp(email, password, metadata)` - Email/Password サインアップ
- `signIn(email, password)` - Email/Password ログイン
- `signInWithMagicLink(email)` - Magic Link ログイン
- `signInWithOAuth(provider)` - OAuth ログイン（Google, GitHub 等）
- `signOut()` - ログアウト
- `resetPassword(email)` - パスワードリセットメール送信
- `updatePassword(newPassword)` - パスワード更新

**OAuth ログイン:**
```javascript
// LoginForm.jsx に実装済み
<Button onClick={() => signInWithOAuth('google')}>
  Google でログイン
</Button>
<Button onClick={() => signInWithOAuth('github')}>
  GitHub でログイン
</Button>
```

**サポートされているプロバイダー:**
- Google, GitHub, GitLab, Bitbucket
- Azure, Facebook, Twitter, Discord
- Slack, Apple など

**OAuth 設定（Supabase Dashboard）:**
1. Authentication → Providers
2. プロバイダーを有効化
3. Client ID / Client Secret を設定

**パスワードリセットフロー:**
1. `/forgot-password` - メールアドレス入力 → リセットメール送信
2. `/reset-password` - 新パスワード入力（メールのリンクから）

**使用例:**
```javascript
import { useAuth } from '../contexts/AuthContext'

function MyComponent() {
  const { user, signIn, signOut } = useAuth()

  const handleLogin = async () => {
    const { error } = await signIn(email, password)
    if (error) console.error(error)
  }

  return (
    <div>
      {user ? (
        <button onClick={signOut}>ログアウト</button>
      ) : (
        <button onClick={handleLogin}>ログイン</button>
      )}
    </div>
  )
}
```

#### AuthGuard の動作

1. **ローディング中**: スピナーを表示（フラッシュ防止）
2. **未ログイン**: `/login` へリダイレクト
3. **ログイン済み**: 子コンポーネントを表示

```javascript
// 使用例
<Route
  path="/admin/*"
  element={
    <AuthGuard>
      <AdminLayout />
    </AuthGuard>
  }
/>
```

#### ベストプラクティス

1. **AuthProvider は App の最上位に配置**
   ```javascript
   <BrowserRouter>
     <AuthProvider>
       <Routes>...</Routes>
     </AuthProvider>
   </BrowserRouter>
   ```

2. **Public/Private を明確に分離**
   - Public: /, /login, /signup, /about など
   - Private: /admin/*, /dashboard/*, /settings/* など

3. **ログイン後のリダイレクト**
   ```javascript
   const { signIn } = useAuth()
   const navigate = useNavigate()

   const handleLogin = async () => {
     const { error } = await signIn(email, password)
     if (!error) navigate('/admin')
   }
   ```

4. **RLS（Row Level Security）と連携**
   - Supabase の RLS が有効な場合、認証済みユーザーのみアクセス可能
   - Repository での CRUD 操作は自動的に認証状態を使用

5. **Profile 自動作成（Database Trigger）**
   - ユーザー登録時に自動的に `profiles` レコードが作成される
   - `auth.users` への INSERT 後、Trigger が発火
   - metadata から `username`, `display_name` を取得（未指定時はメールアドレスのプレフィックス使用）
   - username の重複時は自動的に user_id を付与して一意性を確保

   **Trigger の仕組み:**
   1. SignupForm で metadata に `username`, `display_name` を指定
   2. `auth.users` にユーザー作成
   3. Trigger 発火 (`handle_new_user()`)
   4. `profiles` テーブルに自動作成（username 重複時は user_id を付与）

   **マイグレーション:** `20251029090845_add_profile_creation_trigger.sql`

6. **ロールベースアクセス制御（Role-Based Access Control）**
   - profiles テーブルに role カラムを追加
   - デフォルトロール: `user`
   - 利用可能なロール: `user`, `admin`, `moderator`

   **AuthContext でロール判定:**
   ```javascript
   const { profile, isAdmin, isModerator } = useAuth()

   // 管理者のみアクセス可能
   if (isAdmin) {
     // 管理者機能
   }

   // モデレーター以上でアクセス可能
   if (isModerator) {
     // モデレーター機能
   }

   // プロフィールから直接判定
   if (profile?.isAdmin()) {
     // 管理者機能
   }
   ```

   **ロール設定（サインアップ時）:**
   ```javascript
   // metadata で role を指定
   signUp(email, password, {
     username: 'admin_user',
     display_name: 'Admin User',
     role: 'admin'  // デフォルトは 'user'
   })
   ```

   **マイグレーション:**
   - `20251029093327_add_role_to_profiles.sql`
   - CHECK 制約で 'user', 'admin', 'moderator' のみ許可
   - Trigger が自動的に metadata から role を取得

## 5. 主要機能 (Key Features)

このテンプレートは、AI開発を加速するための基盤を標準搭載しています。

### 5.1. AIGen (AI Generation) 統合基盤

Akatsuki では、複数のAIプロバイダー（OpenAI, Anthropic, Gemini）を統一的に扱える基盤を標準搭載しています。

#### Frontend実装（実装済み）

**useAIGen フック（汎用AI操作）:**
```javascript
import { useAIGen } from '@/hooks/useAIGen'

function MyComponent() {
  const { chat, generateImage, loading, error } = useAIGen('openai')

  // チャット
  const response = await chat('こんにちは')

  // 画像生成（汎用）
  const image = await generateImage('猫の絵')
}
```

**useImageGeneration フック（画像生成特化）:**

**3つのモード（ユーザーの意図を表現、インフラ非依存）:**

| Mode | 説明 | パラメータ | サポートProvider |
|------|------|------------|------------------|
| **text-to-image** | テキストから画像生成 | prompt: 必須 | DALL-E 3, DALL-E 2, Gemini |
| **variation** | 既存画像の自動バリエーション | prompt: 不要<br>image_url: 必須 | DALL-E 2, Gemini |
| **edit** | 画像をプロンプトで編集 | prompt: 必須<br>image_url: 必須 | Gemini のみ |

**重要な設計思想:**
- ✅ **Mode = ユーザーの意図**（インフラ知識を漏洩させない）
- ✅ **Provider/Model = オプション**（デフォルト値で動作、特定Provider使用時のみ指定）
- ✅ **Storage 自動保存** - Public/Private を選択可能（デフォルト: public）
- ⚠️ **DALL-E 3 非サポート機能**: variation, edit（DALL-E 2を自動選択）
- ⚠️ **Gemini 非サポート機能**: なし（全モード対応）

```javascript
import { useImageGeneration } from '@/hooks/useImageGeneration'

function MyComponent() {
  const {
    generate,
    generateVariation,
    generateEdit,
    loading,
    error,
    result,
  } = useImageGeneration()

  // 1. Text-to-Image（通常生成）
  const handleTextToImage = async () => {
    const image = await generate({
      prompt: '可愛い猫が毛糸で遊んでいる',
      // provider: 'dalle' (オプション、デフォルトで動作)
      quality: 'hd',
      size: '1024x1024',
      style: 'vivid',
      storage: 'public',  // または 'private'
    })
    console.log(image.publicUrl) // 恒久的な公開URL
  }

  // 2. Variation（自動バリエーション生成、プロンプト不要）
  const handleVariation = async (existingImageUrl) => {
    const variation = await generateVariation(existingImageUrl, {
      // provider: 'dalle' (オプション、デフォルトで動作)
    })
  }

  // 3. Edit（画像をプロンプトで編集、Gemini のみ）
  const handleEdit = async (imageUrl) => {
    const edited = await generateEdit(
      imageUrl,
      'Add a wizard hat to the cat',  // 編集指示
      {
        // provider: 'gemini' (自動的に Gemini を使用)
      }
    )
  }

  return (
    <div>
      <button onClick={handleTextToImage} disabled={loading}>
        画像生成
      </button>
      {result && <img src={result.publicUrl} alt="Generated" />}
    </div>
  )
}
```

**Provider別機能対応表（参考情報）:**
| 機能 | DALL-E 3 | DALL-E 2 | Gemini 2.5 Flash |
|------|----------|----------|------------------|
| Text-to-Image | ✅ HD/Vivid | ✅ Standard | ✅ |
| Variation | ❌ | ✅ | ✅ |
| Edit | ❌ | ❌ | ✅ |
| サイズ | 1024² / 1792×1024 / 1024×1792 | 1024² / 512² / 256² | Gemini 依存 |

注: Provider の制約は Hook/Service が自動的に吸収します。Mode とパラメータのみを意識してください。

**ModelSelector コンポーネント:**
```javascript
import { ModelSelector } from '@/components/ai/ModelSelector'

function MyComponent() {
  const [modelId, setModelId] = useState(null)

  return (
    <ModelSelector
      value={modelId}
      onChange={setModelId}
      // Vision対応モデルのみ表示
      filters={{ supportsImageInput: true }}
    />
  )
}
```

**実装済み機能:**
- `useAIGen` - プロバイダー切り替え可能なAIフック
  - `chat()` - チャット補完
  - `chatStream()` - ストリーミングチャット
  - `generateImage()` - 画像生成
  - `editImage()` - 画像編集
  - `embed()` - 埋め込み生成
- `AIService` - プロバイダー統合層（OpenAI, Anthropic, Gemini対応）
- `AIModel` - モデル定義（DB管理）
- `AIModelRepository` - モデル情報取得（Supabase）
- `ModelSelector` - UIモデル選択コンポーネント（shadcn/ui）

**Supabase Edge Functions:**
- `ai-chat` - AIプロバイダー統一チャットエンドポイント（マルチプロバイダー対応、クォータ管理）
- `generate-image` - AI画像生成エンドポイント（DALL-E, Gemini対応）

#### Akatsuki統一ハンドラーパターン

Supabase Edge Functions で共通的に使用する統一ハンドラーを提供しています。

**実装場所:**
- `supabase/functions/_shared/handler.ts` - 統一ハンドラー本体
- `supabase/functions/_shared/api_types.ts` - レスポンス型定義
- `supabase/functions/_shared/repository.ts` - BaseRepository
- `supabase/functions/_shared/repositories/` - Repository実装

**2種類のハンドラー:**

1. **`createAkatsukiHandler`** - ユーザー向けAPI（認証必須）
   ```typescript
   import { createAkatsukiHandler } from '../_shared/handler.ts'

   Deno.serve(async (req) => {
     return createAkatsukiHandler<Input, Output>(req, {
       inputSchema: InputSchema,  // Zodスキーマ
       requireAuth: true,

       logic: async ({ input, userClient, adminClient, repos }) => {
         // userClient: RLS有効（ユーザー自身のデータのみ）
         const { data: { user } } = await userClient.auth.getUser()

         // adminClient経由のRepos: RLSバイパス（Usage等の改ざん防止）
         await repos.userQuota.incrementUsage(quotaId)

         return { message: 'Success' }
       }
     })
   })
   ```

2. **`createSystemHandler`** - システム内部API（Webhook等、認証不要）
   ```typescript
   import { createSystemHandler } from '../_shared/handler.ts'

   Deno.serve(async (req) => {
     return createSystemHandler<Input, Output>(req, {
       inputSchema: InputSchema,

       logic: async ({ input, adminClient, repos }) => {
         // adminClient: RLSバイパス（全データアクセス可能）
         await repos.userQuota.create({ ... })

         return { received: true }
       }
     })
   })
   ```

**設計の意図:**
- **認証**: ハンドラーレベルで自動チェック
- **クライアント分離**:
  - `userClient` (RLS有効) - ユーザー自身のデータのみ操作
  - `adminClient` (RLSバイパス) - Usage等の改ざん防止
- **統一レスポンス**: `AkatsukiResponse<T>` 形式で統一
- **エラーハンドリング**: 統一ハンドラーで自動処理（CORS、バリデーション等）

**利用例:**
- `supabase/functions/ai-chat/index.ts` - LLM APIエンドポイント
- `supabase/functions/generate-image/index.ts` - 画像生成エンドポイント

#### Backend実装（Axum）

**エンドポイント雛形:**
  - `packages/app-backend/src/main.rs` に以下の3つのエンドポイント雛形を実装済み：
    1. **画像生成 (Text-to-Image):** `/api/aigen/text-to-image`
    2. **Img2Img (Image-to-Image):** `/api/aigen/image-to-image`
    3. **Agent実行 (LLMタスク):** `/api/aigen/agent-execute`
  - Supabase (PostgreSQL) 連携基盤（`src/db.rs`）

### 5.2. Web検索統合 (Web Search Integration)

Akatsuki では、AI統合型Web検索機能を標準搭載しています。2つのプロバイダーから選択可能で、デフォルトはコスパ最高のGemini Google検索です。

#### 対応プロバイダー

| Provider | 特徴 | 料金 | おすすめ用途 |
|----------|------|------|-------------|
| **Gemini Google検索** (デフォルト) | Google検索統合、自動判断、引用情報 | Gemini料金のみ（検索追加料金なし） | 汎用Web検索、最新情報取得 |
| **Tavily AI Search** | AI特化、構造化データ | $5/月（1000req） | 専門的な検索、複数LLM利用時 |

**推奨**: Gemini利用時はGoogle検索が圧倒的にコスパ良い（追加料金なし）

#### Frontend実装

**WebSearchService（基本）:**
```javascript
import { WebSearchService } from '@/services/WebSearchService'

// Gemini Google検索（デフォルト）
const { data, error } = await WebSearchService.search('AIアート 最新動向')
console.log(data.answer)        // AIの回答
console.log(data.results)       // 引用元URL
console.log(data.searchQueries) // 実行された検索クエリ

// Tavily AI Search（オプション）
const { data, error } = await WebSearchService.search('React hooks', {
  provider: 'tavily',
  numResults: 5
})
console.log(data.answer)   // Tavilyの要約
console.log(data.results)  // 検索結果配列
```

**useWebSearch フック（React Query）:**
```javascript
import { useWebSearch } from '@/hooks/useWebSearch'

function MyComponent() {
  const { searchAsync, isPending, data } = useWebSearch()

  const handleSearch = async () => {
    const result = await searchAsync({
      query: '2024年のAI画像生成の最新動向を教えて',
      provider: 'gemini',  // または 'tavily'
      numResults: 10
    })
    console.log(result.answer)        // AIの回答
    console.log(result.sources)       // 情報源
    console.log(result.searchQueries) // 検索クエリ（Geminiのみ）
  }

  return (
    <div>
      <button onClick={handleSearch} disabled={isPending}>
        Search
      </button>
      {data && (
        <div>
          <p>{data.answer}</p>
          {data.results.map((r, i) => (
            <a key={i} href={r.url}>{r.title}</a>
          ))}
        </div>
      )}
    </div>
  )
}
```

**WebSearchCard コンポーネント（実装済み）:**
```javascript
import { WebSearchCard } from '@/components/features/search/WebSearchCard'

function MyPage() {
  return <WebSearchCard />
  // プロバイダー切り替えUI付き
  // Gemini/Tavily をタブで選択可能
}
```

#### Supabase Edge Function

**実装場所:**
- `supabase/functions/web-search/index.ts`

**パラメータ:**
```typescript
{
  query: string,              // 検索クエリ
  num_results?: number,       // 結果数（1-20、デフォルト: 10）
  provider?: 'gemini' | 'tavily'  // プロバイダー（デフォルト: 'gemini'）
}
```

**レスポンス:**
```typescript
{
  query: string,
  answer: string,             // AI生成の要約/回答
  results: Array<{
    title: string,
    url: string,
    content: string,
    score?: number            // Tavilyのみ
  }>,
  num_results: number,
  provider: 'gemini' | 'tavily',
  searchQueries?: string[]    // Geminiのみ（実行された検索クエリ）
}
```

#### 実装済み機能

- `WebSearchService` - Web検索統一API（Gemini/Tavily対応）
- `useWebSearch` - React Query統合フック
- `WebSearchCard` - プロバイダー切り替えUI付きコンポーネント
- `web-search` Edge Function - マルチプロバイダー検索エンドポイント

### 5.3. 外部連携統合 (External Integrations)

Akatsuki では、よく使う外部サービス連携の雛形を標準搭載しています。

#### Slack通知

**実装場所:**
- `supabase/functions/slack-notify/index.ts`

**用途例:**
- エラー通知
- システムアラート
- ステータス更新通知
- デプロイ完了通知

**使用例:**
```typescript
// 内部システムから呼び出し（認証不要）
await fetch('https://your-project.supabase.co/functions/v1/slack-notify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'デプロイが完了しました！',
    channel: '#notifications',
    attachments: [{
      color: 'good',
      title: 'Production Deploy',
      fields: [
        { title: 'Version', value: 'v1.2.3', short: true },
        { title: 'Status', value: '✅ Success', short: true },
      ]
    }]
  })
})
```

**環境変数:**
- `SLACK_WEBHOOK_URL` - Slack Incoming Webhook URL

#### Email送信

**実装場所:**
- `supabase/functions/send-email/index.ts`

**用途例:**
- パスワードリセットメール
- ウェルカムメール
- 通知メール
- レポート送信

**使用例:**
```typescript
// 内部システムから呼び出し（認証不要）
await fetch('https://your-project.supabase.co/functions/v1/send-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'user@example.com',
    subject: 'Welcome to Akatsuki!',
    html: '<h1>Welcome!</h1><p>Thanks for signing up.</p>',
    metadata: {
      template: 'welcome',
      user_id: 'user-123'
    }
  })
})
```

**環境変数:**
- `RESEND_API_KEY` - Resend API Key
- `EMAIL_FROM` - デフォルト送信元メールアドレス

**使用サービス:**
- [Resend](https://resend.com/) - シンプルで開発者フレンドリーなメール送信サービス

#### 拡張方法

新しい外部連携を追加する場合:
1. `supabase/functions/` に新しいFunction作成（例: `discord-notify`）
2. `createSystemHandler` を使用してハンドラー実装
3. 環境変数に Webhook URL や API Key を設定
4. デプロイ: `npm run supabase:function:deploy`

### 5.4. shadcn/ui コンポーネント (将来の拡張)

* `packages/ui-components/` に `shadcn/ui` の主要コンポーネントを導入予定
* 開発者は即座にコンポーネントを利用・カスタマイズ可能

## 6. 開発ルール (Rules)

ここが最も重要です。「安定性」と「スピード」を維持するため、以下のルールを必ず遵守してください。

### 6.1. ワークフロー (Workflow)

#### DB運用（マイグレーション）
* **`Supabase-dev` 環境を必ず作成し、チームで共有します。**
* **ローカルでのDB開発は原則禁止**し、`Supabase-dev` へ直接変更を加えるフローを採用します。
* 詳細なセットアップ手順は `README.md` の「4. Supabase-dev プロジェクトのセットアップ」を参照してください。

**マイグレーション手順:**
```bash
# 1. 新規マイグレーション作成
npm run supabase:migration:new create_users_table

# 2. supabase/migrations/ 配下にSQLファイルが生成される

# 3. SQLを記述後、Supabaseに適用
npm run supabase:push
```

#### Edge Functions運用
* **Supabase Edge Functions** はサーバーレス関数として、API処理や外部連携を実装します。
* Frontend の `services/` レイヤーから呼び出します。

**Edge Functions手順:**
```bash
# 1. 新規Function作成
npm run supabase:function:new my-function

# 2. supabase/functions/my-function/index.ts にコード実装

# 3. Supabaseにデプロイ
npm run supabase:function:deploy my-function

# 4. すべてのFunctionsをデプロイ
npm run supabase:function:deploy
```

**Frontend からの呼び出し:**
```javascript
// services/EdgeFunctionService.js に個別関数を追加
export async function callMyFunction(payload) {
  return EdgeFunctionService.invoke('my-function', payload)
}

// コンポーネントから使用
import { callMyFunction } from './services'
const result = await callMyFunction({ data: '...' })
```

#### 開発用ダミーデータ生成

動作確認用のダミーデータ（プロフィール、画像、投稿等）は、**`workspace/` に使い捨てスクリプト**を作成して生成します。

**基本方針:**
- Seed (seed.sql) = 本当の初期データ（マスターデータ、固定データ）
- workspace/ スクリプト = 開発用の一時的なダミーデータ

**実装例:**

```javascript
// workspace/generate-dummy-data.js

// ⚠️ Import Path の書き方（相対パス）
// workspace/ からプロジェクトルートは `../` で参照
import { supabase } from '../packages/app-frontend/src/lib/supabase.js'
import { ImageGenerationService } from '../packages/app-frontend/src/services/ImageGenerationService.js'

async function generateDummyProfiles() {
  console.log('Generating dummy profiles with avatars...')

  for (let i = 0; i < 10; i++) {
    try {
      // 1. 画像生成（Storage + file_metadata に自動保存）
      const { data: avatar, error: genError } = await ImageGenerationService.generate({
        prompt: `Professional headshot of person ${i + 1}, studio lighting, neutral background`,
        quality: 'standard',
      })

      if (genError) {
        console.error(`✗ Failed to generate avatar: ${genError.message}`)
        continue
      }

      console.log(`✓ Generated avatar: ${avatar.id}`)

      // 2. profiles テーブルに直接INSERT
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          user_id: `dummy-user-${i + 1}`,
          username: `dummy${i + 1}`,
          display_name: `Dummy User ${i + 1}`,
          avatar_file_id: avatar.id,  // ← file_metadata の id
          bio: `This is a dummy profile for testing.`,
        })
        .select()
        .single()

      if (error) throw error

      console.log(`✓ Created profile: dummy${i + 1}`)

    } catch (error) {
      console.error(`✗ Failed to create dummy${i + 1}:`, error.message)
    }
  }

  console.log('\n✨ Done! Created 10 dummy profiles.')
}

// 実行
generateDummyProfiles()
```

**実行方法:**

```bash
# workspace/ ディレクトリに移動
cd workspace

# スクリプト実行
node generate-dummy-data.js
```

**ポイント:**
- **import path は相対パス** - `../packages/app-frontend/src/...`
- **ImageGenerationService を活用** - Edge Function経由で画像生成
- **file_id を取得** - Storage + file_metadata に自動保存される
- **Supabase Client で直接INSERT** - 既存のRepositoryを使わず自由に
- **workspace/ は Git管理外** - 使い捨てスクリプトを自由に書ける

**応用例:**
- プロジェクトデータ生成: `supabase.from('projects').insert({ ... })`
- 投稿データ生成: `supabase.from('posts').insert({ ... })`
- 画像生成と紐付け: `ImageGenerationService.generate()` → `file_id` 取得

**削除方法:**
- `supabase.from('profiles').delete().like('user_id', 'dummy-user-%')`
- 関連データも同様に削除

#### ローカル専用領域 (`workspace/`)
* ルートの `workspace/` ディレクトリは **`.gitignore` されています**。
* 個人のメモ、下書き、ローカル環境変数（`.env`）など、リポジトリにコミットしてはいけないファイル置き場として使用してください。
* 用途例：
  - 個人的な実験コード
  - 外部ライブラリの調査用クローン（読むだけ）
  - チーム外部の機密情報

### 6.2. 環境変数管理

環境変数は以下の場所に配置します：

| 対象 | 配置場所 | Git管理 | サンプル |
| :--- | :--- | :--- | :--- |
| **Frontend** | `packages/app-frontend/.env` | ❌ Ignore | `.env.example` あり |
| **Backend** | `packages/app-backend/.env` | ❌ Ignore | `.env.example` あり |
| **個人用** | `workspace/.env` | ❌ Ignore | - |

**重要:** `.env` ファイルは絶対にコミットしないでください。`.env.example` を元に各自作成します。

### 6.3. バージョン管理 (Version Control)

開発環境の差異（「私の環境では動かない」）を防ぐため、以下の3点をルートに配置し、バージョンを統一します。

1. **`.tool-versions`** (asdf, mise ユーザー用)
2. **`.nvmrc`** (nvm ユーザー用)
3. **`package.json` の `engines` フィールド** (npm/pnpm 実行時のガードレール)

**開発開始時は必ずバージョン管理ツールでインストール：**
```bash
# nvmの場合
nvm use

# asdf/miseの場合
asdf install  # または mise install
```

### 6.4. ドキュメンテーション・ポリシー (Documentation)

情報は「コミットするもの」「してはいけないもの」に明確に分離します。

| ファイル/ディレクトリ | 役割（なにを置くか） | Git管理 |
| :--- | :--- | :--- |
| **`README.md`** | プロジェクト概要・最速起動（Quick Start） | ⭕️ Commit |
| **`AGENT.md`** | **(このファイル)** 設計思想・アーキテクチャ・ルール | ⭕️ Commit |
| **`issue.md`** | プロジェクトのマスタープラン | ⭕️ Commit |
| **`docs/guide/`** | **【必須】** 再利用可能な「手順書」 (セットアップ, デプロイ等) | ⭕️ Commit |
| **`docs/`**(その他) | **【フリースタイル】** 設計メモ、ADR、議事録など | ⭕️ Commit |
| **`workspace/`** | **【厳禁】** 個人の作業場・下書き | ❌ **Ignore** |

**ルール:**
- チームで共有すべき情報は必ず `docs/` 配下にコミット
- 個人的なメモや実験は `workspace/` に配置
- 環境変数やシークレットは絶対にコミットしない

### 6.4. VibeCoding実践ガイド

VibeCodingで新機能を実装する際の実践的なガイドです。

#### 6.4.1. QuickStart Checklist（実装開始前の1分確認）

新機能実装時は、以下の順序で進めると最速です。

```
□ Step 1: 要件を整理
   → workspace/[feature-name]-design.md に下書き
   → ユーザーのやりたいこと
   

□ Step 2: テンプレート参考（自由に設計）
   → 8.9を見て、近いパターンを把握
   → 要件に合わせて自由にカスタマイズ（そのまま適用しない）
   → ExamplePage/AdminPageで実装パターンを調査する

□ Step 3: 設計整理
   → 画面数・ルーティング（3-5画面推奨）
   → DB設計（Migration + RLS）
   → アーキテクチャ層（Model → Repository → Service → Hook → Component → Page）

□ Step 4: TodoWrite でタスク管理開始
   → Phase分割は内部管理、ユーザーへの中間報告は不要

□ Step 5: 設計をもとに実装
   → 詰まったら報告、それ以外は進める

□ Step 6: 動作確認
   → workspace/ でダミーデータ生成 → 画面確認

□ Step 7: 振り返り（完了後）
   → docs/ に設計ドキュメント整理
```

**参照セクション:**
- DB設計 → 6.1（マイグレーション）
- Component設計 → 4.1（アーキテクチャパターン）
- テンプレート → 8.9（VibeCoding Design Templates）
- トラブル対応 → 9.2（VibeCoding中のよくあるトラブル）

---

#### 6.4.2. 実装の進め方（基本姿勢）

**VibeCodingの本質: スピード重視、要件を動かすことを最優先**

設計・方針が固まったら、AIはそれに従って実装を進めます。

**実装時のルール:**

1. **Phase分けは内部管理でOK**
   - TodoWriteツールでPhaseを管理
   - ユーザーへの中間報告は不要

2. **相談が必要な時のみ停止**
   - 技術的に詰まった時
   - セキュリティなど重要な設計判断が必要な時
   - ユーザーが明示的に「相談しよう」「設計をしよう」などと言った時
   - それ以外は基本的に実装を進める

3. **品質はAGENT.mdのルールとExampleで担保**
   - Repository/Modelパターン徹底
   - 統一ハンドラー（createAkatsukiHandler）使用
   - RLS設計を最初から考慮
   - ExamplePageや初期実装を必ず調査

**✅ 良い例:**
```
ユーザー: 「キャラクター作成アプリ作ろう」
AI:
  1. 要件整理（workspace/に下書き）
  2. テンプレート参考（8.9を見て、近いパターンを把握）
  3. 自由に設計（要件に合わせてカスタマイズ）
  4. TodoWrite でタスク作成
  5. 一気に実装（Migration → Model → Repository → Component → Page）
  6. 動作確認（workspace/でダミーデータ生成）
  7. 完成報告

（Phase 1-7を内部的に進める、詰まらなければ報告不要）

※ テンプレートは「参考」であり、そのまま適用するものではない
※ 要件に応じて自由にカスタマイズして設計する
```

**❌ NG例:**
```
AI: 「Phase 1が完了しました。次に進んで良いですか？」
AI: 「Migrationを作りました。確認してください。」
AI: 「次はRepositoryを作りますが、よろしいですか？」
→ これらは不要。一気に進める。
```

---

#### 6.4.3. 設計ドキュメントテンプレート

**設計整理は必須です**

新機能を実装する前に、以下の項目を `workspace/[feature-name]-design.md` に書き出します。

```markdown
# [機能名] - 設計ドキュメント

## 1. ユーザーの本当のニーズ（3行で）
【WHY: なぜこれが必要か？】
- ユーザーが解決したい課題・達成したい目標
- 例: 「友達と一緒に遊べる、可愛いキャラを作りたい」

【WHO: 誰が使うか？】
- ターゲットユーザー像
- 例: 「10-20代の女性、プリクラ世代」

【WHAT: 何を提供するか？】
- 体験として提供する価値
- 例: 「自分だけのキャラを作って、SNSでシェアできる楽しさ」

## 2. ユースケース展開
【メインフロー（ハッピーパス）】
1. ユーザーがアプリを開く
2. テンプレートから好みのスタイルを選ぶ（3-5種類）
3. パーツをカスタマイズ（髪型、目、服など）
4. プレビューで確認しながら微調整
5. 完成したキャラを保存・シェア

【サブフロー】
- 過去に作ったキャラを見返す（ギャラリー）
- 友達のキャラを見る（ソーシャル機能）
- 作り直す（編集機能）

【エッジケース】
- 初回訪問時のチュートリアル
- ログインせずに試す（ゲストモード）
- 保存数制限（無料 vs 有料）

## 3. 画面構成（ユーザー体験重視）
【ルーティング】
HomePage (/) → TemplateSelectPage (/create/template) → CustomizePage (/create/customize) → GalleryPage (/gallery)

【各画面の体験設計】
- HomePage: ワクワク感を出す（過去作品のカルーセル、CTA）
- TemplateSelect: 視覚的に選びやすい（大きなサムネイル）
- Customize: リアルタイムプレビュー、ステップ式UI
- Gallery: グリッド表示、フィルター機能

【ASCII WireFrame（例: CustomizePage）】
```
┌─────────────────────────────────────┐
│  [← 戻る]  ステップ 2/3  [次へ →]   │
├─────────────────────────────────────┤
│                                     │
│   ┌─────────┐   ┌───────────────┐  │
│   │         │   │  パーツ選択    │  │
│   │ Preview │   │  ○ 髪型       │  │
│   │         │   │  ○ 目         │  │
│   │  キャラ │   │  ○ 服         │  │
│   │         │   │  [カラー選択] │  │
│   └─────────┘   └───────────────┘  │
│                                     │
│   [リセット]         [保存して次へ] │
└─────────────────────────────────────┘
```

## 4. DB設計
- テーブル定義（SQL）
- RLS Policy設計（必須）

## 5. 使用するAkatsuki機能
- 実装済み: AI、Storage、Database等（ExamplePage/AdminPageを参考）
- 既存のEdge Functions
- 新規作成が必要な機能

## 6. アーキテクチャ層
- Models: XXX.js（新規/実装済み）
- Repositories: XXXRepository.js（新規/実装済み）
- Services: XXXService.js（新規/実装済み）
- Hooks: useXXX.js（新規/実装済み）
- Components: features/xxx/（新規）

## 7. 実装ステップ
□ Phase 1: Migration作成
□ Phase 2: Model/Repository作成
□ Phase 3: Service/Hook作成
□ Phase 4: Feature Component作成
□ Phase 5: Page作成、Routing設定
□ Phase 6: 動作確認（ダミーデータ生成）

## 8. 重要な設計判断
- なぜこの設計にしたか（簡潔に）
- セキュリティ考慮事項
```

**ワークフロー:**

1. **下書き作成**: `workspace/[feature-name]-design.md` にファイル保存
2. **テンプレート確認**: 8.9のテンプレートが使えるか判断
3. **ソース・Example調査して実装計画**: ExamplePage/AdminPage、ソースコードのJSDocなどを調べてデザインファイルを更新
4. **実装開始**: 設計を見ながらVibeCoding
5. **完了後**: 実装中の変更なども整理して `docs/design/` にコミット

**ポイント:**
- ✅ **最小限の整理で開始** - 機能的な完璧を求めない。見栄えが良く動くものを
- ✅ **テンプレート活用** - よくあるパターンは8.9参照
- ✅ **Example活用** - 豊富なExampleがあるので参照して車輪の再発明やハレーションを避ける
- ✅ **RLS設計を最初から** - 後付けは不整合の元
- ✅ **workspace → docs** - 下書き→確定版の流れ

---

#### 6.4.4. よくある質問（FAQ）

**Q1: テンプレートはどう使えば良い？**

A: テンプレートは「そのまま適用」するものではなく、「参考」として活用します。
   - セクション8.9「VibeCoding Design Templates」を見て、近いパターンを把握
   - 要件に応じて自由にカスタマイズして設計
   - Template 1（AI画像生成）、Template 2（LLMチャット）、Template 3（ファイル管理）、Template 4（ダッシュボード）
   - VibeCodingはテンプレートエンジンではなく、自由度の高い設計が本質

**Q2: 実装中に詰まったら？**

A: セクション9.2「VibeCoding中のよくあるトラブル」を参照してください。
   - Edge Function 500エラー
   - RLSでデータ取得できない
   - Repository/Modelで型エラー
   - など、6つのケースと解決方法を記載

**Q3: Component分割のタイミングは？**

A: セクション4.1「Component分割の判断基準（The 200-Line Rule）」を参照してください。
   - 200行を超えたら分割
   - useState が5個以上で分割
   - ハンドラー関数が50行超えで分割

**Q4: workspace/ に何を置けば良い？**

A: 以下のものを自由に配置できます（Git管理外）：
   - 設計ドキュメントの下書き（`[feature-name]-design.md`）
   - ダミーデータ生成スクリプト（`generate-dummy-data.js`）
   - 個人的なメモ、実験コード
   - 環境変数（`.env`）

**Q5: ユーザーに確認が必要なタイミングは？**

A: 以下の場合のみ停止して確認：
   - 技術的に詰まった時
   - セキュリティなど重要な設計判断が必要な時
   - ユーザーが明示的に「相談しよう」「設計をしよう」などと言った時
   - それ以外は一気に進める

### 6.5. ライブラリ (Lib) 管理ポリシー

依存関係のクリーンさを保ちます。

#### 1. 内部ライブラリ (Monorepo Internal)

* **対象:** このプロジェクト専用の共通コード（将来実装予定の `ui-components`, `aigen-hooks` など）。
* **場所:** `packages/` ディレクトリ配下。（Git管理対象）
* **参照:** `workspace:*` によるローカル参照を**推奨**します。これによりAppとLibの同時開発が可能です。

**例 (package.json):**
```json
{
  "dependencies": {
    "ui-components": "workspace:*",
    "aigen-hooks": "workspace:*"
  }
}
```

#### 2. 外部ライブラリ (Monorepo External)

* **対象:** 個人OSSなど、私たちが管理するが、このリポジトリの**外部**にあるもの。
* **参照:** `npm link` や `path:` 指定による**ローカルパス参照は原則禁止**します。
* **修正:** 修正が必要な場合、**元の（外部）リポジトリ側をクリーンに修正・Publish**し、`package.json`のバージョンを更新して対応します。

**❌ 禁止例:**
```json
{
  "dependencies": {
    "llm-toolkit": "file:../../llm-toolkit"  // NG!
  }
}
```

**✅ 推奨例:**
```json
{
  "dependencies": {
    "llm-toolkit": "^1.2.3"  // OK: 公開バージョン指定
  }
}
```

#### 3. `workspace/` とコード参照

* 外部ライブラリのコードを「読むため」に `workspace/` へ `git clone` するのは、個人の自由です。（`workspace/` はコミットされないため）
* ただし、それらのコードに**依存関係としてリンクすることは厳禁**です。

### 6.6. Gitコミットポリシー

* **コミットメッセージ:** 簡潔かつ明確に（何を変更したか）
* **`.gitignore`:** 以下は必ず除外されています
  - 環境変数ファイル (`.env`, `.env.local`, `.env.*.local`)
  - ビルド成果物 (`target/`, `dist/`, `build/`)
  - 個人作業場 (`workspace/`)
  - IDE設定、OS固有ファイル

---

## 7. 開発コマンド一覧

プロジェクトルートから実行できる主要コマンド：

### Frontend
```bash
npm run dev:frontend      # 開発サーバー起動
npm run build:frontend    # プロダクションビルド
npm run preview:frontend  # ビルド結果のプレビュー
```

### Backend
```bash
npm run dev:backend       # Shuttle ローカル開発サーバー起動
npm run check:backend     # コンパイルチェック
npm run build:backend     # リリースビルド
npm run test:backend      # テスト実行
npm run deploy:backend    # Shuttleへデプロイ
```

### Supabase
```bash
# マイグレーション
npm run supabase:link             # Supabaseプロジェクトをリンク
npm run supabase:migration:new    # 新規マイグレーション作成
npm run supabase:push             # マイグレーション適用

# Edge Functions
npm run supabase:function:new     # 新規Function作成
npm run supabase:function:deploy  # Functionデプロイ
```

## 8. UI実装の標準設計パターン

### VibeCoding デザイン原則

Akatsukiでは、**見栄えの良さ**と**使いやすさ**を重視した「リッチなUI」を標準とします。

#### デザインスタイル

Akatsukiは以下のデザインスタイルを採用しています：

1. **Glassmorphism（グラスモーフィズム）**
   - 半透明の背景 (`bg-white/80`, `bg-black/60`)
   - backdrop-blur効果 (`backdrop-blur-md`, `backdrop-blur-lg`)
   - 柔らかい影 (`shadow-lg`, `shadow-xl`)

2. **Gradient Design（グラデーションデザイン）**
   - 背景・ボタン・テキストにグラデーション多用
   - 華やかで印象的なビジュアル
   - `bg-gradient-to-r`, `bg-gradient-to-br`

3. **Soft UI（ソフトUI）**
   - 丸みのある要素 (`rounded-xl`, `rounded-3xl`)
   - 柔らかい印象
   - 余白をたっぷり使用

**Akatsuki Design Language: "Vibrant Soft UI"**
- 華やかさと柔らかさを両立
- AIアプリに最適な親しみやすいデザイン

#### カラーテーマバリエーション

アプリのジャンルに応じて、色味を選択できます。

**1. デフォルト（AIアプリ向け）- ピンク/パープル/ブルー**
```css
/* 背景 */
bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100

/* テキストグラデーション */
bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-transparent bg-clip-text

/* ボタン */
bg-gradient-to-r from-pink-500 to-purple-600

/* アクセントカラー */
border-pink-300, border-purple-300, text-purple-600
```

**2. ビジネス/企業向け - ダーク/ブルートーン**
```css
/* 背景 */
bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800
bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100  /* ライトモード */

/* テキストグラデーション */
bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 text-transparent bg-clip-text

/* ボタン */
bg-gradient-to-r from-blue-600 to-cyan-600

/* アクセントカラー */
border-blue-400, border-cyan-400, text-blue-600
```

**3. ヘルスケア/ウェルネス - グリーン/ミント**
```css
/* 背景 */
bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50

/* テキストグラデーション */
bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-transparent bg-clip-text

/* ボタン */
bg-gradient-to-r from-emerald-500 to-teal-600

/* アクセントカラー */
border-emerald-300, border-teal-300, text-emerald-600
```

**4. エンタメ/クリエイティブ - オレンジ/イエロー**
```css
/* 背景 */
bg-gradient-to-br from-orange-100 via-yellow-100 to-pink-100

/* テキストグラデーション */
bg-gradient-to-r from-orange-500 via-yellow-500 to-pink-500 text-transparent bg-clip-text

/* ボタン */
bg-gradient-to-r from-orange-500 to-pink-600

/* アクセントカラー */
border-orange-300, border-yellow-300, text-orange-600
```

**5. Eコマース/ショッピング - パープル/ピンク**
```css
/* 背景 */
bg-gradient-to-br from-purple-100 via-pink-100 to-rose-100

/* テキストグラデーション */
bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 text-transparent bg-clip-text

/* ボタン */
bg-gradient-to-r from-purple-500 to-pink-600

/* アクセントカラー */
border-purple-300, border-pink-300, text-purple-600
```

**6. ダークモード対応**
```css
/* 背景（ダーク） */
bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900

/* テキストグラデーション（ダーク） */
bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 text-transparent bg-clip-text

/* カード（ダーク） */
bg-slate-800/50 backdrop-blur-lg border border-slate-700

/* ボタン（ダーク） */
bg-gradient-to-r from-pink-600 to-purple-700
```

**使い分けガイド:**
- プリクラ/AI画像生成 → デフォルト（ピンク/パープル/ブルー）
- ビジネスダッシュボード → ビジネス向け（ダーク/ブルー）
- ヘルスケアアプリ → グリーン/ミント
- 音楽/動画アプリ → オレンジ/イエロー
- ECサイト → パープル/ピンク

#### ビジュアル重視の原則

✅ **やるべきこと:**
- **画像を積極的に使う** - プレースホルダー画像、生成画像、アイコン画像
- **アイコンを多用** - lucide-react で視覚的にわかりやすく
- **グラデーションで華やかに** - 背景、ボタン、カードに適用
- **丸みのあるデザイン** - `rounded-lg`, `rounded-xl`, `rounded-3xl`
- **余白をたっぷり** - `space-y-6`, `gap-4` などで詰め込まない
- **CTAボタンは大きく** - `size="lg"` または `size="xl"`、目立つ配色

❌ **避けるべきこと:**
- 白黒のシンプルすぎるUI
- テキストだけの羅列
- 小さくて目立たないボタン
- 絵文字の過度な使用（アイコン優先）

#### 必須要件
- **画面数:** 最低3画面以上
- **ナビゲーション:** トップナビゲーションバー必須（複雑なアプリは左ペインメニューも検討）
- **アイコン:** lucide-reactのアイコン優先使用、絵文字は装飾のみ
- **リッチUI:** shadcn/uiコンポーネント必須使用
- **デザイン:** グラデーション、丸みのあるカード
- **CTAボタン:** メインアクション（生成、保存など）は大きく目立たせる（size="lg" or "xl"）
- **レスポンシブ:** モバイル・タブレット・デスクトップ対応（Tailwindのブレークポイント活用）

### 推奨デザインパターン集

VibeCodingでよく使う実装パターンです。

#### 主要パターン一覧

**1. Hero Section（ヒーローセクション）**
- 用途: トップページの第一印象
- 重要クラス: `min-h-screen`, `bg-gradient-to-br`, `text-6xl`, `bg-clip-text`, `Button variant="gradient"`

**2. Feature Cards（機能カード）**
- 用途: 機能紹介、メニュー選択
- 重要クラス: `grid md:grid-cols-3`, `Card`, `hover:border-pink-300`, lucide-reactアイコン

**3. Image Gallery（画像ギャラリー）**
- 用途: 生成画像の表示、作品一覧
- 重要クラス: `grid grid-cols-2 md:grid-cols-3`, `group`, `hover:scale-105`, `hover:shadow-2xl`

**4. Step-by-Step UI（ステップ式UI）**
- 用途: 複数ステップの作成フロー
- 重要クラス: `Progress`, `useState(currentStep)`, 条件分岐でStep表示

**5. Loading & Empty States（ローディング・空状態）**
- 用途: データ取得中、データなし
- 重要クラス: `animate-spin`, `flex items-center justify-center`, lucide-reactアイコン

**6. Image Upload Preview（画像アップロードプレビュー）**
- 用途: ファイルアップロード時のプレビュー
- 重要クラス: `relative`, `absolute top-2 right-2`, `rounded-xl shadow-lg`

**詳細な実装例:** `src/pages/ExamplesPage.jsx` および `src/pages/HomePage.jsx` を参照

### 推奨する視覚要素

#### グラデーション配色パターン

Akatsukiで推奨するグラデーション配色：

```css
/* 背景グラデーション */
bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100     /* 明るいパステル */
bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50      /* 柔らかい */
bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50          /* クール系 */

/* テキストグラデーション */
bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-transparent bg-clip-text

/* ボタン・カードグラデーション */
bg-gradient-to-r from-pink-500 to-purple-600                   /* Button variant="gradient" */
bg-gradient-to-r from-blue-500 to-cyan-600                     /* クール系 */
bg-gradient-to-r from-orange-500 to-pink-600                   /* 暖色系 */
```

#### アイコンの使い方

**lucide-react の推奨アイコン:**
- `Sparkles` - AI生成、キラキラ効果
- `Wand2` - 魔法、変換
- `Image` - 画像関連
- `Camera` - 撮影、カメラ
- `Palette` - カラー、デザイン
- `Download` - ダウンロード
- `Upload` - アップロード
- `Heart` - お気に入り
- `Star` - 評価
- `Zap` - 高速、パワー

**アイコンサイズ:**
- 小: `w-4 h-4` (ボタン内)
- 中: `w-6 h-6` (カード内)
- 大: `w-8 h-8` (メイン要素)
- 特大: `w-12 h-12` (Hero Section)

#### 丸みのレベル

```css
rounded-md     /* 小: ボタン、バッジ */
rounded-lg     /* 中: カード、入力フィールド */
rounded-xl     /* 大: メインカード、画像 */
rounded-2xl    /* 特大: Feature Cards */
rounded-3xl    /* 超特大: Hero Section カード */
rounded-full   /* 円形: アバター、アイコンボタン */
```

### 基本方針
「プリクラ風アプリを作って」のような指示を受けた際、以下の標準設計に従って実装します。

### カテゴリ別標準設計

#### プリクラ系アプリ
**画面数:** 3-5画面

**推奨フロー:**
```
ホーム → ステップ式作成 → 写真生成 → ギャラリー
```

**サンプル指示:**
> "プリクラ風のキャラクタースタジオを作って"

**実装イメージ:**
- ホーム: 3つの機能カード（アイコン付き）
- 作成フロー: プログレスバー + ステップ式UI（髪色→メイク→ポーズ）
- 生成画面: フレーム選択 + フィルター選択
- ギャラリー: グリッド表示（2列 or 3列）

**UI要素:**
- グラデーション背景（ピンク/紫/青）
- Button（gradient variant）
- Card（rounded-3xl）
- Progress（ステップ表示）
- Badge（NEW、人気表示）

#### その他のカテゴリ
今後、必要に応じて追加

### 8.9. VibeCoding Design Templates（実装の参考パターン集）

よくあるパターンを、**実装済みの正確なコンポーネント名**で参考資料化します。

**重要: テンプレートの使い方**
- ⚠️ **そのまま適用するものではない** - WordPressのテンプレートとは違う
- ✅ **参考にして自由に設計** - 近いパターンを把握し、要件に応じてカスタマイズ
- ✅ **実装済みコンポーネントを活用** - AuthGuard, useAIGen, FileUpload等を再利用
- ✅ **命名規則に従う** - Model, Repository, Service等のアーキテクチャパターンを維持

**VibeCodingの本質:**
- テンプレートエンジンではなく、自由度の高い設計を実現
- Akatsukiの基盤（統一ハンドラー、Repository/Modelパターン等）を活用
- スピードと品質を両立

#### Template 1: AI画像生成アプリ（プリクラ系）

**画面構成:**
```
HomePage (/) → CreationPage (/create) → GalleryPage (/gallery)
```

**DB設計:**
```sql
-- Migration
profiles                    -- ユーザープロフィール（実装済み）
file_metadata              -- 生成画像（実装済み）
user_quotas                -- 使用制限（実装済み）
creation_templates         -- 作成テンプレート（新規）
user_creations             -- ユーザー作成物（新規）
```

**実装レイヤー:**
```javascript
// Models (src/models/)
UserProfile.js             // 実装済み
CreationTemplate.js        // 新規作成

// Repositories (src/repositories/)
UserProfileRepository.js           // 実装済み
FileMetadataRepository.js          // 実装済み
CreationTemplateRepository.js      // 新規作成

// Services (src/services/)
ImageGenerationService.js  // 実装済み
PublicStorageService.js    // 実装済み

// Hooks (src/hooks/)
useAIGen.js                // 実装済み
useImageGeneration.js      // 新規作成（useAIGenベース）

// Components (src/components/)
components/auth/AuthGuard.jsx          // 実装済み
components/layout/TopNavigation.jsx    // 実装済み
components/storage/FileUpload.jsx      // 実装済み
components/features/creation/CreationFlow.jsx      // 新規
components/features/creation/TemplateSelector.jsx  // 新規
components/features/gallery/ImageGallery.jsx       // 新規

// UI Components (shadcn/ui - 実装済み)
components/ui/card.jsx
components/ui/button.jsx
components/ui/progress.jsx
components/ui/badge.jsx
components/ui/skeleton.jsx
```

**Edge Functions:**
```
generate-image             // 実装済み
upload-file                // 実装済み
```

**実装フロー:**
1. Migration作成（creation_templates, user_creations）
2. Model作成（CreationTemplate）
3. Repository作成（CreationTemplateRepository）
4. Custom Hook作成（useImageGeneration）
5. Feature Components作成（CreationFlow, TemplateSelector, ImageGallery）
6. Pages作成（CreationPage, GalleryPage）
7. Routing設定（App.jsx）

---

#### Template 2: LLMチャットアプリ

**画面構成:**
```
HomePage (/) → ChatPage (/chat) → HistoryPage (/history)
```

**DB設計:**
```sql
-- Migration
profiles                   -- ユーザープロフィール（実装済み）
ai_models                  -- AIモデル情報（実装済み）
llm_call_logs              -- LLM呼び出し履歴（実装済み）
user_quotas                -- 使用制限（実装済み）
chat_sessions              -- チャットセッション（新規）
chat_messages              -- チャットメッセージ（新規）
```

**実装レイヤー:**
```javascript
// Models
AIModel.js                 // 実装済み
UserProfile.js             // 実装済み
ChatSession.js             // 新規作成
ChatMessage.js             // 新規作成

// Repositories
AIModelRepository.js       // 実装済み
UserQuotaRepository.js     // 実装済み
ChatSessionRepository.js   // 新規作成
ChatMessageRepository.js   // 新規作成

// Services
services/ai/AIService.js   // 実装済み
EdgeFunctionService.js     // 実装済み

// Hooks
useAIGen.js                // 実装済み
useChatSession.js          // 新規作成

// Components
components/auth/AuthGuard.jsx              // 実装済み
components/layout/TopNavigation.jsx        // 実装済み
components/features/chat/ChatCard.jsx      // 新規
components/features/chat/MessageList.jsx   // 新規
components/features/chat/ModelSelector.jsx // 新規

// UI Components (shadcn/ui)
components/ui/card.jsx
components/ui/button.jsx
components/ui/input.jsx
components/ui/textarea.jsx
components/ui/skeleton.jsx
components/ui/scroll-area.jsx
```

**Edge Functions:**
```
ai-chat                    // 実装済み（OpenAI/Anthropic/Gemini対応）
```

**実装フロー:**
1. Migration作成（chat_sessions, chat_messages）
2. Model作成（ChatSession, ChatMessage）
3. Repository作成（ChatSessionRepository, ChatMessageRepository）
4. Custom Hook作成（useChatSession）
5. Feature Components作成（ChatCard, MessageList, ModelSelector）
6. Pages作成（ChatPage, HistoryPage）
7. Routing設定（App.jsx）

---

#### Template 3: ファイル管理アプリ

**画面構成:**
```
HomePage (/) → UploadPage (/upload) → FilesPage (/files)
```

**DB設計:**
```sql
-- Migration
profiles                   -- ユーザープロフィール（実装済み）
file_metadata              -- ファイルメタデータ（実装済み）
file_folders               -- フォルダ（新規）
```

**実装レイヤー:**
```javascript
// Models
UserProfile.js             // 実装済み
FileMetadata.js            // 新規作成
FileFolder.js              // 新規作成

// Repositories
FileMetadataRepository.js  // 実装済み
FileFolderRepository.js    // 新規作成

// Services
PublicStorageService.js    // 実装済み
PrivateStorageService.js   // 実装済み

// Hooks
useFileUpload.js           // 新規作成

// Components
components/auth/AuthGuard.jsx          // 実装済み
components/storage/FileUpload.jsx      // 実装済み
components/features/files/FileList.jsx     // 新規
components/features/files/FolderTree.jsx   // 新規

// UI Components (shadcn/ui)
components/ui/card.jsx
components/ui/button.jsx
components/ui/table.jsx
components/ui/dropdown-menu.jsx
components/ui/dialog.jsx
```

**Edge Functions:**
```
upload-file                // 実装済み
delete-file                // 実装済み
get-signed-url             // 実装済み
create-signed-url          // 実装済み
```

**実装フロー:**
1. Migration作成（file_folders）
2. Model作成（FileMetadata, FileFolder）
3. Repository作成（FileFolderRepository）
4. Custom Hook作成（useFileUpload）
5. Feature Components作成（FileList, FolderTree）
6. Pages作成（UploadPage, FilesPage）
7. Routing設定（App.jsx）

---

#### Template 4: ダッシュボード（データ可視化）

**画面構成:**
```
HomePage (/) → DashboardPage (/dashboard) → ReportsPage (/reports)
```

**DB設計:**
```sql
-- Migration
profiles                   -- ユーザープロフィール（実装済み）
user_usage_stats           -- 使用統計（実装済み）
metrics                    -- メトリクス（新規）
reports                    -- レポート（新規）
```

**実装レイヤー:**
```javascript
// Models
UserProfile.js             // 実装済み
UserUsageStats.js          // 新規作成
Metric.js                  // 新規作成

// Repositories
UserUsageStatsRepository.js  // 実装済み
MetricRepository.js          // 新規作成

// Services
EdgeFunctionService.js     // 実装済み

// Hooks
useMetrics.js              // 新規作成

// Components
components/auth/AuthGuard.jsx                  // 実装済み
components/features/dashboard/MetricsCard.jsx  // 新規
components/features/dashboard/ChartCard.jsx    // 新規
components/features/dashboard/StatsOverview.jsx // 新規

// UI Components (shadcn/ui)
components/ui/card.jsx
components/ui/chart.jsx    // 実装済み（Recharts統合）
components/ui/table.jsx
components/ui/badge.jsx
```

**Edge Functions:**
```
generate-report            // 新規作成
```

**実装フロー:**
1. Migration作成（metrics, reports）
2. Model作成（UserUsageStats, Metric）
3. Repository作成（MetricRepository）
4. Edge Function作成（generate-report）
5. Custom Hook作成（useMetrics）
6. Feature Components作成（MetricsCard, ChartCard, StatsOverview）
7. Pages作成（DashboardPage, ReportsPage）
8. Routing設定（App.jsx）

---

#### テンプレート活用のポイント

1. **実装済みコンポーネントを最大限活用**
   - AuthGuard, TopNavigation, FileUpload は必須
   - shadcn/ui コンポーネントはすべて利用可能

2. **Edge Functionsの再利用**
   - ai-chat, generate-image, upload-file は実装済み
   - 新規Edge Functionは統一ハンドラー（createAkatsukiHandler）を使用

3. **Repository/Model パターン**
   - 既存の UserProfileRepository.js を参考に実装
   - fromDatabase(), toDatabase() を必ず実装

4. **Custom Hooks による再利用**
   - useAIGen.js を参考に、Feature固有のHooksを作成
   - ビジネスロジックはすべてHooksに集約

---

## 9. トラブルシューティング

### 環境が動かない時のチェックリスト

1. **Node.jsバージョン確認:**
   ```bash
   node --version  # v20.x 以上
   nvm use         # または asdf install
   ```

2. **Rustバージョン確認:**
   ```bash
   rustc --version
   ```

3. **依存関係の再インストール:**
   ```bash
   npm install
   cd packages/app-backend && cargo build
   ```

4. **環境変数の確認:**
   ```bash
   # Frontend
   cat packages/app-frontend/.env

   # Backend
   cat packages/app-backend/.env
   ```

5. **Supabase接続確認:**
   - SupabaseダッシュボードでプロジェクトがActiveか確認
   - DATABASE_URLのパスワードが正しいか確認

---

### 9.2. VibeCoding中のよくあるトラブル

実装中に発生しやすい問題と解決方法を記載します。

**このセクションの使い方:**
- 実装中にエラーが発生したら、該当するケースを探す
- 診断方法に従って原因を特定
- 解決方法を適用

#### ケース1: Edge Function が 500 エラー

**症状:**
- Edge Function呼び出しが500エラーで失敗
- フロントエンドでエラーメッセージが表示されない

**診断方法:**
```bash
# リアルタイムログ確認
npx supabase functions logs ai-chat --tail

# 特定のFunctionのログ
npx supabase functions logs generate-image --tail
```

**よくある原因と解決:**

1. **Secrets未設定**
   ```bash
   # Secrets一覧確認
   npx supabase secrets list

   # 不足しているSecret設定
   npx supabase secrets set OPENAI_API_KEY=sk-...
   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   ```

2. **CORS設定漏れ**
   - 統一ハンドラー（createAkatsukiHandler, createSystemHandler）を使用していれば自動対応済み
   - 手動でFetch APIを使っている場合は、Response headerにCORS設定を追加

3. **認証エラー**
   ```typescript
   // ✅ 認証必須APIの場合
   createAkatsukiHandler(req, {
     requireAuth: true,  // ← これを忘れずに
     logic: async ({ userClient, adminClient, repos }) => { ... }
   })
   ```

4. **入力バリデーションエラー**
   ```typescript
   // Zodスキーマで型チェック
   import { z } from 'zod'

   const InputSchema = z.object({
     prompt: z.string().min(1),
     model: z.string().optional(),
   })

   createAkatsukiHandler<Input, Output>(req, {
     inputSchema: InputSchema,  // ← バリデーション自動実行
     // ...
   })
   ```

---

#### ケース2: RLSでデータ取得できない

**症状:**
- ログイン済みなのに、自分のデータが取得できない
- `profiles` テーブルが空配列で返ってくる

**診断方法:**
```sql
-- RLS Policy確認（Supabase Dashboard → Database → Policies）
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- 現在の認証状態確認
SELECT auth.uid();  -- null の場合は未ログイン
```

**よくある原因と解決:**

1. **Policy未作成**
   ```sql
   -- Migration で必ず RLS Policy を作成
   CREATE POLICY "Users can read own profile"
     ON profiles FOR SELECT
     USING (auth.uid() = user_id);

   CREATE POLICY "Users can update own profile"
     ON profiles FOR UPDATE
     USING (auth.uid() = user_id);
   ```

2. **auth.uid() が null**
   ```javascript
   // フロントエンド: ログイン状態確認
   const { user } = useAuth()
   if (!user) {
     // ログインページへリダイレクト
   }

   // Edge Function: 認証確認
   const { data: { user }, error } = await userClient.auth.getUser()
   if (error || !user) {
     throw new Error('Unauthorized')
   }
   ```

3. **adminClient 使うべき箇所で userClient を使用**
   ```typescript
   // ❌ 悪い例: Usage更新をuserClientで実行（RLSで拒否される）
   await userClient.from('user_quotas').update({ usage: usage + 1 })

   // ✅ 良い例: Repos経由でadminClient使用（改ざん防止）
   await repos.userQuota.incrementUsage(quotaId)
   ```

4. **外部キー制約エラー**
   ```sql
   -- profiles.user_id が auth.users に存在しない場合
   -- Trigger が正しく動作しているか確認
   SELECT * FROM auth.users WHERE id = 'ユーザーID';
   ```

---

#### ケース3: Repository/Model で型エラー

**症状:**
- `UserProfile.fromDatabase is not a function`
- `Cannot read property 'toDatabase' of undefined`

**診断方法:**
```javascript
// Model実装確認
console.log(UserProfile.fromDatabase)  // undefined の場合は未実装
```

**よくある原因と解決:**

1. **fromDatabase() の実装漏れ**
   ```javascript
   // ❌ 悪い例: static method 未実装
   class UserProfile {
     constructor(data) {
       this.userId = data.userId
       // ...
     }
   }

   // ✅ 良い例: fromDatabase() を必ず実装
   class UserProfile {
     constructor(data) {
       this.userId = data.userId
       // ...
     }

     static fromDatabase(data) {
       return new UserProfile({
         userId: data.user_id,       // snake_case → camelCase
         username: data.username,
         displayName: data.display_name,
       })
     }

     toDatabase() {
       return {
         user_id: this.userId,       // camelCase → snake_case
         username: this.username,
         display_name: this.displayName,
       }
     }
   }
   ```

2. **Repository で Model を使わずに直接返す**
   ```javascript
   // ❌ 悪い例: DBレコードを直接返す
   static async findByUserId(userId) {
     const { data } = await supabase
       .from('profiles')
       .select('*')
       .eq('user_id', userId)
       .single()

     return data  // ❌ snake_case のまま
   }

   // ✅ 良い例: Model 経由で変換
   static async findByUserId(userId) {
     const { data } = await supabase
       .from('profiles')
       .select('*')
       .eq('user_id', userId)
       .single()

     return UserProfile.fromDatabase(data)  // ✅ camelCase に変換
   }
   ```

3. **import 漏れ**
   ```javascript
   // ✅ 必ず Model を import
   import { UserProfile } from '../models'

   // または
   import { UserProfile } from '../models/UserProfile'
   ```

---

#### ケース4: Migration適用できない

**症状:**
- `npm run supabase:push` がエラー
- `duplicate key value violates unique constraint`

**診断方法:**
```bash
# Migration履歴確認
npx supabase migration list

# 適用済みMigration確認（Supabase Dashboard → Database → Migrations）
```

**よくある原因と解決:**

1. **既存データとの競合**
   ```sql
   -- ❌ 悪い例: 既存データがあるのに NOT NULL 制約追加
   ALTER TABLE profiles ADD COLUMN role TEXT NOT NULL;

   -- ✅ 良い例: DEFAULT 値を設定
   ALTER TABLE profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
   ```

2. **Migration順序の問題**
   ```bash
   # Migration ファイル名のタイムスタンプを確認
   ls supabase/migrations/

   # 20251029_*.sql の順序が正しいか確認
   ```

3. **手動でDBを変更してしまった**
   ```bash
   # Supabase Dashboard で直接テーブルを変更した場合、
   # Migration との不整合が発生する

   # 解決: Migration に反映
   npm run supabase:migration:new fix_manual_changes
   ```

---

#### ケース5: EdgeFunctionService のレスポンス形式エラー

**症状:**
- Edge Functionは成功しているのに、サービス層で「データがない」エラー
- `data` と `error` の扱いを間違えている
- `No image data returned` などのエラーメッセージ

**診断方法:**
```javascript
// サービス層でレスポンスをログ出力
const { data, error } = await EdgeFunctionService.invoke('generate-image', {...})
console.log('[Debug] EdgeFunctionService response:', { data, error })
```

**原因:**
`EdgeFunctionService.invoke()` は **`{ data, error }` 形式** を返します。AkatsukiResponse形式の `{ success, result, error }` を `{ data, error }` 形式に変換しています。

```javascript
// Edge Function が返すレスポンス (AkatsukiResponse)
{
  success: true,
  result: {
    image_data: "base64...",
    mime_type: "image/png"
  }
}

// EdgeFunctionService.invoke() が返す値 ({ data, error } 形式)
{
  data: {
    image_data: "base64...",
    mime_type: "image/png"
  },
  error: null
}

// エラー時
{
  data: null,
  error: Error("エラーメッセージ")
}
```

**解決方法:**

```javascript
// ❌ 悪い例: 分割代入せずに使用
const result = await EdgeFunctionService.invoke('generate-image', {...})
if (!result.image_data) {  // ← result.data.image_data が正しい
  throw new Error('No data')
}

// ✅ 良い例: { data, error } 形式で分割代入
const { data, error } = await EdgeFunctionService.invoke('generate-image', {...})
if (error) {
  return { data: null, error }  // エラーをそのまま返す
}

if (!data || !data.image_data) {
  return { data: null, error: new Error('No image data returned') }
}

// data を使用
console.log(data.image_data)
```

**重要:**
- すべてのServiceは `{ data, error }` 形式を返す（統一仕様）
- **エラー時も throw しない**: `{ data: null, error: Error }` を返す
- 呼び出し側で必ず `error` チェックを行う
- React Query との相性が良い設計

**関連ファイル:**
- `src/services/EdgeFunctionService.js:25-94` - `{ data, error }` 形式への変換ロジック
- `src/services/ImageGenerationService.js:43-189` - Service の実装例

---

#### Akatsuki固有のベストプラクティス

**統一ハンドラーパターン（最重要）:**
```typescript
// ✅ 必ず createAkatsukiHandler または createSystemHandler を使用
import { createAkatsukiHandler } from '../_shared/handler.ts'

Deno.serve(async (req) => {
  return createAkatsukiHandler(req, {
    requireAuth: true,  // 認証必須
    inputSchema: InputSchema,  // Zodバリデーション
    logic: async ({ userClient, adminClient, repos }) => {
      // userClient: RLS有効
      // adminClient: RLSバイパス（Usage等の改ざん防止）
      // repos: Repository集約（adminClient経由）

      return { result: 'success' }
    }
  })
})
```

**Repository/Model パターン（必須）:**
```javascript
// ✅ 必ず Model 経由でDB変換
// 1. Repository でデータ取得
const data = await UserProfileRepository.findByUserId(userId)

// 2. Model で変換（自動実行）
const profile = UserProfile.fromDatabase(data)  // snake_case → camelCase

// 3. 更新時も Model 経由
await UserProfileRepository.update(userId, profile.toDatabase())
```

**RLS設計を最初から（重要）:**
```sql
-- Migration作成時に必ず Policy も作成
CREATE TABLE profiles (...);

-- RLS有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy作成（同時に）
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);
```

**Edge Functions ログ確認（トラブル時必須）:**
```bash
# リアルタイムログ確認
npx supabase functions logs ai-chat --tail
npx supabase functions logs generate-image --tail

# Secrets確認
npx supabase secrets list
```

---

## 10. さらに詳しく

- **クイックスタート:** `README.md`
- **Backend API詳細:** `packages/app-backend/README.md`
- **デプロイ手順:** `docs/guide/` (今後追加予定)

---

## 10. Supabase 設定 (Supabase Configuration)

### Edge Functions

現在デプロイされているEdge Functions:

1. **ai-chat** - マルチプロバイダーLLM API
   - Providers: OpenAI, Anthropic (Claude), Google (Gemini)
   - Default models:
     - OpenAI: `gpt-4o-mini`
     - Anthropic: `claude-sonnet-4-5-20250929`
     - Gemini: `gemini-2.5-flash`

2. **upload-file** - ファイルアップロード
   - Public/Private バケット対応
   - 最大サイズ: 10MB

3. **create-signed-url** - Signed URL 生成
   - プライベートファイル用

### Storage Buckets

1. **uploads** (Public)
   - 公開ファイル用
   - RLS: ユーザーは自分のフォルダにアップロード可能
   - 誰でも読み取り可能

2. **private_uploads** (Private)
   - プライベートファイル用
   - RLS: ユーザーは自分のファイルのみアクセス可能
   - Signed URL必須

### Required Secrets

```bash
# LLM Provider API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...

# Supabase (自動設定)
SUPABASE_URL=https://...supabase.co
SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh...
SUPABASE_DB_URL=postgresql://...
```

### Secrets 設定コマンド

```bash
# 一括設定
npx supabase secrets set --env-file .env.secrets

# 個別設定
npx supabase secrets set OPENAI_API_KEY=sk-...
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
npx supabase secrets set GEMINI_API_KEY=AIza...
# WebSearch 向け Option
npx supabase secrets set TAVILY_API_KEY=tvly-...
# ComfyUI (RunPod) 向け Option
npx supabase secrets set RUNPOD_ENDPOINT=https://your-pod-id.proxy.runpod.net
npx supabase secrets set RUNPOD_API_KEY=your-runpod-auth-token


# 確認
npx supabase secrets list
```

### Database Tables

- **llm_call_logs**: LLM API呼び出し履歴
- **user_quotas**: ユーザーごとの月間使用制限
- **profiles**: ユーザープロフィール情報
- **system_events**: イベントキュー（非同期ジョブ処理）
- **event_handlers**: イベントハンドラー設定


### Event System (イベント駆動アーキテクチャ)

軽量なイベント駆動ジョブキューシステムを実装しています。

**アーキテクチャ:**
```
EventService.emit() → system_events (DB)
  ↓
  ├─→ Supabase Realtime → Frontend (即座に通知)
  └─→ Cron (毎分) → process-events → Handler Edge Functions
```

**使用例:**
```javascript
// Frontend: イベント発行
import { EventService } from './services/EventService'
await EventService.emit('image.generated', {
  imageId: '123',
  imageUrl: 'https://...',
  userId: user.id
})

// Frontend: リアルタイムリスナー
import { useEventListener } from './hooks/useEventListener'
useEventListener('image.generated', (event) => {
  toast.success('画像生成完了！')
  refetchImages()
})
```

**実装済みイベントタイプ:**
- `image.generated` - 画像生成完了
- `quota.exceeded` - クォータ超過
- `quota.warning` - クォータ警告
- `user.registered` - ユーザー登録
- `model.synced` - モデル同期完了

**特徴:**
- シンプルな発行: `EventService.emit(type, payload)`
- Realtime通知: 別タブでも即座に反映
- 自動リトライ: 指数バックオフ（5分 × retry_count）
- 優先度制御: `priority`で処理順を制御
- スケジュール実行: `scheduledAt`で遅延実行

**Admin UI:** `/admin/events` でリアルタイム監視可能

詳細は `workspace/event-system-guide.md` を参照してください。

### Async Job System (非同期ジョブ実行)

Event Systemを拡張した、長時間実行タスク向けの非同期ジョブシステムです。

**特徴:**
- **CRON駆動**: Edge Functionタイムアウト（1分）を回避
- **進捗トラッキング**: 0-100%の進捗をRealtime配信
- **最大1分待機**: ジョブ起動から処理開始まで最大1分のディレイ（許容範囲）
- **シンプルAPI**: `EventService.emit('job:*')` でジョブ起動

**アーキテクチャ:**
```
EventService.emit('job:*') → system_events (pending)
  ↓ (最大1分待機)
Cron → process-events → handlers.ts
  ↓ (進捗更新: 0% → 50% → 100%)
Realtime → Frontend (useJob Hook)
  ↓
JobProgress Component (UI表示)
```

**使用例（Backend - 新しいジョブハンドラー追加）:**
```typescript
// supabase/functions/execute-async-job/handlers.ts
export const jobHandlers: Record<string, JobHandler> = {
  'generate-report': async (params, context) => {
    const { reportType, startDate, endDate } = params

    // Step 1: 初期化 (20%)
    await context.updateProgress(20)
    console.log(`Generating ${reportType} report`)

    // Step 2: データ取得 (60%)
    const data = await fetchReportData(startDate, endDate)
    await context.updateProgress(60)

    // Step 3: 処理 (90%)
    const result = await processData(data)
    await context.updateProgress(90)

    // Step 4: 結果返却（100%は自動設定）
    return {
      records: result.length,
      revenue: result.totalRevenue,
      generatedAt: new Date().toISOString()
    }
  }
}
```

**使用例（Frontend - ジョブ起動と監視）:**
```javascript
import { EventService } from './services/EventService'
import { useJob } from './hooks/useJob'
import { JobProgress } from './components/common/JobProgress'

// ジョブ起動
const event = await EventService.emit('job:generate-report', {
  reportType: 'sales',
  startDate: '2025-01-01',
  endDate: '2025-01-31'
})

// 進捗監視（Realtime自動更新）
const { progress, isCompleted, result } = useJob(event.id, {
  onComplete: (result) => {
    toast.success('レポート生成完了！')
    console.log(result)
  }
})

// UI表示
<JobProgress
  jobId={event.id}
  title="Sales Report"
  renderResult={(result) => (
    <div>
      <p>Records: {result.records}</p>
      <p>Revenue: ${result.revenue}</p>
    </div>
  )}
/>
```

**実装済みジョブタイプ:**
- `job:generate-report` - レポート生成（サンプル実装）

**データベーススキーマ拡張:**
```sql
-- system_events テーブルに追加されたカラム
ALTER TABLE system_events
  ADD COLUMN progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);
  ADD COLUMN result JSONB;
  ADD COLUMN processing_started_at TIMESTAMPTZ;
```

**デモ:** `/examples` ページで動作確認可能

詳細は `docs/design/async_job_system.md` を参照してください。

### RLS ベストプラクティス

**❌ 間違い: 関数を直接呼ぶ**
```sql
CREATE POLICY "Admin only"
  ON table_name
  FOR ALL
  USING (is_admin());  -- NG
```

**✅ 正しい: SELECT でラップ**
```sql
CREATE POLICY "Admin only"
  ON table_name
  FOR ALL
  USING ((SELECT is_admin()) = true);  -- OK
```

**理由:**
- RLSポリシー内で関数を直接呼ぶとエラーになる場合がある
- `SELECT` でラップすることで安全に実行可能
- `= true` で明示的にboolean比較

**is_admin() 実装:**
```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      (auth.jwt() -> 'app_metadata' -> 'role')::text = '"admin"',
      false
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**重要:**
- `raw_app_meta_data` を使用（ユーザーが変更不可）
- `raw_user_meta_data` は使用しない（セキュリティリスク）

### Realtime 設定

**重要:** Realtimeを使用するテーブルは手動で有効化が必要です。

**設定方法:**
1. Supabase Dashboard → Database → Replication
2. `supabase_realtime_messages_publication` を選択
3. 対象テーブル（例: `system_events`）を追加

**動作確認:**
```javascript
// ExamplesPage (/examples) で確認
// イベントを発行 → リアルタイムで受信されることを確認
```

詳細は `docs/setup.md` の「4.6. Supabase Realtime 設定」を参照してください。

---

## 11. LLM Function Calling System

Akatsukiは、LLMが自律的にシステム機能を呼び出せる**Function Call System**を標準搭載しています。

### 11.1. アーキテクチャ概要

```
┌─────────────────────────────────────────┐
│ Frontend Admin UI                        │
│  /admin/function-definitions             │
│  → Function定義のCRUD                     │
└─────────────────────────────────────────┘
              ↓ INSERT/UPDATE
┌─────────────────────────────────────────┐
│ function_call_definitions (DB)          │
│  - name, description                    │
│  - parameters_schema (JSON Schema)      │
│  - target_event_type                    │
│  - is_enabled, is_global                │
└─────────────────────────────────────────┘
              ↓ SELECT
┌─────────────────────────────────────────┐
│ ai-chat Edge Function                   │
│  1. DBからFunction定義読み込み           │
│  2. LLMにスキーマ注入                    │
│  3. Function Call検出                   │
│  4. system_events にJob登録             │
│  5. function_call_logs 記録             │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Job System                              │
│  ← 実行ロジックは別途実装               │
│  （Job Handler / Webhook / 独自）       │
└─────────────────────────────────────────┘
```

### 11.2. 設計思想

**重要な分離:**
- **Function定義 = スキーマのみ（DB管理）**
- **実行ロジック = 別の層で実装**

この設計により：
- ✅ プロバイダー非依存（OpenAI/Anthropic/Gemini共通）
- ✅ 実行基盤はJob Systemで統一
- ✅ ユーザーが独自Functionを登録可能（LLM Platform型アプリも作れる）
- ✅ VibeCodingで柔軟にカスタマイズ可能

### 11.3. データベーススキーマ

**function_call_definitions テーブル:**
```sql
CREATE TABLE function_call_definitions (
  id UUID PRIMARY KEY,
  user_id UUID,  -- NULL = global function
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  parameters_schema JSONB NOT NULL,  -- JSON Schema
  target_event_type TEXT NOT NULL,   -- e.g., 'job:send_webhook'
  is_enabled BOOLEAN DEFAULT true,
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**function_call_logs テーブル:**
```sql
CREATE TABLE function_call_logs (
  id UUID PRIMARY KEY,
  llm_call_log_id UUID,  -- LLM呼び出しとの紐付け
  user_id UUID,
  function_name TEXT NOT NULL,
  function_arguments JSONB NOT NULL,
  execution_type TEXT NOT NULL,  -- 'async' (全てJob経由)
  status TEXT NOT NULL,  -- 'pending' | 'success' | 'failed'
  result JSONB,
  error_message TEXT,
  system_event_id UUID,  -- Job ID
  execution_time_ms INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
);
```

### 11.4. 使い方

**1. Function定義を追加（Admin UI）**

`/admin/function-definitions` にアクセス:
- Function名: `send_webhook`
- 説明: `Send HTTP webhook to external service`
- Parameters Schema (JSON Schema):
```json
{
  "type": "object",
  "properties": {
    "url": { "type": "string", "description": "Webhook URL" },
    "method": { "type": "string", "enum": ["GET", "POST"] },
    "body": { "type": "object" }
  },
  "required": ["url"]
}
```
- Target Event Type: `job:send_webhook`
- 有効化 + グローバル設定

**2. LLMがFunction Callを使用（Frontend）**

```javascript
import { AIService } from './services/ai/AIService'

const { data } = await AIService.chat({
  provider: 'openai',
  prompt: 'Send a webhook to https://example.com with message "Hello"',
  enableFunctionCalling: true,  // Function Calling有効化
})

// → LLMが send_webhook を呼び出し
// → system_events に 'job:send_webhook' 登録
// → Job Systemが処理実行（Job Handlerが必要）
```

**3. 実行ロジックを実装（Job Handler）**

```typescript
// supabase/functions/execute-async-job/handlers.ts
export const jobHandlers: Record<string, JobHandler> = {
  'send_webhook': async (params, context) => {
    // Webhookを実際に送信
    const response = await fetch(params.url, {
      method: params.method || 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params.body),
    })

    return {
      success: response.ok,
      result: { status: response.status },
    }
  },
}
```

**4. 実行ログを確認**

`/admin/function-calls` にアクセス:
- 成功/失敗
- 引数・結果
- 実行時間
- LLM呼び出しとの紐付け

### 11.5. サンプル関数（Seed済み）

Akatsukiには5つのサンプルFunction定義が含まれています：

| 関数名 | 説明 | Event Type |
|--------|------|------------|
| `send_webhook` | Webhook送信 | `job:send_webhook` |
| `query_database` | DBクエリ実行 | `job:query_database` |
| `send_notification` | 通知送信 | `job:send_notification` |
| `generate_image` | AI画像生成 | `job:generate_image` |
| `aggregate_data` | データ集計 | `job:aggregate_data` |

これらは参考実装です。実際の実行ロジックは別途実装してください。

### 11.6. VibeCodingでの拡張

**新しいFunctionを追加する場合:**

1. Admin UIで新しいFunction定義を作成
2. Job Handlerに実行ロジックを実装
3. デプロイ

```typescript
// supabase/functions/execute-async-job/handlers.ts に追加
export const jobHandlers: Record<string, JobHandler> = {
  // 既存...

  'my_custom_function': async (params, context) => {
    // 独自処理を実装
    return { success: true, result: { ... } }
  },
}
```

### 11.7. ユースケース例

**1. シンプルなアプリ（開発者が関数定義）**
- Function定義: Admin UIで管理
- 実行ロジック: Job Handlerにハードコード
- 用途: 自社アプリのAI機能強化

**2. LLM Platform（ユーザーが関数登録）**
- Function定義: ユーザーがUI経由で登録
- 実行ロジック: Webhook (Out) で外部連携
- 用途: Zapier/Make.com的なプラットフォーム

**3. ハイブリッド**
- グローバル関数: 管理者が定義
- ユーザー関数: 各ユーザーが独自に追加
- 用途: エンタープライズAIプラットフォーム

### 11.8. ベストプラクティス

**Function定義:**
- ✅ 明確な責務（1 Function = 1機能）
- ✅ JSON Schema でパラメータを厳密に定義
- ✅ `target_event_type` は `job:` プレフィックスを使用

**実行ロジック:**
- ✅ Job Handler でエラーハンドリング
- ✅ 進捗更新（長時間処理の場合）
- ✅ 監査ログを活用

**セキュリティ:**
- ✅ RLSでFunction定義へのアクセス制限
- ✅ 危険な操作はAdmin専用にする
- ✅ function_call_logs で全実行を記録

### 11.9. 管理画面

**Function定義管理:** `/admin/function-definitions`
- Function一覧・作成・編集・削除
- JSON Schema編集
- 有効/無効切り替え
- Global/User切り替え

**実行ログ閲覧:** `/admin/function-calls`
- 実行履歴一覧
- フィルター（Function名、ステータス）
- 詳細表示（引数、結果、エラー）
- 統計情報

---

**安輝（あき）より:**

この `AGENT.md` が、私たちの「Akatsuki」の安定性と輝きを支える基盤となります。
ルールを守りながら、最速で価値を届けましょう！ 🚀
