import { generateEmbedding } from '@/lib/embedding/zhipu'
import { matchChunks } from '@/lib/supabase/vectors'
import type { RetrievalResult } from '@/types/rag'

export async function semanticRetrieve(
  query: string,
  options: { topK?: number; collectionId?: string } = {}
): Promise<{
  results: RetrievalResult[]
  queryEmbedding: number[]
  durationMs: number
}> {
  const start = Date.now()
  const { topK = 10, collectionId } = options

  // Generate embedding for the query
  const { embedding: queryEmbedding } = await generateEmbedding(query)

  // Perform vector similarity search
  const matches = await matchChunks(queryEmbedding, topK, collectionId)

  // Map to RetrievalResult format
  const results: RetrievalResult[] = (matches ?? []).map(
    (match: {
      id: string
      content: string
      similarity: number
      metadata: Record<string, unknown>
    }) => ({
      chunkId: match.id,
      content: match.content,
      score: match.similarity,
      scoreType: 'cosine' as const,
      documentTitle: (match.metadata?.sourceTitle as string) ?? '',
      metadata: match.metadata ?? {},
    })
  )

  return {
    results,
    queryEmbedding,
    durationMs: Date.now() - start,
  }
}
