-- Enable pgvector extension
create extension if not exists vector with schema extensions;

-- ============================================================
-- 1. collections - knowledge base configuration
-- ============================================================
create table collections (
  id                   uuid        primary key default gen_random_uuid(),
  name                 text        not null,
  description          text,
  chunk_strategy       text        default 'recursive',
  chunk_size           int         default 500,
  chunk_overlap        int         default 50,
  embedding_model      text        default 'embedding-3',
  embedding_dimensions int         default 1024,
  created_at           timestamptz default now()
);

-- ============================================================
-- 2. documents
-- ============================================================
create table documents (
  id              uuid        primary key default gen_random_uuid(),
  collection_id   uuid        references collections(id) on delete cascade,
  title           text        not null,
  source_url      text,
  source_type     text        default 'feishu',
  raw_content     text,
  metadata        jsonb       default '{}',
  token_count     int,
  created_at      timestamptz default now()
);

-- ============================================================
-- 3. chunks
-- ============================================================
create table chunks (
  id              uuid        primary key default gen_random_uuid(),
  document_id     uuid        references documents(id) on delete cascade,
  collection_id   uuid        references collections(id) on delete cascade,
  content         text        not null,
  embedding       vector(1024),
  chunk_index     int,
  token_count     int,
  metadata        jsonb       default '{}',
  created_at      timestamptz default now(),
  fts             tsvector    generated always as (to_tsvector('simple', content)) stored
);

-- ============================================================
-- 4. query_traces
-- ============================================================
create table query_traces (
  id                uuid        primary key default gen_random_uuid(),
  question          text        not null,
  config            jsonb,
  trace             jsonb,
  answer            text,
  sources           jsonb,
  total_duration_ms int,
  total_tokens      int,
  estimated_cost    float,
  created_at        timestamptz default now()
);

-- ============================================================
-- 5. match_chunks() RPC - cosine similarity search
-- ============================================================
create or replace function match_chunks(
  query_embedding       vector(1024),
  match_count           int  default 5,
  filter_collection_id  uuid default null
)
returns table (
  id          uuid,
  document_id uuid,
  content     text,
  metadata    jsonb,
  similarity  float
)
language plpgsql
as $$
begin
  return query
    select
      c.id,
      c.document_id,
      c.content,
      c.metadata,
      1 - (c.embedding <=> query_embedding) as similarity
    from chunks c
    where (filter_collection_id is null or c.collection_id = filter_collection_id)
    order by c.embedding <=> query_embedding
    limit match_count;
end;
$$;

-- ============================================================
-- 6. Indexes
-- ============================================================

-- GIN index for full-text search on chunks.fts
create index idx_chunks_fts on chunks using gin (fts);

-- HNSW index for vector cosine similarity on chunks.embedding
create index idx_chunks_embedding on chunks using hnsw (embedding vector_cosine_ops);
