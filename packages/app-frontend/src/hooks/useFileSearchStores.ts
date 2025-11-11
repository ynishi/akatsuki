import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { FileSearchStoreRepository } from '../repositories/FileSearchStoreRepository'
import { FileSearchStore } from '../models/FileSearchStore'
import { FileSearchService } from '../services/FileSearchService'

export interface UseFileSearchStoresReturn {
  stores: FileSearchStore[] | undefined
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
  createStore: (displayName: string) => void
  createStoreAsync: (displayName: string) => Promise<FileSearchStore | null>
  isPending: boolean
}

/**
 * File Search Stores管理カスタムフック (React Query版)
 *
 * @returns {Object} { stores, isLoading, createStore, createStoreAsync, isPending, ... }
 *
 * @example
 * // ✅ 方法1: Fire-and-forget（結果は stores で自動更新）
 * function MyComponent() {
 *   const { stores, isLoading, createStore, isPending } = useFileSearchStores()
 *
 *   const handleCreate = () => {
 *     createStore('My Knowledge Base')
 *   }
 *
 *   if (isLoading) return <Skeleton />
 *
 *   return (
 *     <div>
 *       <button onClick={handleCreate} disabled={isPending}>
 *         Create Store
 *       </button>
 *       {stores?.map(store => <div key={store.id}>{store.displayName}</div>)}
 *     </div>
 *   )
 * }
 *
 * @example
 * // ✅ 方法2: async/await で結果を直接取得
 * function MyComponent() {
 *   const { createStoreAsync, isPending } = useFileSearchStores()
 *
 *   const handleCreate = async () => {
 *     try {
 *       const store = await createStoreAsync('My KB')
 *       console.log(store.id)  // 結果を直接使用
 *     } catch (error) {
 *       console.error(error)
 *     }
 *   }
 * }
 */
export function useFileSearchStores(): UseFileSearchStoresReturn {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Query: Stores取得
  const query = useQuery({
    queryKey: ['fileSearchStores', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      const data = await FileSearchStoreRepository.findByUserId(user.id)
      return data.map(FileSearchStore.fromDatabase)
    },
    enabled: !!user?.id,
  })

  // Mutation: Store作成
  const createMutation = useMutation({
    mutationFn: async (displayName: string) => {
      const { data, error } = await FileSearchService.createStore(displayName)
      if (error) throw error
      if (!data) throw new Error('Store creation failed')

      // DBから完全なデータを取得
      const storeData = await FileSearchStoreRepository.findById(data.store.id)
      if (!storeData) throw new Error('Store not found after creation')

      return FileSearchStore.fromDatabase(storeData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fileSearchStores', user?.id] })
    },
  })

  return {
    stores: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    createStore: createMutation.mutate,
    createStoreAsync: createMutation.mutateAsync,
    isPending: createMutation.isPending,
  }
}
