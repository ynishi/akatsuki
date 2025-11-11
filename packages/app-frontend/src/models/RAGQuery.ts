/**
 * RAG Query Model
 * Gemini File Search APIを使用したRAGクエリの履歴を管理
 *
 * ベストプラクティス:
 * - クエリと応答、引用情報をセットで保存
 * - RLS (Row Level Security) でユーザー自身のみアクセス可能に設定
 */

export interface GroundingMetadata {
  searchResults?: Array<{
    title?: string
    url?: string
    content?: string
  }>
  citations?: Array<{
    startIndex?: number
    endIndex?: number
    source?: string
  }>
}

export interface RAGQueryData {
  id?: string | null
  storeId?: string | null
  query: string
  response?: string | null
  groundingMetadata?: GroundingMetadata | null
  userId: string
  createdAt?: string | null
}

export interface RAGQueryDatabaseRecord {
  id: string
  store_id: string | null
  query: string
  response: string | null
  grounding_metadata: GroundingMetadata | null
  user_id: string
  created_at: string
}

export class RAGQuery {
  id: string | null
  storeId: string | null
  query: string
  response: string | null
  groundingMetadata: GroundingMetadata | null
  userId: string
  createdAt: string | null

  constructor({
    id = null,
    storeId = null,
    query,
    response = null,
    groundingMetadata = null,
    userId,
    createdAt = null,
  }: RAGQueryData) {
    this.id = id
    this.storeId = storeId
    this.query = query
    this.response = response
    this.groundingMetadata = groundingMetadata
    this.userId = userId
    this.createdAt = createdAt
  }

  /**
   * Supabaseのレコードからインスタンスを生成
   */
  static fromDatabase(data: RAGQueryDatabaseRecord): RAGQuery {
    return new RAGQuery({
      id: data.id,
      storeId: data.store_id,
      query: data.query,
      response: data.response,
      groundingMetadata: data.grounding_metadata,
      userId: data.user_id,
      createdAt: data.created_at,
    })
  }

  /**
   * Supabase保存用の形式に変換
   */
  toDatabase() {
    return {
      store_id: this.storeId,
      query: this.query,
      response: this.response,
      grounding_metadata: this.groundingMetadata,
      user_id: this.userId,
    }
  }

  /**
   * 引用情報を持っているかチェック
   */
  hasCitations(): boolean {
    return !!this.groundingMetadata?.citations && this.groundingMetadata.citations.length > 0
  }

  /**
   * 検索結果を持っているかチェック
   */
  hasSearchResults(): boolean {
    return !!this.groundingMetadata?.searchResults && this.groundingMetadata.searchResults.length > 0
  }

  /**
   * 引用数を取得
   */
  getCitationCount(): number {
    return this.groundingMetadata?.citations?.length || 0
  }

  /**
   * 検索結果数を取得
   */
  getSearchResultCount(): number {
    return this.groundingMetadata?.searchResults?.length || 0
  }
}
