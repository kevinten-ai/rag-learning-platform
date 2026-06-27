import { NextRequest, NextResponse } from 'next/server';
import { generateEmbedding } from '@/lib/embedding/ark';
import { matchChunks } from '@/lib/supabase/vectors';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/auth-server';

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await createAuthenticatedSupabaseClient();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const { query, top_k, collection_id: requestedCollectionId } = body;

    if (!query) {
      return NextResponse.json({ error: 'Missing required field: query' }, { status: 400 });
    }

    const k = top_k ?? 5;

    // Scope search to user's collection for data isolation
    let collection_id: string | undefined = requestedCollectionId;
    if (collection_id) {
      // Verify collection belongs to this user
      const { data: col } = await supabase
        .from('collections')
        .select('id')
        .eq('id', collection_id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!col) {
        collection_id = undefined; // Not owned — fall back to auto-detect
      }
    }
    if (!collection_id) {
      // Auto-detect user's latest collection
      const { data: cols } = await supabase
        .from('collections')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      collection_id = cols?.[0]?.id;
    }

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
