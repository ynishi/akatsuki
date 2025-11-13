import { useState, useEffect } from 'react'
// Removed Card imports - now using section element
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, FileText, CheckCircle2, Plus, Database, List } from 'lucide-react'
import { useKnowledgeFiles } from '@/hooks/useKnowledgeFiles'
import { useFileSearchStores } from '@/hooks/useFileSearchStores'
import { FileSearchService } from '@/services/FileSearchService'

interface FileUploadAreaProps {
  selectedStoreId?: string
  onStoreChange?: (storeId: string) => void
}

/**
 * FileUploadArea - ファイルアップロード用コンポーネント
 *
 * @description
 * File Search用のファイルアップロードUI
 * Store をSelectで指定してファイルをアップロード
 * 実際のEdge Function (knowledge-file-upload) と統合済み
 */
export function FileUploadArea({ selectedStoreId, onStoreChange }: FileUploadAreaProps) {
  const [storeId, setStoreId] = useState(selectedStoreId || '')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [newStoreName, setNewStoreName] = useState('')
  const [showCreateStore, setShowCreateStore] = useState(false)
  const [filesList, setFilesList] = useState<any[]>([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)

  const { stores, isLoading: storesLoading, createStoreAsync, isPending: isCreating } = useFileSearchStores()
  const { uploadFileAsync, isPending: isUploading } = useKnowledgeFiles(storeId || null)

  const isPending = isUploading || isCreating

  // Load files list when store changes
  useEffect(() => {
    if (storeId) {
      loadFilesList()
    } else {
      setFilesList([])
    }
  }, [storeId])

  const loadFilesList = async () => {
    if (!storeId) return

    setIsLoadingFiles(true)
    try {
      const { data, error } = await FileSearchService.listFiles(storeId)
      if (error) {
        console.error('Failed to load files list:', error)
        setFilesList([])
      } else {
        setFilesList(data?.files || [])
      }
    } catch (error) {
      console.error('Failed to load files list:', error)
      setFilesList([])
    } finally {
      setIsLoadingFiles(false)
    }
  }

  const handleStoreChange = (value: string) => {
    if (value === '__no_stores__') return
    setStoreId(value)
    setUploadSuccess(false)
    onStoreChange?.(value)
  }

  const handleCreateStore = async () => {
    if (!newStoreName.trim()) return

    try {
      const store = await createStoreAsync(newStoreName)
      if (store?.id) {
        setStoreId(store.id)
        onStoreChange?.(store.id)
        setNewStoreName('')
        setShowCreateStore(false)
      }
    } catch (error) {
      console.error('Store creation failed:', error)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadSuccess(false)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !storeId.trim()) return

    try {
      await uploadFileAsync(selectedFile)
      setUploadSuccess(true)
      setSelectedFile(null)

      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement
      if (fileInput) fileInput.value = ''

      // Reload files list
      await loadFilesList()
    } catch (error) {
      console.error('File upload failed:', error)
      setUploadSuccess(false)
    }
  }

  return (
    <section className="w-full p-6 rounded-lg border shadow-sm bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 border-purple-200 space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-purple-900">
          <Upload className="w-5 h-5" />
          File Upload
        </h3>
        <p className="text-sm text-gray-700">
          Upload files to your knowledge base store
        </p>
      </div>

      <div className="space-y-4">
        {/* Store Selector */}
        <div className="space-y-2">
          <label htmlFor="store-select" className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Database className="w-4 h-4" />
            Knowledge Base Store
          </label>

          {!showCreateStore ? (
            <div className="flex gap-2">
              <Select value={storeId} onValueChange={handleStoreChange} disabled={isPending || storesLoading}>
                <SelectTrigger id="store-select" className="flex-1">
                  <SelectValue placeholder="Select a store..." />
                </SelectTrigger>
                <SelectContent>
                  {stores && stores.length > 0 ? (
                    stores.map((store) => (
                      <SelectItem key={store.id} value={store.id || '__placeholder__'}>
                        {store.displayName}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__no_stores__" disabled>
                      No stores available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowCreateStore(true)}
                disabled={isPending}
                title="Create new store"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="Enter store name..."
                value={newStoreName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewStoreName(e.target.value)}
                disabled={isCreating}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') handleCreateStore()
                  if (e.key === 'Escape') setShowCreateStore(false)
                }}
              />
              <Button onClick={handleCreateStore} disabled={isCreating || !newStoreName.trim()} variant="default">
                Create
              </Button>
              <Button onClick={() => setShowCreateStore(false)} disabled={isCreating} variant="outline">
                Cancel
              </Button>
            </div>
          )}

          <p className="text-xs text-gray-500">
            {storesLoading ? 'Loading stores...' : `Select a knowledge base to upload files to`}
          </p>
        </div>

        {/* File Input */}
        <div className="space-y-2">
          <label htmlFor="file-input" className="text-sm font-medium text-gray-700">
            File
          </label>
          <div className="flex items-center gap-3">
            <Input
              id="file-input"
              type="file"
              onChange={handleFileChange}
              disabled={isPending}
              className="flex-1"
              accept=".pdf,.txt,.md,.doc,.docx"
            />
            {selectedFile && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {selectedFile.name}
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-500">
            対応形式: PDF, TXT, MD, DOC, DOCX
          </p>
        </div>

        {/* Upload Button */}
        <Button
          variant="gradient"
          onClick={handleUpload}
          disabled={isPending || !selectedFile || !storeId.trim()}
          className="w-full"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Uploading...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload to Store
            </span>
          )}
        </Button>

        {/* Success Message */}
        {uploadSuccess && !isPending && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold">Upload successful!</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              ファイルがStoreにアップロードされました
            </p>
          </div>
        )}

        {/* Files List */}
        {storeId && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <List className="w-4 h-4" />
                Files in Store ({filesList.length})
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadFilesList}
                disabled={isLoadingFiles}
              >
                {isLoadingFiles ? 'Loading...' : 'Refresh'}
              </Button>
            </div>

            {isLoadingFiles ? (
              <div className="text-center py-4 text-sm text-gray-500">
                Loading files...
              </div>
            ) : filesList.length > 0 ? (
              <div className="space-y-1 max-h-48 overflow-y-auto border rounded-lg p-2">
                {filesList.map((file, index) => (
                  <div
                    key={file.name || index}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded"
                  >
                    <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.displayName || file.name}
                      </p>
                      {file.createTime && (
                        <p className="text-xs text-gray-500">
                          {new Date(file.createTime).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-gray-500 border rounded-lg">
                No files uploaded yet
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!selectedFile && !uploadSuccess && !storeId && (
          <div className="text-center py-8 px-4 border-2 border-dashed border-gray-200 rounded-lg">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 mb-3">
              <Upload className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600">
              Storeを選択して、ファイルを選択してください
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
