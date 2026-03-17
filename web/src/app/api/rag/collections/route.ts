import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/client';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch collections:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ collections: data ?? [] });
  } catch (error) {
    console.error('Collections GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name, description, chunk_strategy, chunk_size, chunk_overlap, embedding_dimensions } =
      body;

    if (!name) {
      return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('collections')
      .insert({
        name,
        description: description ?? '',
        chunk_strategy: chunk_strategy ?? 'recursive',
        chunk_size: chunk_size ?? 512,
        chunk_overlap: chunk_overlap ?? 50,
        embedding_dimensions: embedding_dimensions ?? 1536,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create collection:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Collections POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
