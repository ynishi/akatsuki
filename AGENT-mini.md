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

## 2.3. Akatsuki CLI - 開発効率化ツール

`akatsuki` CLI は、VibeCoding ワークフローを加速するコマンドラインツールです：

**主な機能:**
- 🚀 **ワンコマンド起動**: `akatsuki dev` でフロント・バックエンド同時起動
- ⚡ **Entityベース生成**: `akatsuki api new` でYAMLからフロント・バックエンドCRUD自動生成
- 📚 **ドキュメント探索**: `akatsuki docs all` で実装済みコンポーネントを即座に発見
- 🤖 **AI統合**: `akatsuki advice ai` でプロジェクト状態を分析し次のステップを提案
- 🗄️ **DB管理**: `akatsuki db check` でマイグレーションを適用前にプレビュー
- 🎨 **設計支援**: `akatsuki design new` でテンプレートベースの設計ドキュメント生成

**なぜ重要？**
- 新規Entityを5分で実装（`api new` でMigration〜Hook〜UIまで一括生成）
- AIコーディング時の「どのコンポーネントが使える？」を解決（`docs` コマンド）
- 「次何すべき？」の迷いをなくす（`advice` コマンド）
- マイグレーション失敗を防ぐ（`db check` でマルチバイト文字検出）

詳細コマンド一覧は後述（L65-）

## 2.5. VibeCoding Quick Reference（チートシート）

実装開始前に確認する最速リファレンスです。詳細は各セクション参照。

**新機能実装の流れ:**
```
Step 1: 要件整理 → workspace/[feature]-design.md
Step 2: テンプレート参考 → L2018「8.9 Design Templates」で近いパターンを参考にする
Step 3: 設計（画面・DB・アーキテクチャ層）
Step 4: CRUD生成（Model → Repository → Service → Hook & DEMOが自動生成される）
Step 4: 実装（Hook → Component → Page）
Step 5: 動作確認（ダミーデータは自動生成）
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
- 🔧 **WASM Edge Function**: L2292「WASM Runtime Component」→ Edge統合推奨（L2292）
- 📦 **技術スタック全体**: L131「4. 技術スタック」

**実装済みコンポーネント（すぐ使える）:**
💡 最新情報は `akatsuki docs all` で確認

<!-- SYNC:COMPONENTS:START -->
- 認証: `AuthGuard`, `LoginForm`, `SignupForm`
- レイアウト: `Layout`, `PrivateLayout`, `NarrowLayout`, `FullWidthLayout`, `TopNavigation`
  - `Layout` - デフォルトレイアウト（メニュー・背景・パディング自動提供）
  - `PrivateLayout` - 認証必須ページ用（AuthGuard + Layout）
- ストレージ: `FileUpload`
- Hooks: `useAIGen`, `useImageGeneration`, `usePublicProfile` (React Query)
- UI: shadcn/ui 64コンポーネント（`components/ui/`）
- **Graph & Rich Editor**: `GraphView`, `RichEditor` - Reactflowベースのグラフビューとリッチエディタのラッパー
- **Data Export/Import**: Zip対応Export/Import機能 - ExportImportService統合
- Models: 9クラス（100%ドキュメント化）
- Repositories: 14クラス（100%ドキュメント化）
- Services: 15クラス（100%ドキュメント化）
<!-- SYNC:COMPONENTS:END -->

**Edge Functions（デプロイ済み）:**
- `ai-chat` - LLM統合（OpenAI/Anthropic/Gemini）
- `generate-image` - 画像生成（DALL-E）
- `wasm-executor` - WASM モジュール実行（Storage動的ロード + LRUキャッシュ）
- `upload-file` / `delete-file` - ファイル管理
- `get-signed-url` / `create-signed-url` - Private Storage
- `send-email` / `slack-notify` - 外部連携
- `api-gateway` - Public API Gateway（API Key認証 + Rate Limit）
- `cdn-gateway` - CDN Gateway（Base62 URL + OGP）

**コマンド集:**
```bash
# 開発サーバー
akatsuki dev                      # Frontend + Backend 同時起動
akatsuki dev frontend             # Frontend のみ (localhost:5173)
akatsuki dev backend              # Backend のみ (localhost:8000)

# ビルド
akatsuki build                    # 両方ビルド
akatsuki build frontend           # Frontend 本番ビルド
akatsuki build backend            # Backend リリースビルド

# 型チェック
akatsuki check                    # すべて型チェック
akatsuki check frontend           # Frontend (tsc --noEmit)
akatsuki check backend            # Backend (cargo check)
akatsuki check cli                # CLI (tsc --noEmit)
akatsuki check admin-cli          # admin-cli (cargo check)

# Lint（静的解析）
akatsuki lint                     # すべて lint
akatsuki lint frontend            # Frontend (eslint)
akatsuki lint backend             # Backend (cargo clippy)
akatsuki lint admin-cli           # admin-cli (cargo clippy)
akatsuki lint --fix               # 自動修正あり

# フォーマット
akatsuki fmt                      # すべてフォーマット
akatsuki fmt frontend             # Frontend (prettier)
akatsuki fmt backend              # Backend (cargo fmt)
akatsuki fmt admin-cli            # admin-cli (cargo fmt)

# Preflight（総合チェック: fmt + lint + check + test）
akatsuki preflight                # すべて preflight ★推奨
akatsuki preflight frontend       # Frontend のみ
akatsuki preflight backend        # Backend のみ
akatsuki preflight admin-cli      # admin-cli のみ

# テスト
akatsuki test                     # すべてテスト
akatsuki test backend             # Backend テスト (cargo test)

# データベース操作
akatsuki db push                  # Migration 適用
akatsuki db migration-new <name>  # Migration 作成
akatsuki db check                 # Migration チェック（SQL preview、multibyte検出）
akatsuki db status                # データベース状態確認

# 設計ワークフロー
akatsuki design new <name>        # デザインドキュメント作成
akatsuki design list              # デザイン例一覧
akatsuki design publish <name>    # デザインを examples に公開

# ドキュメント探索（AIコーディング支援）
akatsuki docs all                 # 全レイヤー（components/models/repositories/services/hooks/pages）表示
akatsuki docs components          # UI コンポーネント一覧
akatsuki docs models              # Model クラス一覧
akatsuki docs repositories        # Repository クラス一覧
akatsuki docs services            # Service クラス一覧
akatsuki docs hooks               # Custom Hooks 一覧
akatsuki docs pages               # Page コンポーネント一覧
akatsuki docs lint                # ドキュメント網羅率チェック（JSDoc未記載検出）
akatsuki docs all --search "RAG"  # 全レイヤー横断検索

# 開発アドバイス（AI統合）
akatsuki advice rule              # 静的ルールベース提案（高速）
akatsuki advice prompt            # AI分析用プロンプト生成（Claude Codeにコピペ）
akatsuki advice ai                # AI自動分析（claude command経由）
akatsuki advice ai --backend=markdown  # プロンプト生成のみ

# HEADLESS API Generator（フルスタックCRUD自動生成）
akatsuki api new <Entity> --schema <file.yaml>  # YAMLスキーマからCRUD API生成
akatsuki api new <Entity> --interactive         # 対話モードでスキーマ定義
akatsuki api batch <files...>                   # 複数スキーマを一括生成
akatsuki api check <files...>                   # スキーマファイルの検証のみ
akatsuki api list                               # 生成済みAPI一覧
akatsuki api delete <Entity>                    # 生成ファイル削除

# Edge Functions
akatsuki function new <name>      # Edge Function 作成
akatsuki function deploy [name]   # Edge Function デプロイ

# デプロイ
akatsuki deploy backend           # Backend を Shuttle にデプロイ

# セットアップ
akatsuki setup init               # 初回セットアップウィザード
akatsuki setup check              # セットアップ状態確認

