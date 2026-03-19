import { semanticRetrieve } from './semantic'
import { getChunkNeighbors } from '@/lib/supabase/vectors'
import type { RetrievalResult } from '@/types/rag'

export async function sentenceWindowRetrieve(
  query: string,
  options: { topK?: number; collectionId?: string; windowSize?: number } = {}
): Promise<{
  results: RetrievalResult[]
  queryEmbedding: number[]
  durationMs: number
}> {
  const start = Date.now()
  const { topK = 5, collectionId, windowSize = 1 } = options

  // Step 1: Retrieve using standard semantic search (precise matching)
  const semanticResult = await semanticRetrieve(query, { topK, collectionId })

  // Step 2: Expand each result to include neighboring chunks
  const expandedResults = await Promise.all(
    semanticResult.results.map(async (result) => {
      try {
        const neighbors = await getChunkNeighbors(result.chunkId, windowSize)

        if (neighbors.length <= 1) return result

        // Concatenate neighboring chunk content
        const expandedContent = neighbors.map((n) => n.content).join('\n\n')

        return {
          ...result,
          content: expandedContent,
          metadata: {
            ...result.metadata,
            originalContent: result.content,
            windowSize,
            expandedChunks: neighbors.length,
            retrievalType: 'sentence-window',
          },
        }
      } catch {
        return result
      }
    })
  )

  return {
    results: expandedResults,
    queryEmbedding: semanticResult.queryEmbedding,
    durationMs: Date.now() - start,
  }
}
