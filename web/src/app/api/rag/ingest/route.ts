import { NextRequest, NextResponse } from 'next/server';
import { resolveFeishuLink } from '@/lib/feishu/link-resolver';
import { getDocumentContent, getDocumentMeta } from '@/lib/feishu/client';
import { parseFeishuBlocks } from '@/lib/feishu/parser';
import { recursiveChunk } from '@/lib/rag/chunkers/recursive';
import { fixedSizeChunk } from '@/lib/rag/chunkers/fixed-size';
import { documentAwareChunk } from '@/lib/rag/chunkers/document-aware';
import { chunkContextual } from '@/lib/rag/chunkers/contextual';
import { batchGenerateEmbeddingsWithStats } from '@/lib/embedding/ark';
import { computeUMAP3D, computeSimilarityMatrix } from '@/lib/rag/umap';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/auth-server';
import { insertChunks } from '@/lib/supabase/vectors';

const chunkerMap: Record<string, (content: string, options: { chunkSize: number; chunkOverlap: number }) => import('@/types/rag').ChunkResult[] | Promise<import('@/types/rag').ChunkResult[]>> = {
  'recursive': recursiveChunk,
  'fixed-size': fixedSizeChunk,
  'document-aware': documentAwareChunk,
  'contextual': chunkContextual,
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { supabase, user } = await createAuthenticatedSupabaseClient();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { url, content, title, source_type, collection_id, chunk_strategy = 'recursive', chunk_size = 500, chunk_overlap = 50, embedding_dimensions = 1024 } = body;

    // Validate: either content or url must be provided
    if (!url && !content) {
      return NextResponse.json({ error: 'Missing required field: url or content' }, { status: 400 });
    }

    const stages: Record<string, { status: string; duration_ms: number; data?: unknown }> = {};

    let parsed: { markdown: string; structure: { headings: Array<{ level: number; text: string }> }; elements: Array<{ type: string; content: string }>; stats: { totalChars: number; headingCount: number; paragraphCount: number; codeBlockCount: number; listCount: number } };
    let meta: Record<string, unknown>;
    let sourceUrl: string;

    if (content) {
      // Direct content mode: skip Feishu fetch, use provided content directly
      const stageStart = Date.now();

      // Extract basic structure from the provided content
      const headings: Array<{ level: number; text: string }> = [];
      const lines = (content as string).split('\n');
      for (const line of lines) {
        const match = line.match(/^(#{1,6})\s+(.+)/);
        if (match) {
          headings.push({ level: match[1].length, text: match[2] });
        }
      }

      const paragraphCount = lines.filter((l: string) => l.trim().length > 0 && !l.startsWith('#')).length;
      const codeBlockCount = ((content as string).match(/```/g) || []).length / 2;
      const listCount = lines.filter((l: string) => /^\s*[-*+]\s|^\s*\d+\.\s/.test(l)).length;

      parsed = {
        markdown: content as string,
        structure: { headings },
        elements: [{ type: 'text', content: content as string }],
        stats: {
          totalChars: (content as string).length,
          headingCount: headings.length,
          paragraphCount: Math.max(paragraphCount, 0),
          codeBlockCount: Math.max(Math.floor(codeBlockCount), 0),
          listCount,
        },
      };
      meta = { title: title || 'Untitled' };
      sourceUrl = source_type ? `direct://${source_type}` : 'direct://paste';

      stages.resolve = { status: 'completed', duration_ms: 0, data: { mode: 'direct_content' } };
      stages.fetch = { status: 'completed', duration_ms: 0, data: { mode: 'direct_content' } };
      stages.parse = {
        status: 'completed',
        duration_ms: Date.now() - stageStart,
        data: { totalChars: parsed.stats.totalChars, headingCount: parsed.stats.headingCount },
      };
    } else {
      // Feishu URL mode: existing flow
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
      meta = (metaRes?.data?.document ?? {}) as Record<string, unknown>;
      stages.fetch = { status: 'completed', duration_ms: Date.now() - stageStart };

      // Stage 3: Parse blocks to markdown
      stageStart = Date.now();
      parsed = parseFeishuBlocks(blocks);
      stages.parse = {
        status: 'completed',
        duration_ms: Date.now() - stageStart,
        data: { totalChars: parsed.stats.totalChars, headingCount: parsed.stats.headingCount },
      };
      sourceUrl = url;
    }

    // stageStart used in shared stages below
    let stageStart: number;

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

    // Ensure collection exists
    let collectionId = collection_id;
    if (!collectionId) {
      const { data: col, error: colErr } = await supabase
        .from('collections')
        .insert({
          name: (meta.title as string) || 'Untitled Collection',
          chunk_strategy,
          chunk_size,
          chunk_overlap,
          embedding_dimensions,
          user_id: user.id,
        })
        .select('id')
        .single();
      if (colErr) throw colErr;
      collectionId = col.id;
    }

    // Insert document
    const docTitle = (meta.title as string) || title || 'Untitled';
    const docSourceType = content ? (source_type || 'paste') : 'feishu';
    const { data: doc, error: docErr } = await supabase
      .from('documents')
      .insert({
        collection_id: collectionId,
        title: docTitle,
        source_url: sourceUrl,
        source_type: docSourceType,
        raw_content: parsed.markdown,
        metadata: meta,
        token_count: chunks.reduce((sum, c) => sum + c.tokenCount, 0),
        user_id: user.id,
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
        title: meta.title as string,
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