# その他
npm run preview:frontend          # ビルド結果をプレビュー
cd workspace && node generate-dummy-data.js  # ダミーデータ生成
```

**トラブル時の診断:**
1. Edge Function エラー → `npx supabase functions logs <name> --tail`
2. RLS エラー → Supabase Dashboard → Database → Policies
3. TypeScript型エラー → `akatsuki check frontend` で詳細確認
4. Lint エラー → `akatsuki lint frontend` で詳細確認
5. Model型エラー → Model の `fromDatabase()` 実装確認
6. 再レンダリング → useEffect 依存配列確認
7. ビルドエラー → `akatsuki build frontend` で詳細確認
8. コミット前の総合チェック → `akatsuki preflight` ★推奨

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
│   ├── layout/      # レイアウトコンポーネント（Layout.tsx, TopNavigation等）
│   ├── features/    # ドメイン固有のFeatureコンポーネント
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

1. **lib/** - インフラ層: Supabaseクライアントの初期化のみ
2. **models/** - ドメインモデル層: ビジネスロジックとデータ構造の定義、DB形式↔アプリ形式の変換（`fromDatabase()`, `toDatabase()`）
3. **repositories/** - データアクセス層: Supabase（DB）への CRUD 操作を抽象化、エラーハンドリングの統一
4. **services/** - サービス層: Supabase Edge Functions の呼び出しを抽象化、外部API連携、すべて `{ data, error }` 形式に統一
5. **hooks/** - Custom Hooks: React Query を使用した状態管理、Repository/Service を呼び出し、UIとビジネスロジックを分離
6. **components/** - UIコンポーネント: 再利用可能なUI部品、Presentationalコンポーネント
7. **pages/** - ページコンポーネント: **コンテンツのみ**を返す（Layout, TopNavigation, 背景等は不要）

**データフロー全体（パターン）:**
```javascript
// ✅ 正しい使い方
const { data, error } = await EdgeFunctionService.invoke('my-function', payload)
const { profile, isLoading } = usePublicProfile(userId)
const { generate, isPending, data } = useImageGeneration()

// ❌ 間違い
const result = await EdgeFunctionService.invoke('my-function', payload)
console.log(result.someField)  // undefined
```

*詳細な実装例は `src/pages/ExamplesPage.jsx` を参照*

#### Component設計原則

**Component分類 (3つの役割)**

```
┌─────────────────────────────────────────────────┐
│ Pages (Container Component)                     │
│ - 画面全体の構成、Feature Componentの組み合わせ  │
└─────────────────────────────────────────────────┘
              ↓ 使用
┌─────────────────────────────────────────────────┐
│ Feature Components                              │
│ - ドメイン固有のビジネスロジック                 │
│ - Repository/Serviceとの連携、複雑なState管理    │
└─────────────────────────────────────────────────┘
              ↓ 使用
┌─────────────────────────────────────────────────┐
│ UI Components (Presentational Component)       │
│ - 見た目のみ（ロジックなし）、propsで完全に制御   │
└─────────────────────────────────────────────────┘
```

**Pagesの責務:**

✅ **やるべきこと:**
- Feature Componentを組み合わせて画面を構成
- ページ固有のルーティングロジック
- グローバルStateの取得（Context経由）
- 最小限のローカルState（タブ切り替え等）

❌ **やってはいけないこと:**
- 複雑なビジネスロジックを直接記述
- Repository/Serviceを直接呼び出し（Feature Componentに委譲）
- 巨大なハンドラー関数を量産

**Feature Componentsの設計:**

✅ **特徴:**
- Repository/Serviceとの連携
- 複雑なState管理（useState, useReducer）
- Custom Hooksの活用
- ドメインロジックのカプセル化

*実装パターン例は `src/components/features/` 内の各コンポーネントを参照*

**UI Components（Presentational Component）:**

✅ **原則:**
- ビジネスロジックを持たない
- propsで完全に制御可能
- Repository/Serviceを呼ばない
- State管理は最小限（開閉状態等のUI Stateのみ）

*参考実装: `src/components/ui/` - shadcn/ui の UI Components（Button, Card, Input等）*

#### ベストプラクティス

**Component設計:**

1. **1ファイル = 200行以内を目指す** - 超えたら分割を検討、Feature ComponentとCustom Hookに分ける
2. **Pagesは組み立てに専念** - Feature Componentの組み合わせのみ、ビジネスロジックは持たない
3. **Feature Componentはドメイン単位** - 1機能 = 1Feature Component
4. **Custom Hooksで再利用性を高める** - 複数のFeature Componentで共通利用、テスト容易性の向上
5. **propsのバケツリレーを避ける** - 3階層以上のprops渡しはContext APIを検討

**分割すべきタイミング:**
1. **200行を超えた** → Feature Component + Custom Hook に分割
2. **useState が5個以上** → Custom Hook に抽出
3. **同じロジックを2箇所で使った** → Custom Hook化
4. **ハンドラー関数が50行超え** → Service層 または Custom Hook へ

**データアクセス:**
1. **lib/supabase.js は肥大化させない** - クライアント初期化のみに専念
2. **Model は常に使う** - DBレコードを直接使わず、必ず Model 経由で変換
3. **Repository はテーブル単位** - 1テーブル = 1Repository
4. **Service は機能単位** - Edge Functions のラッパー、外部API連携

### 4.2. TypeScript

AkatsukiはTypeScriptを採用しています。

**TypeScript移行状況:**
- ✅ **Model/Repository/Service/Hook層は完全にTS化済み**
- 🔄 Component/Page層は一部 `.jsx` が残存（段階的移行中）
- 📝 新規ファイルは全て `.tsx` / `.ts` で作成

**型定義の使い方:**
```typescript
import type { EdgeFunctionResponse, AIChatResponse } from '@/types'

const { data, error }: EdgeFunctionResponse<AIChatResponse> =
  await EdgeFunctionService.invoke('ai-chat', { message: 'Hello' })
```

**参考資料:**
- 型定義一覧: `src/types/index.ts`
- 使用例とガイド: `src/types/README.md`
- テストコンポーネント: `/type-test` (開発サーバーでアクセス可能)

### 4.3. 認証アーキテクチャ (Authentication)

Akatsuki では、Supabase Auth を使用した公開/非公開ページ混在型の認証システムを標準実装しています。

#### ルーティングパターン

**Layout.tsx を使った階層化ルーティング:**

```javascript
<BrowserRouter>
  <AuthProvider>
    <Routes>
      {/* Public Routes */}
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Private Routes */}
      <Route element={<PrivateLayout />}>
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>
    </Routes>
  </AuthProvider>
</BrowserRouter>
```

**Layoutバリエーション:**
- `Layout` - デフォルト（max-w-7xl）
- `NarrowLayout` - 狭いコンテンツ用（max-w-4xl）
- `FullWidthLayout` - 全幅（w-full）
- `PrivateLayout` - AuthGuard + Layout

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

**OAuth サポート:**
- Google, GitHub, GitLab, Bitbucket, Azure, Facebook, Twitter, Discord, Slack, Apple など

**ロールベースアクセス制御（RBAC）:**
```javascript
const { profile, isAdmin, isModerator } = useAuth()

if (isAdmin) {
  // 管理者機能
}

