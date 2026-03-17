import { nanoid } from 'nanoid';
import { generateEmbedding } from '@/lib/embedding/zhipu';
import { estimateTokenCount } from '../token-utils';
import type { ChunkerOptions, ChunkResult } from '@/types/rag';

/**
 * NOTE: This is the most expensive chunking strategy.
 * It calls the embedding API once per sentence, so costs scale linearly
 * with the number of sentences in the content.
 */

const DEFAULT_SIMILARITY_THRESHOLD = 0.5;
const SENTENCE_ENDERS = /([。！？；])/;

function splitSentences(text: string): string[] {
  const parts = text.split(SENTENCE_ENDERS);
  const sentences: string[] = [];

  for (let i = 0; i < parts.length; i += 2) {
    const sentence = parts[i] + (parts[i + 1] ?? '');
    const trimmed = sentence.trim();
    if (trimmed.length > 0) {
      sentences.push(trimmed);
    }
  }

  return sentences;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

export async function semanticChunk(
  content: string,
  options: ChunkerOptions
): Promise<ChunkResult[]> {
  if (!content || content.trim().length === 0) {
    return [];
  }

  const sentences = splitSentences(content);

  if (sentences.length === 0) {
    return [];
  }

  if (sentences.length === 1) {
    return [
      {
        id: nanoid(),
        content: sentences[0],
        tokenCount: estimateTokenCount(sentences[0]),
        chunkIndex: 0,
        metadata: { strategy: 'semantic' },
      },
    ];
  }

  // Generate embeddings for all sentences
  const embeddings: number[][] = [];
  for (const sentence of sentences) {
    const { embedding } = await generateEmbedding(sentence);
    embeddings.push(embedding);
  }

  // Compute similarities between adjacent sentences
  const similarities: number[] = [];
  for (let i = 0; i < embeddings.length - 1; i++) {
    similarities.push(cosineSimilarity(embeddings[i], embeddings[i + 1]));
  }

  // Group sentences into chunks based on similarity threshold
  const groups: string[][] = [[]];

  for (let i = 0; i < sentences.length; i++) {
    groups[groups.length - 1].push(sentences[i]);

    if (i < similarities.length && similarities[i] < DEFAULT_SIMILARITY_THRESHOLD) {
      groups.push([]);
    }
  }

  return groups
    .filter((group) => group.length > 0)
    .map((group, index) => {
      const chunkContent = group.join('');
      return {
        id: nanoid(),
        content: chunkContent,
        tokenCount: estimateTokenCount(chunkContent),
        chunkIndex: index,
        metadata: { strategy: 'semantic' },
      };
    });
}
