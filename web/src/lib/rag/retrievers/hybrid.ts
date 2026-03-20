import { semanticRetrieve } from './semantic'
import { keywordRetrieve } from './keyword'
import type { RetrievalResult } from '@/types/rag'

/**
 * Reciprocal Rank Fusion (RRF) score for a given rank.
 * k=60 is the standard constant used in RRF.
 */
function rrfScore(rank: number, k: number = 60): number {
  return 1 / (k + rank)
}

export async function hybridRetrieve(
  query: string,
  options: { topK?: number; collectionId?: string; alpha?: number } = {}
): Promise<{
  results: RetrievalResult[]
  durationMs: number
  hybridWeights: { vector: number; keyword: number }
}> {
  const start = Date.now()
  const { topK = 10, collectionId, alpha = 0.7 } = options

  // Run both retrievers in parallel
  const [semanticResult, keywordResult] = await Promise.all([
    semanticRetrieve(query, { topK: topK * 2, collectionId }),
    keywordRetrieve(query, { topK: topK * 2, collectionId }),
  ])

  // Build rank maps from each retriever
  const vectorRanks = new Map<string, number>()
  semanticResult.results.forEach((r, i) => {
    vectorRanks.set(r.chunkId, i + 1)
  })

  const keywordRanks = new Map<string, number>()
  keywordResult.results.forEach((r, i) => {
    keywordRanks.set(r.chunkId, i + 1)
  })

  // Collect all unique chunk IDs
  const allChunkIds = new Set<string>([
    ...vectorRanks.keys(),
    ...keywordRanks.keys(),
  ])

  // Build a content/metadata lookup from both result sets
  const chunkLookup = new Map<string, RetrievalResult>()
  for (const r of semanticResult.results) {
    chunkLookup.set(r.chunkId, r)
  }
  for (const r of keywordResult.results) {
    if (!chunkLookup.has(r.chunkId)) {
      chunkLookup.set(r.chunkId, r)
    }
  }

  // Compute RRF fusion scores
  const defaultRank = topK * 2 + 1 // Default rank for items not found by a retriever
  const fusedResults: RetrievalResult[] = []

  for (const chunkId of allChunkIds) {
    const vRank = vectorRanks.get(chunkId) ?? defaultRank
    const kRank = keywordRanks.get(chunkId) ?? defaultRank

    const vectorRRF = rrfScore(vRank)
    const keywordRRF = rrfScore(kRank)
    const fusedScore = alpha * vectorRRF + (1 - alpha) * keywordRRF

    const source = chunkLookup.get(chunkId)!
    fusedResults.push({
      chunkId,
      content: source.content,
      score: fusedScore,
      scoreType: 'hybrid',
      documentTitle: source.documentTitle,
      metadata: source.metadata,
      vectorScore: vectorRanks.has(chunkId)
        ? semanticResult.results.find((r) => r.chunkId === chunkId)?.score
        : undefined,
      keywordScore: keywordRanks.has(chunkId)
        ? keywordResult.results.find((r) => r.chunkId === chunkId)?.score
        : undefined,
    })
  }

  // Sort by fused score descending and take topK
  fusedResults.sort((a, b) => b.score - a.score)

  // Normalize RRF scores to 0-1 range for consistent display
  const maxScore = fusedResults[0]?.score ?? 1
  if (maxScore > 0) {
    for (const r of fusedResults) {
      r.score = r.score / maxScore
    }
  }

  const results = fusedResults.slice(0, topK)

  return {
    results,
    durationMs: Date.now() - start,
    hybridWeights: { vector: alpha, keyword: 1 - alpha },
  }
}
