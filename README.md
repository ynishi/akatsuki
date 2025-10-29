# 🚀 Akatsuki (暁) Template

**VITE + React + Shuttle (Axum) + Supabase + AIGen 統合テンプレート**

`Akatsuki` は、AI機能を「息を吸うように」組み込める、**0→1フェーズの最速立ち上げ** に特化した開発テンプレートです。

> [!IMPORTANT]
> **初めての方へ:** このプロジェクトには重要な「憲法」があります。
> 開発を始める前に、必ず **`AGENT.md`** を読み、設計思想とルール（特に `workspace/` とライブラリ管理）を理解してください。

---

## ✨ 主な機能 (Key Features)

* **AIGen 標準搭載:** 画像生成、Img2Img、Agent実行のAPIエンドポイントが最初から組み込まれています。
* **モノレポ構成:** `packages/` がNPM Workspacesで連携済み。
* **環境統一:** `.tool-versions` と `.nvmrc` により、Node.js と Rust のバージョンを統一します。
* **Supabase連携:** 開発チームで共有する `Supabase-dev` 環境を活用。

## 🛠️ 技術スタック (Tech Stack)

| 領域 | 技術選定 |
| :--- | :--- |
| **フロントエンド** | VITE + React + Tailwind CSS |
| **バックエンド** | Shuttle + Axum (Rust) |
| **データベース** | Supabase (PostgreSQL) |
| **リポジトリ** | モノレポ (NPM Workspaces) |

---

## 🚀 最速起動 (Quick Start)

最短で開発環境を立ち上げるための手順です。

### 1. 前提条件 (Prerequisites)

以下のツールがインストールされていることを確認してください。

#### Node.js (v20.x 推奨)
バージョン管理ツールを使用して、プロジェクト指定のバージョンをインストール：

```bash
# nvmを使用する場合
nvm use

# asdfを使用する場合
asdf install

# miseを使用する場合
mise install
```

#### Rust & Cargo
```bash
# Rustのインストール（未インストールの場合）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# インストール確認
rustc --version
cargo --version
```

#### Shuttle CLI
```bash
cargo install cargo-shuttle
```

### 2. リポジトリのクローン

```bash
git clone [repository-url]
cd akatsuki
```

### 3. 依存関係のインストール

```bash
npm install
```

*(ルートディレクトリで実行すると、`packages/` 配下のすべての依存関係がインストールされます)*

### 4. Supabase-dev プロジェクトのセットアップ

このプロジェクトは、開発チーム（1〜2名）で **`Supabase-dev` 環境を共有** して使用します。

#### 4-1. Supabaseプロジェクトの作成

