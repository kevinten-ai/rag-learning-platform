-- Add user_id to all tables
ALTER TABLE collections ADD COLUMN user_id uuid REFERENCES auth.users(id);
ALTER TABLE documents ADD COLUMN user_id uuid REFERENCES auth.users(id);
ALTER TABLE query_traces ADD COLUMN user_id uuid REFERENCES auth.users(id);
-- chunks inherits from collections/documents, no need for user_id

-- Enable RLS
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_traces ENABLE ROW LEVEL SECURITY;

-- RLS policies for collections
CREATE POLICY "Users can view own collections" ON collections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own collections" ON collections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own collections" ON collections FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for documents
CREATE POLICY "Users can view own documents" ON documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents" ON documents FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policies for chunks (via collection ownership)
CREATE POLICY "Users can view chunks of own collections" ON chunks FOR SELECT
  USING (collection_id IN (SELECT id FROM collections WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert chunks into own collections" ON chunks FOR INSERT
  WITH CHECK (collection_id IN (SELECT id FROM collections WHERE user_id = auth.uid()));

-- RLS policies for query_traces
CREATE POLICY "Users can view own traces" ON query_traces FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own traces" ON query_traces FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update match_chunks function to respect RLS
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1024),
  match_count int default 5,
  filter_collection_id uuid default null
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT c.id, c.document_id, c.content, c.metadata,
      1 - (c.embedding <=> query_embedding) AS similarity
    FROM chunks c
    WHERE (filter_collection_id IS NULL OR c.collection_id = filter_collection_id)
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
