import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Switch } from '../ui/switch'
import { supabase } from '@/lib/supabase'
import { WasmModuleRepository } from '@/repositories/WasmModuleRepository'
import { useAuth } from '@/contexts/AuthContext'

interface WasmModuleUploaderProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  defaultOwnerType?: 'system' | 'admin' | 'user'
}

export function WasmModuleUploader({
  open,
  onOpenChange,
  onSuccess,
  defaultOwnerType = 'user',
}: WasmModuleUploaderProps) {
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  const [moduleName, setModuleName] = useState('')
  const [version, setVersion] = useState('1.0.0')
  const [description, setDescription] = useState('')
  const [ownerType, setOwnerType] = useState<'system' | 'admin' | 'user'>(defaultOwnerType)
  const [isPublic, setIsPublic] = useState(false)

  const resetForm = () => {
    setFile(null)
    setModuleName('')
    setVersion('1.0.0')
    setDescription('')
    setOwnerType(defaultOwnerType)
    setIsPublic(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.wasm')) {
        alert('Please select a .wasm file')
        return
      }
      setFile(selectedFile)

      // Auto-fill module name from filename if empty
      if (!moduleName) {
        const name = selectedFile.name.replace(/\.wasm$/, '')
        setModuleName(name)
      }
    }
  }

  const handleUpload = async () => {
    if (!file || !moduleName || !user) {
      alert('Please fill in all required fields')
      return
    }

    try {
      setUploading(true)

      // 1. Upload WASM file to Storage
      const filePath = `wasm-modules/${user.id}/${Date.now()}-${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('wasm-modules')
        .upload(filePath, file, {
          contentType: 'application/wasm',
          upsert: false,
        })

      if (uploadError) throw uploadError
      if (!uploadData) throw new Error('Upload failed')

      // 2. Create database record
      const { error: createError } = await WasmModuleRepository.create({
        owner_id: user.id,
        owner_type: ownerType,
        module_name: moduleName,
        version,
        description: description || null,
        file_id: uploadData.path,
        status: 'active',
        is_public: isPublic,
        wasm_size_bytes: file.size,
        exported_functions: [],
        memory_pages: 1,
        max_memory_pages: null,
        timeout_ms: 5000,
        max_execution_time_ms: 10000,
        allowed_users: [],
        metadata: {},
      })

      if (createError) {
        // Cleanup uploaded file if DB insert fails
        await supabase.storage.from('wasm-modules').remove([filePath])
        throw createError
      }

      alert(`Module "${moduleName}" v${version} uploaded successfully!`)
      resetForm()
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Upload error:', error)
      const message = error instanceof Error ? error.message : String(error)
      alert(`Upload failed: ${message}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload WASM Module</DialogTitle>
          <DialogDescription>
            Upload a WebAssembly module and configure its metadata
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Upload */}
          <div>
            <Label htmlFor="wasm-file">WASM File *</Label>
            <Input
              id="wasm-file"
              type="file"
              accept=".wasm"
              onChange={handleFileChange}
              disabled={uploading}
            />
            {file && (
              <p className="text-sm text-gray-600 mt-1">
                Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          {/* Module Name */}
          <div>
            <Label htmlFor="module-name">Module Name *</Label>
            <Input
              id="module-name"
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
              placeholder="image-resize"
              disabled={uploading}
            />
          </div>

          {/* Version */}
          <div>
            <Label htmlFor="version">Version *</Label>
            <Input
              id="version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.0.0"
              disabled={uploading}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              className="w-full p-2 border rounded-md"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of what this module does"
              disabled={uploading}
            />
          </div>

          {/* Owner Type */}
          <div>
            <Label htmlFor="owner-type">Owner Type *</Label>
            <Select value={ownerType} onValueChange={(v) => setOwnerType(v as typeof ownerType)} disabled={uploading}>
              <SelectTrigger id="owner-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">
                  System - Available to all users
                </SelectItem>
                <SelectItem value="admin">
                  Admin - Admin only
                </SelectItem>
                <SelectItem value="user">
                  User - Personal module
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              {ownerType === 'system' && 'System modules are accessible to all authenticated users'}
              {ownerType === 'admin' && 'Admin modules can only be executed by administrators'}
              {ownerType === 'user' && 'User modules are private by default (use Public toggle below)'}
            </p>
          </div>

          {/* Public Toggle (only for user modules) */}
          {ownerType === 'user' && (
            <div className="flex items-center space-x-2">
              <Switch
                id="is-public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
                disabled={uploading}
              />
              <Label htmlFor="is-public">Make this module public</Label>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => {
                resetForm()
                onOpenChange(false)
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={handleUpload}
              disabled={uploading || !file || !moduleName}
            >
              {uploading ? 'Uploading...' : 'Upload Module'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