// metadata で role を指定
signUp(email, password, {
  username: 'admin_user',
  role: 'admin'  // デフォルトは 'user'
})
```

**利用可能なロール:**
- `user` - 一般ユーザー（デフォルト）
- `admin` - 管理者
- `moderator` - モデレーター

#### ベストプラクティス

1. **AuthProvider は App の最上位に配置**
2. **Public/Private を明確に分離**
3. **RLS（Row Level Security）と連携** - Supabase の RLS が有効な場合、認証済みユーザーのみアクセス可能
4. **Profile 自動作成** - ユーザー登録時に自動的に `profiles` レコードが作成される（Database Trigger）
## 5. 主要機能 (Key Features)

このテンプレートは、AI開発を加速するための基盤を標準搭載しています。

### 5.1. AIGen (AI Generation) 統合基盤

Akatsuki では、複数のAIプロバイダー（OpenAI, Anthropic, Gemini）を統一的に扱える基盤を標準搭載しています。

#### Frontend実装（実装済み）

**useAIGen フック（汎用AI操作）:**
```javascript
const { chat, generateImage, loading, error } = useAIGen('openai')
const response = await chat('こんにちは')
const image = await generateImage('猫の絵')
```

**useImageGeneration フック（画像生成特化）:**

**3つのモード:**

| Mode | 説明 | パラメータ | サポートProvider |
|------|------|------------|------------------|
| **text-to-image** | テキストから画像生成 | prompt: 必須 | DALL-E 3, DALL-E 2, Gemini |
| **variation** | 既存画像の自動バリエーション | image_url: 必須 | DALL-E 2, Gemini |
| **edit** | 画像をプロンプトで編集 | prompt + image_url | Gemini のみ |

**設計思想:**
- ✅ Mode = ユーザーの意図（インフラ知識を漏洩させない）
- ✅ Provider/Model = オプション（デフォルト値で動作）
- ✅ Storage 自動保存（Public/Private選択可能）

*詳細な使用例は `src/pages/ExamplesPage.jsx` を参照*

**実装済み機能:**
- `useAIGen` - プロバイダー切り替え可能なAIフック（chat, chatStream, generateImage, editImage, embed）
- `AIService` - プロバイダー統合層（OpenAI, Anthropic, Gemini対応）
- `AIModel` - モデル定義（DB管理）
- `AIModelRepository` - モデル情報取得（Supabase）
- `ModelSelector` - UIモデル選択コンポーネント

**Supabase Edge Functions:**
- `ai-chat` - AIプロバイダー統一チャットエンドポイント（マルチプロバイダー対応、クォータ管理）
- `generate-image` - AI画像生成エンドポイント（DALL-E, Gemini対応）

#### Akatsuki統一ハンドラーパターン

Supabase Edge Functions で共通的に使用する統一ハンドラーを提供。

**2種類のハンドラー:**

1. **`createAkatsukiHandler`** - ユーザー向けAPI（認証必須）
   - `userClient`: RLS有効（ユーザー自身のデータのみ）
   - `adminClient`: RLSバイパス（Usage等の改ざん防止）

2. **`createSystemHandler`** - システム内部API（Webhook等、認証不要）
   - `adminClient`: RLSバイパス（全データアクセス可能）

**設計の意図:**
- 認証: ハンドラーレベルで自動チェック
- 統一レスポンス: `AkatsukiResponse<T>` 形式
- エラーハンドリング: 統一ハンドラーで自動処理（CORS、バリデーション等）

*実装例: `supabase/functions/ai-chat/index.ts`, `generate-image/index.ts`*

### 5.2. Web検索統合 (Web Search Integration)

AI統合型Web検索機能を標準搭載。2つのプロバイダーから選択可能。

#### 対応プロバイダー

| Provider | 特徴 | 料金 | おすすめ用途 |
|----------|------|------|-------------|
| **Gemini Google検索** (デフォルト) | Google検索統合、自動判断、引用情報 | Gemini料金のみ（検索追加料金なし） | 汎用Web検索、最新情報取得 |
| **Tavily AI Search** | AI特化、構造化データ | $5/月（1000req） | 専門的な検索、複数LLM利用時 |

**推奨**: Gemini利用時はGoogle検索が圧倒的にコスパ良い（追加料金なし）

#### Frontend実装

```javascript
import { WebSearchService } from '@/services/WebSearchService'
import { useWebSearch } from '@/hooks/useWebSearch'

// Service（基本）
const { data, error } = await WebSearchService.search('AIアート 最新動向')

// Hook（React Query）
const { searchAsync, isPending, data } = useWebSearch()
const result = await searchAsync({ query: '...', provider: 'gemini' })
```

**実装済み機能:**
- `WebSearchService` - Web検索統一API
- `useWebSearch` - React Query統合フック
- `WebSearchCard` - プロバイダー切り替えUI付きコンポーネント
- `web-search` Edge Function - マルチプロバイダー検索エンドポイント

### 5.3. 外部連携統合 (External Integrations)

よく使う外部サービス連携の雛形を標準搭載。

#### Slack通知

**実装場所:** `supabase/functions/slack-notify/index.ts`

**用途例:** エラー通知、システムアラート、ステータス更新通知、デプロイ完了通知

**環境変数:** `SLACK_WEBHOOK_URL`

#### Email送信

**実装場所:** `supabase/functions/send-email/index.ts`

**用途例:** パスワードリセットメール、ウェルカムメール、通知メール、レポート送信

**環境変数:** `RESEND_API_KEY`, `EMAIL_FROM`

**使用サービス:** [Resend](https://resend.com/)

#### 拡張方法

新しい外部連携を追加する場合:
1. `supabase/functions/` に新しいFunction作成
2. `createSystemHandler` を使用してハンドラー実装
3. 環境変数に Webhook URL や API Key を設定
4. デプロイ: `npm run supabase:function:deploy`

### 5.4. shadcn/ui コンポーネント

`packages/ui-components/` に shadcn/ui の主要コンポーネントを導入予定。開発者は即座にコンポーネントを利用・カスタマイズ可能。

### 5.5. AI Agent UI Library (`@akatsuki/ai-agent-ui`)

**Location:** `packages/ai-agent-ui/`

テキスト入力フィールドに AI 機能を簡単に追加できる React コンポーネントライブラリ。

#### 特徴

- **Headless Architecture**: Core層（ロジック）とUI層（見た目）を完全分離
- **Provider Pattern**: 複数のAIプロバイダーをサポート（OpenAI, Anthropic, Gemini等）
- **i18n対応**: 英語・日本語の完全サポート（デフォルト: 英語）
- **Type-Safe**: 全コンポーネント・型定義が完全にTypeScript化
- **Zero Config**: デフォルト設定で即座に動作

#### コンポーネント一覧

| コンポーネント | 説明 |
|--------------|------|
| `AITrigger` | AI機能を開くトリガーボタン（✨アイコン） |
| `AIIconSet` | AI機能のメインメニュー（💫生成, 🖌️修正, ←戻す等） |
| `AIDirectionMenu` | 生成方向性の選択パネル（フォーマル、カジュアル等） |
| `AIModelSelector` | AIモデル選択パネル（Fast/Think、Multi-Run対応） |
| `AICommandPanel` | カスタムコマンド入力・保存パネル |
| `AIHistoryList` | 履歴表示・ジャンプパネル |
| `AITokenUsagePanel` | Token使用量・コスト表示パネル |

#### 基本的な使い方

```tsx
import { AIAgentProvider, useAIRegister, useAIUI, AIIconSet, AI_LABELS } from '@akatsuki/ai-agent-ui'

function MyEditor() {
  const [text, setText] = useState('')
  const ai = useAIRegister({ text, onUpdate: setText, provider: 'openai' })
  const uiState = useAIUI()

  return (
    <div className="relative">
      <textarea value={text} onChange={(e) => setText(e.target.value)} />
      <AITrigger onClick={uiState.handlers.toggleMenu} isActive={uiState.ui.isMenuOpen} />
      {uiState.ui.isMenuOpen && (
        <AIIconSet
          actions={ai.actions}
          state={ai.state}
          uiState={uiState.ui}
          uiHandlers={uiState.handlers}
          labels={AI_LABELS.ja}
        />
      )}
    </div>
  )
}
```

#### フォーム連携機能（relatedData）

**他のフォームフィールドの値を AI 生成に反映:**

```tsx
function BlogPostForm() {
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('') // ユーザー入力
  const [content, setContent] = useState('') // AI生成

  const ai = useAIRegister({
    context: {
      scope: 'BlogPost.Content',
      type: 'long_text',
      maxLength: 2000,
      relatedData: {
        title: title,
        summary: summary, // ← これらの値がAIに渡される
      },
    },
    getValue: () => content,
    setValue: (newValue) => setContent(newValue),
  })

  return (
    <>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea value={summary} onChange={(e) => setSummary(e.target.value)} />
      <textarea value={content} onChange={(e) => setContent(e.target.value)} />
      <button onClick={() => ai.actions.generate()}>💫 本文を生成</button>
    </>
  )
}
```

**AIに送られるプロンプト:**
```
【SystemPrompt】
あなたは優秀なコンテンツ生成アシスタントです...

【コンテキスト】
- スコープ: BlogPost.Content
- タイプ: long_text

【関連情報】
- title: React Hooksの基礎
- summary: React Hooksを使った状態管理とライフサイクルの基本を解説

【重要な制約】
生成するテキストは必ず2000文字以内にしてください。
```

**対応する型:**
- `string`, `number`, `boolean`: 読みやすいkey-value形式
- `object`, `array`: 整形されたJSON形式

#### 設計ドキュメント

詳細は以下を参照：
- `packages/ai-agent-ui/README.md` - セットアップ・基本的な使い方
- `packages/ai-agent-ui/CORE_LOGIC_CONSOLIDATION.md` - Core層の設計思想
- `packages/ai-agent-ui/TOKEN_LOGIC_CONSOLIDATION.md` - Token計算ロジック
- `packages/ai-agent-ui/RELATEDDATA_USAGE.md` - relatedDataによるフォーム連携の詳細ガイド

### 5.6. GraphView & RichEditor

**Location:** `src/components/ui/GraphView.tsx`, `RichEditor.tsx`

Reactflow/Lexical の軽量ラッパー。基本的な使い方のみ提供。

- `GraphView` - グラフ可視化（Reactflow）
- `RichEditor` - リッチテキストエディタ（Lexical）

**使い方:** `src/app/examples/` のデモを参照

### 5.7. Export/Import Service

**Location:** `src/services/ExportImportService.ts`

データのエクスポート/インポート機能。Zip形式対応。

```typescript
// Export
const zipBlob = await ExportImportService.exportData(data, 'filename')

