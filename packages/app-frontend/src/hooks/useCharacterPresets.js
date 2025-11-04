import { useQuery } from '@tanstack/react-query'
import { CharacterPresetRepository } from '../repositories/CharacterPresetRepository'
import { CharacterPreset } from '../models/CharacterPreset'

/**
 * Character Presets Hook (React Query)
 * Fetch character presets grouped by category
 *
 * @returns {Object} { presets, isLoading, isError, error, refetch }
 *
 * @example
 * function PresetSelector() {
 *   const { presets, isLoading } = useCharacterPresets()
 *
 *   if (isLoading) return <Skeleton />
 *
 *   return (
 *     <div>
 *       {Object.entries(presets).map(([category, items]) => (
 *         <div key={category}>
 *           <h3>{category}</h3>
 *           {items.map(preset => (
 *             <button key={preset.id}>{preset.name}</button>
 *           ))}
 *         </div>
 *       ))}
 *     </div>
 *   )
 * }
 */
export function useCharacterPresets() {
  const query = useQuery({
    queryKey: ['characterPresets'],
    queryFn: async () => {
      const { data, error } = await CharacterPresetRepository.findAllGroupedByCategory()

      if (error) throw error

      // Convert to Models
      const grouped = {}
      for (const [category, items] of Object.entries(data)) {
        grouped[category] = items.map((item) => CharacterPreset.fromDatabase(item))
      }

      return grouped
    },
    staleTime: 1000 * 60 * 10, // 10 minutes (master data rarely changes)
  })

  return {
    presets: query.data || {},
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
