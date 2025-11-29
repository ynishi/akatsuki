/**
 * GenericExportService
 * Type-safe JSON Export/Import service for any entity type
 *
 * @template T - The entity type to export/import
 *
 * @example
 * ```typescript
 * // Create service instance
 * const exporter = new GenericExportService<Skill>('skills', '1.0.0')
 *
 * // Export to JSON file
 * exporter.downloadJSON(skills, { filename: 'my-skills.json' })
 *
 * // Import from JSON file
 * const data = await exporter.readJSONFile(file)
 * if (data) {
 *   console.log(`Imported ${data.entities.length} skills`)
 * }
 *
 * // Copy single entity to clipboard
 * await exporter.copyToClipboard(skill)
 * ```
 *
 * @see useExportImport - React Query integration hook
 */

/**
 * Export data structure with versioning and metadata
 */
export interface ExportData<T> {
  /** Version of the export format (semver) */
  version: string

  /** ISO 8601 timestamp of export */
  exportedAt: string

  /** Array of exported entities */
  entities: T[]

  /** Optional metadata (user info, app version, etc.) */
  metadata?: Record<string, any>
}

/**
 * Options for export operations
 */
export interface ExportOptions {
  /** Custom filename (without extension) */
  filename?: string

  /** Include metadata in export */
  includeMetadata?: boolean

  /** Custom metadata to include */
  customMetadata?: Record<string, any>
}

/**
 * Generic Export/Import service for type-safe data exchange
 *
 * Features:
 * - Type-safe export/import with TypeScript generics
 * - Versioned export format for backward compatibility
 * - Metadata support for context preservation
 * - File download/upload utilities
 * - Clipboard operations
 */
export class GenericExportService<T> {
  /**
   * Create a new export service
   *
   * @param entityName - Human-readable entity name (e.g., 'skills', 'workflows')
   * @param version - Export format version (semver)
   */
  constructor(
    private readonly entityName: string,
    private readonly version: string = '1.0.0'
  ) {}

  /**
   * Export entities to JSON string
   *
   * @param entities - Array of entities to export
   * @param metadata - Optional metadata to include
   * @returns JSON string with proper formatting
   */
  exportToJSON(entities: T[], metadata?: Record<string, any>): string {
    const exportData: ExportData<T> = {
      version: this.version,
      exportedAt: new Date().toISOString(),
      entities,
      metadata,
    }

    return JSON.stringify(exportData, null, 2)
  }

  /**
   * Download entities as JSON file
   *
   * @param entities - Array of entities to export
   * @param options - Export options
   *
   * @example
   * ```typescript
   * service.downloadJSON(skills, {
   *   filename: 'my-skills',
   *   includeMetadata: true,
   *   customMetadata: { author: 'John Doe' }
   * })
   * ```
   */
  downloadJSON(entities: T[], options?: ExportOptions): void {
    const metadata = options?.includeMetadata ? options.customMetadata : undefined
    const json = this.exportToJSON(entities, metadata)

    // Create blob and download
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = this.generateFilename(options?.filename)
    document.body.appendChild(a)
    a.click()

    // Cleanup
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * Parse JSON string to ExportData
   *
   * @param jsonString - JSON string to parse
   * @returns Parsed export data or null if invalid
   */
  parseJSON(jsonString: string): ExportData<T> | null {
    try {
      const data = JSON.parse(jsonString) as ExportData<T>

      // Validate structure
      if (!data.version || !data.entities || !Array.isArray(data.entities)) {
        console.error('Invalid export data structure:', {
          hasVersion: !!data.version,
          hasEntities: !!data.entities,
          isArray: Array.isArray(data.entities),
        })
        return null
      }

      return data
    } catch (error) {
      console.error('Failed to parse JSON:', error)
      return null
    }
  }

  /**
   * Read and parse JSON file
   *
   * @param file - File object from input[type="file"]
   * @returns Promise resolving to parsed data or null if invalid
   *
   * @example
   * ```typescript
   * const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
   *   const file = e.target.files?.[0]
   *   if (file) {
   *     const data = await service.readJSONFile(file)
   *     if (data) {
   *       console.log(`Loaded ${data.entities.length} items`)
   *     }
   *   }
   * }
   * ```
   */
  async readJSONFile(file: File): Promise<ExportData<T> | null> {
    return new Promise((resolve) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        const text = e.target?.result as string
        const data = this.parseJSON(text)
        resolve(data)
      }

      reader.onerror = () => {
        console.error('Failed to read file:', reader.error)
        resolve(null)
      }

      reader.readAsText(file)
    })
  }

  /**
   * Copy single entity to clipboard as JSON
   *
   * @param entity - Entity to copy
   * @returns Promise resolving to true if successful
   *
   * @example
   * ```typescript
   * const handleCopy = async () => {
   *   const success = await service.copyToClipboard(skill)
   *   if (success) {
   *     toast.success('Copied to clipboard')
   *   }
   * }
   * ```
   */
  async copyToClipboard(entity: T): Promise<boolean> {
    try {
      const json = JSON.stringify(entity, null, 2)
      await navigator.clipboard.writeText(json)
      return true
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      return false
    }
  }

  /**
   * Copy multiple entities to clipboard as JSON array
   *
   * @param entities - Entities to copy
   * @returns Promise resolving to true if successful
   */
  async copyEntitiesToClipboard(entities: T[]): Promise<boolean> {
    try {
      const json = JSON.stringify(entities, null, 2)
      await navigator.clipboard.writeText(json)
      return true
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      return false
    }
  }

  /**
   * Generate filename with timestamp
   *
   * @param customName - Custom filename (without extension)
   * @returns Filename with .json extension
   */
  private generateFilename(customName?: string): string {
    if (customName) {
      return `${customName}.json`
    }

    const timestamp = new Date().toISOString().split('T')[0]
    return `${this.entityName}-export-${timestamp}.json`
  }

  /**
   * Validate export data version compatibility
   *
   * @param exportData - Export data to validate
   * @param expectedVersion - Expected version (defaults to service version)
   * @returns True if compatible
   */
  isVersionCompatible(
    exportData: ExportData<T>,
    expectedVersion?: string
  ): boolean {
    const expected = expectedVersion || this.version
    const actual = exportData.version

    // Simple semver major version check
    const expectedMajor = parseInt(expected.split('.')[0])
    const actualMajor = parseInt(actual.split('.')[0])

    return expectedMajor === actualMajor
  }
}
