import { createServerSupabaseClient } from './client'
import type { Chunk } from '@/types/rag'

export async function insertChunks(
  chunks: Array<{
    document_id: string
    collection_id: string
    content: string
    embedding: number[]
    chunk_index: number
    token_count: number
    metadata: Record<string, unknown>
  }>
) {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.from('chunks').insert(chunks).select()
  if (error) {
    throw new Error(`Failed to insert chunks into Supabase: ${error.message} (code: ${error.code})`)
  }
  return data
}

export async function getChunksByDocument(documentId: string): Promise<Chunk[]> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('chunks')
    .select('*')
    .eq('document_id', documentId)
    .order('chunk_index')
  if (error) {
    throw new Error(`Failed to fetch chunks for document "${documentId}": ${error.message} (code: ${error.code})`)
  }
  return data as Chunk[]
}

export async function matchChunks(
  queryEmbedding: number[],
  matchCount: number = 5,
  collectionId?: string
) {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.rpc('match_chunks', {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    filter_collection_id: collectionId ?? null,
  })
  if (error) {
    throw new Error(`Failed to match chunks via RPC: ${error.message} (code: ${error.code})`)
  }
  return data
}

export async function getChunkNeighbors(
  chunkId: string,
  windowSize: number = 1
): Promise<Array<{ id: string; content: string; chunk_index: number; document_id: string }>> {
  const supabase = createServerSupabaseClient()

  // First get the target chunk's index and document_id
  const { data: target, error: targetError } = await supabase
    .from('chunks')
    .select('chunk_index, document_id')
    .eq('id', chunkId)
    .single()

  if (targetError || !target) return []

  // Fetch surrounding chunks from the same document
  const { data, error } = await supabase
    .from('chunks')
    .select('id, content, chunk_index, document_id')
    .eq('document_id', target.document_id)
    .gte('chunk_index', target.chunk_index - windowSize)
    .lte('chunk_index', target.chunk_index + windowSize)
    .order('chunk_index')

  if (error) return []
  return data ?? []
}
