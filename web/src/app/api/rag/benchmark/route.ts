import { NextRequest, NextResponse } from 'next/server'
import { BENCHMARK_DATASET } from '@/lib/rag/benchmark-datasets'
import { evaluateAnswer } from '@/lib/rag/evaluator'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/auth-server'

export async function POST(request: NextRequest) {
  try {
    const { user } = await createAuthenticatedSupabaseClient()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      config,
      questionIds,
    }: {
      config: {
        retrievalMode: string
        enhancers: string[]
        rerank: boolean
        topK: number
      }
      questionIds?: string[]
    } = body

    // Filter questions if specific IDs provided
    const questions = questionIds
      ? BENCHMARK_DATASET.filter((q) => questionIds.includes(q.id))
      : BENCHMARK_DATASET

    const results: Array<{
      questionId: string
      question: string
      category: string
      difficulty: string
      answer: string
      groundTruth: string
      relevance: number
      faithfulness: number
      completeness: number
      latencyMs: number
      keywordHits: number
      keywordTotal: number
    }> = []

    // Run each question through the RAG pipeline
    for (const item of questions) {
      const start = Date.now()

      try {
        // Call our own query API internally (forward cookies for auth)
        const queryResponse = await fetch(
          new URL('/api/rag/query', request.url),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: request.headers.get('cookie') ?? '',
            },
            body: JSON.stringify({
              question: item.question,
              mode: config.retrievalMode,
              enhancers: config.enhancers,
              rerank: config.rerank,
              top_k: config.topK,
            }),
          }
        )

        const latencyMs = Date.now() - start

        // Extract retrieved context from trace header
        let retrievedContext = ''
        const traceHeader = queryResponse.headers.get('X-RAG-Trace')
        if (traceHeader) {
          try {
            const traceData = JSON.parse(Buffer.from(traceHeader, 'base64').toString())
            if (traceData?.steps?.promptConstruction?.contextChunks) {
              retrievedContext = traceData.steps.promptConstruction.contextChunks
                .map((c: { content: string }) => c.content)
                .join('\n\n')
            }
          } catch {
            // fallback to ground truth if trace parsing fails
          }
        }

        // Read the streamed response
        const reader = queryResponse.body?.getReader()
        let answer = ''
        if (reader) {
          const decoder = new TextDecoder()
          let done = false
          while (!done) {
            const { value, done: streamDone } = await reader.read()
            done = streamDone
            if (value) {
              answer += decoder.decode(value, { stream: !done })
            }
          }
        }

        // Evaluate the answer against retrieved context (not ground truth)
        const evaluation = await evaluateAnswer(
          item.question,
          answer,
          retrievedContext || item.groundTruth
        )

        // Check keyword coverage
        const keywordHits = item.relevantKeywords.filter((kw) =>
          answer.includes(kw)
        ).length

        results.push({
          questionId: item.id,
          question: item.question,
          category: item.category,
          difficulty: item.difficulty,
          answer: answer.slice(0, 500),
          groundTruth: item.groundTruth,
          relevance: evaluation.relevance,
          faithfulness: evaluation.faithfulness,
          completeness: evaluation.completeness,
          latencyMs,
          keywordHits,
          keywordTotal: item.relevantKeywords.length,
        })
      } catch (err) {
        results.push({
          questionId: item.id,
          question: item.question,
          category: item.category,
          difficulty: item.difficulty,
          answer: `Error: ${err instanceof Error ? err.message : 'Unknown'}`,
          groundTruth: item.groundTruth,
          relevance: 0,
          faithfulness: 0,
          completeness: 0,
          latencyMs: Date.now() - start,
          keywordHits: 0,
          keywordTotal: item.relevantKeywords.length,
        })
      }
    }

    // Compute aggregated metrics
    const count = results.length || 1
    const metrics = {
      avgRelevance: results.reduce((s, r) => s + r.relevance, 0) / count,
      avgFaithfulness: results.reduce((s, r) => s + r.faithfulness, 0) / count,
      avgCompleteness: results.reduce((s, r) => s + r.completeness, 0) / count,
      avgLatencyMs: results.reduce((s, r) => s + r.latencyMs, 0) / count,
      avgKeywordCoverage:
        results.reduce(
          (s, r) => s + (r.keywordTotal > 0 ? r.keywordHits / r.keywordTotal : 0),
          0
        ) / count,
      totalQuestions: results.length,
      byCategory: Object.fromEntries(
        (['factual', 'analytical', 'comparison', 'multi-hop'] as const).map(
          (cat) => {
            const catResults = results.filter((r) => r.category === cat)
            const catCount = catResults.length || 1
            return [
              cat,
              {
                count: catResults.length,
                avgRelevance:
                  catResults.reduce((s, r) => s + r.relevance, 0) / catCount,
                avgFaithfulness:
                  catResults.reduce((s, r) => s + r.faithfulness, 0) / catCount,
                avgCompleteness:
                  catResults.reduce((s, r) => s + r.completeness, 0) / catCount,
              },
            ]
          }
        )
      ),
      byDifficulty: Object.fromEntries(
        (['easy', 'medium', 'hard'] as const).map((diff) => {
          const diffResults = results.filter((r) => r.difficulty === diff)
          const diffCount = diffResults.length || 1
          return [
            diff,
            {
              count: diffResults.length,
              avgRelevance:
                diffResults.reduce((s, r) => s + r.relevance, 0) / diffCount,
              avgCompleteness:
                diffResults.reduce((s, r) => s + r.completeness, 0) / diffCount,
            },
          ]
        })
      ),
    }

    return NextResponse.json({
      config,
      metrics,
      results,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Benchmark failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
