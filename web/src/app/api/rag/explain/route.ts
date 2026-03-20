import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/auth-server'
import { explainStep, streamFullAnalysis, type StepKey } from '@/lib/rag/teacher-analysis'
import type { RAGTrace } from '@/types/rag'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * POST /api/rag/explain
 *
 * Two modes:
 * 1. Explain a single step: { mode: 'step', stepKey, stepData, question }
 * 2. Full trace analysis (streaming): { mode: 'full', trace }
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await createAuthenticatedSupabaseClient()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { mode } = body

    if (mode === 'step') {
      const { stepKey, stepData, question } = body as {
        stepKey: StepKey
        stepData: unknown
        question: string
      }

      if (!stepKey || !question) {
        return NextResponse.json({ error: 'Missing stepKey or question' }, { status: 400 })
      }

      const explanation = await explainStep(stepKey, stepData, question)
      return NextResponse.json({ explanation })
    }

    if (mode === 'full') {
      const { trace } = body as { trace: RAGTrace }

      if (!trace) {
        return NextResponse.json({ error: 'Missing trace' }, { status: 400 })
      }

      const result = streamFullAnalysis(trace)
      return result.toTextStreamResponse()
    }

    return NextResponse.json({ error: 'Invalid mode. Use "step" or "full"' }, { status: 400 })
  } catch (error) {
    console.error('Explain API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
