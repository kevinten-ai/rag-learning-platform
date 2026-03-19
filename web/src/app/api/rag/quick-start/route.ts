import { NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/auth-server';
import { SAMPLE_DOCUMENTS } from '@/lib/rag/sample-documents';
import { recursiveChunk } from '@/lib/rag/chunkers/recursive';
import { batchGenerateEmbeddings } from '@/lib/embedding/zhipu';
import { insertChunks } from '@/lib/supabase/vectors';

const QUICK_START_COLLECTION_NAME = '快速入门示例';
const CHUNK_SIZE = 300;
const CHUNK_OVERLAP = 30;
const EMBEDDING_DIMENSIONS = 1024;

export async function POST() {
  try {
    const { supabase, user } = await createAuthenticatedSupabaseClient();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if quick-start collection already exists
    const { data: existing, error: findError } = await supabase
      .from('collections')
      .select('id')
      .eq('name', QUICK_START_COLLECTION_NAME)
      .limit(1)
      .maybeSingle();

    if (findError) {
      throw new Error(`Failed to query collections: ${findError.message}`);
    }

    if (existing) {
      // Collection already exists — count documents and chunks
      const { count: docCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('collection_id', existing.id);

      const { count: chunkCount } = await supabase
        .from('chunks')
        .select('*', { count: 'exact', head: true })
        .eq('collection_id', existing.id);

      return NextResponse.json({
        success: true,
        collection_id: existing.id,
        documents: docCount ?? 0,
        chunks: chunkCount ?? 0,
        message: '快速入门示例集合已存在，无需重复创建。',
      });
    }

    // Create the collection
    const { data: collection, error: colError } = await supabase
      .from('collections')
      .insert({
        name: QUICK_START_COLLECTION_NAME,
        description: '内置示例文档，帮助你快速体验 RAG 全流程。',
        chunk_strategy: 'recursive',
        chunk_size: CHUNK_SIZE,
        chunk_overlap: CHUNK_OVERLAP,
        embedding_dimensions: EMBEDDING_DIMENSIONS,
        user_id: user.id,
      })
      .select('id')
      .single();

    if (colError) {
      throw new Error(`Failed to create collection: ${colError.message}`);
    }

    const collectionId = collection.id;
    let totalChunks = 0;

    for (const sample of SAMPLE_DOCUMENTS) {
      // Insert document
      const { data: doc, error: docError } = await supabase
        .from('documents')
        .insert({
          collection_id: collectionId,
          title: sample.title,
          raw_content: sample.content,
          source_type: 'sample',
          metadata: { sample_id: sample.id },
          user_id: user.id,
        })
        .select('id')
        .single();

      if (docError) {
        throw new Error(`Failed to insert document "${sample.title}": ${docError.message}`);
      }

      // Chunk the content
      const chunks = await recursiveChunk(sample.content, {
        chunkSize: CHUNK_SIZE,
        chunkOverlap: CHUNK_OVERLAP,
      });

      if (chunks.length === 0) {
        continue;
      }

      // Generate embeddings for all chunks
      const texts = chunks.map((c) => c.content);
      const embeddings = await batchGenerateEmbeddings(texts, EMBEDDING_DIMENSIONS);

      // Insert chunks with embeddings
      const chunkRows = chunks.map((chunk, i) => ({
        document_id: doc.id,
        collection_id: collectionId,
        content: chunk.content,
        embedding: embeddings[i].embedding,
        chunk_index: chunk.chunkIndex,
        token_count: chunk.tokenCount,
        metadata: chunk.metadata,
      }));

      await insertChunks(chunkRows);
      totalChunks += chunks.length;
    }

    return NextResponse.json({
      success: true,
      collection_id: collectionId,
      documents: SAMPLE_DOCUMENTS.length,
      chunks: totalChunks,
      message: `成功创建快速入门示例：${SAMPLE_DOCUMENTS.length} 篇文档，${totalChunks} 个分块。`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Quick-start error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
