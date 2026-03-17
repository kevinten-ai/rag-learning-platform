import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { nanoid } from 'nanoid';
import { estimateTokenCount } from '../token-utils';
import type { ChunkerOptions, ChunkResult } from '@/types/rag';

const DEFAULT_CHINESE_SEPARATORS = [
  '\n\n',
  '\n',
  '。',
  '！',
  '？',
  '；',
  '，',
  ' ',
  '',
];

export async function recursiveChunk(
  content: string,
  options: ChunkerOptions
): Promise<ChunkResult[]> {
  const { chunkSize, chunkOverlap, separators } = options;

  if (!content || content.trim().length === 0) {
    return [];
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: separators ?? DEFAULT_CHINESE_SEPARATORS,
  });

  const documents = await splitter.createDocuments([content]);

  return documents.map((doc, index) => ({
    id: nanoid(),
    content: doc.pageContent,
    tokenCount: estimateTokenCount(doc.pageContent),
    chunkIndex: index,
    metadata: { strategy: 'recursive' },
  }));
}
