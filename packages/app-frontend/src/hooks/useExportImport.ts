/**
 * useExportImport
 * Type-safe Export/Import hook with React Query integration
 *
 * @template T - The entity type to export/import
 *
 * @example
 * ```typescript
 * // In your component
 * const { exportJSON, importJSON, isImporting } = useExportImport<Skill>({
 *   entityName: 'Skills',
 *   version: '1.0.0',
 *   onImport: async (skills) => {
 *     for (const skill of skills) {
 *       await createSkillAsync({ ...skill, userId: user.id })
 *     }
 *   },
 *   onImportSuccess: () => {
 *     queryClient.invalidateQueries({ queryKey: ['skills'] })
 *   }
 * })
 *
 * // Use in UI
 * <Button onClick={() => exportJSON(skills)}>Export</Button>
 * <input type="file" onChange={(e) => {
 *   const file = e.target.files?.[0]
 *   if (file) importJSON(file)
 * }} />
 * ```
 *
 * @see GenericExportService - Underlying service
 * @see ExportImportButtons - Ready-to-use UI component
 */

import { useMutation } from '@tanstack/react-query'
import { GenericExportService, type ExportOptions } from '../services/GenericExportService'
import { toast } from 'sonner'

/**
 * Options for useExportImport hook
 */
export interface UseExportImportOptions<T> {
  /**
   * Human-readable entity name (e.g., 'Skills', 'Workflows')
   * Used in toast messages and default filenames
   */
  entityName: string

  /**
   * Export format version (semver)
   * @default '1.0.0'
   */
  version?: string

  /**
   * Callback to handle imported entities
   * Typically saves to database via Repository/Service
   *
   * @param entities - Array of entities to import
   * @returns Promise that resolves when import is complete
   *
   * @example
   * ```typescript
   * onImport: async (skills) => {
   *   for (const skill of skills) {
   *     await skillRepository.create({ ...skill, userId: user.id })
   *   }
   * }
   * ```
   */
  onImport: (entities: T[]) => Promise<void>

  /**
   * Callback after successful import
   * Typically used to invalidate queries or navigate
   *
   * @example
   * ```typescript
   * onImportSuccess: () => {
   *   queryClient.invalidateQueries({ queryKey: ['skills'] })
   *   toast.success('Skills imported successfully')
   * }
   * ```
   */
  onImportSuccess?: () => void

  /**
   * Callback when import fails
   *
   * @param error - Error that occurred during import
   *
   * @example
   * ```typescript
   * onImportError: (error) => {
   *   console.error('Import failed:', error)
   *   toast.error(`Import failed: ${error.message}`)
   * }
   * ```
   */
  onImportError?: (error: Error) => void

  /**
   * Custom toast messages
   */
  toastMessages?: {
    exportSuccess?: string
    importSuccess?: string
    importError?: string
  }
}

/**
 * Return type of useExportImport hook
 */
export interface UseExportImportReturn<T> {
  /**
   * Export entities to JSON file
   *
   * @param entities - Entities to export
   * @param options - Export options (filename, metadata)
   *
   * @example
   * ```typescript
   * exportJSON(skills, { filename: 'my-skills', includeMetadata: true })
   * ```
   */
  exportJSON: (entities: T[], options?: ExportOptions) => void

  /**
   * Import entities from JSON file
   * Triggers mutation with loading state
   *
   * @param file - File from input[type="file"]
   *
   * @example
   * ```typescript
   * <input
   *   type="file"
   *   accept=".json"
   *   onChange={(e) => {
   *     const file = e.target.files?.[0]
   *     if (file) importJSON(file)
   *   }}
   * />
   * ```
   */
  importJSON: (file: File) => void

  /**
   * True while import is in progress
   */
  isImporting: boolean

  /**
   * Error that occurred during import (null if no error)
   */
  importError: Error | null

  /**
   * Underlying service (for advanced use cases)
   */
  service: GenericExportService<T>
}

/**
 * Hook for type-safe Export/Import with React Query
 *
 * Features:
 * - Type-safe export/import operations
 * - React Query mutation for import with loading/error states
 * - Toast notifications
 * - Success/error callbacks
 */
export function useExportImport<T>({
  entityName,
  version = '1.0.0',
  onImport,
  onImportSuccess,
  onImportError,
  toastMessages,
}: UseExportImportOptions<T>): UseExportImportReturn<T> {
  // Create service instance
  const service = new GenericExportService<T>(entityName.toLowerCase(), version)

  // Export JSON (instant operation, no mutation needed)
  const exportJSON = (entities: T[], options?: ExportOptions) => {
    service.downloadJSON(entities, options)

    const message =
      toastMessages?.exportSuccess || `${entityName} exported successfully`
    toast.success(message)
  }

  // Import JSON with React Query mutation
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      // Read and parse file
      const data = await service.readJSONFile(file)

      if (!data) {
        throw new Error('Failed to parse JSON file. Please check the file format.')
      }

      // Validate version compatibility
      if (!service.isVersionCompatible(data)) {
        console.warn('Version mismatch:', {
          expected: version,
          actual: data.version,
        })
        // Continue anyway, but warn user
        toast.warning(
          `File version (${data.version}) differs from expected (${version}). Some features may not work correctly.`
        )
      }

      // Call user-provided import handler
      await onImport(data.entities)

      return data
    },

    onSuccess: (data) => {
      const message =
        toastMessages?.importSuccess ||
        `Successfully imported ${data.entities.length} ${entityName.toLowerCase()}`
      toast.success(message)

      onImportSuccess?.()
    },

    onError: (error: Error) => {
      const message =
        toastMessages?.importError ||
        `Failed to import ${entityName.toLowerCase()}: ${error.message}`
      toast.error(message)

      onImportError?.(error)
    },
  })

  return {
    exportJSON,
    importJSON: importMutation.mutate,
    isImporting: importMutation.isPending,
    importError: importMutation.error,
    service,
  }
}
