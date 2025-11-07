import { useMutation, UseMutationResult } from '@tanstack/react-query'
import { WebSearchService, SearchProvider, SearchResult } from '../services/WebSearchService'

/**
 * Web search parameters
 */
export interface WebSearchParams {
  query: string
  numResults?: number
  provider?: SearchProvider
}

/**
 * useWebSearch hook return type
 */
export interface UseWebSearchReturn {
  search: (params: WebSearchParams) => void
  searchAsync: (params: WebSearchParams) => Promise<SearchResult>
  isPending: boolean
  isError: boolean
  isSuccess: boolean
  error: Error | null
  data: SearchResult | undefined
  reset: () => void
  // 互換性のため
  loading: boolean
  result: SearchResult | undefined
}

/**
 * Web検索専用カスタムフック (React Query版)
 * WebSearchService をラップし、Tavily APIでのWeb検索を実行
 *
 * @returns Hook return object
 *
 * @example
 * // ✅ 方法1: Fire-and-forget（結果は data で取得）
 * function MyComponent() {
 *   const { search, isPending, isError, error, data } = useWebSearch()
 *
 *   const handleSearch = () => {
 *     search({
 *       query: 'AIアート 最新動向',
 *       numResults: 10
 *     })
 *   }
 *
 *   if (isPending) return <Skeleton />
 *   if (isError) return <p>Error: {error.message}</p>
 *
 *   return (
 *     <div>
 *       <button onClick={handleSearch}>Search</button>
 *       {data && (
 *         <div>
 *           <p>{data.answer}</p>
 *           {data.results.map((r, i) => (
 *             <a key={i} href={r.url}>{r.title}</a>
 *           ))}
 *         </div>
 *       )}
 *     </div>
 *   )
 * }
 *
 * @example
 * // ✅ 方法2: async/await で結果を直接取得
 * function MyComponent() {
 *   const { searchAsync, isPending } = useWebSearch()
 *
 *   const handleSearch = async () => {
 *     try {
 *       const results = await searchAsync({ query: 'React hooks' })
 *       console.log(results.answer)   // Tavilyの要約
 *       console.log(results.results)  // 検索結果
 *     } catch (error) {
 *       console.error(error)
 *     }
 *   }
 * }
 */
export function useWebSearch(): UseWebSearchReturn {
  const mutation: UseMutationResult<SearchResult, Error, WebSearchParams> = useMutation({
    mutationFn: async ({ query, numResults = 10, provider = 'gemini' }: WebSearchParams) => {
      const { data, error } = await WebSearchService.search(query, { numResults, provider })

      if (error) throw error
      if (!data) throw new Error('No data returned from web search')
      return data
    },
  })

  return {
    // 基本メソッド
    search: mutation.mutate,
    searchAsync: mutation.mutateAsync,

    // React Query 状態
    isPending: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,

    // 互換性のため
    loading: mutation.isPending,
    result: mutation.data,
  }
}
