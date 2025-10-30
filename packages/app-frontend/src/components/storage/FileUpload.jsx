import { useState, useRef } from 'react'
import { Button } from '../ui/button'
import { StorageRepository } from '../../repositories'

/**
 * FileUpload Component
 * ファイルアップロード用のシンプルなコンポーネント
 */
export function FileUpload({ onUploadComplete, options = {} }) {
  const {
    bucket = 'uploads',
    folder = '',
    maxSizeMB = 10,
    allowedTypes = [],
    multiple = false,
  } = options

  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedFiles, setSelectedFiles] = useState([])
  const fileInputRef = useRef(null)

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles(files)
    setError(null)
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('ファイルを選択してください')
      return
    }

    setUploading(true)
    setError(null)

    try {
      // Validate files
      for (const file of selectedFiles) {
        if (!StorageRepository.validateFileSize(file, maxSizeMB)) {
          throw new Error(`ファイルサイズは${maxSizeMB}MB以下にしてください: ${file.name}`)
        }

        if (allowedTypes.length > 0 && !StorageRepository.validateFileType(file, allowedTypes)) {
          throw new Error(`許可されていないファイルタイプです: ${file.name}`)
        }
      }

      // Upload files
      const results = multiple
        ? await StorageRepository.uploadMultiple(selectedFiles, { bucket, folder })
        : [await StorageRepository.uploadFile(selectedFiles[0], { bucket, folder })]

      // Call callback with results
      if (onUploadComplete) {
        onUploadComplete(results)
      }

      // Reset state
      setSelectedFiles([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveFile = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index)
    setSelectedFiles(newFiles)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          onChange={handleFileSelect}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-lg file:border-0
            file:text-sm file:font-semibold
            file:bg-gradient-to-r file:from-pink-500 file:via-purple-500 file:to-blue-500
            file:text-white
            hover:file:opacity-90
            file:cursor-pointer cursor-pointer"
        />
        <Button
          onClick={handleUpload}
          disabled={uploading || selectedFiles.length === 0}
          variant="gradient"
        >
          {uploading ? 'アップロード中...' : 'アップロード'}
        </Button>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">選択されたファイル:</p>
          {selectedFiles.map((file, index) => {
            const fileInfo = StorageRepository.getFileInfo(file)
            return (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{fileInfo.name}</p>
                  <p className="text-xs text-gray-500">{fileInfo.sizeFormatted}</p>
                </div>
                <button
                  onClick={() => handleRemoveFile(index)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  削除
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Upload Info */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>最大ファイルサイズ: {maxSizeMB}MB</p>
        {allowedTypes.length > 0 && (
          <p>許可されるファイル形式: {allowedTypes.join(', ')}</p>
        )}
      </div>
    </div>
  )
}
