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
    if (isPgVectorOperatorError(error)) {
      return matchChunksInProcess(queryEmbedding, matchCount, collectionId)
    }
    throw new Error(`Failed to match chunks via RPC: ${error.message} (code: ${error.code})`)
  }
  return data
}

function isPgVectorOperatorError(error: { code?: string; message?: string }) {
  return error.code === '42883' && (error.message ?? '').includes('operator does not exist')
}

async function matchChunksInProcess(
  queryEmbedding: number[],
  matchCount: number,
  collectionId?: string
) {
  const supabase = createServerSupabaseClient()
  let query = supabase
    .from('chunks')
    .select('id, document_id, content, metadata, embedding')
    .limit(2000)

  if (collectionId) {
    query = query.eq('collection_id', collectionId)
  }

  const { data, error } = await query
  if (error) {
    throw new Error(`Failed to fetch chunks for fallback matching: ${error.message} (code: ${error.code})`)
  }

  return (data ?? [])
    .map((chunk) => ({
      id: chunk.id,
      document_id: chunk.document_id,
      content: chunk.content,
      metadata: chunk.metadata ?? {},
      similarity: cosineSimilarity(queryEmbedding, parseEmbedding(chunk.embedding)),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, matchCount)
}

function parseEmbedding(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map(Number)
  }
  if (typeof value === 'string') {
    return value
      .replace(/^\[/, '')
      .replace(/\]$/, '')
      .split(',')
      .filter(Boolean)
      .map(Number)
  }
  return []
}

function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length)
  if (length === 0) return 0

  let dot = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < length; i += 1) {
    const av = a[i] ?? 0
    const bv = b[i] ?? 0
    dot += av * bv
    normA += av * av
    normB += bv * bv
  }

  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
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
