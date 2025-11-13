// RAG Provider Factory
// Factory pattern for creating RAG provider instances

import type { RAGProviderInterface } from './rag-provider-interface.ts'
import { GeminiRAGClient } from './gemini-rag-client.ts'
import { OpenAIRAGClient } from './openai-rag-client.ts'
import { PineconeRAGClient } from './pinecone-rag-client.ts'
import { AnythingLLMClient } from './anythingllm-rag-client.ts'

/**
 * Supported RAG providers
 */
export type RAGProviderType = 'gemini' | 'openai' | 'pinecone' | 'anythingllm' | 'weaviate'

/**
 * Provider-specific options
 */
export interface RAGProviderOptions {
  /** OpenAI API key (for OpenAI provider) */
  openaiApiKey?: string
  /** Gemini API key (for Gemini provider) */
  geminiApiKey?: string
  /** Pinecone API key (for Pinecone provider) */
  pineconeApiKey?: string
  /** Pinecone index name (for Pinecone provider) */
  pineconeIndexName?: string
  /** AnythingLLM API key (for AnythingLLM provider) */
  anythingllmApiKey?: string
  /** AnythingLLM base URL (for AnythingLLM provider) */
  anythingllmBaseUrl?: string
  /** Weaviate API key (for Weaviate provider) */
  weaviateApiKey?: string
  /** Weaviate URL (for Weaviate provider) */
  weaviateUrl?: string
}

/**
 * Create RAG Provider instance
 *
 * Factory function that creates appropriate RAG provider client based on provider type.
 *
 * @param provider - Provider type ('gemini', 'openai', 'pinecone', 'anythingllm', 'weaviate')
 * @param options - Provider-specific configuration options
 * @returns RAG provider instance
 * @throws Error if provider is not supported or required API key is missing
 *
 * @example
 * // Create Gemini provider
 * const gemini = createRAGProvider('gemini', {
 *   geminiApiKey: process.env.GEMINI_API_KEY
 * })
 *
 * @example
 * // Create OpenAI provider
 * const openai = createRAGProvider('openai', {
 *   openaiApiKey: process.env.OPENAI_API_KEY
 * })
 *
 * @example
 * // Create Pinecone provider
 * const pinecone = createRAGProvider('pinecone', {
 *   pineconeApiKey: process.env.PINECONE_API_KEY,
 *   pineconeIndexName: 'akatsuki-rag'
 * })
 */
export function createRAGProvider(
  provider: RAGProviderType,
  options: RAGProviderOptions = {}
): RAGProviderInterface {
  switch (provider) {
    case 'gemini': {
      const apiKey = options.geminiApiKey || Deno.env.get('GEMINI_API_KEY')
      if (!apiKey) {
        throw new Error('[RAGProviderFactory] GEMINI_API_KEY is required for Gemini provider')
      }
      return new GeminiRAGClient(apiKey)
    }

    case 'openai': {
      const apiKey = options.openaiApiKey || Deno.env.get('OPENAI_API_KEY')
      if (!apiKey) {
        throw new Error('[RAGProviderFactory] OPENAI_API_KEY is required for OpenAI provider')
      }
      return new OpenAIRAGClient(apiKey)
    }

    case 'pinecone': {
      const apiKey = options.pineconeApiKey || Deno.env.get('PINECONE_API_KEY')
      if (!apiKey) {
        throw new Error('[RAGProviderFactory] PINECONE_API_KEY is required for Pinecone provider')
      }
      const indexName = options.pineconeIndexName || Deno.env.get('PINECONE_INDEX_NAME') || 'akatsuki-rag'
      return new PineconeRAGClient(apiKey, { indexName })
    }

    case 'anythingllm': {
      const apiKey = options.anythingllmApiKey || Deno.env.get('ANYTHINGLLM_API_KEY')
      if (!apiKey) {
        throw new Error('[RAGProviderFactory] ANYTHINGLLM_API_KEY is required for AnythingLLM provider')
      }
      const baseUrl = options.anythingllmBaseUrl || Deno.env.get('ANYTHINGLLM_BASE_URL') || 'http://localhost:3001'
      return new AnythingLLMClient(apiKey, { baseUrl })
    }

    case 'weaviate': {
      // TODO: Implement Weaviate provider
      throw new Error('[RAGProviderFactory] Weaviate provider not implemented yet')
    }

    default: {
      // TypeScript should catch this at compile time, but runtime check for safety
      const exhaustiveCheck: never = provider
      throw new Error(`[RAGProviderFactory] Unsupported provider: ${exhaustiveCheck}`)
    }
  }
}

/**
 * Get available providers
 *
 * Returns list of providers that have required API keys configured
 * in environment variables.
 *
 * @returns Array of available provider names
 *
 * @example
 * const available = getAvailableProviders()
 * console.log(available) // ['gemini', 'openai']
 */
export function getAvailableProviders(): RAGProviderType[] {
  const providers: RAGProviderType[] = []

  if (Deno.env.get('GEMINI_API_KEY')) {
    providers.push('gemini')
  }
  if (Deno.env.get('OPENAI_API_KEY')) {
    providers.push('openai')
  }
  if (Deno.env.get('PINECONE_API_KEY')) {
    providers.push('pinecone')
  }
  if (Deno.env.get('ANYTHINGLLM_API_KEY')) {
    providers.push('anythingllm')
  }
  if (Deno.env.get('WEAVIATE_API_KEY')) {
    providers.push('weaviate')
  }

  return providers
}

/**
 * Check if a provider is available
 *
 * @param provider - Provider name to check
 * @returns true if provider is available (API key configured)
 *
 * @example
 * if (isProviderAvailable('gemini')) {
 *   // Use Gemini
 * }
 */
export function isProviderAvailable(provider: RAGProviderType): boolean {
  return getAvailableProviders().includes(provider)
}
