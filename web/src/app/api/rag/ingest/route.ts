import { NextRequest, NextResponse } from 'next/server';
import { resolveFeishuLink } from '@/lib/feishu/link-resolver';
import { getDocumentContent, getDocumentMeta } from '@/lib/feishu/client';
import { parseFeishuBlocks } from '@/lib/feishu/parser';
import { recursiveChunk } from '@/lib/rag/chunkers/recursive';
import { fixedSizeChunk } from '@/lib/rag/chunkers/fixed-size';
import { documentAwareChunk } from '@/lib/rag/chunkers/document-aware';
import { batchGenerateEmbeddingsWithStats } from '@/lib/embedding/zhipu';
import { computeUMAP3D, computeSimilarityMatrix } from '@/lib/rag/umap';
import { createServerSupabaseClient } from '@/lib/supabase/client';
import { insertChunks } from '@/lib/supabase/vectors';

const chunkerMap: Record<string, (content: string, options: { chunkSize: number; chunkOverlap: number }) => import('@/types/rag').ChunkResult[] | Promise<import('@/types/rag').ChunkResult[]>> = {
  'recursive': recursiveChunk,
  'fixed-size': fixedSizeChunk,
  'document-aware': documentAwareChunk,
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { url, collection_id, chunk_strategy = 'recursive', chunk_size = 500, chunk_overlap = 50, embedding_dimensions = 1024 } = body;

    if (!url) {
      return NextResponse.json({ error: 'Missing required field: url' }, { status: 400 });
    }

    const stages: Record<string, { status: string; duration_ms: number; data?: unknown }> = {};

    // Stage 1: Resolve feishu link
    let stageStart = Date.now();
    const linkInfo = resolveFeishuLink(url);
    stages.resolve = { status: 'completed', duration_ms: Date.now() - stageStart, data: linkInfo };

    // Stage 2: Fetch document from feishu
    stageStart = Date.now();
    const [blocksRes, metaRes] = await Promise.all([
      getDocumentContent(linkInfo.documentId),
      getDocumentMeta(linkInfo.documentId),
    ]);
    const blocks = blocksRes?.data?.items ?? [];
    const meta = metaRes?.data?.document ?? {};
    stages.fetch = { status: 'completed', duration_ms: Date.now() - stageStart };

    // Stage 3: Parse blocks to markdown
    stageStart = Date.now();
    const parsed = parseFeishuBlocks(blocks);
    stages.parse = {
      status: 'completed',
      duration_ms: Date.now() - stageStart,
      data: { totalChars: parsed.stats.totalChars, headingCount: parsed.stats.headingCount },
    };

    // Stage 4: Chunk the content
    stageStart = Date.now();
    const chunker = chunkerMap[chunk_strategy] ?? chunkerMap['recursive'];
    const chunks = await chunker(parsed.markdown, { chunkSize: chunk_size, chunkOverlap: chunk_overlap });
    stages.chunk = {
      status: 'completed',
      duration_ms: Date.now() - stageStart,
      data: { totalChunks: chunks.length, strategy: chunk_strategy },
    };

    // Stage 5: Generate embeddings
    stageStart = Date.now();
    const texts = chunks.map((c) => c.content);
    const embeddingResult = await batchGenerateEmbeddingsWithStats(texts, embedding_dimensions);
    stages.embed = {
      status: 'completed',
      duration_ms: Date.now() - stageStart,
      data: {
        totalTokens: embeddingResult.totalTokensUsed,
        dimensions: embedding_dimensions,
      },
    };

    // Stage 6: Compute UMAP + similarity
    stageStart = Date.now();
    const vectors = embeddingResult.embeddings.map((e) => e.embedding);
    const umap3d = computeUMAP3D(vectors);
    const similarityMatrix = computeSimilarityMatrix(vectors);
    stages.visualize = { status: 'completed', duration_ms: Date.now() - stageStart };

    // Stage 7: Store in Supabase
    stageStart = Date.now();
    const supabase = createServerSupabaseClient();

    // Ensure collection exists
    let collectionId = collection_id;
    if (!collectionId) {
      const { data: col, error: colErr } = await supabase
        .from('collections')
        .insert({
          name: (meta as Record<string, unknown>).title as string || 'Untitled Collection',
          chunk_strategy,
          chunk_size,
          chunk_overlap,
          embedding_dimensions,
        })
        .select('id')
        .single();
      if (colErr) throw colErr;
      collectionId = col.id;
    }

    // Insert document
    const { data: doc, error: docErr } = await supabase
      .from('documents')
      .insert({
        collection_id: collectionId,
        title: (meta as Record<string, unknown>).title as string || 'Untitled',
        source_url: url,
        source_type: 'feishu',
        raw_content: parsed.markdown,
        metadata: meta,
        token_count: chunks.reduce((sum, c) => sum + c.tokenCount, 0),
      })
      .select('id')
      .single();
    if (docErr) throw docErr;

    // Insert chunks with embeddings
    const chunkRows = chunks.map((chunk, i) => ({
      document_id: doc.id,
      collection_id: collectionId,
      content: chunk.content,
      embedding: vectors[i],
      chunk_index: chunk.chunkIndex,
      token_count: chunk.tokenCount,
      metadata: chunk.metadata,
    }));
    await insertChunks(chunkRows);

    stages.store = { status: 'completed', duration_ms: Date.now() - stageStart };

    return NextResponse.json({
      success: true,
      document_id: doc.id,
      collection_id: collectionId,
      chunks_created: chunks.length,
      duration_ms: Date.now() - startTime,
      stages,
      visualization: {
        umap_3d: umap3d.points3D,
        similarity_matrix: similarityMatrix,
        vector_previews: vectors.map((v) => v.slice(0, 10)),
      },
      document: {
        title: (meta as Record<string, unknown>).title,
        markdown: parsed.markdown,
        structure: parsed.structure,
        elements: parsed.elements,
        stats: parsed.stats,
      },
      chunks: chunks.map((c, i) => ({
        ...c,
        vectorPreview: vectors[i]?.slice(0, 10) ?? [],
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message, duration_ms: Date.now() - startTime },
      { status: 500 }
    );
  }
}
