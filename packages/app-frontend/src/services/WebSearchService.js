import { EdgeFunctionService } from './EdgeFunctionService'

/**
 * Web検索サービス（Tavily API / Gemini Google検索）
 */
export class WebSearchService {
  /**
   * Web検索を実行
   * @param {string} query - 検索クエリ
   * @param {Object} options - オプション
   * @param {number} options.numResults - 取得する結果数（1-20、デフォルト: 10）
   * @param {'tavily'|'gemini'} options.provider - 検索プロバイダー（デフォルト: 'gemini'）
   * @returns {Promise<{data: Object|null, error: Error|null}>}
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
  static async search(query, options = {}) {
    const { numResults = 10, provider = 'gemini' } = options

    const { data, error } = await EdgeFunctionService.invoke('web-search', {
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
