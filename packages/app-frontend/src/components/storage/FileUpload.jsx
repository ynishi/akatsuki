import { useState, useRef } from 'react'
import { Button } from '../ui/button'
import { PublicStorageService } from '../../services/PublicStorageService'
import { PrivateStorageService } from '../../services/PrivateStorageService'
import { FileUtils } from '../../utils/FileUtils'

/**
 * FileUpload Component
 * ファイルアップロード用のシンプルなコンポーネント
 *
 * @param {Object} props
 * @param {Function} props.onUploadComplete - アップロード完了時のコールバック
 * @param {Object} props.options - オプション
 * @param {boolean} props.options.isPublic - true: PublicStorage, false: PrivateStorage (デフォルト: true)
 * @param {string} props.options.folder - フォルダ名
 * @param {number} props.options.maxSizeMB - 最大ファイルサイズ（MB）
 * @param {string[]} props.options.allowedTypes - 許可するMIMEタイプ
 * @param {boolean} props.options.multiple - 複数ファイル選択
 *
 * @example
 * // Public アバター画像
 * <FileUpload
 *   onUploadComplete={(results) => console.log(results)}
 *   options={{ isPublic: true, folder: 'avatars', maxSizeMB: 2, allowedTypes: FileUtils.IMAGE_TYPES }}
 * />
 *
 * // Private ドキュメント
 * <FileUpload
 *   onUploadComplete={(results) => console.log(results)}
 *   options={{ isPublic: false, folder: 'documents', maxSizeMB: 10 }}
 * />
 */
export function FileUpload({ onUploadComplete, options = {} }) {
  const {
    isPublic = true,
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
        if (!FileUtils.validateFileSize(file, maxSizeMB)) {
          throw new Error(`ファイルサイズは${maxSizeMB}MB以下にしてください: ${file.name}`)
        }

        if (allowedTypes.length > 0 && !FileUtils.validateFileType(file, allowedTypes)) {
          throw new Error(`許可されていないファイルタイプです: ${file.name}`)
        }
      }

      // Upload files using appropriate service
      const StorageService = isPublic ? PublicStorageService : PrivateStorageService

      const uploadOptions = { folder }

      const results = multiple
        ? await StorageService.uploadMultiple(selectedFiles, uploadOptions)
        : [await StorageService.upload(selectedFiles[0], uploadOptions)]

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

      {/* Storage Type Badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-500">Storage:</span>
        <span className={`text-xs px-2 py-1 rounded ${
          isPublic
            ? 'bg-green-100 text-green-700'
            : 'bg-blue-100 text-blue-700'
        }`}>
          {isPublic ? 'Public (公開)' : 'Private (非公開)'}
        </span>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">選択されたファイル:</p>
          {selectedFiles.map((file, index) => {
            const fileInfo = FileUtils.getFileInfo(file)
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
