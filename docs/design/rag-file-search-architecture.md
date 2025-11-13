# RAG File Search Architecture

## 概要

Akatsuki RAG File Search Systemは、複数のFile Search Provider（Gemini, OpenAI, Pinecone等）に対応した、拡張性の高いRAG（Retrieval-Augmented Generation）実装です。

**設計目標:**
- Provider抽象化による拡張性
- Hybrid Storage戦略（Supabase Storage + Provider Storage）
- 型安全な2-step Upload Flow
- 単一責任原則に基づく設計

## アーキテクチャ図

```
┌───────────────────────────────────────────────────────────┐
│                      Frontend Layer                       │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │ FileSearchService.ts                            │    │
│  │ - createStore()                                 │    │
│  │ - uploadFile() [2-step flow]                    │    │
│  │ - chatWithRAG()                                 │    │
│  │ - listFiles()                                   │    │
│  │ - deleteStore()                                 │    │
│  └─────────────────────────────────────────────────┘    │
│                      ↓                                    │
└───────────────────────────────────────────────────────────┘
                       ↓
┌───────────────────────────────────────────────────────────┐
│                    Edge Functions Layer                   │
│                                                           │
│  ┌──────────────────────┐  ┌─────────────────────────┐  │
│  │ file-upload          │  │ knowledge-file-index    │  │
│  │ (Generic)            │  │ (RAG-specific)          │  │
│  │                      │  │                         │  │
│  │ INPUT:               │  │ INPUT:                  │  │
│  │ - File               │  │ - file_id (UUID)        │  │
│  │ - bucket             │  │ - store_id (optional)   │  │
│  │ - metadata           │  │ - provider              │  │
│  │                      │  │                         │  │
│  │ OUTPUT:              │  │ OUTPUT:                 │  │
│  │ - file_id            │──┼─→ knowledge_file       │  │
│  │ - storage_path       │  │   - indexing_status     │  │
│  │                      │  │   - provider_file_name  │  │
│  └──────────────────────┘  └─────────────────────────┘  │
│           ↓                              ↓                │
└───────────────────────────────────────────────────────────┘
            ↓                              ↓
┌───────────────────────────────────────────────────────────┐
│                   Repository Layer                        │
│                                                           │
│  ┌──────────────────┐  ┌──────────────────────────────┐ │
│  │ FileRepository   │  │ KnowledgeFileRepository       │ │
│  │                  │  │                               │ │
│  │ - uploadToStorage│  │ - create()                    │ │
│  │ - findById       │  │ - findAllByStoreId()          │ │
│  │ - getSignedUrl   │  │ - updateIndexingStatus()      │ │
│  │ - delete         │  │ - delete()                    │ │
│  └──────────────────┘  └──────────────────────────────┘ │
│           ↓                              ↓                │
└───────────────────────────────────────────────────────────┘
            ↓                              ↓
┌───────────────────────────────────────────────────────────┐
│                 Provider Client Layer                     │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │ RAGProviderFactory                              │    │
│  │ - createRAGProvider(provider)                   │    │
│  │ - getAvailableProviders()                       │    │
│  └─────────────────────────────────────────────────┘    │
│                      ↓                                    │
│  ┌─────────────────────────────────────────────────┐    │
│  │ RAGProviderInterface (Abstract)                 │    │
│  │ - createStore(displayName)                      │    │
│  │ - uploadFile(params)                            │    │
│  │ - listFiles(storeName)                          │    │
│  │ - deleteStore(storeName)                        │    │
│  │ - search(params)                                │    │
│  └─────────────────────────────────────────────────┘    │
│                      ↓                                    │
│  ┌─────────────┬──────────────┬──────────────┬────────┐ │
│  │ Gemini      │ OpenAI       │ Pinecone     │ ...    │ │
│  │ RAGClient   │ RAGClient    │ RAGClient    │        │ │
│  │ [実装済み]   │ [TODO]       │ [TODO]       │        │ │
│  └─────────────┴──────────────┴──────────────┴────────┘ │
│                      ↓                                    │
└───────────────────────────────────────────────────────────┘
                       ↓
┌───────────────────────────────────────────────────────────┐
│                     Database Layer                        │
│                                                           │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐  │
│  │ files        │  │ knowledge_    │  │ file_search_ │  │
│  │              │  │ files         │  │ stores       │  │
│  │ - id (PK)    │  │               │  │              │  │
│  │ - owner_id   │←─│ - file_id (FK)│  │ - id (PK)    │  │
│  │ - storage_   │  │ - store_id ───┼─→│ - user_id    │  │
│  │   path       │  │   (FK)        │  │ - name       │  │
│  │ - bucket_    │  │ - provider_   │  │ - provider   │  │
│  │   name       │  │   file_name   │  │ - display_   │  │
│  │ - file_name  │  │ - indexing_   │  │   name       │  │
│  │ - mime_type  │  │   status      │  │              │  │
│  └──────────────┘  └───────────────┘  └──────────────┘  │
│                                                           │
└───────────────────────────────────────────────────────────┘
                       ↓
┌───────────────────────────────────────────────────────────┐
│                 Provider Storage Layer                    │
│                                                           │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐  │
│  │ Gemini       │  │ OpenAI        │  │ Pinecone     │  │
│  │ File Search  │  │ Vector Stores │  │ Vector DB    │  │
│  └──────────────┘  └───────────────┘  └──────────────┘  │
│                                                           │
└───────────────────────────────────────────────────────────┘
                       ↓
┌───────────────────────────────────────────────────────────┐
│                      Storage Layer                        │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Supabase Storage                                │    │
│  │                                                 │    │
│  │ Buckets:                                        │    │
│  │ - public_assets                                 │    │
│  │ - private_uploads ← RAGファイル保存先            │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

## レイヤー詳細

### 1. Frontend Layer

**FileSearchService.ts**
- 統一されたAPI提供
- 2-step flowを内部で実行
- Provider切り替え可能

### 2. Edge Functions Layer

**file-upload (汎用的)**
- 用途: RAG、画像、添付ファイル等
- Supabase Storageにアップロード
- filesテーブル作成
- file_idを返却

**knowledge-file-index (RAG専用)**
- file_idを受け取る
- Providerにインデックス化
- knowledge_filesテーブル作成

### 3. Repository Layer

**FileRepository**
- Supabase Storage CRUD
- Signed URL生成
- 所有権検証

**KnowledgeFileRepository**
- knowledge_files CRUD
- files JOIN対応
- Indexing status管理

### 4. Provider Client Layer

**RAGProviderInterface**
- 全Providerの共通インターフェース
- 5つのメソッド定義

**RAGProviderFactory**
- Factory Pattern実装
- Provider切り替え

**各Provider Client**
- Gemini: 実装済み
- OpenAI: TODO（実装ガイド付き）
- Pinecone: TODO（実装ガイド付き）
- AnythingLLM: TODO（実装ガイド付き）

### 5. Database Layer

**files**
- Supabase Storage管理
- 全ファイルのメタデータ

**knowledge_files**
- filesとfile_search_storesの関係テーブル
- Indexing状態管理

**file_search_stores**
- RAG Store管理
- Provider情報

### 6. Provider Storage Layer

各Provider固有のストレージ：
- Gemini: Corpora & Documents
- OpenAI: Vector Stores
- Pinecone: Vector Database

### 7. Storage Layer

**Supabase Storage**
- オリジナルファイル保存
- private_uploadsバケット使用（RAG用）
- Signed URL対応

## データフロー

### ファイルアップロード

```
1. User: File選択
   ↓
