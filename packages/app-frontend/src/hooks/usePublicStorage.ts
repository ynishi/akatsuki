import { useMutation } from '@tanstack/react-query'
import { PublicStorageService, UploadOptions, UploadResult } from '../services/PublicStorageService'

/**
 * Public Storage アップロード専用カスタムフック (React Query版)
 * PublicStorageService をラップし、ファイルアップロードからCDN URL生成までを自動化
 *
 * @param defaultOptions - デフォルトアップロードオプション
 * @returns { upload, uploadAsync, isPending, isError, error, data, reset }
 *
 * @example
 * // Fire-and-forget（結果は data で取得）
 * function AvatarUpload() {
 *   const { upload, isPending, isError, error, data } = usePublicStorage({
 *     folder: 'avatars',
 *     maxSizeMB: 2
 *   })
 *
 *   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 *     const file = e.target.files?.[0]
 *     if (file) {
 *       upload({ file })
 *     }
 *   }
 *
 *   if (isPending) return <Spinner />
 *   if (isError) return <p>Error: {error.message}</p>
 *
 *   return (
 *     <div>
 *       <input type="file" onChange={handleFileChange} accept="image/*" />
 *       {data && (
 *         <div>
 *           <img src={data.cdnUrl} alt="Uploaded" />
 *           <p>CDN URL: {data.cdnUrlFull}</p>
 *         </div>
 *       )}
 *     </div>
 *   )
 * }
 *
 * @example
 * // async/await で結果を直接取得
 * function FileUpload() {
 *   const { uploadAsync, isPending } = usePublicStorage()
 *
 *   const handleUpload = async (file: File) => {
 *     try {
 *       const result = await uploadAsync({ file, folder: 'documents' })
 *       console.log('Uploaded:', result.cdnUrl)
 *       // CDN URLをクリップボードにコピー
 *       navigator.clipboard.writeText(result.cdnUrlFull)
 *       alert('Uploaded! URL copied to clipboard')
 *     } catch (error) {
 *       console.error('Upload failed:', error)
 *     }
 *   }
 *
 *   return (
 *     <Dropzone onDrop={(files) => handleUpload(files[0])} />
 *   )
 * }
 *
 * @example
 * // 画像専用アップロード
 * function ImageUpload() {
 *   const { upload, data } = usePublicStorage({
 *     folder: 'gallery',
 *     allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
 *     maxSizeMB: 5
 *   })
 *
 *   const handleUpload = (file: File) => {
 *     upload({ file, metadata: { uploadedAt: new Date().toISOString() } })
 *   }
 *
 *   return (
 *     <div>
 *       <ImagePicker onSelect={handleUpload} />
 *       {data && <ImagePreview src={data.cdnUrl} />}
 *     </div>
 *   )
 * }
 */
export function usePublicStorage(defaultOptions: UploadOptions = {}) {
  const mutation = useMutation({
    mutationFn: async ({
      file,
      ...overrideOptions
    }: {
      file: File
    } & UploadOptions): Promise<UploadResult> => {
      const result = await PublicStorageService.upload(file, {
        ...defaultOptions,
        ...overrideOptions,
      })

      return result
    },
  })

  return {
    // Fire-and-forget
    upload: mutation.mutate,

    // async/await
    uploadAsync: mutation.mutateAsync,

    // 状態
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    isIdle: mutation.isIdle,

    // データ & エラー
    data: mutation.data,
    error: mutation.error,

    // リセット
    reset: mutation.reset,

    // その他のReact Query状態
    status: mutation.status,
    variables: mutation.variables,
  }
}

/**
 * 複数ファイルアップロード専用フック
 *
 * @example
 * function MultiFileUpload() {
 *   const { uploadMultiple, isPending, data } = usePublicStorageMultiple()
 *
 *   const handleFiles = (files: FileList) => {
 *     uploadMultiple({ files: Array.from(files), folder: 'gallery' })
 *   }
 *
 *   return (
 *     <div>
 *       <input type="file" multiple onChange={(e) => handleFiles(e.target.files!)} />
 *       {isPending && <p>Uploading...</p>}
 *       {data && (
 *         <ul>
 *           {data.map((result, i) => (
 *             <li key={i}>
 *               {result.success ? (
 *                 <a href={result.cdnUrl}>File {i + 1}</a>
 *               ) : (
 *                 <span>Failed: {result.error}</span>
 *               )}
 *             </li>
 *           ))}
 *         </ul>
 *       )}
 *     </div>
 *   )
 * }
 */
export function usePublicStorageMultiple(defaultOptions: UploadOptions = {}) {
  const mutation = useMutation({
    mutationFn: async ({
      files,
      ...overrideOptions
    }: {
      files: File[]
    } & UploadOptions) => {
      const results = await PublicStorageService.uploadMultiple(files, {
        ...defaultOptions,
        ...overrideOptions,
      })

      return results
    },
  })

  return {
    uploadMultiple: mutation.mutate,
    uploadMultipleAsync: mutation.mutateAsync,

    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,

    data: mutation.data,
    error: mutation.error,
    reset: mutation.reset,
  }
}

/**
 * ファイル削除専用フック
 *
 * @example
 * function DeleteButton({ fileId }: { fileId: string }) {
 *   const { deleteFile, isPending } = usePublicStorageDelete()
 *
 *   const handleDelete = async () => {
 *     if (confirm('Delete this file?')) {
 *       await deleteFile({ fileId })
 *       alert('Deleted!')
 *     }
 *   }
 *
 *   return (
 *     <button onClick={handleDelete} disabled={isPending}>
 *       {isPending ? 'Deleting...' : 'Delete'}
 *     </button>
 *   )
 * }
 */
export function usePublicStorageDelete() {
  const mutation = useMutation({
    mutationFn: async ({ fileId }: { fileId: string }) => {
      const result = await PublicStorageService.delete(fileId)
      return result
    },
  })

  return {
    deleteFile: mutation.mutate,
    deleteFileAsync: mutation.mutateAsync,

    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,

    data: mutation.data,
    error: mutation.error,
    reset: mutation.reset,
  }
}
