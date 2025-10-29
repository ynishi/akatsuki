# Akatsuki Backend (Shuttle + Axum)

Rust製のバックエンドAPIサーバー。Shuttle.rsを使った簡単デプロイに対応。

## 技術スタック

- **フレームワーク:** Axum (Rust)
- **デプロイ:** Shuttle.rs
- **データベース:** Supabase (PostgreSQL via sqlx)

## セットアップ

### 1. 環境変数の設定

```bash
cp .env.example .env
# .env を編集してSupabaseの接続情報を設定
```

### 2. 依存関係のインストールとビルド

```bash
# プロジェクトルートから
npm run check:backend
```

### 3. ローカル開発サーバーの起動

```bash
npm run dev:backend
```

サーバーは `http://localhost:8000` で起動します。

## APIエンドポイント

### Health Check
- **GET** `/health`
  - サーバーの稼働状況を確認

### AIGen機能

#### 1. Text-to-Image (画像生成)
- **POST** `/api/aigen/text-to-image`
  ```json
  {
    "prompt": "A beautiful sunset over the ocean",
    "model": "stable-diffusion-xl",  // optional
    "width": 1024,  // optional
    "height": 1024  // optional
  }
  ```

#### 2. Image-to-Image (画像変換)
- **POST** `/api/aigen/image-to-image`
  ```json
  {
    "source_image_url": "https://example.com/image.png",
    "prompt": "Convert to anime style",
    "model": "stable-diffusion-xl",  // optional
    "strength": 0.75  // optional (0.0 ~ 1.0)
  }
  ```

#### 3. Agent Execute (LLMタスク実行)
- **POST** `/api/aigen/agent-execute`
  ```json
  {
    "task": "Summarize this text...",
    "model": "gpt-4",  // optional
    "system_prompt": "You are a helpful assistant"  // optional
  }
  ```

## デプロイ

```bash
npm run deploy:backend
```

初回デプロイ時には、Shuttleへのログインが必要です。
詳細は [Shuttle.rs ドキュメント](https://docs.shuttle.rs/) を参照してください。

## TODO

- [ ] 実際のAI生成ロジックの実装 (Text-to-Image)
- [ ] Img2Imgロジックの実装
- [ ] LLM_TOOLKITを使ったAgent実行機能の実装
- [ ] Supabaseとの連携実装 (DB操作)
- [ ] エラーハンドリングの強化
- [ ] テストの追加