// Import
const data = await ExportImportService.importData(file)
```

**設計:** Type-safe、拡張可能なフォーマット定義

---
## 6. 開発ルール (Rules)

ここが最も重要です。「安定性」と「スピード」を維持するため、以下のルールを必ず遵守してください。

### 6.1. ワークフロー (Workflow)

#### DB運用（マイグレーション）

* **`Supabase-dev` 環境を必ず作成し、チームで共有**
* **ローカルでのDB開発は原則禁止**、`Supabase-dev` へ直接変更を加える

**マイグレーション手順:**
```bash
npm run supabase:migration:new create_users_table  # Migration作成
npm run supabase:push                               # Supabaseに適用
```

#### Edge Functions運用

**手順:**
```bash
npm run supabase:function:new my-function           # Function作成
npm run supabase:function:deploy my-function        # デプロイ
npm run supabase:function:deploy                    # 全Functionsデプロイ
```

**Frontend からの呼び出し:**
```javascript
// services/EdgeFunctionService.js に個別関数を追加
export async function callMyFunction(payload) {
  return EdgeFunctionService.invoke('my-function', payload)
}
```

#### 開発用ダミーデータ生成

動作確認用のダミーデータは、`akatsuki api`で作成すると自動生成される。

**基本方針:**
- Seed (seed.sql) = 本当の初期データ（マスターデータ、固定データ）
- workspace/ スクリプト = 開発用の一時的なダミーデータ

**実行方法:**
```bash
cd workspace
node generate-dummy-data.js
```

**ポイント:**
- import path は相対パス（`../packages/app-frontend/src/...`）
- ImageGenerationService を活用（Edge Function経由で画像生成）
- file_id を取得（Storage + file_metadata に自動保存）
- Supabase Client で直接INSERT
- workspace/ は Git管理外（使い捨てスクリプトを自由に）

*詳細な実装例は既存の workspace/ スクリプトを参照*

#### ローカル専用領域 (`workspace/`)

* `.gitignore` されている
* 個人のメモ、下書き、ローカル環境変数（`.env`）などを配置
* 用途例: 個人的な実験コード、外部ライブラリの調査用クローン、機密情報

### 6.2. 環境変数管理

| 対象 | 配置場所 | Git管理 | サンプル |
| :--- | :--- | :--- | :--- |
| **Frontend** | `packages/app-frontend/.env` | ❌ Ignore | `.env.example` あり |
| **Backend** | `packages/app-backend/.env` | ❌ Ignore | `.env.example` あり |
| **個人用** | `workspace/.env` | ❌ Ignore | - |

**重要:** `.env` ファイルは絶対にコミットしない。

### 6.3. バージョン管理 (Version Control)

開発環境の差異を防ぐため、以下を配置しバージョンを統一：

1. `.tool-versions` (asdf, mise用)
2. `.nvmrc` (nvm用)
3. `package.json` の `engines` フィールド

**開発開始時は必ずバージョン管理ツールでインストール:**
```bash
nvm use           # nvmの場合
asdf install      # asdf/miseの場合
```

### 6.4. ドキュメンテーション・ポリシー (Documentation)

| ファイル/ディレクトリ | 役割 | Git管理 |
| :--- | :--- | :--- |
| **`README.md`** | プロジェクト概要・最速起動 | ⭕️ Commit |
| **`AGENT.md`** | 設計思想・アーキテクチャ・ルール | ⭕️ Commit |
| **`issue.md`** | プロジェクトのマスタープラン | ⭕️ Commit |
| **`docs/guide/`** | 再利用可能な「手順書」 | ⭕️ Commit |
| **`docs/`**(その他) | 設計メモ、ADR、議事録など | ⭕️ Commit |
| **`workspace/`** | 個人の作業場・下書き | ❌ **Ignore** |

**ルール:**
- チームで共有すべき情報は必ず `docs/` 配下にコミット
- 個人的なメモや実験は `workspace/` に配置
- 環境変数やシークレットは絶対にコミットしない

### 6.4. VibeCoding実践ガイド

#### 6.4.1. QuickStart Checklist（実装開始前の1分確認）

```
□ Step 1: 要件を整理
   → workspace/[feature-name]-design.md に下書き

□ Step 2: テンプレート参考（自由に設計）
   → 8.9を見て、近いパターンを把握
   → 要件に合わせて自由にカスタマイズ（そのまま適用しない）
   → ExamplePage/AdminPageで実装パターンを調査

□ Step 3: 設計整理
   → 画面数・ルーティング（3-5画面推奨）
   → アーキテクチャ設計（Entity・DB/データフロー・レイヤー）
   → Schema設計（Entity + RLS）
   → コンポーネント設計（Hook → Component → Page）
 
□ Step 4: TodoWrite でタスク管理開始
   → Phase分割は内部管理、ユーザーへの中間報告は不要

□ Step 5: 設計をもとに実装
   → CRUDコード自動生成他`akatsuki`コマンドを利用
   → 詰まったら報告、それ以外は進める

□ Step 6: 動作確認
   → 自動生成されたダミーデータ → 画面確認

□ Step 7: 振り返り（完了後）
   → docs/ に設計ドキュメント整理
```

**参照セクション:**
- DB設計 → 6.1（マイグレーション）
- Component設計 → 4.1（アーキテクチャパターン）
- テンプレート → 8.9（VibeCoding Design Templates）
- トラブル対応 → 9.2（VibeCoding中のよくあるトラブル）

#### 6.4.2. 実装の進め方（基本姿勢）

**VibeCodingの本質: スピード重視、要件を動かすことを最優先**

**実装時のルール:**

1. **Phase分けは内部管理でOK** - TodoWriteツールでPhaseを管理、ユーザーへの中間報告は不要
2. **相談が必要な時のみ停止** - 技術的に詰まった時、重要な設計判断が必要な時、ユーザーが明示的に相談を求めた時のみ
3. **品質はAGENT.mdのルールとExampleで担保** - Repository/Modelパターン徹底、統一ハンドラー使用、RLS設計を最初から考慮、ExamplePageや初期実装を必ず調査

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
ー＞確認は不要
```

#### 6.4.3. VibeCoding Design Framework（設計ドキュメント作成）

**設計整理は必須** - 新機能を実装する前に、`workspace/[feature-name]-design.md` に書き出す。

**✨ 新機能: Design Template Generator**

```bash
# 設計ドキュメントを自動生成
npm run design:new <feature-name>

# 例
npm run design:new user-dashboard
# → workspace/user-dashboard-design.md が作成される
```

**テンプレートの特徴:**
- 💡 **"Feel free to customize!"** マーカー - カスタマイズポイントを明示
- 🎨 **カラーバリエーション選択肢** - AGENT.md L954-1000参照
- 📐 **レイアウトパターン** - 1-pane/2-pane/3-paneから選択
- 📝 **事前対話メモ** - ユーザーとの対話内容を記録

**テンプレート項目:**
1. **事前対話メモ** - ユーザーとの対話内容（カラー、レイアウト等）
2. **ユーザーの本当のニーズ** - WHY/WHO/WHAT
3. **ユースケース展開** - メインフロー/サブフロー/エッジケース
4. **画面構成（UX重視）** - カラーテーマ、レイアウトパターン、ASCII WireFrame
5. **DB設計** - テーブル定義（SQL）、RLS Policy設計
6. **使用するAkatsuki機能** - 実装済み機能、新規作成が必要な機能
7. **アーキテクチャ層** - Models/Repositories/Services/Hooks/Components
8. **実装ステップ** - Phase 1-8のチェックリスト
9. **重要な設計判断** - なぜこの設計にしたか、セキュリティ考慮事項
10. **参考資料** - 既存実装パターンへのリンク

**Design Frameworkの本質:**

❌ **従来のTemplate/Theme（固定化）:**
- WordPressテンプレート的
- 「そのまま適用」を想定
- カスタマイズしにくい

✅ **VibeCoding Design（対話と柔軟性）:**
- 「思考の出発点」
- ユーザーとの対話で決定（カラー、レイアウト等）
- 要件に応じて自由にカスタマイズ
- 実装の「地図」であり「羅針盤」

**ワークフロー:**
1. **CLI実行**: `npm run design:new <feature-name>`
2. **対話で確認**: カラー、レイアウト、画面数などをユーザーと確認
3. **テンプレート記入**: 対話内容を「事前対話メモ」に記録、各セクション埋める
4. **Example調査**: ExamplePage/AdminPage、既存実装を調査
5. **実装開始**: 設計を見ながらVibeCoding
6. **完了後**: `docs/examples/` にコミット（成功事例として蓄積）

