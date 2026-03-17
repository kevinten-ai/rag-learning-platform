import { createServerSupabaseClient } from '@/lib/supabase/client'
import type { RetrievalResult } from '@/types/rag'

export async function keywordRetrieve(
  query: string,
  options: { topK?: number; collectionId?: string } = {}
): Promise<{
  results: RetrievalResult[]
  durationMs: number
}> {
  const start = Date.now()
  const { topK = 10, collectionId } = options

  const supabase = createServerSupabaseClient()

  // Build the full-text search query
  // Convert the query into tsquery format: split on whitespace and join with &
  const tsQuery = query
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .join(' & ')

  let queryBuilder = supabase
    .from('chunks')
    .select('id, content, metadata, document_id')
    .textSearch('fts', tsQuery)
    .limit(topK)

  if (collectionId) {
    queryBuilder = queryBuilder.eq('collection_id', collectionId)
  }

  const { data, error } = await queryBuilder

  if (error) throw error

  // Map to RetrievalResult format
  // Assign decreasing scores based on result order (BM25 ranking from Postgres)
  const results: RetrievalResult[] = (data ?? []).map(
    (
      row: {
        id: string
        content: string
        metadata: Record<string, unknown>
        document_id: string
      },
      index: number
    ) => ({
      chunkId: row.id,
      content: row.content,
      score: 1 - index / Math.max(data.length, 1),
      scoreType: 'bm25' as const,
      documentTitle: (row.metadata?.sourceTitle as string) ?? '',
      metadata: row.metadata ?? {},
    })
  )

  return {
    results,
    durationMs: Date.now() - start,
  }
}
