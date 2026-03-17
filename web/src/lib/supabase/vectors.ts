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
