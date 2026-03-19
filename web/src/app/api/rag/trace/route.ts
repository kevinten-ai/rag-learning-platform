import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/auth-server'

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing trace id' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('query_traces')
      .select('trace')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Trace not found' }, { status: 404 })
    }

    return NextResponse.json(data.trace)
  } catch (error) {
    console.error('Trace fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
