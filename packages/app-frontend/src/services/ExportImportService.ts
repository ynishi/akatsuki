/**
 * ExportImportService
 * Type-safe JSON and Zip Export/Import service for any entity type
 *
 * @template T - The entity type to export/import
 *
 * @example
 * ```typescript
 * // Create service instance
 * const service = new ExportImportService<Skill>('skills', '1.0.0')
 *
 * // JSON Export/Import
 * service.downloadJSON(skills, { filename: 'my-skills.json' })
 * const data = await service.readJSONFile(file)
 *
 * // Zip Export/Import (requires formatter)
 * const formatter: ZipFormatter<Skill> = {
 *   toDirectoryName: (skill) => skill.name.toLowerCase().replace(/\s+/g, '-'),
 *   toFileName: () => 'SKILL.md',
 *   formatContent: (skill) => skill.content,
 *   parseContent: (content) => ({ content }),
 * }
 * await service.exportZip(skills, formatter, { filename: 'skills.zip' })
 * const imported = await service.importZip(file, formatter)
 * ```
 *
 * @see useExportImport - React Query integration hook
 */

import JSZip from 'jszip'

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
 * Options for JSON export operations
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
 * Options for Zip export operations
 */
export interface ZipExportOptions {
  /** Custom filename (with .zip extension) */
  filename?: string

  /** Optional metadata to pass to formatter */
  metadata?: any
}

/**
 * Formatter interface for customizing zip export/import behavior
 *
 * @template T - The entity type
 */
export interface ZipFormatter<T> {
  /**
   * Convert entity to directory-safe name
   *
   * @param entity - Entity to convert
   * @returns Directory-safe name (e.g., "my-skill-name")
   *
   * @example
   * ```typescript
   * toDirectoryName: (skill) => skill.name.toLowerCase().replace(/\s+/g, '-')
   * ```
   */
  toDirectoryName: (entity: T) => string

  /**
   * Get file name for the entity
   *
   * @param entity - Entity to get filename for
   * @returns File name (e.g., "SKILL.md", "workflow.json")
   *
   * @example
   * ```typescript
   * toFileName: () => 'SKILL.md'
   * // or dynamic:
   * toFileName: (skill) => `${skill.id}.md`
   * ```
   */
  toFileName: (entity: T) => string

  /**
   * Convert entity to file content
   *
   * @param entity - Entity to convert
   * @param metadata - Optional metadata (e.g., related entities)
   * @returns File content as string
   *
   * @example
   * ```typescript
   * formatContent: (skill, metadata) => {
   *   const frontMatter = `---\nname: ${skill.name}\n---\n`
   *   return frontMatter + skill.content
   * }
   * ```
   */
  formatContent: (entity: T, metadata?: any) => string

  /**
   * Parse file content back to entity
   *
   * @param content - File content to parse
   * @returns Partial entity data or null if parsing fails
   *
   * @example
   * ```typescript
   * parseContent: (content) => {
   *   const match = content.match(/^---\n(.*?)\n---\n(.*)$/s)
   *   if (!match) return null
   *   return { name: extractName(match[1]), content: match[2] }
   * }
   * ```
   */
  parseContent: (content: string) => Partial<T> | null
}

/**
 * Export/Import service for type-safe data exchange
 *
 * Features:
 * - JSON export/import with versioning and metadata
 * - Zip export/import with custom formatters
 * - Clipboard operations
 * - File download/upload utilities
 */
export class ExportImportService<T> {
  /**
   * Create a new export/import service
   *
   * @param entityName - Human-readable entity name (e.g., 'skills', 'workflows')
   * @param version - Export format version (semver)
   */
  constructor(
    private readonly entityName: string,
    private readonly version: string = '1.0.0'
  ) {}

  // ==================== JSON Export/Import ====================

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
    this.downloadBlob(blob, this.generateJSONFilename(options?.filename))
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

  // ==================== Zip Export/Import ====================

  /**
   * Export entities as single combined .zip file
   *
   * @param entities - Entities to export
   * @param formatter - Formatter defining how to convert entities to/from files
   * @param options - Zip export options
   *
   * @example
   * ```typescript
   * const formatter: ZipFormatter<Skill> = {
   *   toDirectoryName: (skill) => skill.name.toLowerCase().replace(/\s+/g, '-'),
   *   toFileName: () => 'SKILL.md',
   *   formatContent: (skill) => skill.content,
   *   parseContent: (content) => ({ content }),
   * }
   *
   * await service.exportZip(skills, formatter, { filename: 'all-skills.zip' })
   * ```
   */
  async exportZip(
    entities: T[],
    formatter: ZipFormatter<T>,
    options?: ZipExportOptions
  ): Promise<void> {
    const zip = new JSZip()

    // Add each entity as separate directory
    for (const entity of entities) {
      const dirName = formatter.toDirectoryName(entity)
      const fileName = formatter.toFileName(entity)
      const content = formatter.formatContent(entity, options?.metadata)

      zip.file(`${dirName}/${fileName}`, content)
    }

    // Generate and download
    const blob = await zip.generateAsync({ type: 'blob' })
    const defaultFilename = `${this.entityName}-export-${new Date().toISOString().split('T')[0]}.zip`
    this.downloadBlob(blob, options?.filename || defaultFilename)
  }

  /**
   * Import all entities from .zip file
   *
   * @param file - Zip file containing entities
   * @param formatter - Formatter defining how to parse file contents
   * @param filePattern - Optional regex pattern to filter files (e.g., /\.md$/)
   * @returns Array of parsed entities (skips failed parses)
   *
   * @example
   * ```typescript
   * const formatter: ZipFormatter<Skill> = { ... }
   * const skills = await service.importZip(file, formatter, /SKILL\.md$/)
   * console.log(`Imported ${skills.length} skills`)
   * ```
   */
  async importZip(
    file: File,
    formatter: ZipFormatter<T>,
    filePattern?: RegExp
  ): Promise<Array<Partial<T>>> {
    try {
      const zip = await JSZip.loadAsync(file)
      const entities: Array<Partial<T>> = []

      // Process all files
      const filePromises: Promise<void>[] = []

      zip.forEach((relativePath, zipEntry) => {
        // Skip directories
        if (zipEntry.dir) return

        // Apply pattern filter if provided
        if (filePattern && !filePattern.test(relativePath)) return

        const promise = zipEntry.async('text').then((content) => {
          const parsed = formatter.parseContent(content)
          if (parsed) {
            entities.push(parsed)
          } else {
            console.warn(`Failed to parse: ${relativePath}`)
          }
        })

        filePromises.push(promise)
      })

      await Promise.all(filePromises)

      return entities
    } catch (error) {
      console.error('Failed to import from zip:', error)
      return []
    }
  }

  // ==================== Clipboard Operations ====================

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

  // ==================== Private Utilities ====================

  /**
   * Download blob as file
   *
   * @param blob - Blob to download
   * @param filename - Filename with extension
   */
  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()

    // Cleanup
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * Generate filename for JSON export with timestamp
   *
   * @param customName - Custom filename (without extension)
   * @returns Filename with .json extension
   */
  private generateJSONFilename(customName?: string): string {
    if (customName) {
      return `${customName}.json`
    }

    const timestamp = new Date().toISOString().split('T')[0]
    return `${this.entityName}-export-${timestamp}.json`
  }
}
