# Agent Asset Hub - 設計ドキュメント

## 1. ユーザーの本当のニーズ（WHY/WHO/WHAT）

**WHY（なぜ必要か）:**
- LLM/Agent開発において、プロンプト・ワークフロー・知識が散在している
- ComfyUIのワークフローは画像メタデータに埋め込まれているが、共有・再利用が困難
- チーム内での「良いプロンプト」「良いワークフロー」の共有文化を作りたい
- アセットの評価・フィードバックループを回したい

**WHO（誰のため）:**
- AI開発者・研究者（個人/チーム）
- ComfyUIユーザー
- LLMエンジニア
- プロンプトエンジニア

**WHAT（何を作るか）:**
- Agent/LLMのナレッジ・アセット共有プラットフォーム
- アセット登録・検索・評価機能
- ComfyUI画像からメタデータ自動抽出・再利用
- マークダウンファイルでのドキュメント共有
- 評価・コメント機能によるフィードバックループ

## 2. ユースケース展開

### メインフロー

1. **アセット投稿フロー**
   - ユーザーがアセットを新規作成
   - アセットタイプを選択（Prompt / ComfyUI Workflow / Agent Config / Knowledge Document）
   - ComfyUI画像をアップロード → メタデータ自動抽出 → ワークフローJSON表示
   - Markdownファイルをアップロード → プレビュー表示
   - タグ・カテゴリ設定
   - 公開/非公開設定

2. **アセット閲覧・検索フロー**
   - ダッシュボード → アセット一覧（カード表示）
   - タグ・カテゴリでフィルタリング
   - アセット詳細ページ → メタデータ・プレビュー・評価表示
   - ダウンロード（画像はメタデータ保持、MDはそのまま）

3. **評価・フィードバックフロー**
   - アセット詳細ページ → 評価（5段階スター）
   - コメント投稿
   - フォーク（アセットを複製して改良）

4. **評価実行フロー（LLM/Agent）**
   - アセット詳細 → 「評価実行」ボタン
   - LLM APIでプロンプトを実行
   - 結果を自動評価（レスポンス時間、品質スコア）
   - 評価履歴として保存

### サブフロー

- マイアセット管理（作成したアセット一覧）
- ブックマーク機能
- アセットのバージョン管理（v1, v2, v3...）

### エッジケース

- ComfyUI画像にメタデータがない場合 → 手動入力フォーム表示
- 大きすぎるファイル → 10MB制限
- 不適切なコンテンツ → 報告機能

## 3. 画面構成（ユーザー体験重視）

### ルーティング

```
/ (HomePage)                           - ランディング・最新アセット
/assets (AssetLibraryPage)             - アセット一覧・検索
/assets/new (AssetCreatePage)          - アセット新規作成
/assets/:id (AssetDetailPage)          - アセット詳細・評価
/my-assets (MyAssetsPage)              - マイアセット管理
/bookmarks (BookmarksPage)             - ブックマーク一覧
```

### 各画面の体験設計

#### HomePage (/)
- **目的**: 新規ユーザーの興味喚起、最新アセットの発見
- **要素**: Hero Section、最新アセットカード（6件）、カテゴリ別アセット、CTA（アセット作成）
- **デザイン**: Vibrant Soft UI、グラデーション背景（ピンク/パープル/ブルー）

#### AssetLibraryPage (/assets)
- **目的**: アセット検索・閲覧
- **要素**: 検索バー、フィルター（タグ・カテゴリ・タイプ）、アセットカードグリッド（3列）、ページネーション
- **デザイン**: Card Grid、hover効果、Badge（タグ）

#### AssetCreatePage (/assets/new)
- **目的**: アセット作成
- **要素**: ステップ式UI（Step 1: タイプ選択 → Step 2: アップロード → Step 3: メタデータ → Step 4: 公開設定）
- **デザイン**: Progress Bar、FileUpload、MetadataPreview

