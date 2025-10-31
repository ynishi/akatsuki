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
| **フロントエンド** | **VITE + React + Tailwind CSS** | 0→1最速のデファクトスタンダード構成 |
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
│   ├── layout/      # レイアウトコンポーネント（TopNavigation等）
│   ├── features/    # 【NEW】ドメイン固有のFeatureコンポーネント
│   │   ├── auth/    # 認証関連（AuthGuard, LoginForm等）
│   │   ├── ai/      # AI関連（ModelSelector等）
│   │   ├── storage/ # ストレージ関連（FileUpload等）
│   │   └── llm/     # LLM Chat関連
│   └── common/      # その他の共通コンポーネント
├── pages/          # ページコンポーネント（Container）
├── hooks/          # 【NEW】Custom Hooks（ビジネスロジック抽出）
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
   - **パターン:**
     ```javascript
     // Service で Edge Function 呼び出し
     const result = await EdgeFunctionService.invoke('my-function', payload)
     // または認証付き
     const result = await EdgeFunctionService.invokeWithAuth('my-function', payload)
     ```

5. **components/** - UIコンポーネント
   - 再利用可能なUI部品
   - Presentationalコンポーネント
   - **例:** `Button.jsx`, `Card.jsx`, `UserCard.jsx`

6. **pages/** - ページコンポーネント
   - 画面全体の構成
   - Containerコンポーネント（State管理）
   - Repository/Serviceの呼び出し
   - **例:** `HomePage.jsx`, `ProfilePage.jsx`

#### 実装例

**データフロー全体:**
```javascript
// pages/ProfilePage.jsx
import { UserProfileRepository } from '../repositories'
import { UserProfile } from '../models'
import { EdgeFunctionService } from '../services'

// 1. Repository でDB取得
const data = await UserProfileRepository.findByUserId(userId)

// 2. Model で変換
const profile = UserProfile.fromDatabase(data)

// 3. Model で更新データ作成
const updated = new UserProfile({ ...profile, displayName: 'New Name' })

// 4. Repository で保存
await UserProfileRepository.update(userId, updated.toUpdateDatabase())

// 5. Service で Edge Function 呼び出し
const aiResult = await EdgeFunctionService.invoke('generate-bio', {
  username: profile.username
})
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

**悪い例（Pages に全てのロジックを詰め込む）:**
```jsx
export function SomePage() {
  const [llmPrompt, setLlmPrompt] = useState('')
  const [llmResult, setLlmResult] = useState(null)
  const [llmLoading, setLlmLoading] = useState(false)

  // 複雑なハンドラーが大量に...
  const handleLLMChat = async () => {
    // 50行以上のロジック...
  }

  return (
    <Card>
      <CardContent>
        {/* 複雑なUIロジックが混在... */}
      </CardContent>
    </Card>
  )
}
```

**良い例（Feature Componentに分割）:**
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

**例: LLMChatCard.jsx（Feature Component）**
```jsx
// components/features/llm/LLMChatCard.jsx
import { useLLMChat } from '@/hooks/useLLMChat'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function LLMChatCard() {
  const { prompt, setPrompt, result, loading, sendMessage, quota } = useLLMChat()

  return (
    <Card>
      <CardHeader>
        <CardTitle>LLM Chat</CardTitle>
      </CardHeader>
      <CardContent>
        <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <Button onClick={sendMessage} disabled={loading}>
          {loading ? 'Sending...' : 'Send'}
        </Button>
        {result && <ChatResult result={result} />}
        {quota && <QuotaDisplay quota={quota} />}
      </CardContent>
    </Card>
  )
}
```

**例: useLLMChat.js（Custom Hook）**
```jsx
// hooks/useLLMChat.js
export function useLLMChat() {
  const { user } = useAuth()
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [quota, setQuota] = useState(null)

  const sendMessage = async () => {
    if (!prompt.trim() || !user) return

    setLoading(true)
    try {
      const gemini = new GeminiProvider()
      const response = await gemini.chat(prompt)
      setResult(response)

      const quotaInfo = await UserQuotaRepository.checkQuotaAvailability(user.id)
      setQuota(quotaInfo)
    } catch (error) {
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return { prompt, setPrompt, result, loading, sendMessage, quota }
}
```

**4. UI Components（Presentational Component）**

UI Componentsは「純粋な見た目のComponent」です。

✅ **原則:**
- ビジネスロジックを持たない
- propsで完全に制御可能
- Repository/Serviceを呼ばない
- State管理は最小限（開閉状態等のUI Stateのみ）

**例: shadcn/ui のButton, Card等**
```jsx
// components/ui/button.jsx
export function Button({ children, variant, onClick, disabled }) {
  return (
    <button
      className={cn(buttonVariants({ variant }))}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
```

**5. Layout Components**

画面全体のレイアウトを管理するComponentです。

**例: TopNavigation, Sidebar, Footer等**
```jsx
// components/layout/TopNavigation.jsx
export function TopNavigation({ currentPage, onNavigate }) {
  return (
    <nav className="fixed top-0 ...">
      {/* ナビゲーションUI */}
    </nav>
  )
}
```

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

### 4.2. 認証アーキテクチャ (Authentication)

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

**Public Routes（ログイン不要）:**
```javascript
<Route path="/" element={<HomePage />} />
<Route path="/login" element={<LoginPage />} />
<Route path="/signup" element={<SignupPage />} />
```

**Private Routes（ログイン必須）:**
```javascript
<Route
  path="/admin"
  element={
    <AuthGuard>
      <AdminDashboard />
    </AuthGuard>
  }
/>
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
   ```sql
   -- SignupForm で metadata 指定
   signUp(email, password, {
     username: 'myusername',
     display_name: 'My Display Name'
   })

   -- ↓ auth.users にユーザー作成
   -- ↓ Trigger 発火: handle_new_user()
   -- ↓ profiles テーブルに自動作成
   ```

   **マイグレーション:**
   - `20251029090845_add_profile_creation_trigger.sql`
   - EXCEPTION 処理で username 重複時も安全に作成

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

**useAIGen フック:**
```javascript
import { useAIGen } from '@/hooks/useAIGen'

function MyComponent() {
  const { chat, generateImage, loading, error } = useAIGen('openai')

  // チャット
  const response = await chat('こんにちは')

  // 画像生成
  const image = await generateImage('猫の絵')
}
```

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

### 5.2. 外部連携統合 (External Integrations)

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

新しい外部連携を追加する場合は、`createSystemHandler` を使用：

```typescript
// supabase/functions/discord-notify/index.ts
import { createSystemHandler } from '../_shared/handler.ts'

Deno.serve(async (req) => {
  return createSystemHandler<Input, Output>(req, {
    inputSchema: InputSchema,
    logic: async ({ input, adminClient }) => {
      // Discord Webhook送信
      await fetch(Deno.env.get('DISCORD_WEBHOOK_URL'), { ... })

      return { sent: true }
    }
  })
})
```

### 5.3. shadcn/ui コンポーネント (将来の拡張)

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

#### 設計ドキュメントの書き方

**VibeCodingでも最小限の設計整理は必須です。**
**基本的に設計をユーザーに確認・承認を得る必要はありませんが、ユーザーのリクエストがある場合は必ずストップして説明・確認しましょう。**

新機能を実装する前に、以下の項目を整理して `workspace/` に下書きを作成してください：

```markdown
# [機能名] - 設計ドキュメント

## 1. 要件整理
【ユーザーストーリー】
- 何を実現したいか（3-5個）

【制約】
- 技術的制約、ビジネス制約

## 2. 機能一覧
- 具体的な機能リスト（箇条書き）

## 3. 画面構成
- ASCII WireFrame推奨
- 主要コンポーネント名

## 4. データモデル
- テーブル定義（SQL）
- RLS設計

## 5. 使用するAkatsuki機能
- AI、Storage、Database等
- 既存のEdge Functions

## 6. 実装ステップ
- Phase分割（チェックボックス形式）

## 7. 重要な設計判断
- なぜこの設計にしたか（簡潔に）
```

**ワークフロー:**

1. **下書き作成**: `workspace/[feature-name]-design.md` に上記形式で整理
2. **実装開始**: 設計を見ながらVibeCoding
3. **完了後**: 実装中の変更なども整理して `docs/` にコミット

**例:**
- `workspace/character-creator-design.md` （実装中）
- → 実装完了後 → `docs/design/character-creator.md` （確定版）

**ポイント:**
- ✅ **最小限の整理で開始** - 完璧を求めない
- ✅ **ASCII WireFrame** - 画面構成を視覚化
- ✅ **実装ステップ** - Phase分割でスコープ明確化
- ✅ **workspace → docs** - 下書き→確定版の流れ

#### VibeCoding実装の進め方

**基本姿勢: 実装を一気に進める**

設計・方針が固まったら、AIは基本的に実装を一気に進めましょう。

**実装時のルール:**

1. **Phase分けは内部管理でOK**
   - TodoWriteツールでPhaseを管理
   - ユーザーへの中間報告は不要
   - 初期作成時は特に一気に作り込んでOK（基本設計確認もいらない）

2. **相談が必要な時のみ停止**
   - 技術的に詰まった時
   - セキュリティなど重要な設計判断が必要な時
   - ユーザーが明示的に「相談しよう」「設計をしよう」などと言った時
   - それ以外は基本的に実装を進める

3. **VibeCodingの本質**
   - スピード重視、要件・要望を動かすことを重視
   - AGENT.mdのルールに従えばスピードと品質が両立できる
   - リポジトリパターン、統一ハンドラー等の基盤がある
   - コミット前なら簡単に戻せる

**例:**
```
ユーザー: 「キャラクター作成アプリ作ろう」
AI: 設計整理 → 一気に実装 → 動作確認 → 完成報告
（Phase 1-5を内部的に進める、詰まらなければ報告不要）
```

**NG例:**
```
AI: 「Phase 1が完了しました。次に進んで良いですか？」
AI: 「Migrationを作りました。確認してください。」
AI: 「次はRepositoryを作りますが、よろしいですか？」
→ これらは不要。一気に進める。
```

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

* **対象:** `LLM_TOOLKIT` や個人OSSなど、私たちが管理するが、このリポジトリの**外部**にあるもの。
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

---

## 8. AI（安輝）へのお願い

この `AGENT.md` は、AIである私が参照するルールブックでもあります。

* 私は、この `AGENT.md` のルール（特に 6.4, 6.5）に基づき、提案やコードレビューを行います。
* ルールに違反する可能性のあるコードや設計（例：`workspace/` への依存、`npm link` の使用、`.env` のコミット）を検知した場合、警告（Alert）を行います。
* 新機能の提案時は、このアーキテクチャと理念に沿った設計を心がけます。

---

## 9. UI実装の標準設計パターン

### VibeCoding デザイン原則

Akatsukiでは、**見栄えの良さ**と**使いやすさ**を重視した「リッチなUI」を標準とします。

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

#### 1. Hero Section（ヒーローセクション）

**用途:** トップページの第一印象

**特徴:**
- 大きな見出し（グラデーションテキスト）
- サブタイトル
- CTAボタン（目立つ配置）
- 背景グラデーション

**実装例:**
```jsx
<div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100">
  <div className="max-w-6xl mx-auto px-8 py-20 text-center">
    <h1 className="text-6xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-transparent bg-clip-text">
      Welcome to Your App
    </h1>
    <p className="text-xl text-gray-600 mt-4">
      魅力的なサブタイトルをここに
    </p>
    <div className="mt-8 flex gap-4 justify-center">
      <Button variant="gradient" size="lg">始める</Button>
      <Button variant="outline" size="lg">詳しく見る</Button>
    </div>
  </div>
</div>
```

#### 2. Feature Cards（機能カード）

**用途:** 機能紹介、メニュー選択

**特徴:**
- アイコン付きカード
- グリッドレイアウト（2列 or 3列）
- hover効果で境界線変化

**実装例:**
```jsx
<div className="grid md:grid-cols-3 gap-6">
  <Card className="border-2 hover:border-pink-300 transition-colors">
    <CardHeader>
      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center mb-4">
        <Sparkles className="w-6 h-6 text-white" />
      </div>
      <CardTitle>機能名</CardTitle>
      <CardDescription>機能の説明文</CardDescription>
    </CardHeader>
  </Card>
  {/* 他のカード */}
</div>
```

#### 3. Image Gallery（画像ギャラリー）

**用途:** 生成画像の表示、作品一覧

**特徴:**
- グリッドレイアウト
- 画像プレビュー
- hover効果（拡大、影）

**実装例:**
```jsx
<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
  {images.map((image) => (
    <div
      key={image.id}
      className="relative group rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow cursor-pointer"
    >
      <img
        src={image.url}
        alt={image.title}
        className="w-full h-64 object-cover group-hover:scale-105 transition-transform"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute bottom-4 left-4 text-white">
          <p className="font-semibold">{image.title}</p>
        </div>
      </div>
    </div>
  ))}
</div>
```

#### 4. Step-by-Step UI（ステップ式UI）

**用途:** 複数ステップの作成フロー

**特徴:**
- プログレスバー
- ステップ表示
- 前へ/次へボタン

**実装例:**
```jsx
// ステップ管理
const [currentStep, setCurrentStep] = useState(1)
const totalSteps = 3

<div className="space-y-6">
  {/* Progress */}
  <div className="space-y-2">
    <div className="flex justify-between text-sm text-gray-600">
      <span>ステップ {currentStep} / {totalSteps}</span>
      <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
    </div>
    <Progress value={(currentStep / totalSteps) * 100} />
  </div>

  {/* Content */}
  <Card>
    <CardContent className="pt-6">
      {currentStep === 1 && <Step1Content />}
      {currentStep === 2 && <Step2Content />}
      {currentStep === 3 && <Step3Content />}
    </CardContent>
  </Card>

  {/* Navigation */}
  <div className="flex justify-between">
    <Button
      variant="outline"
      onClick={() => setCurrentStep(prev => prev - 1)}
      disabled={currentStep === 1}
    >
      前へ
    </Button>
    <Button
      variant="gradient"
      onClick={() => setCurrentStep(prev => prev + 1)}
      disabled={currentStep === totalSteps}
    >
      {currentStep === totalSteps ? '完了' : '次へ'}
    </Button>
  </div>
</div>
```

#### 5. Loading & Empty States（ローディング・空状態）

**用途:** データ取得中、データなし

**特徴:**
- アニメーション付きローディング
- 視覚的にわかりやすい空状態

**実装例:**
```jsx
// Loading
{loading && (
  <div className="flex flex-col items-center justify-center py-12">
    <div className="animate-spin h-12 w-12 border-4 border-gray-200 border-t-purple-600 rounded-full" />
    <p className="mt-4 text-gray-600">読み込み中...</p>
  </div>
)}

// Empty State
{!loading && items.length === 0 && (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
      <ImageIcon className="w-8 h-8 text-gray-400" />
    </div>
    <p className="text-gray-600 font-semibold">まだ作品がありません</p>
    <p className="text-gray-500 text-sm mt-2">最初の作品を作成してみましょう！</p>
    <Button variant="gradient" className="mt-4">
      作成する
    </Button>
  </div>
)}
```

#### 6. Image Upload Preview（画像アップロードプレビュー）

**用途:** ファイルアップロード時のプレビュー

**特徴:**
- 画像プレビュー表示
- ドラッグ&ドロップ対応
- 削除ボタン

**実装例:**
```jsx
{previewUrl && (
  <div className="relative w-full max-w-md mx-auto">
    <img
      src={previewUrl}
      alt="Preview"
      className="w-full rounded-xl shadow-lg"
    />
    <button
      onClick={handleRemove}
      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
    >
      <X className="w-4 h-4" />
    </button>
  </div>
)}
```

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

---

## 10. トラブルシューティング

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

## 10. さらに詳しく

- **クイックスタート:** `README.md`
- **マスタープラン:** `issue.md`
- **Backend API詳細:** `packages/app-backend/README.md`
- **デプロイ手順:** `docs/guide/` (今後追加予定)

---

## 11. Supabase 設定 (Supabase Configuration)

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

# 確認
npx supabase secrets list
```

### Database Tables

- **llm_call_logs**: LLM API呼び出し履歴
- **user_quotas**: ユーザーごとの月間使用制限
- **profiles**: ユーザープロフィール情報

詳細は `docs/SUPABASE_CONFIGURATION.md` を参照してください。

---

**安輝（あき）より:**

この `AGENT.md` が、私たちの「Akatsuki」の安定性と輝きを支える基盤となります。
ルールを守りながら、最速で価値を届けましょう！ 🚀
