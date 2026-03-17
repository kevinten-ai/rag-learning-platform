import { NextRequest, NextResponse } from 'next/server';
import { batchGenerateEmbeddingsWithStats } from '@/lib/embedding/zhipu';
import { computeUMAP3D, computeSimilarityMatrix } from '@/lib/rag/umap';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { texts, dimensions } = body;

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: texts (must be a non-empty array)' },
        { status: 400 },
      );
    }

    const dim = dimensions ?? 1024;

    // Generate embeddings with per-item stats
    const batchResult = await batchGenerateEmbeddingsWithStats(texts, dim);

    // Extract raw embedding vectors for UMAP and similarity computation
    const rawVectors = batchResult.embeddings.map((e) => {
      if (!e.embedding) {
        throw new Error('Embedding API returned a result without an embedding vector');
      }
      return e.embedding;
    });

    // Compute 3D UMAP projection
    const umapResult = computeUMAP3D(rawVectors);

    // Compute cosine similarity matrix
    const similarityMatrix = computeSimilarityMatrix(rawVectors);

    // Build response — only include a preview of each vector (first 10 dims)
    const embeddings = batchResult.embeddings.map((e) => ({
      vector_preview: e.embedding.slice(0, 10),
      token_count: e.tokensUsed,
      duration_ms: e.durationMs,
    }));

    return NextResponse.json({
      embeddings,
      umap_3d: umapResult.points3D,
      similarity_matrix: similarityMatrix,
      stats: {
        total_tokens: batchResult.totalTokensUsed,
        total_duration_ms: batchResult.totalDurationMs,
        dimensions: dim,
      },
    });
  } catch (error) {
    console.error('Embed API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