#### AssetDetailPage (/assets/:id)
- **目的**: アセット詳細閲覧・評価・実行
- **要素**: アセットプレビュー、メタデータ表示、評価スター、コメント一覧、ダウンロードボタン、評価実行ボタン
- **デザイン**: 2カラムレイアウト（左: プレビュー、右: メタデータ・評価）

#### MyAssetsPage (/my-assets)
- **目的**: 自分のアセット管理
- **要素**: アセット一覧（編集・削除可能）、統計情報（総アセット数、総評価数、平均スコア）
- **デザイン**: Table + Card、Stats Overview

#### ASCII WireFrame（AssetDetailPage）

```
┌─────────────────────────────────────────────────────────────┐
│ TopNavigation                                                │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ ┌──────────────────────────┐ ┌─────────────────────────────┐│
│ │                          │ │ Asset Title                  ││
│ │   Asset Preview          │ │ by @username                 ││
│ │   (Image or MD)          │ │                              ││
│ │                          │ │ ⭐⭐⭐⭐⭐ 4.5 (120 ratings) ││
│ │   [Download Button]      │ │                              ││
│ │   [Evaluate Button]      │ │ Tags: #comfyui #sdxl        ││
│ │                          │ │ Category: Workflow           ││
│ └──────────────────────────┘ │                              ││
│                               │ Metadata:                    ││
│                               │ - Model: SDXL 1.0            ││
│                               │ - Steps: 20                  ││
│                               │ - CFG: 7.5                   ││
│                               │                              ││
│                               │ [Fork Asset]                 ││
│                               └─────────────────────────────┘│
│                                                               │
│ Comments & Ratings                                            │
│ ┌───────────────────────────────────────────────────────────┐│
│ │ @user1: Great workflow! ⭐⭐⭐⭐⭐                         ││
│ │ @user2: Works perfectly ⭐⭐⭐⭐                          ││
│ └───────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## 4. DB設計

### テーブル定義（SQL）

```sql
-- アセットタイプ ENUM
CREATE TYPE asset_type AS ENUM ('prompt', 'comfyui_workflow', 'agent_config', 'knowledge_doc');
CREATE TYPE asset_visibility AS ENUM ('public', 'private', 'unlisted');

-- アセット基本情報
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 基本情報
  title TEXT NOT NULL,
  description TEXT,
  asset_type asset_type NOT NULL,
  visibility asset_visibility NOT NULL DEFAULT 'public',

  -- ファイル関連
  file_id UUID REFERENCES file_metadata(id) ON DELETE SET NULL,
  thumbnail_url TEXT,

  -- メタデータ（JSONBで柔軟に）
  metadata JSONB DEFAULT '{}',

  -- 統計情報
  view_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  fork_count INTEGER DEFAULT 0,

  -- バージョン管理
  version TEXT DEFAULT '1.0.0',
  parent_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- アセットタグ（多対多）
CREATE TABLE asset_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(asset_id, tag_name)
);

-- アセット評価
CREATE TABLE asset_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(asset_id, user_id)
);

-- アセット評価実行履歴（LLM実行結果）
CREATE TABLE asset_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 実行設定
  provider TEXT NOT NULL,
  model TEXT NOT NULL,

  -- 実行結果
  response TEXT,
  execution_time_ms INTEGER,
  quality_score NUMERIC(3, 2), -- 0.00 ~ 1.00

  -- メタ情報
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ブックマーク
CREATE TABLE asset_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(asset_id, user_id)
);

-- インデックス
CREATE INDEX idx_assets_owner_id ON assets(owner_id);
CREATE INDEX idx_assets_asset_type ON assets(asset_type);
CREATE INDEX idx_assets_visibility ON assets(visibility);
CREATE INDEX idx_assets_created_at ON assets(created_at DESC);
CREATE INDEX idx_asset_tags_tag_name ON asset_tags(tag_name);
CREATE INDEX idx_asset_ratings_asset_id ON asset_ratings(asset_id);
CREATE INDEX idx_asset_evaluations_asset_id ON asset_evaluations(asset_id);
CREATE INDEX idx_asset_bookmarks_user_id ON asset_bookmarks(user_id);
```

### RLS Policy設計

```sql
-- RLS有効化
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_bookmarks ENABLE ROW LEVEL SECURITY;

