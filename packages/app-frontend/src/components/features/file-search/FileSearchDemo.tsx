import { useState } from 'react'
import { FileUploadArea } from './FileUploadArea'
import { RAGChatArea } from './RAGChatArea'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { FileSearch, ArrowRight } from 'lucide-react'

/**
 * FileSearchDemo - File Search & RAG 統合コンポーネント（Phase 1）
 *
 * @description
 * FileUploadArea + RAGChatArea を統合したUI
 * フロー: ファイルアップロード → Store指定 → RAGチャット
 *
 * Store選択は各コンポーネントで独立して行う
 * - FileUploadArea: 単一Store選択（アップロード先）
 * - RAGChatArea: 複数Store選択（検索対象）
 *
 * TODO Phase 2: Edge Function統合
 * TODO Phase 3: 既存AI Chat機能との統合検討
 * TODO Phase 4: Admin画面への移行（ファイル管理）
 */
export function FileSearchDemo() {
  const [selectedUploadStoreId, setSelectedUploadStoreId] = useState<string>('')
  const [selectedSearchStoreIds, setSelectedSearchStoreIds] = useState<string[]>([])

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSearch className="w-5 h-5" />
          File Search & RAG
        </CardTitle>
        <CardDescription>
          Upload files to your knowledge base and chat with them using RAG (Retrieval-Augmented Generation)
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Flow Diagram Section */}
        <section className="w-full p-6 rounded-lg border shadow-sm bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 border-purple-200">
          <h3 className="text-sm font-medium text-purple-900 mb-4 text-center">How it works</h3>
          <div className="flex items-center justify-center gap-4">
            <div className="text-sm font-medium text-gray-700 bg-white px-4 py-2 rounded-lg border border-gray-200">
              1. Upload File
            </div>
            <ArrowRight className="w-5 h-5 text-purple-400" />
            <div className="text-sm font-medium text-gray-700 bg-white px-4 py-2 rounded-lg border border-gray-200">
              2. Specify Store
            </div>
            <ArrowRight className="w-5 h-5 text-purple-400" />
            <div className="text-sm font-medium text-gray-700 bg-white px-4 py-2 rounded-lg border border-gray-200">
              3. RAG Chat
            </div>
          </div>
        </section>
        {/* Main Content: 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: File Upload */}
          <div>
            <FileUploadArea
              selectedStoreId={selectedUploadStoreId}
              onStoreChange={(storeId) => {
                setSelectedUploadStoreId(storeId)
                // Auto-add uploaded store to search targets
                if (storeId && !selectedSearchStoreIds.includes(storeId)) {
                  setSelectedSearchStoreIds([...selectedSearchStoreIds, storeId])
                }
              }}
            />
          </div>

          {/* Right: RAG Chat */}
          <div>
            <RAGChatArea
              selectedStoreIds={selectedSearchStoreIds}
              onStoreIdsChange={setSelectedSearchStoreIds}
            />
          </div>
        </div>

        {/* Phase 1 Notice */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Phase 1 - UI検証モード:</strong> このUIは現在モック実装です。
            実際のAPI連携はPhase 2で実装されます。
            Storeを作成・選択してファイルをアップロード、RAGチャットでテストしてください。
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
