-- ============================================================================
-- Gemini File Search Tables Migration
-- ============================================================================
-- file_search_stores: Gemini Corpora (Knowledge Base Store)
-- knowledge_files: Files uploaded to Gemini File Search
-- rag_queries: RAG query history
-- ============================================================================

-- ============================================================================
-- Create file_search_stores table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.file_search_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Gemini API store name (e.g., "corpora/xxx")
  name text NOT NULL UNIQUE,

  -- Display name for UI
  display_name text,

  -- Owner
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_file_search_stores_user_id ON public.file_search_stores(user_id);
CREATE INDEX idx_file_search_stores_name ON public.file_search_stores(name);

-- Auto-update updated_at trigger
CREATE TRIGGER trigger_update_file_search_stores_updated_at
  BEFORE UPDATE ON public.file_search_stores
  FOR EACH ROW
  EXECUTE FUNCTION update_files_updated_at();

-- Enable RLS
ALTER TABLE public.file_search_stores ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own stores"
  ON public.file_search_stores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own stores"
  ON public.file_search_stores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stores"
  ON public.file_search_stores FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stores"
  ON public.file_search_stores FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Create knowledge_files table
-- ============================================================================
-- Stores relationship between files table and Gemini File Search
CREATE TABLE IF NOT EXISTS public.knowledge_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Store reference
  store_id uuid NOT NULL REFERENCES public.file_search_stores(id) ON DELETE CASCADE,

  -- File reference (files table)
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,

  -- Gemini API file name (e.g., "corpora/xxx/documents/xxx")
  gemini_file_name text NOT NULL,

  -- Owner
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Timestamp
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_knowledge_files_store_id ON public.knowledge_files(store_id);
CREATE INDEX idx_knowledge_files_file_id ON public.knowledge_files(file_id);
CREATE INDEX idx_knowledge_files_user_id ON public.knowledge_files(user_id);

-- Composite index (store + file lookup)
CREATE INDEX idx_knowledge_files_store_file ON public.knowledge_files(store_id, file_id);

-- Enable RLS
ALTER TABLE public.knowledge_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view files in their stores"
  ON public.knowledge_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.file_search_stores
      WHERE file_search_stores.id = knowledge_files.store_id
      AND file_search_stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload files to their stores"
  ON public.knowledge_files FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.file_search_stores
      WHERE file_search_stores.id = knowledge_files.store_id
      AND file_search_stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete files from their stores"
  ON public.knowledge_files FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.file_search_stores
      WHERE file_search_stores.id = knowledge_files.store_id
      AND file_search_stores.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Create rag_queries table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.rag_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Store reference (nullable - deleted stores don't delete history)
  store_id uuid REFERENCES public.file_search_stores(id) ON DELETE SET NULL,

  -- Query and response
  query text NOT NULL,
  response text,

  -- Grounding metadata (citations, search results)
  grounding_metadata jsonb,

  -- Owner
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Timestamp
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_rag_queries_store_id ON public.rag_queries(store_id);
CREATE INDEX idx_rag_queries_user_id ON public.rag_queries(user_id);
CREATE INDEX idx_rag_queries_created_at ON public.rag_queries(created_at DESC);

-- Enable RLS
ALTER TABLE public.rag_queries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own queries"
  ON public.rag_queries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own queries"
  ON public.rag_queries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Add comments
-- ============================================================================

COMMENT ON TABLE public.file_search_stores IS 'Gemini File Search Stores (Corpora) management';
COMMENT ON COLUMN public.file_search_stores.name IS 'Gemini API corpus name (e.g., corpora/xxx)';
COMMENT ON COLUMN public.file_search_stores.display_name IS 'User-friendly display name';

COMMENT ON TABLE public.knowledge_files IS 'Knowledge files uploaded to Gemini File Search';
COMMENT ON COLUMN public.knowledge_files.file_id IS 'Reference to files table (Storage + metadata)';
COMMENT ON COLUMN public.knowledge_files.gemini_file_name IS 'Gemini API file name (e.g., corpora/xxx/documents/xxx)';

COMMENT ON TABLE public.rag_queries IS 'RAG query history and results';
COMMENT ON COLUMN public.rag_queries.grounding_metadata IS 'Citations and search results from Gemini';
