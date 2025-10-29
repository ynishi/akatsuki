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
├── components/      # UIコンポーネント（Presentational）
├── pages/          # ページコンポーネント（Container）
├── models/         # ドメインモデル層
├── repositories/   # データアクセス層（DB CRUD）
├── services/       # サービス層（Edge Functions等）
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

#### ベストプラクティス

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

* **Backend (Axum):**
  - `packages/app-backend/src/main.rs` に以下の3つのエンドポイント雛形を実装済み：
    1. **画像生成 (Text-to-Image):** `/api/aigen/text-to-image`
    2. **Img2Img (Image-to-Image):** `/api/aigen/image-to-image`
    3. **Agent実行 (LLMタスク):** `/api/aigen/agent-execute`
  - Supabase (PostgreSQL) 連携基盤（`src/db.rs`）
  - 将来的に `LLM_TOOLKIT` を統合予定

* **Frontend (React):**
  - 将来的に `useAIGen` フックを `packages/aigen-hooks/` に実装予定
  - モデル切り替え、プロンプトテンプレート調整機能

### 5.2. shadcn/ui コンポーネント (将来の拡張)

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

### 基本方針
「プリクラ風アプリを作って」のような指示を受けた際、以下の標準設計に従って実装します。

### 必須要件
- **画面数:** 最低3画面以上
- **ナビゲーション:** トップナビゲーションバー必須（複雑なアプリは左ペインメニューも検討）
- **アイコン:** lucide-reactのアイコン優先使用、絵文字は装飾のみ
- **リッチUI:** shadcn/uiコンポーネント必須使用
- **デザイン:** グラデーション、丸みのあるカード
- **CTAボタン:** メインアクション（生成、保存など）は大きく目立たせる（size="lg" or "xl"）

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

**安輝（あき）より:**

この `AGENT.md` が、私たちの「Akatsuki」の安定性と輝きを支える基盤となります。
ルールを守りながら、最速で価値を届けましょう！ 🚀
