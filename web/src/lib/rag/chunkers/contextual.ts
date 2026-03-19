import { recursiveChunk } from './recursive'
import { generateChunkContext } from '../context-generator'
import { estimateTokenCount } from '../token-utils'
import type { ChunkerOptions, ChunkResult } from '@/types/rag'

const BATCH_SIZE = 3

/**
 * Contextual Retrieval chunking — uses a recursive splitter as the base,
 * then prepends an LLM-generated context prefix to each chunk describing
 * where it fits in the overall document. This improves retrieval quality
 * by ~35% (Anthropic's Contextual Retrieval technique).
 */
export async function chunkContextual(
  content: string,
  options: ChunkerOptions
): Promise<ChunkResult[]> {
  // 1. Use recursive splitter as base
  const baseChunks = await recursiveChunk(content, options)

  if (baseChunks.length === 0) {
    return []
  }

  // 2. Process chunks in batches for concurrency control
  const results: ChunkResult[] = []

  for (let i = 0; i < baseChunks.length; i += BATCH_SIZE) {
    const batch = baseChunks.slice(i, i + BATCH_SIZE)

    const contextResults = await Promise.all(
      batch.map(async (chunk) => {
        const contextPrefix = await generateChunkContext(content, chunk.content)
        const contextualContent = `[上下文] ${contextPrefix}\n\n${chunk.content}`

        return {
          ...chunk,
          content: contextualContent,
          tokenCount: estimateTokenCount(contextualContent),
          metadata: {
            ...chunk.metadata,
            strategy: 'contextual' as const,
            contextPrefix,
          },
        }
      })
    )

    results.push(...contextResults)
  }

  return results
}
