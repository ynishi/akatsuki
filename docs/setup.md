# 📚 Akatsuki Detailed Setup Guide

このドキュメントでは、Akatsuki プロジェクトの詳細なセットアップ手順を説明します。

## 目次

- [1. 前提条件](#1-前提条件)
- [2. プロジェクトの取得](#2-プロジェクトの取得)
- [3. 自動セットアップ（推奨）](#3-自動セットアップ推奨)
- [4. 手動セットアップ（詳細）](#4-手動セットアップ詳細)
- [5. トラブルシューティング](#5-トラブルシューティング)

---

## 1. 前提条件

以下のツールをインストールしてください。

### 1.1. Node.js (v20.x 以上)

バージョン管理ツールを使用することを推奨します。

#### nvm を使用する場合

```bash
# nvmのインストール（未インストールの場合）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Node.js v20のインストール
nvm install 20
nvm use 20
```

#### asdf を使用する場合

```bash
# asdfのインストール（未インストールの場合）
brew install asdf

# Node.jsプラグインの追加
asdf plugin add nodejs

# Node.js v20のインストール
asdf install nodejs 20.x.x
asdf global nodejs 20.x.x
```

#### mise (旧rtx) を使用する場合

```bash
# miseのインストール（未インストールの場合）
brew install mise

# Node.js v20のインストール
mise install nodejs@20
mise global nodejs@20
```

### 1.2. Rust & Cargo

```bash
# Rustのインストール
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# インストール確認
rustc --version
cargo --version
```

### 1.3. Shuttle CLI

```bash
# Shuttle CLIのインストール
cargo install cargo-shuttle

# インストール確認
cargo shuttle --version
```

### 1.4. Supabase CLI

⚠️ **これを忘れがち！**

```bash
# npmでインストール（推奨）
npm install -g supabase

# または Homebrew でインストール（macOS）
brew install supabase/tap/supabase

# インストール確認
supabase --version
```

---

## 2. プロジェクトの取得

### 2.1. リポジトリをクローン

⚠️ **重要:** アプリ名を指定してクローンしてください！

```bash
# アプリ名を指定してクローン（例: my-awesome-app）
git clone https://github.com/yourusername/akatsuki.git my-awesome-app

# プロジェクトディレクトリに移動
cd my-awesome-app
```

### 2.2. 依存関係のインストール

```bash
# NPM Workspaces で全パッケージの依存関係をインストール
npm install
```

---

## 3. 自動セットアップ（推奨）

### 3.1. Supabase プロジェクトの作成

1. [Supabase Dashboard](https://app.supabase.com/) にアクセス
2. 「New Project」をクリック
3. プロジェクト情報を入力：
   - **Name:** `my-awesome-app-dev` (または任意の名前)
   - **Database Password:** 安全なパスワードを設定（**後で使用するので控えておく**）
   - **Region:** 最も近いリージョンを選択（例: `Northeast Asia (Tokyo)`）
4. 「Create new project」をクリック

### 3.2. 接続情報の取得（後で必要）

以下の情報を控えておいてください：

#### Project URL
- Dashboard > Settings > API > **Project URL**
- 例: `https://xxxxxxxxxxxxx.supabase.co`

#### Anon Key
- Dashboard > Settings > API > Project API keys > **`anon` `public`**
- 例: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

#### Database Password
- プロジェクト作成時に設定したパスワード

### 3.3. 自動セットアップスクリプトの実行

```bash
npm run setup
```

スクリプトが以下を自動的に実行します：

0. 📦 **プロジェクト名の設定** - package.json の `name` フィールドを更新
0. 🔄 **Git 履歴のクリーン化** - 既存の `.git` を削除して新規リポジトリとして初期化
1. ✅ **前提条件チェック** - Node.js, Rust, Cargo, Shuttle CLI, Supabase CLI
2. 📝 **Supabase 情報の入力** - 対話的に Project URL, Anon Key, Database Password を入力
3. 📝 **`.env` ファイル生成** - Frontend と Backend の環境変数ファイルを自動生成
4. 🔗 **Supabase プロジェクトにリンク** - `supabase link` を実行
5. 🗄️ **マイグレーション適用** - データベーステーブル、RLS、Trigger を作成
6. ⚡ **Edge Functions デプロイ** - AI Chat, 画像生成、ファイルアップロード等をデプロイ
7. 🔑 **Secrets 設定ガイド** - 必要な API Key のリストを表示
8. 🔍 **バックエンド確認** - `cargo check` でコンパイルチェック
9. 📝 **初回 Git コミット作成** - セットアップ完了の記録をコミット

### 3.4. プロジェクト名と Git 初期化について

`npm run setup` の最初のステップで、以下が実行されます：

#### プロジェクト名の設定

- デフォルトはディレクトリ名（例: `my-awesome-app`）
- package.json の `name` フィールドが更新されます
- npm パッケージ名のルールに従った名前が必要（小文字、ハイフン、アンダースコア）

#### プロジェクトの説明（description）

- オプションで説明を入力可能
- 入力した場合: `"${説明} (Made with Akatsuki)"`
- 入力しない場合: プロジェクト名がそのまま設定される
- 例: `"AI-powered character generator (Made with Akatsuki)"`

#### Git 履歴のクリーン化

テンプレートの Git 履歴を削除して、新しいプロジェクトとして初期化します：

1. 既存の `.git` ディレクトリを削除
2. `git init` で新規リポジトリとして初期化
3. セットアップ完了後に初回コミットを作成（オプション）

**メリット:**
- テンプレートの履歴が含まれない
- クリーンな状態で自分のプロジェクトを開始
- すぐに自分のリモートリポジトリにプッシュ可能

### 3.5. セットアップ完了後

```bash
# ターミナル1: フロントエンド起動
npm run dev:frontend

# ターミナル2: バックエンド起動
npm run dev:backend
```

ブラウザで `http://localhost:5173` を開いてアプリを確認！

**リモートリポジトリへプッシュ:**

```bash
git remote add origin <your-repo-url>
git push -u origin main
```

---

## 4. 手動セットアップ（詳細）

自動セットアップスクリプトが何をやっているか、詳細を知りたい場合はこちらを参照してください。

### 4.1. 環境変数ファイルの作成

#### Frontend (.env)

```bash
cd packages/app-frontend
cat > .env << 'EOF'
# Supabase Configuration
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Backend API (ローカル開発時)
VITE_API_BASE_URL=http://localhost:8000
EOF
```

**値を実際のSupabase情報に置き換えてください。**

#### Backend (.env)

```bash
cd packages/app-backend
cat > .env << 'EOF'
# Supabase Connection
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres

# Optional: Supabase Project URL and Anon Key
SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# Optional: AI Model API Keys
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
EOF
```

**値を実際のSupabase情報に置き換えてください。**

### 4.2. Supabase プロジェクトにリンク

```bash
# プロジェクトルートで実行
supabase link --project-ref <YOUR-PROJECT-REF>

# または
npm run supabase:link
```

**`<YOUR-PROJECT-REF>`** は、Project URL の `https://xxxxxxxxxxxxx.supabase.co` の `xxxxxxxxxxxxx` 部分です。

### 4.3. データベースマイグレーションの適用

```bash
# プロジェクトルートで実行
supabase db push

# または
npm run supabase:push
```

これにより、以下のテーブルが作成されます：

- **`profiles`** - ユーザープロフィール
- **`ai_models`** - AI モデル定義
- **`llm_call_logs`** - LLM 呼び出し履歴
- **`user_quotas`** - ユーザーごとの使用制限
- **`files`** - ファイル管理テーブル
- **`characters`** - キャラクター管理（サンプル）
- **Storage Buckets** - `public_assets`, `private_uploads`
- **RLS Policies, Triggers, Functions**

### 4.4. Edge Functions のデプロイ

```bash
# 全 Edge Functions を一括デプロイ
supabase functions deploy

# または
npm run supabase:function:deploy
```

デプロイされる Edge Functions:

- **`ai-chat`** - LLM API（OpenAI, Anthropic, Gemini）
- **`generate-image`** - 画像生成
- **`upload-file`** - ファイルアップロード
- **`create-signed-url`** - Signed URL 生成
- **`slack-notify`** - Slack 通知
- **`send-email`** - Email 送信（Resend）

### 4.5. Supabase Secrets の設定

AI 機能を使用する場合、API キーを Supabase Secrets として設定する必要があります。

#### 必須（LLM 機能を使う場合）

```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set GEMINI_API_KEY=AIza...
```

#### Web検索機能を使う場合

```bash
# Tavily API（Web検索）
supabase secrets set TAVILY_API_KEY=tvly-...
```

**取得方法:**
1. [Tavily](https://tavily.com/) でアカウント作成
2. Dashboard から API Key を取得
3. 上記コマンドで設定

#### ComfyUI画像生成を使う場合（RunPod）

```bash
# RunPod ComfyUI Endpoint & Auth
supabase secrets set RUNPOD_ENDPOINT=https://your-pod-id.proxy.runpod.net
supabase secrets set RUNPOD_API_KEY=your-runpod-auth-token
```

**セットアップ方法:**
1. [RunPod](https://www.runpod.io/) でアカウント作成
2. ComfyUI テンプレートでPodを起動
3. 認証サーバーをセットアップ（Flask等の薄いレイヤー推奨）
   - Basic認証またはトークン認証を実装
   - `X-Auth` ヘッダーでトークンを検証
4. Pod URLと認証トークンを上記コマンドで設定

**参考:**
- RunPodは公開アクセス可能なため、必ず認証を実装してください
- 詳細な認証実装方法は調査ドキュメント参照

#### オプション（外部連携を使う場合）

```bash
# Slack 通知
supabase secrets set SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Email 送信（Resend）
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set EMAIL_FROM=noreply@yourdomain.com
```

#### Secrets の確認

```bash
supabase secrets list
```

### 4.6. バックエンドのコンパイルチェック

```bash
# プロジェクトルートで実行
npm run check:backend

# または
cd packages/app-backend
cargo check
```

正常にコンパイルが通れば、セットアップ完了です！

---

## 5. セットアップ状況の確認

いつでも以下のコマンドでセットアップ状況を確認できます：

```bash
npm run setup:check
```

このコマンドは以下をチェックします：

- ✅ 前提条件のインストール状況
- ✅ `.env` ファイルの存在
- ✅ Supabase プロジェクトのリンク状況
- ✅ マイグレーションファイルの存在
- ✅ Edge Functions の存在
- ℹ️ Secrets の設定ガイド

---

## 6. トラブルシューティング

### 6.1. 前提条件のインストールエラー

#### Node.js のバージョンが古い

```bash
# nvm を使用している場合
nvm install 20
nvm use 20

# asdf を使用している場合
asdf install nodejs 20.x.x
asdf global nodejs 20.x.x
```

#### Supabase CLI がインストールできない

```bash
# npm でインストールできない場合、Homebrew を試す（macOS）
brew install supabase/tap/supabase

# Linux の場合
curl -fsSL https://raw.githubusercontent.com/supabase/supabase/master/packages/cli/install.sh | sh
```

### 6.2. Supabase Link エラー

**エラー:** `Error: Project not found`

**解決策:**
- Project Ref が正しいか確認
- Supabase Dashboard でプロジェクトが Active か確認

```bash
# 手動でリンク
supabase link --project-ref <YOUR-PROJECT-REF>
```

### 6.3. マイグレーション適用エラー

**エラー:** `Error: Connection refused`

**解決策:**
- `DATABASE_URL` が正しいか確認
- Database Password が正しいか確認
- Supabase プロジェクトが起動しているか確認

```bash
# DATABASE_URL の確認
cat packages/app-backend/.env | grep DATABASE_URL
```

### 6.4. Edge Functions デプロイエラー

**エラー:** `Error: Unauthorized`

**解決策:**
- Supabase CLI にログインしているか確認

```bash
# ログイン
supabase login

# 再度デプロイ
supabase functions deploy
```

### 6.5. Backend コンパイルエラー

**エラー:** `error: could not compile ...`

**解決策:**
- `.env` ファイルが正しく設定されているか確認
- Rust のバージョンを更新

```bash
# Rust 更新
rustup update

# 依存関係の再ビルド
cd packages/app-backend
cargo clean
cargo build
```

---

## 7. npm コマンド一覧

プロジェクトルートで使用できる主要コマンド：

### Frontend

```bash
npm run dev:frontend      # 開発サーバー起動 (localhost:5173)
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

# Secrets
npm run supabase:secrets:list     # Secrets一覧表示
npm run supabase:secrets:set      # Secretsを設定
```

### セットアップ

```bash
npm run setup             # 自動セットアップスクリプト実行
npm run setup:check       # セットアップ状況確認
```

---

## 8. 次のステップ

セットアップが完了したら、以下のドキュメントを参照してください：

- **`AGENT.md`** - 開発憲章（設計思想、アーキテクチャ、ルール）
- **`docs/SUPABASE_CONFIGURATION.md`** - Supabase 設定の詳細
- **`packages/app-backend/README.md`** - Backend API の詳細

---

**Happy Coding! 🚀**
