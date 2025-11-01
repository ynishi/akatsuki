import { useMutation } from '@tanstack/react-query'
import { WebSearchService } from '../services/WebSearchService'

/**
 * Web検索専用カスタムフック (React Query版)
 * WebSearchService をラップし、Tavily APIでのWeb検索を実行
 *
 * @returns {Object} { search, searchAsync, isPending, isError, error, data, reset }
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
 *
 * @example
 * // ❌ 間違い: mutate() の結果を await しようとする
 * function MyComponent() {
 *   const { search } = useWebSearch()
 *
 *   const handleSearch = async () => {
 *     const result = await search({ query: 'AI' })  // undefined
 *     console.log(result.answer)  // エラー！
 *   }
 * }
 */
export function useWebSearch() {
  const mutation = useMutation({
    mutationFn: async ({ query, numResults = 10, provider = 'gemini' }) => {
      const { data, error } = await WebSearchService.search(query, { numResults, provider })

      if (error) throw error
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
