import { EdgeFunctionService } from './EdgeFunctionService'

/**
 * Search provider type
 */
export type SearchProvider = 'tavily' | 'gemini'

/**
 * Search options
 */
export interface SearchOptions {
  numResults?: number
  provider?: SearchProvider
}

/**
 * Individual search result item
 */
export interface SearchResultItem {
  title: string
  url: string
  content: string
  score?: number
}

/**
 * Search result
 */
export interface SearchResult {
  provider: string
  num_results: number
  answer?: string
  searchQueries?: string[]
  results: SearchResultItem[]
}

/**
 * Search response
 */
export interface SearchResponse {
  data: SearchResult | null
  error: Error | null
}

/**
 * Web検索サービス（Tavily API / Gemini Google検索）
 */
export class WebSearchService {
  /**
   * Web検索を実行
   * @param query - 検索クエリ
   * @param options - オプション
   * @returns Search response
   *
   * @example
   * // Gemini Google検索（デフォルト）
   * const { data, error } = await WebSearchService.search('AIアート 最新動向')
   * console.log(data.answer)        // AIの回答
   * console.log(data.results)       // 引用元URL
   * console.log(data.searchQueries) // 実行された検索クエリ
   *
   * @example
   * // Tavily API
   * const { data, error } = await WebSearchService.search('React hooks', {
   *   provider: 'tavily',
   *   numResults: 5
   * })
   * console.log(data.answer)   // Tavilyの要約
   * console.log(data.results)  // 検索結果配列
   */
  static async search(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    const { numResults = 10, provider = 'gemini' } = options

    const { data, error } = await EdgeFunctionService.invoke<SearchResult>('web-search', {
      query,
      num_results: numResults,
      provider,
    })

    if (error) {
      return { data: null, error }
    }

    return { data, error: null }
  }
}
