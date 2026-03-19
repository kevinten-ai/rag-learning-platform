import { NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/auth-server';

export async function GET() {
  try {
    const { supabase, user } = await createAuthenticatedSupabaseClient();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch last 5 queries and total count in parallel
    const [recentResult, countResult] = await Promise.all([
      supabase
        .from('query_traces')
        .select('id, question, answer, config, total_duration_ms, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('query_traces')
        .select('*', { count: 'exact', head: true }),
    ]);

    if (recentResult.error) {
      console.error('Failed to fetch recent queries:', recentResult.error);
      return NextResponse.json({ error: recentResult.error.message }, { status: 500 });
    }

    const queries = (recentResult.data ?? []).map((row) => ({
      id: row.id,
      question: row.config?.question ?? row.question ?? '',
      answer_preview: row.answer
        ? String(row.answer).slice(0, 80) + (String(row.answer).length > 80 ? '...' : '')
        : '',
      mode: row.config?.resolvedMode ?? row.config?.mode ?? 'semantic',
      duration_ms: row.total_duration_ms ?? 0,
      timestamp: row.created_at,
    }));

    const totalCount = countResult.error ? queries.length : (countResult.count ?? 0);

    return NextResponse.json({ queries, totalCount });
  } catch (error) {
    console.error('Recent queries GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
