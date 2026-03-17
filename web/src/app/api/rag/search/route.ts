import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { query, top_k, mode } = body;

  if (!query) {
    return NextResponse.json({ error: 'Missing required field: query' }, { status: 400 });
  }

  const k = top_k ?? 5;
  const searchMode = mode ?? 'hybrid';

  const mockResults = Array.from({ length: Math.min(k, 5) }, (_, i) => ({
    chunk_id: `chunk-${String(i + 1).padStart(3, '0')}`,
    content: `这是第 ${i + 1} 条搜索结果的模拟内容。该内容片段与查询 "${query}" 具有较高的语义相似度。`,
    score: parseFloat((0.95 - i * 0.05).toFixed(4)),
    document_title: `Document ${i + 1}`,
    document_id: `doc-${String(i + 1).padStart(3, '0')}`,
    metadata: {
      chunk_index: i,
      token_count: 64 + i * 12,
      source: 'feishu',
    },
  }));

  return NextResponse.json({
    query,
    mode: searchMode,
    top_k: k,
    total_results: mockResults.length,
    results: mockResults,
  });
}
