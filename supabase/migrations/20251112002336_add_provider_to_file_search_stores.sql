-- ============================================================================
-- Add provider column to file_search_stores
-- ============================================================================
-- Support multiple File Search providers (Gemini, OpenAI, Pinecone, etc.)
-- ============================================================================

-- Add provider column
ALTER TABLE public.file_search_stores
ADD COLUMN provider text NOT NULL DEFAULT 'gemini';

-- Add check constraint for valid providers
ALTER TABLE public.file_search_stores
ADD CONSTRAINT file_search_stores_provider_check
CHECK (provider IN ('gemini', 'openai', 'pinecone', 'weaviate'));

-- Add index for provider-based queries
CREATE INDEX idx_file_search_stores_provider ON public.file_search_stores(provider);

-- Add comment
COMMENT ON COLUMN public.file_search_stores.provider IS 'File Search provider (gemini, openai, pinecone, weaviate)';
