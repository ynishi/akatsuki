import { useState } from 'react'
import { useWebSearch } from '@/hooks/useWebSearch'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, ExternalLink, Sparkles } from 'lucide-react'

/**
 * Web検索カード（Tavily / Gemini 対応）
 * 2つのプロバイダーを切り替えて検索可能
 */
export function WebSearchCard() {
  const [query, setQuery] = useState('')
  const [provider, setProvider] = useState('gemini')
  const { searchAsync, isPending, data, reset } = useWebSearch()

  const handleSearch = async () => {
    if (!query.trim()) return
    await searchAsync({ query, numResults: 10, provider })
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleProviderChange = (newProvider) => {
    setProvider(newProvider)
    reset() // 検索結果をクリア
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Web Search
        </CardTitle>
        <CardDescription>
          Choose between Tavily AI Search or Gemini Google Search
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Provider Selector */}
        <Tabs value={provider} onValueChange={handleProviderChange}>
          <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1">
            <TabsTrigger
              value="tavily"
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Search className="w-4 h-4" />
              Tavily
            </TabsTrigger>
            <TabsTrigger
              value="gemini"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              Gemini
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search Input */}
        <div className="space-y-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              provider === 'gemini'
                ? '質問を入力（例: 2024年のAI画像生成の最新動向を教えて）'
                : '検索キーワードを入力（例: AIアート 最新動向）'
            }
            disabled={isPending}
            className="w-full"
          />
          <Button
            variant="gradient"
            onClick={handleSearch}
            disabled={isPending || !query.trim()}
            className="w-full"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Searching...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Search
              </span>
            )}
          </Button>
        </div>

        {/* Loading State */}
        {isPending && (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {/* Search Results */}
        {!isPending && data && (
          <div className="space-y-4">
            {/* Provider Badge */}
            <div className="flex items-center justify-between">
              <Badge
                variant={data.provider === 'gemini' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {data.provider === 'gemini' ? (
                  <>
                    <Sparkles className="w-3 h-3 mr-1" />
                    Gemini Google Search
                  </>
                ) : (
                  <>
                    <Search className="w-3 h-3 mr-1" />
                    Tavily AI Search
                  </>
                )}
              </Badge>
              <span className="text-xs text-gray-500">
                {data.num_results} results
              </span>
            </div>

            {/* Gemini Search Queries */}
            {data.searchQueries && data.searchQueries.length > 0 && (
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-purple-900">
                  <Search className="w-4 h-4" />
                  実行された検索クエリ
                </h3>
                <div className="flex flex-wrap gap-2">
                  {data.searchQueries.map((q, i) => (
                    <Badge key={i} variant="secondary" className="text-xs bg-white/80">
                      {q}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* AI Summary */}
            {data.answer && (
              <div className={`p-5 rounded-xl border shadow-sm ${
                data.provider === 'gemini'
                  ? 'bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 border-purple-200'
                  : 'bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 border-blue-200'
              }`}>
                <h3 className={`font-bold mb-3 flex items-center gap-2 text-lg ${
                  data.provider === 'gemini' ? 'text-purple-900' : 'text-blue-900'
                }`}>
                  {data.provider === 'gemini' ? (
                    <>
                      <Sparkles className="w-5 h-5" />
                      AIの回答
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      AI Summary
                    </>
                  )}
                </h3>
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{data.answer}</p>
                </div>
              </div>
            )}

            {/* Search Results */}
            {data.results && data.results.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  {data.provider === 'gemini' ? '情報源' : 'Search Results'}
                  <span className="text-sm font-normal text-gray-500">({data.num_results})</span>
                </h3>
                <div className="space-y-2">
                  {data.results.map((result, i) => (
                    <a
                      key={i}
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 flex items-center gap-2 mb-1 transition-colors">
                            <span className="truncate">{result.title}</span>
                            <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </h4>
                          {result.content && (
                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                              {result.content}
                            </p>
                          )}
                          <p className="text-xs text-blue-500 truncate">
                            {result.url}
                          </p>
                        </div>
                        {result.score && data.provider !== 'gemini' && (
                          <div className="flex-shrink-0">
                            <div className="text-xs font-medium text-gray-700 bg-gradient-to-r from-blue-100 to-cyan-100 px-3 py-1.5 rounded-full">
                              {(result.score * 100).toFixed(0)}%
                            </div>
                          </div>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!isPending && !data && (
          <div className="text-center py-16 px-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 mb-4">
              {provider === 'gemini' ? (
                <Sparkles className="w-8 h-8 text-purple-600" />
              ) : (
                <Search className="w-8 h-8 text-blue-600" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {provider === 'gemini' ? 'Gemini Google検索' : 'Tavily AI検索'}
            </h3>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              {provider === 'gemini'
                ? '質問を入力すると、AIが自動でGoogle検索して最新情報を基に回答します'
                : 'AI特化の検索エンジンで、構造化されたデータを取得できます'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
