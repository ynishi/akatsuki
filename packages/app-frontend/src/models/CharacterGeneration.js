/**
 * CharacterGeneration Model
 * User's character generation history
 */
export class CharacterGeneration {
  constructor({
    id = null,
    userId,
    fileId = null,
    file = null,
    presetIds = [],
    customPrompt = null,
    translatedPrompt = null,
    finalPrompt,
    comfyWorkflowId = null,
    comfyModelId = null,
    generationSettings = null,
    createdAt = null,
  } = {}) {
    this.id = id
    this.userId = userId
    this.fileId = fileId
    this.file = file
    this.presetIds = presetIds
    this.customPrompt = customPrompt
    this.translatedPrompt = translatedPrompt
    this.finalPrompt = finalPrompt
    this.comfyWorkflowId = comfyWorkflowId
    this.comfyModelId = comfyModelId
    this.generationSettings = generationSettings
    this.createdAt = createdAt
  }

  /**
   * Create instance from database record
   * @param {Object} data - Database record
   * @returns {CharacterGeneration}
   */
  static fromDatabase(data) {
    return new CharacterGeneration({
      id: data.id,
      userId: data.user_id,
      fileId: data.file_id,
      file: data.files || null,
      presetIds: data.preset_ids || [],
      customPrompt: data.custom_prompt,
      translatedPrompt: data.translated_prompt,
      finalPrompt: data.final_prompt,
      comfyWorkflowId: data.comfy_workflow_id,
      comfyModelId: data.comfy_model_id,
      generationSettings: data.generation_settings || null,
      createdAt: data.created_at,
    })
  }

  /**
   * Get public URL for the generated image
   * @returns {string|null}
   */
  getPublicUrl() {
    if (!this.file || !this.file.storage_path) return null

    // Construct Supabase Storage public URL
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const bucketName = this.file.bucket_name || 'public_assets'
    return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${this.file.storage_path}`
  }

  /**
   * Convert to database format for insertion
   * @returns {Object}
   */
  toDatabase() {
    return {
      user_id: this.userId,
      file_id: this.fileId,
      preset_ids: this.presetIds,
      custom_prompt: this.customPrompt,
      translated_prompt: this.translatedPrompt,
      final_prompt: this.finalPrompt,
      comfy_workflow_id: this.comfyWorkflowId,
      comfy_model_id: this.comfyModelId,
    }
  }

  /**
   * Check if custom prompt was used
   * @returns {boolean}
   */
  hasCustomPrompt() {
    return !!this.customPrompt
  }

  /**
   * Get formatted creation date
   * @returns {string}
   */
  getFormattedDate() {
    if (!this.createdAt) return ''
    return new Date(this.createdAt).toLocaleString('ja-JP')
  }
}
