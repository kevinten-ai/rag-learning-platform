import { NextRequest, NextResponse } from 'next/server';
import type { ChunkerOptions, ChunkResult } from '@/types/rag';
import { fixedSizeChunk } from '@/lib/rag/chunkers/fixed-size';
import { recursiveChunk } from '@/lib/rag/chunkers/recursive';
import { semanticChunk } from '@/lib/rag/chunkers/semantic';
import { documentAwareChunk } from '@/lib/rag/chunkers/document-aware';
import { chunkContextual } from '@/lib/rag/chunkers/contextual';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/auth-server';

const DEFAULT_CHUNK_SIZE = 500;
const DEFAULT_CHUNK_OVERLAP = 50;
const DEFAULT_STRATEGIES = ['fixed-size', 'recursive'];

type StrategyResult = {
  chunks: ChunkResult[];
  totalChunks: number;
  avgTokenCount: number;
};

async function runChunker(
  strategy: string,
  content: string,
  options: ChunkerOptions
): Promise<ChunkResult[]> {
  switch (strategy) {
    case 'fixed-size':
      return fixedSizeChunk(content, options);
    case 'recursive':
      return recursiveChunk(content, options);
    case 'semantic':
      return semanticChunk(content, options);
    case 'document-aware':
      return documentAwareChunk(content, options);
    case 'contextual':
      return chunkContextual(content, options);
    default:
      throw new Error(`Unknown chunking strategy: ${strategy}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await createAuthenticatedSupabaseClient();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const { content, strategies, options } = body as {
      content?: string;
      strategies?: string[];
      options?: { chunkSize?: number; chunkOverlap?: number };
    };

    if (!content) {
      return NextResponse.json(
        { error: 'Missing required field: content' },
        { status: 400 }
      );
    }

    const activeStrategies =
      strategies && Array.isArray(strategies) && strategies.length > 0
        ? strategies
        : DEFAULT_STRATEGIES;

    const chunkerOptions: ChunkerOptions = {
      chunkSize: options?.chunkSize ?? DEFAULT_CHUNK_SIZE,
      chunkOverlap: options?.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP,
    };

    const results: Record<string, StrategyResult> = {};

    for (const strategy of activeStrategies) {
      const chunks = await runChunker(strategy, content, chunkerOptions);
      const totalChunks = chunks.length;
      const avgTokenCount =
        totalChunks > 0
          ? Math.round(
              chunks.reduce((sum, c) => sum + c.tokenCount, 0) / totalChunks
            )
          : 0;

      results[strategy] = {
        chunks,
        totalChunks,
        avgTokenCount,
      };
    }

    return NextResponse.json({ results });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
