import { useState, useEffect } from 'react'
// Removed Card imports - now using section element
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MessageSquare, Sparkles, FileSearch, X, Database } from 'lucide-react'
import { useFileSearchStores } from '@/hooks/useFileSearchStores'

interface RAGChatAreaProps {
  selectedStoreIds?: string[]
  onStoreIdsChange?: (storeIds: string[]) => void
}

/**
 * RAGChatArea - RAGチャット用コンポーネント（Phase 1: 簡易版・モック + Select対応）
 *
 * @description
 * File Search RAGを使用したチャットUI
 * Store を複数選択してRAG検索 + チャット
 *
 * TODO Phase 2: モック削除、実際のEdge Function呼び出し
 * TODO Phase 3: 既存LLMChatCardとの統合検討
 */
export function RAGChatArea({ selectedStoreIds = [], onStoreIdsChange }: RAGChatAreaProps) {
  const [message, setMessage] = useState('')
  const [activeStoreIds, setActiveStoreIds] = useState<string[]>(selectedStoreIds)
  const [response, setResponse] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [selectValue, setSelectValue] = useState<string>('')

  const { stores, isLoading: storesLoading } = useFileSearchStores()

  // Sync with parent component
  useEffect(() => {
    setActiveStoreIds(selectedStoreIds)
  }, [selectedStoreIds])

  const handleAddStore = (storeId: string) => {
    if (!storeId || storeId === '__no_stores__' || activeStoreIds.includes(storeId)) return

    const newStoreIds = [...activeStoreIds, storeId]
    setActiveStoreIds(newStoreIds)
    setSelectValue('')
    onStoreIdsChange?.(newStoreIds)
  }

  const handleRemoveStore = (storeId: string) => {
    const newStoreIds = activeStoreIds.filter((id) => id !== storeId)
    setActiveStoreIds(newStoreIds)
    onStoreIdsChange?.(newStoreIds)
  }

  const handleSend = async () => {
    if (!message.trim()) return

    setIsPending(true)
    setResponse(null)

    try {
      // TODO Phase 2: 実際のEdge Function呼び出し（現在はモック）
      // const { data, error } = await FileSearchService.chatWithRAG(
      //   message,
      //   activeStoreIds
      // )

      // Mock response
      await new Promise((resolve) => setTimeout(resolve, 1500))
      const storeNames = activeStoreIds
        .map((id) => stores?.find((s) => s.id === id)?.displayName || id)
        .join(', ')
      const mockResponse = `[Mock Response]\n\nYour question: "${message}"\n\nStores searched: ${storeNames || 'None'}\n\nThis is a mock response. In Phase 2, this will be replaced with actual File Search RAG results.`

      setResponse(mockResponse)
    } catch (error) {
      console.error('RAG chat failed:', error)
      setResponse('Error: Failed to get response')
    } finally {
      setIsPending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const availableStores = stores?.filter((store) => store.id && !activeStoreIds.includes(store.id)) || []

  return (
    <section className="w-full p-6 rounded-lg border shadow-sm bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 border-purple-200 space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-purple-900">
          <MessageSquare className="w-5 h-5" />
          RAG Chat
        </h3>
        <p className="text-sm text-gray-700">
          Chat with your knowledge base using RAG
        </p>
      </div>

      <div className="space-y-4">
        {/* Store Selector (Multiple) */}
        <div className="space-y-2">
          <label htmlFor="rag-store-select" className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Database className="w-4 h-4" />
            Knowledge Base Stores (Multiple)
          </label>

          <Select value={selectValue} onValueChange={handleAddStore} disabled={isPending || storesLoading}>
            <SelectTrigger id="rag-store-select">
              <SelectValue placeholder="Add stores to search..." />
            </SelectTrigger>
            <SelectContent>
              {availableStores.length > 0 ? (
                availableStores.map((store) => (
                  <SelectItem key={store.id} value={store.id || '__placeholder__'}>
                    {store.displayName}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="__no_stores__" disabled>
                  {activeStoreIds.length > 0 ? 'All stores added' : 'No stores available'}
                </SelectItem>
              )}
            </SelectContent>
          </Select>

          {/* Selected Stores */}
          {activeStoreIds.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              {activeStoreIds.map((storeId) => {
                const store = stores?.find((s) => s.id === storeId)
                return (
                  <Badge
                    key={storeId}
                    variant="secondary"
                    className="flex items-center gap-1 cursor-pointer hover:bg-gray-300 transition-colors"
                    onClick={() => handleRemoveStore(storeId)}
                  >
                    <FileSearch className="w-3 h-3" />
                    {store?.displayName || storeId}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                )
              })}
            </div>
          )}

          <p className="text-xs text-gray-500">
            {storesLoading ? 'Loading stores...' : `Select multiple knowledge bases to search (click badge to remove)`}
          </p>
        </div>

        {/* Message Input */}
        <div className="space-y-2">
          <label htmlFor="rag-message" className="text-sm font-medium text-gray-700">
            Message
          </label>
          <Input
            id="rag-message"
            type="text"
            value={message}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessage(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e)}
            placeholder="質問を入力してください..."
            disabled={isPending}
            className="w-full"
          />
        </div>

        {/* Send Button */}
        <Button
          variant="gradient"
          onClick={handleSend}
          disabled={isPending || !message.trim() || activeStoreIds.length === 0}
          className="w-full"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Processing...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Send with RAG
            </span>
          )}
        </Button>

        {/* Response Display */}
        {response && (
          <div className="p-5 rounded-xl border shadow-sm bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 border-purple-200">
            <h3 className="font-bold mb-3 flex items-center gap-2 text-lg text-purple-900">
              <Sparkles className="w-5 h-5" />
              AI Response
            </h3>
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{response}</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!response && !isPending && (
          <div className="text-center py-8 px-4 border-2 border-dashed border-gray-200 rounded-lg">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 mb-3">
              <MessageSquare className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-sm text-gray-600">
              Storeを選択して、メッセージを入力してRAGチャットを開始
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
