/**
 * ExportImportButtons
 * Type-safe Export/Import UI component with Dialog
 *
 * @template T - The entity type to export/import
 *
 * @example
 * ```typescript
 * // Basic usage with useExportImport hook
 * const { exportJSON, importJSON, isImporting } = useExportImport<Skill>({
 *   entityName: 'Skills',
 *   onImport: async (skills) => { ... }
 * })
 *
 * <ExportImportButtons
 *   entities={skills}
 *   onExportJSON={exportJSON}
 *   onImportJSON={importJSON}
 *   isImporting={isImporting}
 * />
 * ```
 *
 * @example
 * ```typescript
 * // With Zip export
 * const zipExport = (entities: Skill[]) => {
 *   zipService.exportAllAsZip(entities, undefined, 'skills.zip')
 * }
 *
 * <ExportImportButtons
 *   entities={skills}
 *   onExportJSON={exportJSON}
 *   onExportZip={zipExport}
 *   onImportJSON={importJSON}
 *   isImporting={isImporting}
 *   showZipExport={true}
 * />
 * ```
 *
 * @example
 * ```typescript
 * // Custom labels and styling
 * <ExportImportButtons
 *   entities={workflows}
 *   onExportJSON={exportJSON}
 *   onImportJSON={importJSON}
 *   entityName="Workflows"
 *   exportJSONLabel="Download JSON"
 *   importLabel="Upload JSON"
 *   size="default"
 *   variant="default"
 *   className="my-4"
 * />
 * ```
 */

import { useState, useRef } from 'react'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../ui/dialog'
import { Download, Upload, FileArchive, Loader2, X } from 'lucide-react'
import type { ExportOptions } from '../../services/ExportImportService'

/**
 * Props for ExportImportButtons component
 */
export interface ExportImportButtonsProps<T> {
  /**
   * Array of entities to export
   */
  entities: T[]

  /**
   * Callback to export entities as JSON
   *
   * @param entities - Entities to export
   * @param options - Export options
   */
  onExportJSON: (entities: T[], options?: ExportOptions) => void

  /**
   * Optional callback to export entities as Zip
   *
   * @param entities - Entities to export
   * @param filename - Optional filename
   */
  onExportZip?: (entities: T[], filename?: string) => void

  /**
   * Callback to import entities from JSON file
   *
   * @param file - File from input[type="file"]
   */
  onImportJSON: (file: File) => void

  /**
   * True while import is in progress
   * @default false
   */
  isImporting?: boolean

  /**
   * Human-readable entity name (plural)
   * @default 'Items'
   */
  entityName?: string

  /**
   * Custom label for Export JSON button
   * @default 'Export JSON'
   */
  exportJSONLabel?: string

  /**
   * Custom label for Export Zip button
   * @default 'Export .zip'
   */
  exportZipLabel?: string

  /**
   * Custom label for Import button
   * @default 'Import JSON'
   */
  importLabel?: string

  /**
   * Show Export Zip button
   * @default false
   */
  showZipExport?: boolean

  /**
   * File types to accept for import
   * @default '.json'
   */
  importAccept?: string

  /**
   * Button size
   * @default 'sm'
   */
  size?: 'sm' | 'default' | 'lg' | 'icon'

  /**
   * Button variant
   * @default 'outline'
   */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'

  /**
   * Additional CSS classes
   */
  className?: string

  /**
   * Disable all buttons
   * @default false
   */
  disabled?: boolean
}

/**
 * Export/Import UI component with type-safe operations
 *
 * Features:
 * - Export JSON button with instant download
 * - Optional Export Zip button
 * - Import dialog with file picker
 * - Loading states
 * - Accessible keyboard navigation
 * - Empty state handling
 */
export function ExportImportButtons<T>({
  entities,
  onExportJSON,
  onExportZip,
  onImportJSON,
  isImporting = false,
  entityName = 'Items',
  exportJSONLabel = 'Export JSON',
  exportZipLabel = 'Export .zip',
  importLabel = 'Import JSON',
  showZipExport = false,
  importAccept = '.json',
  size = 'sm',
  variant = 'outline',
  className = '',
  disabled = false,
}: ExportImportButtonsProps<T>) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isEmpty = entities.length === 0
  const isDisabled = disabled || isImporting

  /**
   * Handle file selection
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  /**
   * Handle import confirmation
   */
  const handleImportConfirm = () => {
    if (selectedFile) {
      onImportJSON(selectedFile)
      setSelectedFile(null)
      setIsDialogOpen(false)

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  /**
   * Handle dialog close
   */
  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  /**
   * Clear selected file
   */
  const handleClearFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {/* Export JSON Button */}
      <Button
        onClick={() => onExportJSON(entities)}
        variant={variant}
        size={size}
        disabled={isDisabled || isEmpty}
        title={isEmpty ? `No ${entityName.toLowerCase()} to export` : `Export ${entityName} as JSON`}
        aria-label={`Export ${entityName} as JSON`}
      >
        <Download className="mr-2 h-4 w-4" />
        {exportJSONLabel}
      </Button>

      {/* Export Zip Button (Optional) */}
      {showZipExport && onExportZip && (
        <Button
          onClick={() => onExportZip(entities)}
          variant={variant}
          size={size}
          disabled={isDisabled || isEmpty}
          title={isEmpty ? `No ${entityName.toLowerCase()} to export` : `Export ${entityName} as Zip`}
          aria-label={`Export ${entityName} as Zip`}
        >
          <FileArchive className="mr-2 h-4 w-4" />
          {exportZipLabel}
        </Button>
      )}

      {/* Import Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogTrigger asChild>
          <Button
            variant={variant}
            size={size}
            disabled={isDisabled}
            aria-label={`Import ${entityName}`}
          >
            {isImporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {importLabel}
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import {entityName}</DialogTitle>
            <DialogDescription>
              Upload a JSON file to import {entityName.toLowerCase()}. The file should be in the
              correct export format.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* File Input */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept={importAccept}
                onChange={handleFileSelect}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isImporting}
                aria-label="Select file to import"
              />
            </div>

            {/* Selected File Info */}
            {selectedFile && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFile}
                  disabled={isImporting}
                  aria-label="Clear selected file"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Import Progress */}
            {isImporting && (
              <div className="flex items-center gap-2 text-sm text-purple-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Importing {entityName.toLowerCase()}...</span>
              </div>
            )}
          </div>

          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogClose(false)}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleImportConfirm}
              disabled={!selectedFile || isImporting}
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                'Import'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
