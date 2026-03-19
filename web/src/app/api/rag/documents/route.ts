import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/client';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    // Fetch documents with chunk counts via a left join aggregate
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('id, title, source_type, token_count, created_at, collection_id')
      .order('created_at', { ascending: false });

    if (docError) {
      console.error('Failed to fetch documents:', docError);
      return NextResponse.json({ error: docError.message }, { status: 500 });
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json({ documents: [] });
    }

    // Fetch chunk counts grouped by document_id
    const docIds = documents.map((d) => d.id);
    const { data: chunkCounts, error: chunkError } = await supabase
      .from('chunks')
      .select('document_id')
      .in('document_id', docIds);

    if (chunkError) {
      console.error('Failed to fetch chunk counts:', chunkError);
      // Continue without chunk counts rather than failing entirely
    }

    // Count chunks per document
    const chunkCountMap: Record<string, number> = {};
    if (chunkCounts) {
      for (const row of chunkCounts) {
        chunkCountMap[row.document_id] = (chunkCountMap[row.document_id] ?? 0) + 1;
      }
    }

    const result = documents.map((doc) => ({
      id: doc.id,
      title: doc.title || 'Untitled',
      source_type: doc.source_type || 'unknown',
      chunk_count: chunkCountMap[doc.id] ?? 0,
      token_count: doc.token_count ?? 0,
      created_at: doc.created_at,
      status: 'ready' as const,
    }));

    return NextResponse.json({ documents: result });
  } catch (error) {
    console.error('Documents GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
