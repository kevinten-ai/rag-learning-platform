import { nanoid } from 'nanoid';
import { estimateTokenCount, splitByTokens } from '../token-utils';
import type { ChunkerOptions, ChunkResult } from '@/types/rag';

export function fixedSizeChunk(
  content: string,
  options: ChunkerOptions
): ChunkResult[] {
  const { chunkSize, chunkOverlap } = options;

  if (!content || content.trim().length === 0) {
    return [];
  }

  const parts = splitByTokens(content, chunkSize, chunkOverlap);

  return parts.map((part, index) => ({
    id: nanoid(),
    content: part.text,
    tokenCount: part.tokenCount,
    chunkIndex: index,
    metadata: { strategy: 'fixed-size' },
  }));
}
