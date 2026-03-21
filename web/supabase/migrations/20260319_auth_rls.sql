-- Add user_id for session-cookie-based data isolation.
-- user_id is a plain uuid (NOT a FK to auth.users) because
-- visitors use session-cookie UUIDs that don't exist in auth.users.

-- Add user_id columns (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'collections' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE collections ADD COLUMN user_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE documents ADD COLUMN user_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'query_traces' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE query_traces ADD COLUMN user_id uuid;
  END IF;
END $$;

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_query_traces_user_id ON query_traces(user_id);

-- Note: RLS is NOT enabled. Data isolation is enforced at the application
-- level by filtering on user_id (from the session cookie). The service-role
-- client bypasses RLS anyway, so enabling it would add no security benefit
-- in this architecture.
