import { CharacterPresetRepository } from '../repositories/CharacterPresetRepository'
import { CharacterGenerationRepository } from '../repositories/CharacterGenerationRepository'
import { CharacterPreset } from '../models/CharacterPreset'
import { AIService } from './ai/AIService'

/**
 * Character Generation Service
 * Handles character generation workflow:
 * 1. Translate Japanese prompt to English
 * 2. Build final prompt from presets + custom prompt
 * 3. Call ComfyUI to generate image
 * 4. Save generation history
 */
export class CharacterGenerationService {
  /**
   * Translate Japanese text to English using LLM
   * @param {string} jaText - Japanese text
   * @returns {Promise<{data: string|null, error: Error|null}>}
   */
  static async translatePrompt(jaText) {
    if (!jaText || jaText.trim() === '') {
      return { data: '', error: null }
    }

    try {
      const result = await AIService.chat(
        `Translate the following Japanese text to English for use as an image generation prompt. Only output the English translation, nothing else.\n\nJapanese: ${jaText}`,
        {
          provider: 'gemini', // Use Gemini for translation (fast and cheap)
          temperature: 0.3,
        }
      )

      return { data: result.text.trim(), error: null }
    } catch (err) {
      console.error('Translation error:', err)
      return { data: null, error: err }
    }
  }

  /**
   * Build final prompt from preset IDs and custom prompt
   * Optimal order: Quality Prefix → Base Tags (1girl, solo) → Custom Prompt → Presets
   *
   * @param {Array<string>} presetIds - Selected preset IDs
   * @param {string} customPrompt - User's custom prompt (already translated)
   * @param {string} prefix - Quality prefix (e.g., "masterpiece, best quality, ...")
   * @returns {Promise<{data: string|null, error: Error|null}>}
   */
  static async buildFinalPrompt(presetIds, customPrompt = '', prefix = '') {
    try {
      // Fetch presets
      const { data: presets, error } = await CharacterPresetRepository.findByIds(presetIds)

      if (error) {
        return { data: null, error }
      }

      // Convert to Models
      const presetModels = presets.map((p) => CharacterPreset.fromDatabase(p))

      // Filter out special presets (RANDOM, NONE)
      const activePresets = presetModels.filter((p) => !p.isSpecial())

      // Build prompt parts in optimal order
      const promptParts = []

      // 1. Quality prefix (masterpiece, best quality, absurdres, ...)
      if (prefix && prefix.trim() !== '') {
        promptParts.push(prefix.trim())
      }

      // 3. Custom prompt (user's specific requests)
      if (customPrompt && customPrompt.trim() !== '') {
        promptParts.push(customPrompt.trim())
      }

      // 4. Preset prompts (appearance details)
      if (activePresets.length > 0) {
        const presetPrompts = activePresets.map((p) => p.promptEn)
        promptParts.push(...presetPrompts)
      }

      // Combine with comma separation
      const finalPrompt = promptParts.join(', ')

      return { data: finalPrompt, error: null }
    } catch (err) {
      console.error('Failed to build final prompt:', err)
      return { data: null, error: err }
    }
  }

  /**
   * Build final prompt (translate + combine with presets)
   * This is used by the component to prepare the prompt before image generation
   *
   * @param {Object} params - Generation parameters
   * @param {Array<string>} params.presetIds - Selected preset IDs
   * @param {string} params.customPrompt - User's custom prompt (Japanese)
   * @param {string} params.promptPrefix - Quality prefix (e.g., "masterpiece, best quality, ...")
   * @returns {Promise<{data: string|null, error: Error|null}>}
   */
  static async prepareFinalPrompt({ presetIds = [], customPrompt = '', promptPrefix = '' }) {
    try {
      // 1. Translate custom prompt (if provided)
      let translatedPrompt = ''
      if (customPrompt && customPrompt.trim() !== '') {
        const { data: translated, error: translateError } =
          await this.translatePrompt(customPrompt)

        if (translateError) {
          return { data: null, error: translateError }
        }

        translatedPrompt = translated
      }

      // 2. Build final prompt
      const { data: finalPrompt, error: buildError } = await this.buildFinalPrompt(
        presetIds,
        translatedPrompt,
        promptPrefix
      )

      if (buildError) {
        return { data: null, error: buildError }
      }

      if (!finalPrompt || finalPrompt.trim() === '') {
        return {
          data: null,
          error: new Error('Final prompt is empty. Please select presets or add custom prompt.'),
        }
      }

      return {
        data: {
          finalPrompt,
          translatedPrompt,
        },
        error: null,
      }
    } catch (err) {
      console.error('Failed to prepare prompt:', err)
      return { data: null, error: err }
    }
  }

  /**
   * Save generation history after image generation
   * @param {Object} params - Save parameters
   * @param {string} params.userId - User ID
   * @param {string} params.fileId - Generated file ID
   * @param {Array<string>} params.presetIds - Selected preset IDs
   * @param {string} params.customPrompt - Original custom prompt (Japanese)
   * @param {string} params.translatedPrompt - Translated prompt (English)
   * @param {string} params.finalPrompt - Final combined prompt
   * @param {string} params.workflowId - ComfyUI Workflow ID (optional)
   * @param {string} params.modelId - ComfyUI Model ID (optional)
   * @param {Object} params.generationSettings - Generation settings (optional)
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  static async saveGeneration({
    userId,
    fileId,
    presetIds,
    customPrompt,
    translatedPrompt,
    finalPrompt,
    workflowId = null,
    modelId = null,
    generationSettings = null,
  }) {
    try {
      const generationData = {
        user_id: userId,
        file_id: fileId,
        preset_ids: presetIds,
        custom_prompt: customPrompt,
        translated_prompt: translatedPrompt,
        final_prompt: finalPrompt,
        comfy_workflow_id: workflowId,
        comfy_model_id: modelId,
        generation_settings: generationSettings,
      }

      const { data: savedGeneration, error: saveError } =
        await CharacterGenerationRepository.create(generationData)

      if (saveError) {
        return { data: null, error: saveError }
      }

      return { data: savedGeneration, error: null }
    } catch (err) {
      console.error('Failed to save generation:', err)
      return { data: null, error: err }
    }
  }

  /**
   * Call image generation service
   * Note: This should be called from the Hook layer (useCharacterGeneration)
   * This method is kept for backward compatibility but not recommended for direct use
   *
   * @deprecated Use useImageGeneration hook directly from components
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  static async callImageGeneration() {
    // This is a placeholder - actual implementation should use useImageGeneration hook
    throw new Error(
      'Direct call to callImageGeneration is not supported. Use useImageGeneration hook from components instead.'
    )
  }
}
