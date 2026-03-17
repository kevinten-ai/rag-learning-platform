import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    collections: [
      {
        id: 'col-001',
        name: 'Default Collection',
        description: 'Default RAG knowledge base collection',
        chunk_strategy: 'recursive',
        chunk_size: 512,
        chunk_overlap: 50,
        embedding_dimensions: 1536,
        document_count: 24,
        created_at: '2026-01-15T08:30:00Z',
        updated_at: '2026-03-10T14:22:00Z',
      },
      {
        id: 'col-002',
        name: 'Engineering Docs',
        description: 'Internal engineering documentation',
        chunk_strategy: 'semantic',
        chunk_size: 1024,
        chunk_overlap: 100,
        embedding_dimensions: 1536,
        document_count: 87,
        created_at: '2026-02-01T10:00:00Z',
        updated_at: '2026-03-14T09:15:00Z',
      },
    ],
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { name, description, chunk_strategy, chunk_size, chunk_overlap, embedding_dimensions } =
    body;

  if (!name) {
    return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 });
  }

  return NextResponse.json(
    {
      id: crypto.randomUUID(),
      name,
      description: description ?? '',
      chunk_strategy: chunk_strategy ?? 'recursive',
      chunk_size: chunk_size ?? 512,
      chunk_overlap: chunk_overlap ?? 50,
      embedding_dimensions: embedding_dimensions ?? 1536,
      document_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { status: 201 },
  );
}
