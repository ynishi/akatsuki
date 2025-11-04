import { useMutation } from '@tanstack/react-query'
import { CharacterGenerationService } from '../services/CharacterGenerationService'
import { useAuth } from '../contexts/AuthContext'

/**
 * Character Generation Hook (React Query)
 * Generate character image with presets and custom prompt
 *
 * @returns {Object} { generate, generateAsync, isPending, isError, error, data, reset }
 *
 * @example
 * // Fire-and-forget (result in data)
 * function CharacterGenerator() {
 *   const { generate, isPending, data, error } = useCharacterGeneration()
 *
 *   const handleGenerate = () => {
 *     generate({
 *       presetIds: ['preset-1', 'preset-2'],
 *       customPrompt: 'かわいい女の子',
 *       workflowId: 'workflow-1',
 *       modelId: 'model-1',
 *     })
 *   }
 *
 *   if (isPending) return <Skeleton />
 *   if (error) return <p>Error: {error.message}</p>
 *
 *   return (
 *     <div>
 *       <button onClick={handleGenerate}>Generate</button>
 *       {data && <img src={data.image.publicUrl} alt="Generated" />}
 *     </div>
 *   )
 * }
 *
 * @example
 * // async/await
 * function CharacterGenerator() {
 *   const { generateAsync, isPending } = useCharacterGeneration()
 *
 *   const handleGenerate = async () => {
 *     try {
 *       const result = await generateAsync({
 *         presetIds: ['preset-1'],
 *         customPrompt: 'かわいい女の子',
 *       })
 *       console.log(result.image.publicUrl)
 *     } catch (error) {
 *       console.error(error)
 *     }
 *   }
 * }
 */
export function useCharacterGeneration() {
  const { user } = useAuth()

  const mutation = useMutation({
    mutationFn: async (options) => {
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await CharacterGenerationService.generate({
        ...options,
        userId: user.id,
      })

      if (error) throw error
      return data
    },
  })

  return {
    // Fire-and-forget
    generate: mutation.mutate,

    // async/await
    generateAsync: mutation.mutateAsync,

    // Status
    isPending: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,

    // Data
    data: mutation.data,
    error: mutation.error,

    // Utils
    reset: mutation.reset,
  }
}
