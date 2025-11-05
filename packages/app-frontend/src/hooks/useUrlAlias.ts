import { useMutation } from '@tanstack/react-query'
import {
  PublicStorageService,
  CreateUrlAliasOptions,
  CreateUrlAliasResult,
} from '../services/PublicStorageService'

/**
 * URL Alias作成専用カスタムフック (React Query版)
 * アップロード済みファイルに対して、カスタムURL（短縮URL、SEO slug）を作成
 *
 * @returns { createAlias, createAliasAsync, isPending, isError, error, data, reset }
 *
 * @example
 * // SNS共有用の短縮URLを作成
 * function ShareButton({ fileId }: { fileId: string }) {
 *   const { createAlias, isPending, data } = useUrlAlias()
 *
 *   const handleShare = () => {
 *     createAlias({
 *       fileId,
 *       shortCode: PublicStorageService.generateShortCode(),
 *       ogTitle: 'Check out my photo!',
 *       ogDescription: 'Amazing sunset at the beach',
 *     })
 *   }
 *
 *   return (
 *     <div>
 *       <button onClick={handleShare} disabled={isPending}>
 *         {isPending ? 'Creating...' : 'Create Share Link'}
 *       </button>
 *       {data && (
 *         <div>
 *           <p>Short URL: {data.cdnUrls.short}</p>
 *           <button onClick={() => navigator.clipboard.writeText(data.cdnUrls.short!)}>
 *             Copy
 *           </button>
 *         </div>
 *       )}
 *     </div>
 *   )
 * }
 *
 * @example
 * // SEO-Friendly URLを作成
 * function SeoUrlGenerator({ fileId, fileName }: { fileId: string; fileName: string }) {
 *   const { createAliasAsync } = useUrlAlias()
 *
 *   const handleCreate = async () => {
 *     const slug = PublicStorageService.generateSlug(fileName)
 *     const result = await createAliasAsync({
 *       fileId,
 *       slug,
 *       ogTitle: fileName,
 *       ogDescription: 'My amazing content',
 *     })
 *
 *     console.log('SEO URL:', result.cdnUrls.seo)
 *   }
 *
 *   return <button onClick={handleCreate}>Generate SEO URL</button>
 * }
 *
 * @example
 * // 両方のURLを作成（短縮 + SEO）
 * function DualUrlCreator({ fileId, title }: { fileId: string; title: string }) {
 *   const { createAlias, data } = useUrlAlias()
 *
 *   const handleCreate = () => {
 *     createAlias({
 *       fileId,
 *       shortCode: PublicStorageService.generateShortCode(6),
 *       slug: PublicStorageService.generateSlug(title),
 *       ogTitle: title,
 *       ogDescription: 'Share this content',
 *     })
 *   }
 *
 *   return (
 *     <div>
 *       <button onClick={handleCreate}>Create URLs</button>
 *       {data && (
 *         <div>
 *           <p>Short: {data.cdnUrls.short}</p>
 *           <p>SEO: {data.cdnUrls.seo}</p>
 *         </div>
 *       )}
 *     </div>
 *   )
 * }
 *
 * @example
 * // 有効期限付きの一時共有リンク
 * function TemporaryShareLink({ fileId }: { fileId: string }) {
 *   const { createAliasAsync } = useUrlAlias()
 *
 *   const handleCreate = async () => {
 *     const expiresAt = new Date()
 *     expiresAt.setHours(expiresAt.getHours() + 24) // 24時間後
 *
 *     const result = await createAliasAsync({
 *       fileId,
 *       shortCode: `temp-${Date.now()}`,
 *       expiresAt: expiresAt.toISOString(),
 *       ogTitle: 'Temporary Share',
 *     })
 *
 *     alert(`Link expires at: ${expiresAt.toLocaleString()}`)
 *     return result.cdnUrls.short
 *   }
 *
 *   return <button onClick={handleCreate}>Create 24h Link</button>
 * }
 */
export function useUrlAlias() {
  const mutation = useMutation({
    mutationFn: async ({
      fileId,
      ...options
    }: { fileId: string } & CreateUrlAliasOptions): Promise<CreateUrlAliasResult> => {
      const result = await PublicStorageService.createUrlAlias(fileId, options)
      return result
    },
  })

  return {
    // Fire-and-forget
    createAlias: mutation.mutate,

    // async/await
    createAliasAsync: mutation.mutateAsync,

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
 * アップロード + URL Alias作成を一括で行うフック
 * ファイルアップロードと同時にカスタムURLを生成
 *
 * @example
 * function UploadAndShare() {
 *   const { uploadWithAlias, isPending, data } = useUploadWithAlias()
 *
 *   const handleUpload = (file: File) => {
 *     uploadWithAlias({
 *       file,
 *       folder: 'shares',
 *       shortCode: PublicStorageService.generateShortCode(),
 *       ogTitle: file.name,
 *       ogDescription: 'Check this out!',
 *     })
 *   }
 *
 *   return (
 *     <div>
 *       <input
 *         type="file"
 *         onChange={(e) => {
 *           const file = e.target.files?.[0]
 *           if (file) handleUpload(file)
 *         }}
 *       />
 *       {isPending && <p>Uploading and creating share link...</p>}
 *       {data && (
 *         <div>
 *           <p>Upload complete!</p>
 *           <p>Share URL: {data.aliasResult.cdnUrls.short}</p>
 *           <img src={data.uploadResult.cdnUrl} alt="Uploaded" />
 *         </div>
 *       )}
 *     </div>
 *   )
 * }
 */
export function useUploadWithAlias() {
  const mutation = useMutation({
    mutationFn: async ({
      file,
      folder,
      shortCode,
      slug,
      ogTitle,
      ogDescription,
      ogImageAlt,
      expiresAt,
    }: {
      file: File
      folder?: string
      shortCode?: string
      slug?: string
      ogTitle?: string
      ogDescription?: string
      ogImageAlt?: string
      expiresAt?: string
    }) => {
      // 1. ファイルをアップロード
      const uploadResult = await PublicStorageService.upload(file, { folder })

      // 2. URL Aliasを作成
      const aliasResult = await PublicStorageService.createUrlAlias(uploadResult.id, {
        shortCode,
        slug,
        ogTitle,
        ogDescription,
        ogImageAlt,
        expiresAt,
      })

      return {
        uploadResult,
        aliasResult,
      }
    },
  })

  return {
    uploadWithAlias: mutation.mutate,
    uploadWithAliasAsync: mutation.mutateAsync,

    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,

    data: mutation.data,
    error: mutation.error,
    reset: mutation.reset,
  }
}
