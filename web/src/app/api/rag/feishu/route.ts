import { NextRequest, NextResponse } from 'next/server';
import { resolveFeishuLink } from '@/lib/feishu/link-resolver';
import { parseFeishuBlocks } from '@/lib/feishu/parser';
import { getDocumentContent, getDocumentMeta } from '@/lib/feishu/client';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/auth-server';

export async function POST(request: NextRequest) {
  try {
    const { user } = await createAuthenticatedSupabaseClient();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { url } = body;

  if (!url) {
    return NextResponse.json({ error: 'Missing required field: url' }, { status: 400 });
  }

  // 1. Parse the feishu URL to extract document ID and type
  let linkInfo;
  try {
    linkInfo = resolveFeishuLink(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid feishu URL';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    // 2. Fetch document blocks via the feishu SDK
    const contentRes = await getDocumentContent(linkInfo.documentId);
    const blocks = contentRes?.data?.items ?? [];

    // 3. Parse blocks into markdown and structured data
    const parsed = parseFeishuBlocks(blocks);

    // 4. Fetch document metadata
    let title = 'Untitled Document';
    let metadata: Record<string, unknown> = {};
    try {
      const metaRes = await getDocumentMeta(linkInfo.documentId);
      const doc = metaRes?.data?.document;
      if (doc) {
        title = doc.title || title;
        metadata = {
          revision_id: doc.revision_id,
          document_id: doc.document_id,
        };
      }
    } catch {
      // Metadata fetch is best-effort; continue with defaults
    }

    // 5. Return response
    return NextResponse.json({
      document: {
        id: linkInfo.documentId,
        title,
        content: parsed.markdown,
        metadata: {
          ...metadata,
          source_url: linkInfo.rawUrl,
          document_type: linkInfo.type,
          total_chars: parsed.stats.totalChars,
        },
      },
      structure: parsed.structure,
      elements: parsed.elements,
      stats: parsed.stats,
    });
  } catch (err) {
    console.error('Failed to fetch feishu document:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { error: `Failed to fetch document: ${message}` },
      { status: 500 }
    );
  }
}
