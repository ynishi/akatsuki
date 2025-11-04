import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CharacterGenerationRepository } from '../repositories/CharacterGenerationRepository'
import { CharacterGeneration } from '../models/CharacterGeneration'
import { useAuth } from '../contexts/AuthContext'

/**
 * Character Gallery Hook (React Query)
 * Fetch and manage user's character generation history
 *
 * @param {Object} options - Query options
 * @param {number} options.limit - Limit
 * @param {number} options.offset - Offset
 *
 * @returns {Object} { generations, isLoading, error, deleteGeneration, ... }
 *
 * @example
 * function CharacterGallery() {
 *   const { generations, isLoading, deleteGeneration } = useCharacterGallery()
 *
 *   if (isLoading) return <Skeleton />
 *
 *   return (
 *     <div className="grid grid-cols-3 gap-4">
 *       {generations.map(gen => (
 *         <div key={gen.id}>
 *           <img src={gen.file?.publicUrl} alt="Generated" />
 *           <button onClick={() => deleteGeneration(gen.id)}>Delete</button>
 *         </div>
 *       ))}
 *     </div>
 *   )
 * }
 */
export function useCharacterGallery({ limit = 50, offset = 0 } = {}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Query: Fetch gallery
  const query = useQuery({
    queryKey: ['characterGallery', user?.id, limit, offset],
    queryFn: async () => {
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await CharacterGenerationRepository.findByUserId(user.id, {
        limit,
        offset,
      })

      if (error) throw error

      // Convert to Models
      return data.map((item) => CharacterGeneration.fromDatabase(item))
    },
    enabled: !!user,
  })

  // Mutation: Delete generation
  const deleteMutation = useMutation({
    mutationFn: async (generationId) => {
      const { error } = await CharacterGenerationRepository.delete(generationId)

      if (error) throw error

      return generationId
    },
    onSuccess: () => {
      // Invalidate gallery query to refetch
      queryClient.invalidateQueries({ queryKey: ['characterGallery', user?.id] })
    },
  })

  return {
    // Gallery data
    generations: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,

    // Delete mutation
    deleteGeneration: deleteMutation.mutate,
    deleteGenerationAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,
  }
}
