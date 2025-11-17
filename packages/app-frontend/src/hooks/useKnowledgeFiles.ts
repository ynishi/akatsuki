import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { KnowledgeFileRepository } from '../repositories/KnowledgeFileRepository'
import { KnowledgeFile } from '../models/KnowledgeFile'
import { FileSearchService } from '../services/FileSearchService'

export interface UseKnowledgeFilesReturn {
  files: KnowledgeFile[] | undefined
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
  uploadFile: (file: File) => void
  uploadFileAsync: (file: File) => Promise<KnowledgeFile | null>
  isPending: boolean
}

/**
 * Knowledge Files管理カスタムフック (React Query版)
 *
 * @param storeId - Store ID
 * @returns {Object} { files, isLoading, uploadFile, uploadFileAsync, isPending, ... }
 *
 * @example
 * // ✅ 方法1: Fire-and-forget（結果は files で自動更新）
 * function MyComponent({ storeId }) {
 *   const { files, isLoading, uploadFile, isPending } = useKnowledgeFiles(storeId)
 *
 *   const handleUpload = (event) => {
 *     const file = event.target.files[0]
 *     uploadFile(file)
 *   }
 *
 *   if (isLoading) return <Skeleton />
 *
 *   return (
 *     <div>
 *       <input type="file" onChange={handleUpload} disabled={isPending} />
 *       {files?.map(file => <div key={file.id}>{file.getFileName()}</div>)}
 *     </div>
 *   )
 * }
 *
 * @example
 * // ✅ 方法2: async/await で結果を直接取得
 * function MyComponent({ storeId }) {
 *   const { uploadFileAsync, isPending } = useKnowledgeFiles(storeId)
 *
 *   const handleUpload = async (event) => {
 *     const file = event.target.files[0]
 *     try {
 *       const knowledgeFile = await uploadFileAsync(file)
 *       console.log(knowledgeFile.geminiFileName)  // 結果を直接使用
 *     } catch (error) {
 *       console.error(error)
 *     }
 *   }
 * }
 */
export function useKnowledgeFiles(storeId: string | null): UseKnowledgeFilesReturn {
  const queryClient = useQueryClient()

  // Query: Files取得
  const query = useQuery({
    queryKey: ['knowledgeFiles', storeId],
    queryFn: async () => {
      if (!storeId) return []

      const data = await KnowledgeFileRepository.findByStoreIdWithFiles(storeId)
      return data.map(KnowledgeFile.fromDatabase)
    },
    enabled: !!storeId,
  })

  // Mutation: File upload
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const { data, error } = await FileSearchService.uploadFile(storeId, file)
      if (error) throw error
      if (!data) throw new Error('File upload failed')

      // DBから完全なデータを取得
      const fileData = await KnowledgeFileRepository.findByIdWithFile(data.knowledge_file.file_id)
      if (!fileData) throw new Error('File not found after upload')

      return KnowledgeFile.fromDatabase(fileData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeFiles', storeId] })
    },
  })

  return {
    files: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    uploadFile: uploadMutation.mutate,
    uploadFileAsync: uploadMutation.mutateAsync,
    isPending: uploadMutation.isPending,
  }
}
