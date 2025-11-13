/**
 * File Repository (Edge Functions版)
 * files table + Supabase Storage data access layer
 *
 * Manages file metadata and Storage operations
 */

import { BaseRepository } from '../repository.ts'
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * FileRepository
 * File metadata management + Storage operations
 */
export class FileRepository extends BaseRepository {
  /**
   * Upload file to Supabase Storage and create metadata record
   *
   * @param params - Upload parameters
   * @returns File metadata record
   *
   * @example
   * const fileRecord = await fileRepo.uploadToStorage({
   *   file: uploadedFile,
   *   bucket: 'private_uploads',
   *   ownerId: userId,
   *   storagePath: `${userId}/${Date.now()}-${file.name}`
   * })
   */
  async uploadToStorage(params: {
    file: File
    bucket: string
    ownerId: string
    storagePath?: string
    isPublic?: boolean
    metadata?: Record<string, any>
  }): Promise<any> {
    const {
      file,
      bucket,
      ownerId,
      storagePath: providedPath,
      isPublic = false,
      metadata = {},
    } = params

    // Generate storage path if not provided
    const storagePath = providedPath || `${ownerId}/${Date.now()}-${file.name}`

    // 1. Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer()
    const { data: uploadData, error: uploadError } = await this.supabase.storage
      .from(bucket)
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('[FileRepository] Storage upload error:', uploadError)
      throw new Error(`Failed to upload file to storage: ${uploadError.message}`)
    }

    // 2. Create metadata record in files table
    try {
      const { data: fileRecord, error: dbError } = await this.supabase
        .from('files')
        .insert({
          owner_id: ownerId,
          storage_path: uploadData.path,
          bucket_name: bucket,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          is_public: isPublic,
          status: 'active',
          metadata: metadata,
        })
        .select()
        .single()

      if (dbError) {
        // Rollback: Delete uploaded file from storage
        await this.supabase.storage.from(bucket).remove([uploadData.path])
        throw new Error(`Failed to create file metadata: ${dbError.message}`)
      }

      return fileRecord
    } catch (error: any) {
      console.error('[FileRepository] File metadata creation error:', error)
      throw error
    }
  }

  /**
   * Get file metadata by ID
   *
   * @param fileId - files.id (UUID)
   * @returns File metadata or null
   */
  async findById(fileId: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single()

    if (error) {
      if (this.isNotFoundError(error)) {
        return null
      }
      console.error('[FileRepository] findById error:', error)
      throw new Error(`Failed to fetch file: ${error.message}`)
    }

    return data
  }

  /**
   * Get files by owner ID
   *
   * @param ownerId - Owner user ID
   * @param limit - Limit (default: 100)
   * @returns File metadata array
   */
  async findAllByOwnerId(ownerId: string, limit = 100): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('files')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[FileRepository] findAllByOwnerId error:', error)
      throw new Error(`Failed to fetch files: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get signed URL for file download
   *
   * @param fileId - files.id (UUID)
   * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
   * @returns Signed URL
   */
  async getSignedUrl(fileId: string, expiresIn = 3600): Promise<string> {
    const fileRecord = await this.findById(fileId)
    if (!fileRecord) {
      throw new Error('File not found')
    }

    const { data, error } = await this.supabase.storage
      .from(fileRecord.bucket_name)
      .createSignedUrl(fileRecord.storage_path, expiresIn)

    if (error) {
      console.error('[FileRepository] getSignedUrl error:', error)
      throw new Error(`Failed to generate signed URL: ${error.message}`)
    }

    return data.signedUrl
  }

  /**
   * Update file status
   *
   * @param fileId - files.id (UUID)
   * @param status - New status ('uploading', 'active', 'deleting')
   * @returns Updated file record
   */
  async updateStatus(
    fileId: string,
    status: 'uploading' | 'active' | 'deleting'
  ): Promise<any> {
    const { data, error } = await this.supabase
      .from('files')
      .update({ status })
      .eq('id', fileId)
      .select()
      .single()

    if (error) {
      console.error('[FileRepository] updateStatus error:', error)
      throw new Error(`Failed to update file status: ${error.message}`)
    }

    return data
  }

  /**
   * Delete file (metadata + storage)
   *
   * ⚠️ WARNING: This physically deletes the file from storage
   *
   * @param fileId - files.id (UUID)
   */
  async delete(fileId: string): Promise<void> {
    // 1. Get file metadata
    const fileRecord = await this.findById(fileId)
    if (!fileRecord) {
      throw new Error('File not found')
    }

    // 2. Mark as deleting
    await this.updateStatus(fileId, 'deleting')

    try {
      // 3. Delete from storage
      const { error: storageError } = await this.supabase.storage
        .from(fileRecord.bucket_name)
        .remove([fileRecord.storage_path])

      if (storageError) {
        console.error('[FileRepository] Storage deletion error:', storageError)
        throw new Error(`Failed to delete file from storage: ${storageError.message}`)
      }

      // 4. Delete metadata
      const { error: dbError } = await this.supabase
        .from('files')
        .delete()
        .eq('id', fileId)

      if (dbError) {
        console.error('[FileRepository] Metadata deletion error:', dbError)
        throw new Error(`Failed to delete file metadata: ${dbError.message}`)
      }
    } catch (error: any) {
      // If deletion fails, mark as orphaned
      await this.supabase.from('orphaned_files').insert({
        storage_path: fileRecord.storage_path,
        bucket_name: fileRecord.bucket_name,
        error_message: error.message,
      })

      throw error
    }
  }

  /**
   * Check if user owns the file
   *
   * @param fileId - files.id (UUID)
   * @param userId - User ID
   * @returns true if user owns the file
   */
  async checkOwnership(fileId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('files')
      .select('id')
      .eq('id', fileId)
      .eq('owner_id', userId)
      .single()

    if (error || !data) {
      return false
    }

    return true
  }
}