-- assets: 公開アセットは全員閲覧可、自分のアセットは全操作可
CREATE POLICY "Public assets are viewable by everyone"
  ON assets FOR SELECT
  USING (visibility = 'public' OR owner_id = auth.uid());

CREATE POLICY "Users can insert own assets"
  ON assets FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own assets"
  ON assets FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own assets"
  ON assets FOR DELETE
  USING (auth.uid() = owner_id);

-- asset_tags: アセットの可視性に従う
CREATE POLICY "Tags viewable with asset"
  ON asset_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assets
      WHERE assets.id = asset_tags.asset_id
      AND (assets.visibility = 'public' OR assets.owner_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage tags on own assets"
  ON asset_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM assets
      WHERE assets.id = asset_tags.asset_id
      AND assets.owner_id = auth.uid()
    )
  );

-- asset_ratings: 公開アセットの評価は全員閲覧可、自分の評価は編集可
CREATE POLICY "Ratings viewable with asset"
  ON asset_ratings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assets
      WHERE assets.id = asset_ratings.asset_id
      AND (assets.visibility = 'public' OR assets.owner_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert own ratings"
  ON asset_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ratings"
  ON asset_ratings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ratings"
  ON asset_ratings FOR DELETE
  USING (auth.uid() = user_id);

-- asset_evaluations: 同様
CREATE POLICY "Evaluations viewable with asset"
  ON asset_evaluations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assets
      WHERE assets.id = asset_evaluations.asset_id
      AND (assets.visibility = 'public' OR assets.owner_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert own evaluations"
  ON asset_evaluations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- asset_bookmarks: 自分のブックマークのみ閲覧・編集可
CREATE POLICY "Users can manage own bookmarks"
  ON asset_bookmarks FOR ALL
  USING (auth.uid() = user_id);
```

## 5. 使用するAkatsuki機能

### 実装済み機能（再利用）

- ✅ `FileUpload` コンポーネント
- ✅ `usePublicProfile` フック
- ✅ `PublicStorageService` / `PrivateStorageService`
- ✅ `EdgeFunctionService`
- ✅ `AuthGuard`, `Layout`, `PrivateLayout`
- ✅ shadcn/ui コンポーネント（Card, Button, Badge, Input, Textarea, Select, Progress, etc.）
- ✅ React Query（Custom Hook統合）

### 新規作成が必要な機能

- 📝 ComfyUI画像メタデータ抽出（Edge Function）
- 📝 Markdownプレビュー機能
- 📝 LLM評価実行（既存 ai-chat を活用）
- 📝 評価スコア自動計算

## 6. アーキテクチャ層

### Models
- `Asset.ts` - アセット基本情報
- `AssetRating.ts` - 評価情報
- `AssetEvaluation.ts` - 評価実行履歴
- `AssetBookmark.ts` - ブックマーク

### Repositories
- `AssetRepository.ts` - アセットCRUD（タグ・評価含む）
- `AssetRatingRepository.ts` - 評価CRUD
- `AssetEvaluationRepository.ts` - 評価実行履歴CRUD
- `AssetBookmarkRepository.ts` - ブックマークCRUD

### Services
- `ComfyUIMetadataService.ts` - ComfyUI画像メタデータ抽出（Edge Function呼び出し）
- `AssetEvaluationService.ts` - LLM評価実行（ai-chat活用）

### Hooks
- `useAssets.ts` - アセット一覧取得（React Query）
- `useAsset.ts` - アセット詳細取得（React Query）
- `useCreateAsset.ts` - アセット作成（Mutation）
- `useUpdateAsset.ts` - アセット更新（Mutation）
- `useDeleteAsset.ts` - アセット削除（Mutation）
- `useAssetRatings.ts` - 評価一覧取得
- `useCreateRating.ts` - 評価作成（Mutation）
- `useAssetEvaluations.ts` - 評価実行履歴取得
- `useExecuteEvaluation.ts` - 評価実行（Mutation）
- `useBookmarks.ts` - ブックマーク一覧取得
- `useToggleBookmark.ts` - ブックマーク切り替え（Mutation）

### Components
- `AssetCard.tsx` - アセットカード（Grid表示用）
- `AssetPreview.tsx` - アセットプレビュー（画像 or Markdown）
- `MetadataDisplay.tsx` - メタデータ表示
- `RatingStars.tsx` - 評価スター表示・入力
- `CommentList.tsx` - コメント一覧
- `AssetFilters.tsx` - フィルター（タグ・カテゴリ）
- `AssetCreateFlow.tsx` - ステップ式作成フロー

### Pages
- `HomePage.tsx` - ランディング・最新アセット
- `AssetLibraryPage.tsx` - アセット一覧・検索
- `AssetCreatePage.tsx` - アセット新規作成
- `AssetDetailPage.tsx` - アセット詳細・評価
- `MyAssetsPage.tsx` - マイアセット管理
- `BookmarksPage.tsx` - ブックマーク一覧

### Edge Functions（新規）
- `extract-comfyui-metadata` - ComfyUI画像からメタデータ抽出

## 7. 実装ステップ

### Phase 1: DB設計・Migration
- [ ] Migration作成（テーブル・RLS・インデックス）
- [ ] Migration適用・確認

### Phase 2: Model/Repository層
- [ ] Asset Model
- [ ] AssetRating Model
- [ ] AssetEvaluation Model
- [ ] AssetBookmark Model
- [ ] 各Repository実装

### Phase 3: Service層
- [ ] ComfyUIMetadataService（Edge Function含む）
- [ ] AssetEvaluationService

### Phase 4: Hook層
- [ ] useAssets
- [ ] useAsset
- [ ] useCreateAsset / useUpdateAsset / useDeleteAsset
- [ ] useAssetRatings / useCreateRating
- [ ] useAssetEvaluations / useExecuteEvaluation
- [ ] useBookmarks / useToggleBookmark

### Phase 5: Component層
- [ ] AssetCard
- [ ] AssetPreview
- [ ] MetadataDisplay
- [ ] RatingStars
- [ ] CommentList
- [ ] AssetFilters
- [ ] AssetCreateFlow

### Phase 6: Page層
- [ ] HomePage
- [ ] AssetLibraryPage
- [ ] AssetCreatePage
- [ ] AssetDetailPage
- [ ] MyAssetsPage
- [ ] BookmarksPage

### Phase 7: Routing設定
- [ ] App.tsx にルート追加

### Phase 8: 動作確認
- [ ] workspace/ でダミーデータ生成
- [ ] 各画面の動作確認

## 8. 重要な設計判断

### ComfyUIメタデータ抽出について

**方針:**
- PNG画像のEXIFデータに `workflow` というキーでJSON文字列が格納されている
- Edge Functionで画像を読み込み、メタデータをパース
- フロントエンドで整形して表示

**ライブラリ候補:**
- Deno標準機能 or `pngjs` / `exif-parser`

### メタデータダウンロード保持

**方針:**
- ダウンロード時は元ファイルをそのまま返す（Signed URL経由）
- Supabase Storage に保存された時点でメタデータは保持されている

### LLM評価実行

**方針:**
- 既存の `ai-chat` Edge Functionを活用
- プロンプトアセットの場合: そのままLLMに送信 → レスポンス時間・品質を評価
- 評価スコアは別途ロジック実装（文字数、レスポンス時間、etc.）

### セキュリティ考慮事項

- RLS: 公開アセットは全員閲覧可、非公開は本人のみ
- ファイルアップロード: Public Storageを使用（公開アセット想定）
- 不適切コンテンツ: 報告機能は今回スコープ外（将来実装）

---

**設計完了！次は既存実装パターンの調査に進みます。**
