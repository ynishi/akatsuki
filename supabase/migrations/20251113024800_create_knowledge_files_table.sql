-- ============================================================================
-- Create knowledge_files table
-- ============================================================================
-- Manages the relationship between files (Supabase Storage) and
-- File Search stores (RAG providers)
-- ============================================================================

-- Create knowledge_files table
CREATE TABLE IF NOT EXISTS public.knowledge_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.file_search_stores(id) ON DELETE CASCADE,

  -- Provider information
  provider_file_name text NOT NULL, -- Provider-specific file identifier (e.g., "corpora/xxx/documents/xxx" for Gemini)

  -- Indexing status
  indexing_status text NOT NULL DEFAULT 'pending'
    CHECK (indexing_status IN ('pending', 'processing', 'completed', 'failed')),
  error_message text,

  -- Metadata (optional)
  metadata jsonb DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint: same file can't be uploaded to same store twice
  UNIQUE(file_id, store_id)
);

-- Create indexes
CREATE INDEX idx_knowledge_files_file_id ON public.knowledge_files(file_id);
CREATE INDEX idx_knowledge_files_store_id ON public.knowledge_files(store_id);
CREATE INDEX idx_knowledge_files_indexing_status ON public.knowledge_files(indexing_status);
CREATE INDEX idx_knowledge_files_created_at ON public.knowledge_files(created_at DESC);

-- Composite index (store + status)
CREATE INDEX idx_knowledge_files_store_status ON public.knowledge_files(store_id, indexing_status);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_knowledge_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_knowledge_files_updated_at
  BEFORE UPDATE ON public.knowledge_files
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_files_updated_at();

-- ============================================================================
-- RLS (Row Level Security) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE public.knowledge_files ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own knowledge files
CREATE POLICY knowledge_files_select_own
  ON public.knowledge_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.files
      WHERE files.id = knowledge_files.file_id
      AND files.owner_id = auth.uid()
    )
  );

-- Policy: Users can insert knowledge files for their own files
CREATE POLICY knowledge_files_insert_own
  ON public.knowledge_files
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.files
      WHERE files.id = knowledge_files.file_id
      AND files.owner_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM public.file_search_stores
      WHERE file_search_stores.id = knowledge_files.store_id
      AND file_search_stores.user_id = auth.uid()
    )
  );

-- Policy: Users can update their own knowledge files
CREATE POLICY knowledge_files_update_own
  ON public.knowledge_files
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.files
      WHERE files.id = knowledge_files.file_id
      AND files.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.files
      WHERE files.id = knowledge_files.file_id
      AND files.owner_id = auth.uid()
    )
  );

-- Policy: Users can delete their own knowledge files
CREATE POLICY knowledge_files_delete_own
  ON public.knowledge_files
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.files
      WHERE files.id = knowledge_files.file_id
      AND files.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE public.knowledge_files IS 'Relationship table between files (Supabase Storage) and File Search stores (RAG providers)';
COMMENT ON COLUMN public.knowledge_files.file_id IS 'Reference to files table (Supabase Storage)';
COMMENT ON COLUMN public.knowledge_files.store_id IS 'Reference to file_search_stores table';
COMMENT ON COLUMN public.knowledge_files.provider_file_name IS 'Provider-specific file identifier (e.g., corpora/xxx/documents/xxx)';
COMMENT ON COLUMN public.knowledge_files.indexing_status IS 'Indexing status: pending, processing, completed, failed';
COMMENT ON COLUMN public.knowledge_files.error_message IS 'Error message if indexing failed';
COMMENT ON COLUMN public.knowledge_files.metadata IS 'Additional metadata (JSON format)';