1. [Supabase Dashboard](https://app.supabase.com/) にアクセス
2. 「New Project」をクリック
3. プロジェクト情報を入力：
   - **Name:** `akatsuki-dev` (または任意の名前)
   - **Database Password:** 安全なパスワードを設定（後で使用）
   - **Region:** 最も近いリージョンを選択（例: `Northeast Asia (Tokyo)`）
4. 「Create new project」をクリック

#### 4-2. 接続情報の取得

プロジェクトが作成されたら、以下の情報を取得します：

1. **Project URL:**
   - Dashboard > Settings > API > Project URL
   - 例: `https://xxxxxxxxxxxxx.supabase.co`

2. **API Keys:**
   - Dashboard > Settings > API > Project API keys
   - `anon` `public` キーをコピー

3. **Database URL:**
   - Dashboard > Settings > Database > Connection string > URI
   - 形式: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres`
   - `[YOUR-PASSWORD]` を先ほど設定したDatabase Passwordに置き換える

### 5. 環境変数のセットアップ

#### 5-1. workspace ディレクトリの作成

```bash
mkdir -p workspace
```

`workspace/` ディレクトリは `.gitignore` に含まれており、個人の作業場として使用します。

#### 5-2. Frontend用の環境変数

`packages/app-frontend/` に `.env` ファイルを作成：

```bash
cd packages/app-frontend
cat > .env << 'EOF'
# Supabase
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Backend API (ローカル開発時)
VITE_API_BASE_URL=http://localhost:8000
EOF
```

**値を実際のSupabase情報に置き換えてください。**

#### 5-3. Backend用の環境変数

`packages/app-backend/` に `.env` ファイルを作成：

```bash
cd packages/app-backend
cat > .env << 'EOF'
# Supabase Connection
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres

# Optional: Supabase Project URL and Anon Key
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# Optional: AI Model API Keys (必要に応じて追加)
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
EOF
```

**値を実際のSupabase情報に置き換えてください。**

> [!TIP]
> チーム内で `.env` ファイルの内容を安全に共有するには、1Password や Bitwarden などのパスワードマネージャーを使用することをお勧めします。

### 6. 動作確認

#### Backend のコンパイルチェック

```bash
npm run check:backend
```

正常にコンパイルが通れば OK です。

### 7. 開発サーバーの起動

#### ターミナル 1: フロントエンド (FE)

```bash
npm run dev:frontend
```

`http://localhost:5173` で起動します。

#### ターミナル 2: バックエンド (BE)

```bash
npm run dev:backend
```

Shuttle によりローカルサーバーが起動します（デフォルト: `http://localhost:8000`）。

---

## 📁 ディレクトリ構成

```
akatsuki/
├── README.md              # (このファイル) クイックスタート
├── AGENT.md              # 【必読】設計思想、アーキテクチャ、全ルール
├── issue.md              # プロジェクトのマスタープラン
├── package.json          # モノレポのルート設定
├── .tool-versions        # asdf/mise用バージョン管理
├── .nvmrc                # nvm用Node.jsバージョン指定
├── packages/
│   ├── app-frontend/     # Frontend (VITE + React)
│   │   ├── src/
│   │   ├── .env          # Frontend環境変数 (Git管理外)
│   │   └── package.json
│   └── app-backend/      # Backend (Shuttle + Axum)
│       ├── src/
│       ├── .env          # Backend環境変数 (Git管理外)
│       ├── .env.example  # 環境変数サンプル
│       └── Cargo.toml
├── docs/                 # 公式ドキュメント (手順書、設計書など)
└── workspace/            # (Git管理外) 個人の作業場
```

### 各ディレクトリの役割

| ファイル/ディレクトリ | 役割 |
| :--- | :--- |
| **`README.md`** | **(このファイル)** クイックスタート |
| **`AGENT.md`** | **【必読】** 設計思想、アーキテクチャ、全ルール |
| **`issue.md`** | プロジェクトのマスタープラン |
| `packages/app-frontend/` | Vite + React フロントエンドアプリ |
| `packages/app-backend/` | Shuttle + Axum バックエンドAPI |
| `docs/` | チームの公式ナレッジ (手順書、設計書) |
| `workspace/` | **(Git管理外)** 個人の作業場 (メモ、下書き) |

---

## 🔧 開発コマンド

プロジェクトルートで使用できる npm scripts：

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

---

## 🌐 APIエンドポイント

Backend が提供する主要なエンドポイント：

### Health Check
- **GET** `/health` - サーバーの稼働状況確認

### AIGen 機能

#### 1. Text-to-Image (画像生成)
- **POST** `/api/aigen/text-to-image`
  ```json
  {
    "prompt": "A beautiful sunset over the ocean",
    "model": "stable-diffusion-xl",
    "width": 1024,
    "height": 1024
  }
  ```

#### 2. Image-to-Image (画像変換)
- **POST** `/api/aigen/image-to-image`
  ```json
  {
    "source_image_url": "https://example.com/image.png",
    "prompt": "Convert to anime style",
    "model": "stable-diffusion-xl",
    "strength": 0.75
  }
  ```

#### 3. Agent Execute (LLMタスク実行)
- **POST** `/api/aigen/agent-execute`
  ```json
  {
    "task": "Summarize this text...",
    "model": "gpt-4",
    "system_prompt": "You are a helpful assistant"
  }
  ```

詳細は `packages/app-backend/README.md` を参照してください。

---

## 📚 さらに詳しく

- **設計思想とルール:** `AGENT.md` を必ず読んでください
- **Backend詳細:** `packages/app-backend/README.md`
- **デプロイ手順:** `docs/guide/` (今後追加予定)

---

## 🤝 開発方針

- **Supabase-dev環境の共有:** チーム（1〜2名）で開発用Supabaseプロジェクトを共有します
- **workspace/ の活用:** 個人のメモや下書きは `workspace/` に保存します（Git管理外）
- **モノレポ管理:** 共通コンポーネントは `packages/` に配置します

---

**Akatsuki** で最高の 0→1 開発体験をスタートしましょう！ 🚀