**参考資料:**
- Template: `docs/templates/design-template.md`
- 実例: `docs/examples/agent-asset-hub-design.md`

**ポイント:**
- ✅ 対話を最優先 - 「カラフルで楽しい感じ」等のニュアンスを反映
- ✅ 自由にカスタマイズ - "Feel free!"マーカーを活用
- ✅ 最小限の整理で開始 - 完璧を求めない
- ✅ Example活用 - 車輪の再発明を避ける
- ✅ RLS設計を最初から - 後付けは不整合の元
- ✅ workspace → docs/examples - 成功事例として蓄積

#### 6.4.4. よくある質問（FAQ）

**Q1: テンプレートはどう使えば良い？**
- セクション8.9を見て、近いパターンを把握
- 要件に応じて自由にカスタマイズ（そのまま適用しない）
- VibeCodingはテンプレートエンジンではなく、自由度の高い設計が本質

**Q2: 実装中に詰まったら？**
- セクション9.2「VibeCoding中のよくあるトラブル」を参照

**Q3: Component分割のタイミングは？**
- セクション4.1「Component分割の判断基準（The 200-Line Rule）」を参照
- 200行超え/useState 5個以上/ハンドラー50行超えで分割

**Q4: workspace/ に何を置けば良い？**
- 設計ドキュメントの下書き、ダミーデータ生成スクリプト、個人的なメモ、実験コード、環境変数

**Q5: ユーザーに確認が必要なタイミングは？**
- 技術的に詰まった時、重要な設計判断が必要な時、ユーザーが明示的に相談を求めたに行う

#### 6.4.5. 実装時のベストプラクティス（最重要）

**既存コードを最優先で参照せよ**

**参考資料の優先順位:**
```
既存コード > Design Templates > ドキュメント内のサンプルコード
```

**1. 既存の実装パターン（最優先）**
- `src/models/UserProfile.ts` - Model層の実装パターン
- `src/repositories/UserProfileRepository.ts` - Repository層の実装パターン
- `src/hooks/usePublicProfile.ts` - React Query統合パターン
- `src/pages/ExamplesPage.jsx` - 全機能のデモ実装
- `src/pages/AdminDashboard.jsx` - ダッシュボード実装パターン

**利点:** ✅ TypeScript型定義が正確、✅ 実際に動作している、✅ Akatsukiのベストプラクティスに準拠

**2. Design Templates（参考）**
- セクション 8.9 を見て、近いパターンを把握
- ⚠️ そのままコピペせず、要件に応じてカスタマイズ
- ⚠️ テンプレートはあくまで「参考」
- ✅ 既存コードと組み合わせて使う

**3. QuickStart Checklist（フロー確認）**
- セクション 6.4.1 でフロー確認

### 6.5. ライブラリ (Lib) 管理ポリシー

#### 1. 内部ライブラリ (Monorepo Internal)

- `packages/` ディレクトリ配下（Git管理対象）
- `workspace:*` によるローカル参照を推奨

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

- `npm link` や `path:` 指定による**ローカルパス参照は原則禁止**
- 元のリポジトリ側をクリーンに修正・Publish後、`package.json`のバージョンを更新

**✅ 推奨例:**
```json
{
  "dependencies": {
    "llm-toolkit": "^1.2.3"  // OK: 公開バージョン指定
  }
}
```

#### 3. `workspace/` とコード参照

- 外部ライブラリのコードを「読むため」に `workspace/` へ `git clone` するのは自由
- ただし、依存関係としてリンクすることは厳禁

### 6.6. Gitコミットポリシー

* **コミットメッセージ:** 簡潔かつ明確に（何を変更したか）
* **`.gitignore`:** 以下は必ず除外
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

**1. デフォルト（AIアプリ向け）- ピンク/パープル/ブルー**
```css
bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100
bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-transparent bg-clip-text
bg-gradient-to-r from-pink-500 to-purple-600
```

**2. ビジネス/企業向け - ダーク/ブルートーン**
```css
bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800
bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 text-transparent bg-clip-text
bg-gradient-to-r from-blue-600 to-cyan-600
```

**3. ヘルスケア/ウェルネス - グリーン/ミント**
```css
bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50
bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-transparent bg-clip-text
```

**4. エンタメ/クリエイティブ - オレンジ/イエロー**
```css
bg-gradient-to-br from-orange-100 via-yellow-100 to-pink-100
bg-gradient-to-r from-orange-500 via-yellow-500 to-pink-500 text-transparent bg-clip-text
```

**5. Eコマース/ショッピング - パープル/ピンク**
```css
bg-gradient-to-br from-purple-100 via-pink-100 to-rose-100
bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 text-transparent bg-clip-text
```

**6. ダークモード対応**
```css
bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900
bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 text-transparent bg-clip-text
bg-slate-800/50 backdrop-blur-lg border border-slate-700
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

#### 主要パターン一覧

1. **Hero Section（ヒーローセクション）** - トップページの第一印象
   - `min-h-screen`, `bg-gradient-to-br`, `text-6xl`, `bg-clip-text`, `Button variant="gradient"`

2. **Feature Cards（機能カード）** - 機能紹介、メニュー選択
   - `grid md:grid-cols-3`, `Card`, `hover:border-pink-300`, lucide-reactアイコン

3. **Image Gallery（画像ギャラリー）** - 生成画像の表示、作品一覧
   - `grid grid-cols-2 md:grid-cols-3`, `group`, `hover:scale-105`, `hover:shadow-2xl`

4. **Step-by-Step UI（ステップ式UI）** - 複数ステップの作成フロー
   - `Progress`, `useState(currentStep)`, 条件分岐でStep表示

5. **Loading & Empty States（ローディング・空状態）** - データ取得中、データなし
   - `animate-spin`, `flex items-center justify-center`, lucide-reactアイコン

6. **Image Upload Preview（画像アップロードプレビュー）** - ファイルアップロード時のプレビュー
   - `relative`, `absolute top-2 right-2`, `rounded-xl shadow-lg`

**詳細な実装例:** `src/pages/ExamplesPage.jsx` および `src/pages/HomePage.jsx` を参照

### 推奨する視覚要素

#### グラデーション配色パターン

```css
/* 背景グラデーション */
bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100
bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50
bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50

/* テキストグラデーション */
bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-transparent bg-clip-text

/* ボタン・カードグラデーション */
bg-gradient-to-r from-pink-500 to-purple-600
bg-gradient-to-r from-blue-500 to-cyan-600
bg-gradient-to-r from-orange-500 to-pink-600
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

### カテゴリ別標準設計

#### プリクラ系アプリ
**画面数:** 3-5画面

**推奨フロー:**
```
ホーム → ステップ式作成 → 写真生成 → ギャラリー
```

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

### 8.9. VibeCoding Design Templates（実装の参考パターン集）

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

**画面構成:** `HomePage (/) → CreationPage (/create) → GalleryPage (/gallery)`

**DB設計:**
```sql
profiles                    -- ユーザープロフィール（実装済み）
file_metadata              -- 生成画像（実装済み）
user_quotas                -- 使用制限（実装済み）
creation_templates         -- 作成テンプレート（新規）
user_creations             -- ユーザー作成物（新規）
```

**実装レイヤー:**
- Models: UserProfile.js (実装済み), CreationTemplate.js (新規)
- Repositories: UserProfileRepository.js (実装済み), CreationTemplateRepository.js (新規)
- Services: ImageGenerationService.js (実装済み), PublicStorageService.js (実装済み)
- Hooks: useAIGen.js (実装済み), useImageGeneration.js (新規)
- Components: AuthGuard, TopNavigation, FileUpload (実装済み), CreationFlow, TemplateSelector, ImageGallery (新規)

**Edge Functions:** generate-image, upload-file (実装済み)

**実装フロー:**
1. Migration作成 → 2. Model作成 → 3. Repository作成 → 4. Custom Hook作成 → 5. Feature Components作成 → 6. Pages作成 → 7. Routing設定

---

#### Template 2: LLMチャットアプリ

**画面構成:** `HomePage (/) → ChatPage (/chat) → HistoryPage (/history)`

**DB設計:**
```sql
profiles                   -- ユーザープロフィール（実装済み）
ai_models                  -- AIモデル情報（実装済み）
llm_call_logs              -- LLM呼び出し履歴（実装済み）
user_quotas                -- 使用制限（実装済み）
chat_sessions              -- チャットセッション（新規）
chat_messages              -- チャットメッセージ（新規）
```