2. Frontend: FileSearchService.uploadFile()
   ↓
3. Step 1: file-upload Edge Function
   - Supabase Storageにアップロード
   - filesテーブル作成
   - file_id返却
   ↓
4. Step 2: knowledge-file-index Edge Function
   - file_idからファイル取得
   - Signed URL経由でダウンロード
   - Providerにアップロード
   - knowledge_filesテーブル作成
   ↓
5. Frontend: 完了通知
```

### RAG Chat

```
1. User: 質問入力
   ↓
2. Frontend: FileSearchService.chatWithRAG()
   ↓
3. ai-chat Edge Function
   - store_idsから provider_file_name を取得
   - Providerに検索クエリ送信
   - LLMで回答生成（引用情報付き）
   ↓
4. Frontend: 回答表示（引用付き）
```

## セキュリティ

### RLS (Row Level Security)

**files テーブル:**
```sql
-- ユーザーは自分のファイルのみ閲覧・操作可能
CREATE POLICY files_select_own ON files
FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY files_insert_own ON files
FOR INSERT WITH CHECK (owner_id = auth.uid());
```

**knowledge_files テーブル:**
```sql
-- ユーザーは自分が所有するファイルの knowledge_files のみ閲覧可能
CREATE POLICY knowledge_files_select_own ON knowledge_files
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM files
    WHERE files.id = knowledge_files.file_id
    AND files.owner_id = auth.uid()
  )
);
```

**file_search_stores テーブル:**
```sql
-- ユーザーは自分のStoreのみ閲覧・操作可能
CREATE POLICY file_search_stores_select_own ON file_search_stores
FOR SELECT USING (user_id = auth.uid());
```

### 所有権検証

全ての操作で所有権を検証：
```typescript
// ファイル所有権
const hasOwnership = await repos.file.checkOwnership(fileId, userId)

// Store所有権
const hasStoreOwnership = await repos.fileSearchStore.checkOwnership(storeId, userId)
```

## 拡張性

### 新しいProvider追加

1. Provider Client実装（RAGProviderInterface準拠）
2. Factory登録
3. Migration更新（CHECK制約）
4. Frontend型更新

### 新しいファイルタイプ対応

1. Provider Clientで対応確認
2. file-uploadのacceptリスト更新
3. Frontend UIでファイルタイプ制限

### Workflow化

現在の2-step flowは将来的にWorkflow化可能：
```
Job 1: file-upload
  ↓
Job 2: knowledge-file-index
  ↓
Job 3: post-indexing-webhook (optional)
```

## パフォーマンス

### ファイルサイズ制限

- Supabase Storage: 50MB（デフォルト）
- Gemini: 2GB
- OpenAI: 512MB
- Pinecone: 制限なし（chunking必要）

### インデックス時間

- 小ファイル（<1MB）: 5-10秒
- 中ファイル（1-10MB）: 10-30秒
- 大ファイル（10-50MB）: 30-60秒

### キャッシング

- Signed URL: 1時間有効
- Provider検索結果: キャッシュなし（リアルタイム）

## モニタリング

### ログ

```bash
# Edge Function logs
npx supabase functions logs file-upload --tail
npx supabase functions logs knowledge-file-index --tail
npx supabase functions logs ai-chat --tail
```

### メトリクス

- files.status = 'active' の件数
- knowledge_files.indexing_status = 'completed' の件数
- knowledge_files.indexing_status = 'failed' の件数（要調査）

## まとめ

Akatsuki RAG File Search Systemは：
- ✅ Provider抽象化で拡張性を確保
- ✅ Hybrid Storageで管理性と機能性を両立
- ✅ 2-step flowで責任分離
- ✅ 型安全性でエラーを防止
- ✅ RLSでセキュリティを担保

詳細な実装ガイドは以下を参照：
- `rag-provider-abstraction.md` - Provider抽象化パターン
- `rag-2step-upload-flow.md` - 2-step Upload Flow設計
