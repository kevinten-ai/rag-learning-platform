import { NextRequest, NextResponse } from 'next/server';
import { generateEmbedding } from '@/lib/embedding/zhipu';
import { matchChunks } from '@/lib/supabase/vectors';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/auth-server';

export async function POST(request: NextRequest) {
  try {
    const { user } = await createAuthenticatedSupabaseClient();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const { query, top_k, collection_id } = body;

    if (!query) {
      return NextResponse.json({ error: 'Missing required field: query' }, { status: 400 });
    }

    const k = top_k ?? 5;

    // Generate embedding for the search query
    const { embedding } = await generateEmbedding(query);

    // Call the match_chunks RPC via Supabase for vector search
    const results = await matchChunks(embedding, k, collection_id);

    return NextResponse.json({
      query,
      top_k: k,
      total_results: results.length,
      results,
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