**実装レイヤー:**
- Models: AIModel.js, UserProfile.js (実装済み), ChatSession.js, ChatMessage.js (新規)
- Repositories: AIModelRepository.js, UserQuotaRepository.js (実装済み), ChatSessionRepository.js, ChatMessageRepository.js (新規)
- Services: AIService.js, EdgeFunctionService.js (実装済み)
- Hooks: useAIGen.js (実装済み), useChatSession.js (新規)
- Components: AuthGuard, TopNavigation (実装済み), ChatCard, MessageList, ModelSelector (新規)

**Edge Functions:** ai-chat (実装済み - OpenAI/Anthropic/Gemini対応)

**実装フロー:** Migration → Model → Repository → Hook → Components → Pages → Routing

---

#### Template 3: ファイル管理アプリ

**画面構成:** `HomePage (/) → UploadPage (/upload) → FilesPage (/files)`

**DB設計:**
```sql
profiles                   -- ユーザープロフィール（実装済み）
file_metadata              -- ファイルメタデータ（実装済み）
file_folders               -- フォルダ（新規）
```

**実装レイヤー:**
- Models: UserProfile.js (実装済み), FileMetadata.js, FileFolder.js (新規)
- Repositories: FileMetadataRepository.js (実装済み), FileFolderRepository.js (新規)
- Services: PublicStorageService.js, PrivateStorageService.js (実装済み)
- Hooks: useFileUpload.js (新規)
- Components: AuthGuard, FileUpload (実装済み), FileList, FolderTree (新規)

**Edge Functions:** upload-file, delete-file, get-signed-url, create-signed-url (実装済み)

**実装フロー:** Migration → Model → Repository → Hook → Components → Pages → Routing

---

#### Template 4: ダッシュボード（データ可視化）

**画面構成:** `HomePage (/) → DashboardPage (/dashboard) → ReportsPage (/reports)`

**DB設計:**
```sql
profiles                   -- ユーザープロフィール（実装済み）
user_usage_stats           -- 使用統計（実装済み）
metrics                    -- メトリクス（新規）
reports                    -- レポート（新規）
```

**実装レイヤー:**
- Models: UserProfile.js (実装済み), UserUsageStats.js, Metric.js (新規)
- Repositories: UserUsageStatsRepository.js (実装済み), MetricRepository.js (新規)
- Services: EdgeFunctionService.js (実装済み)
- Hooks: useMetrics.js (新規)
- Components: AuthGuard (実装済み), MetricsCard, ChartCard, StatsOverview (新規)
- UI Components: card.jsx, chart.jsx (Recharts統合), table.jsx, badge.jsx

**Edge Functions:** generate-report (新規作成)

**実装フロー:** Migration → Model → Repository → Edge Function → Hook → Components → Pages → Routing

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
   cat packages/app-frontend/.env
   cat packages/app-backend/.env
   ```

5. **Supabase接続確認:**
   - SupabaseダッシュボードでプロジェクトがActiveか確認
   - DATABASE_URLのパスワードが正しいか確認

---

### 9.2. VibeCoding中のよくあるトラブル

実装中に発生しやすい問題と解決方法を記載します。

#### ケース1: Edge Function が 500 エラー

**症状:**
- Edge Function呼び出しが500エラーで失敗
- フロントエンドでエラーメッセージが表示されない

**診断方法:**
```bash
npx supabase functions logs ai-chat --tail
npx supabase functions logs generate-image --tail
```

**よくある原因と解決:**

1. **Secrets未設定**
   ```bash
   npx supabase secrets list
   npx supabase secrets set OPENAI_API_KEY=sk-...
   ```

2. **CORS設定漏れ**
   - 統一ハンドラー（createAkatsukiHandler, createSystemHandler）を使用していれば自動対応済み

3. **認証エラー**
   ```typescript
   createAkatsukiHandler(req, {
     requireAuth: true,  // ← これを忘れずに
   })
   ```

4. **入力バリデーションエラー**
   ```typescript
   createAkatsukiHandler<Input, Output>(req, {
     inputSchema: InputSchema,  // ← バリデーション自動実行
   })
   ```

---

#### ケース2: RLSでデータ取得できない

**症状:**
- ログイン済みなのに、自分のデータが取得できない
- `profiles` テーブルが空配列で返ってくる

**診断方法:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
SELECT auth.uid();  -- null の場合は未ログイン
```

**よくある原因と解決:**

1. **Policy未作成**
   ```sql
   CREATE POLICY "Users can read own profile"
     ON profiles FOR SELECT
     USING (auth.uid() = user_id);
   ```

2. **auth.uid() が null** - ログイン状態確認、認証チェック

3. **adminClient 使うべき箇所で userClient を使用**
   ```typescript
   // ❌ 悪い例: Usage更新をuserClientで実行（RLSで拒否される）
   await userClient.from('user_quotas').update({ usage: usage + 1 })

   // ✅ 良い例: Repos経由でadminClient使用（改ざん防止）
   await repos.userQuota.incrementUsage(quotaId)
   ```

---

#### ケース3: Repository/Model で型エラー

**症状:**
- `UserProfile.fromDatabase is not a function`
- `Cannot read property 'toDatabase' of undefined`

**よくある原因と解決:**

1. **fromDatabase() の実装漏れ**
   ```javascript
   // ✅ 必ず fromDatabase() と toDatabase() を実装
   class UserProfile {
     static fromDatabase(data) {
       return new UserProfile({
         userId: data.user_id,       // snake_case → camelCase
         username: data.username,
       })
     }

     toDatabase() {
       return {
         user_id: this.userId,       // camelCase → snake_case
         username: this.username,
       }
     }
   }
   ```

2. **Repository で Model を使わずに直接返す**
   ```javascript
   // ❌ 悪い例: DBレコードを直接返す
   return data  // snake_case のまま

   // ✅ 良い例: Model 経由で変換
   return UserProfile.fromDatabase(data)
   ```

3. **import 漏れ**
   ```javascript
   import { UserProfile } from '../models/UserProfile'
   ```

---

#### ケース4: Migration適用できない

**症状:**
- `npm run supabase:push` がエラー
- `duplicate key value violates unique constraint`

**診断方法:**
```bash
npx supabase migration list
```

**よくある原因と解決:**

1. **既存データとの競合**
   ```sql
   -- ❌ 悪い例: 既存データがあるのに NOT NULL 制約追加
   ALTER TABLE profiles ADD COLUMN role TEXT NOT NULL;

   -- ✅ 良い例: DEFAULT 値を設定
   ALTER TABLE profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
   ```

2. **Migration順序の問題** - タイムスタンプ確認

3. **手動でDBを変更してしまった** - Migration に反映

---

#### ケース5: EdgeFunctionService のレスポンス形式エラー

**症状:**
- Edge Functionは成功しているのに、サービス層で「データがない」エラー
- `No image data returned` などのエラーメッセージ

**診断方法:**
```javascript
const { data, error } = await EdgeFunctionService.invoke('generate-image', {...})
console.log('[Debug] EdgeFunctionService response:', { data, error })
```

**原因:**
`EdgeFunctionService.invoke()` は **`{ data, error }` 形式** を返します。

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
  return { data: null, error }
}

if (!data || !data.image_data) {
  return { data: null, error: new Error('No image data returned') }
}

console.log(data.image_data)
```

**重要:**
- すべてのServiceは `{ data, error }` 形式を返す（統一仕様）
- **エラー時も throw しない**: `{ data: null, error: Error }` を返す
- 呼び出し側で必ず `error` チェックを行う
- React Query との相性が良い設計

---

#### Akatsuki固有のベストプラクティス

**統一ハンドラーパターン（最重要）:**
```typescript
import { createAkatsukiHandler } from '../_shared/handler.ts'

Deno.serve(async (req) => {
  return createAkatsukiHandler(req, {
    requireAuth: true,
    inputSchema: InputSchema,
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
const data = await UserProfileRepository.findByUserId(userId)
const profile = UserProfile.fromDatabase(data)  // snake_case → camelCase
await UserProfileRepository.update(userId, profile.toDatabase())
```

**RLS設計を最初から（重要）:**
```sql
CREATE TABLE profiles (...);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);
```

**Edge Functions ログ確認（トラブル時必須）:**
```bash
npx supabase functions logs ai-chat --tail
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
   - Default models: `gpt-4o-mini`, `claude-sonnet-4-5-20250929`, `gemini-2.5-flash`

2. **upload-file** - ファイルアップロード
   - Public/Private バケット対応、最大サイズ: 10MB

3. **create-signed-url** - Signed URL 生成（プライベートファイル用）

### Storage Buckets

1. **uploads** (Public)
   - 公開ファイル用、RLS: ユーザーは自分のフォルダにアップロード可能、誰でも読み取り可能

2. **private_uploads** (Private)
   - プライベートファイル用、RLS: ユーザーは自分のファイルのみアクセス可能、Signed URL必須

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

**使用例:**
```javascript
// Frontend: ジョブ起動
const event = await EventService.emit('job:generate-report', {
  reportType: 'sales',
  startDate: '2025-01-01',
  endDate: '2025-01-31'
})

// 進捗監視（Realtime自動更新）
const { progress, isCompleted, result } = useJob(event.id, {
  onComplete: (result) => {
    toast.success('レポート生成完了！')
  }
})

// UI表示
<JobProgress jobId={event.id} title="Sales Report" />
```

**実装済みジョブタイプ:**
- `job:generate-report` - レポート生成（サンプル実装）

**デモ:** `/examples` ページで動作確認可能

詳細な実装例は `docs/design/async_job_system.md` および `supabase/functions/execute-async-job/handlers.ts` を参照してください。

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

**is_admin() 実装例:**
(詳細は Migration ファイルを参照)

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

(実装例は `supabase/functions/execute-async-job/handlers.ts` を参照)

**4. 実行ログを確認**

`/admin/function-calls` にアクセス:
- 成功/失敗、引数・結果、実行時間、LLM呼び出しとの紐付け

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

(詳細な実装例は `supabase/functions/execute-async-job/handlers.ts` を参照)

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
- Function一覧・作成・編集・削除、JSON Schema編集、有効/無効切り替え、Global/User切り替え

**実行ログ閲覧:** `/admin/function-calls`
- 実行履歴一覧、フィルター（Function名、ステータス）、詳細表示（引数、結果、エラー）、統計情報

---
## 12. RAG File Search System（知識ベース統合）

### 12.1. 概要

AkatsukiはRAG（Retrieval-Augmented Generation）機能を統合し、複数のFile Search Providerに対応した堅牢なファイル管理システムを提供します。

**特徴:**
- ✅ **Provider抽象化**: Gemini/OpenAI/Pinecone/AnythingLLM等に対応
- ✅ **ハイブリッドストレージ**: Supabase Storage + Provider両方にファイルを保存
- ✅ **2-step Upload Flow**: ファイルアップロードとインデックス化を分離
- ✅ **型安全性**: 厳密な型定義でパラメータミスを防止

### 12.2. アーキテクチャ

```
┌─────────────────────────────────────────────┐
│ Frontend: FileSearchService.ts              │
│ - 統一されたAPI                             │
│ - Provider抽象化                            │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ Edge Functions (2-step flow)               │
│                                             │
│ Step 1: file-upload (汎用的)                │
│   - Supabase Storageにアップロード          │
│   - filesテーブル作成                       │
│   OUTPUT: file_id                           │
│                                             │
│ Step 2: knowledge-file-index (RAG専用)      │
│   - file_idからファイル取得                 │
│   - Providerにインデックス化                │
│   - knowledge_filesテーブル作成             │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ Provider Client Layer                       │
│                                             │
│ RAGProviderInterface (共通IF)               │
│  ├─ GeminiRAGClient      [実装済み]         │
│  ├─ OpenAIRAGClient      [TODO]            │
│  ├─ PineconeRAGClient    [TODO]            │
│  └─ AnythingLLMClient    [TODO]            │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ Database                                    │
│                                             │
│ files (Supabase Storage管理)                │
│  ↓ file_id                                  │
│ knowledge_files (関係テーブル)               │
│  ↓ store_id                                 │
│ file_search_stores (RAG Store管理)          │
│  ↓ provider                                 │
│ Provider Storage (Gemini/OpenAI/etc.)       │
└─────────────────────────────────────────────┘
```

### 12.3. Frontend Service

#### FileSearchService

**Location:** `packages/app-frontend/src/services/FileSearchService.ts`

統一されたAPIを提供（2-step flowを内部で実行）：

```typescript
import { FileSearchService } from '@/services/FileSearchService'

// 1. Create Store
const { data: storeData } = await FileSearchService.createStore('My Knowledge Base', {
  provider: 'gemini'
})

// 2. Upload File (2-step flow internally)
const { data: uploadData } = await FileSearchService.uploadFile(storeData.store.id, file, {
  provider: 'gemini'
})

// 3. RAG Chat
const { data: chatData } = await FileSearchService.chatWithRAG(
  'このドキュメントについて教えて',
  [storeData.store.id],
  { provider: 'gemini', model: 'gemini-2.0-flash-exp' }
)

// 4. List Files
const { data: filesData } = await FileSearchService.listFiles(storeData.store.id)

// 5. Delete Store
await FileSearchService.deleteStore(storeData.store.id)
```

**内部動作（2-step flow）:**
```typescript
// uploadFile() internally:
// Step 1: file-upload Edge Function → get file_id
// Step 2: knowledge-file-index Edge Function → index to provider
```

### 12.4. RAG Chat統合（ai-chat）

**Location:** `supabase/functions/ai-chat/index.ts`

File Search機能はai-chatに統合されています：

```typescript
// INPUT
{
  provider: 'gemini' | 'openai' | 'anthropic',
  prompt: string,
  model?: string,
  fileSearchStoreIds?: string[], // RAG用のStore ID配列
  enableFileSearch?: boolean
}

// OUTPUT
{
  response: string,
  grounding_metadata?: {
    search_results: [...],
    citations: [...]
  }
}
```

### 12.5. 新しいProviderの追加方法

**Step 1: Provider Client実装**

1. `supabase/functions/_shared/providers/new-provider-rag-client.ts` を作成
2. `RAGProviderInterface` を実装

**Step 2: Factory登録**

`rag-provider-factory.ts` に追加（詳細は実装を参照）

**Step 3: Migration更新**

`file_search_stores` のCHECK制約を更新

**Step 4: Frontend型更新**

`FileSearchService.ts` の型定義を更新

### 12.6. ベストプラクティス

**ファイルアップロード:**
- ✅ 2-step flowを使用（Storage → Indexing）
- ✅ private_uploadsバケットを使用（RAGファイル用）
- ✅ metadata にpurpose: 'rag'を設定
- ✅ エラーハンドリング（Storage失敗時のクリーンアップ）

**Provider実装:**
- ✅ RAGProviderInterfaceを厳密に実装
- ✅ エラーメッセージは明確に
- ✅ 一時ファイルは必ず削除

**セキュリティ:**
- ✅ RLSで全テーブルを保護
- ✅ files.owner_id で所有権を検証
- ✅ file_search_stores.user_id で権限確認

**型安全性:**
- ✅ file_id/store_id/provider_file_nameを明確に区別

### 12.7. 設計ドキュメント

詳細な設計ドキュメントは以下を参照：
- `docs/design/rag-file-search-architecture.md` - アーキテクチャ全体像
- `docs/design/rag-provider-abstraction.md` - Provider抽象化パターン
- `docs/design/rag-2step-upload-flow.md` - 2-step Upload Flow設計

---

## 13. WASM Runtime Component

### 13.1. 概要

**WebAssembly (WASM) Runtime Component** は、ブラウザ上で安全にWASMモジュールを実行・管理するための統合プラットフォームです。

**提供価値:**
- 🔒 **安全性**: タイムアウト制御、メモリ管理、エラーハンドリング
- 📦 **モジュール管理**: アップロード、バージョン管理、公開/非公開設定
- ⚡ **高性能**: モジュールキャッシング、CDN配信（Public）
- 🎯 **簡単**: React Hooksで即座に利用可能

**使用例:**
- カスタム計算ロジックの実行
- ユーザー提供コードのサンドボックス実行
- 高速な数値計算処理
- 実行可能なデモ・チュートリアル

### 13.2. アーキテクチャ

**レイヤー構成:**
```
UI Layer          → WasmRuntimeCard, WasmModuleUploaderCard
Hook Layer        → useWasmModule (React Query)
Service Layer     → WasmRuntimeService (実行エンジン)
Repository Layer  → WasmModuleRepository, WasmExecutionRepository
Model Layer       → WasmModule, WasmExecution
Database          → wasm_modules, wasm_executions (PostgreSQL)
Storage           → public_assets / private_uploads (Supabase Storage)
```

**主要コンポーネント:**

1. **WasmRuntimeService** (`services/WasmRuntimeService.ts`)
   - WASMモジュールのコンパイル・実行
   - タイムアウト制御 (デフォルト5秒)
   - メモリ使用量監視
   - モジュールキャッシング
   - 関数一覧取得

2. **WasmModuleRepository** (`repositories/WasmModuleRepository.ts`)
   - モジュールのCRUD操作
   - 公開/非公開管理
   - バージョン管理
   - ユーザーフレンドリーなエラーメッセージ

3. **useWasmModule Hook** (`hooks/useWasmModule.ts`)
   - React Query統合
   - モジュール一覧取得
   - WASM関数実行
   - モジュール削除

### 13.3. データベーススキーマ

**wasm_modules テーブル:**

* wasm_modules
* wasm_executions

### 13.4. Storage設定

**Public Storage (public_assets):**
- CDN配信可能
- 永続的な公開URL
- デモ・OSS向け
- 50MB上限
- `allowed_mime_types`: `['application/wasm', ...]`

**Private Storage (private_uploads):**
- 署名付きURLのみアクセス可能
- RLSで権限管理
- 機密コード向け
- 50MB上限
- `allowed_mime_types`: `['application/wasm', ...]`

### 13.5. 使用方法

**アップロード UI:**
- `ExamplesPage` に `WasmModuleUploaderCard` が実装済み
- 公開/非公開選択
- 自動的な関数検出
- バージョン管理
- エラーメッセージ（重複検出など）

### 13.6. セキュリティ

**RLS Policies:**
- ✅ ユーザーは自分のモジュールのみ管理可能
- ✅ 公開モジュールは誰でも読み取り可能
- ✅ 実行履歴は所有者のみアクセス可能

**実行時保護:**
- ✅ タイムアウト制御（無限ループ防止）
- ✅ メモリ使用量監視
- ✅ サンドボックス実行（ブラウザWASM環境）

### 13.7. ベストプラクティス

**モジュール作成:**
- ✅ `-C link-arg=-s` フラグでバイナリサイズ削減
- ✅ 単純な計算ロジックから始める
- ✅ 関数名は明確に（`add`, `calculate`, etc.）

**設計ドキュメント:**
- `docs/design/wasm-runtime-design.md`
- `docs/design/wasm-edge-integration.md`

### 13.8. Edge Function統合（推奨）

**2025-11実装:** WASM Edge Function統合により、ブラウザ実行とサーバーサイド実行の両方をサポート。

**なぜEdge Function？**
- ✅ **シンプル**: Shuttleより設定が簡単（`wasm-executor` Edge Function 1つ）
- ✅ **高速デプロイ**: `akatsuki function deploy` で即座にデプロイ（Dockerレス）
- ✅ **管理が楽**: Supabase ダッシュボードで一元管理
- ✅ **自動スケール**: Supabase Edge Runtime の恩恵
- ✅ **Storage統合**: WASM バイナリを Storage から動的ロード + LRU キャッシュ

**Shuttleとの比較:**
| 項目 | Edge Function | Shuttle |
|------|---------------|---------|
| デプロイ速度 | ⚡ 即座（1-2秒） | 🐢 遅い（ビルド数分） |
| 設定 | シンプル（Edge Function 1つ） | 複雑（Cargo.toml、プロジェクト構成） |
| 管理 | Supabase ダッシュボード | 別サービス |
| WASM動的ロード | ✅ Storage + キャッシュ | ❌ 静的埋め込み |
| スケーリング | 自動 | 手動設定必要 |

**推奨:** カスタムロジック実行には WASM Edge Function を優先。Shuttleは重い処理や外部API統合が必要な場合のみ。

**owner_type分類:**
```typescript
type OwnerType = 'system' | 'admin' | 'user'

// system: 全ユーザーが実行可能（公式モジュール）
// admin:  管理者のみ実行可能（管理ツール）
// user:   個人モジュール（Public/Private選択可）
```

**Admin UI:**
- `/admin/wasm` - System/Admin/User タブでモジュール管理
- アップロード、テスト実行、削除
- Edge Function 実行結果表示（実行時間、メモリ、キャッシュヒット）

**Hook拡張:**
```typescript
const {
  systemModules,      // システムモジュール一覧
  adminModules,       // 管理者モジュール一覧
  executeOnEdge,      // Edge Function で実行
  executeOnEdgeAsync, // Async版
} = useWasmModule()
```

**サンプルモジュール:**
`wasm-modules/sample-module` に5つのテスト関数を実装済み（75KB）：
- `rgb_to_grayscale`, `sum_array`, `multiply_array`, `process_json`, `memory_test`

---

## HEADLESS API Generator（フルスタックCRUD自動生成）

YAMLスキーマから、Backend（Migration + Edge Function）〜 Frontend（Model + Service + Hook + UI）まで一括生成する最速開発ツール。

**生成されるファイル:**
```
Backend (Supabase):
├── supabase/migrations/YYYYMMDD_create_{table}_table.sql  # Migration + RLS + Indexes
├── supabase/functions/{table}-crud/index.ts               # Edge Function (createAkatsukiHandler)
├── supabase/functions/{table}-crud/schema.ts              # Zod Validation Schema
└── supabase/functions/_shared/repositories/{Entity}Repository.ts

Frontend (React):
├── src/models/{Entity}.ts              # Model (fromDatabase/toDatabase)
├── src/services/{Entity}Service.ts     # Service (EdgeFunctionService wrapper)
├── src/hooks/use{Entity}s.ts           # React Query Hook (CRUD + mutations)
├── src/pages/admin/entities/{Entity}AdminPage.tsx    # Admin管理画面
└── src/components/features/{table}/{Entity}sDemo.tsx # Demo Card

CLI:
└── packages/app-cli/clients/{Entity}sClient.js  # Node.js CLIクライアント
```

**使用例:**
```bash
# 1. スキーマファイル作成 (docs/templates/article-schema-example.yaml 参照)
# 2. コード生成
akatsuki api new Article --schema article-schema.yaml

# 3. 生成後のNext steps:
akatsuki db push                           # Migration適用
akatsuki function deploy articles-crud     # Edge Function デプロイ
# App.tsx に Route 追加、ExamplesPage に Demo 追加
```

**スキーマ例 (YAML):**
```yaml
name: Article
tableName: articles

fields:
  - name: id
    type: uuid
    primaryKey: true
    default: gen_random_uuid()
  - name: userId
    type: uuid
    references: auth.users(id)
    onDelete: CASCADE
  - name: title
    type: string
    required: true
  - name: status
    type: enum
    enumValues: [draft, published]
    default: draft

operations:
  - type: list
  - type: get
  - type: create
  - type: update
  - type: delete

rls:
  - action: SELECT
    using: "auth.uid() = user_id"
  - action: INSERT
    withCheck: "auth.uid() = user_id"
```

**機能:**
- ✅ Full CRUD (Create, Read, Update, Delete)
- ✅ RLS Policy自動生成
- ✅ Enum型サポート（Toggle操作自動生成）
- ✅ React Query統合（キャッシュ・楽観的更新）
- ✅ Zod Validation
- ✅ Admin Page（Dummy Data生成ボタン付き）
- ✅ Demo Component（ExamplesPage用カード）

---

## Public API Gateway（外部API公開）

HEADLESS APIを外部サービス・モバイルアプリ向けに公開するためのAPI Key認証Gateway。

**アーキテクチャ:**
```
External Client (X-API-Key header)
    │
    ▼
┌─────────────────────────────┐
│  api-gateway (Edge Func)    │
│  • API Key検証 (SHA-256)    │
│  • Rate Limit (分/日)       │
│  • Permission Check         │
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│  {entity}-crud (Edge Func)  │
└─────────────────────────────┘
```

**使用例:**
```bash
# API Key管理: /admin/api-keys

# List
curl -X GET ".../api-gateway/articles/list" \
  -H "X-API-Key: ak_xxxxxx_..."

# Create
curl -X POST ".../api-gateway/articles/create" \
  -H "X-API-Key: ak_xxxxxx_..." \
  -H "Content-Type: application/json" \
  -d '{"title": "Hello"}'
```

**機能:**
- ✅ API Key発行・管理（Admin画面: `/admin/api-keys`）
- ✅ SHA-256ハッシュ認証（フルキーは発行時のみ表示）
- ✅ Rate Limiting（分単位・日単位）
- ✅ 操作権限設定（list/get/create/update/delete）
- ✅ 即時停止（isActive toggle）
- ✅ 使用統計・最終使用日時

---

**安輝（あき）より:**

この `AGENT.md` が、私たちの「Akatsuki」の安定性と輝きを支える基盤となります。
ルールを守りながら、最速で価値を届けましょう！ 🚀
