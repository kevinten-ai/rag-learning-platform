import { NextRequest, NextResponse } from 'next/server'
import { streamText } from 'ai'
import { kimiModel } from '@/lib/llm/kimi'
import { glmModel } from '@/lib/llm/glm'
import { RAGTracer } from '@/lib/rag/tracer'
import { rewriteQuery } from '@/lib/rag/query-enhancers/rewriter'
import { generateHyDE } from '@/lib/rag/query-enhancers/hyde'
import { generateMultiQuery } from '@/lib/rag/query-enhancers/multi-query'
import { semanticRetrieve } from '@/lib/rag/retrievers/semantic'
import { keywordRetrieve } from '@/lib/rag/retrievers/keyword'
import { hybridRetrieve } from '@/lib/rag/retrievers/hybrid'
import { rerankResults } from '@/lib/rag/reranker'
import { constructPrompt } from '@/lib/rag/generator'
import { evaluateAnswer } from '@/lib/rag/evaluator'
import { generateEmbedding } from '@/lib/embedding/zhipu'
import { createServerSupabaseClient } from '@/lib/supabase/client'
import type { RetrievalResult } from '@/types/rag'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      question,
      mode = 'semantic',
      enhancers = [] as string[],
      model = 'kimi',
      collection_id,
      top_k = 5,
      rerank = true,
    } = body

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: question' },
        { status: 400 }
      )
    }

    const tracer = new RAGTracer(question)

    // ----------------------------------------------------------------
    // Step 1 - Query Understanding
    // ----------------------------------------------------------------
    const quStart = Date.now()
    let effectiveQuery = question
    let rewritten: string | undefined
    let hydeDocument: string | undefined
    let subQueries: string[] | undefined
    const activeStrategies: string[] = []

    if (enhancers.includes('rewrite')) {
      const result = await rewriteQuery(question)
      rewritten = result.rewritten
      effectiveQuery = rewritten
      activeStrategies.push('rewrite')
    }

    if (enhancers.includes('hyde')) {
      const result = await generateHyDE(question)
      hydeDocument = result.hydeDocument
      activeStrategies.push('hyde')
    }

    if (enhancers.includes('multi-query')) {
      const result = await generateMultiQuery(question)
      subQueries = result.subQueries
      activeStrategies.push('multi-query')
    }

    tracer.recordQueryUnderstanding({
      durationMs: Date.now() - quStart,
      original: question,
      rewritten,
      hydeDocument,
      subQueries,
      activeStrategies,
    })

    // ----------------------------------------------------------------
    // Step 2 - Embedding
    // ----------------------------------------------------------------
    const embStart = Date.now()
    // Use the HyDE document for embedding when available, otherwise the (rewritten) query
    const textToEmbed = hydeDocument ?? effectiveQuery
    const { embedding, tokensUsed } = await generateEmbedding(textToEmbed)

    tracer.recordEmbedding({
      durationMs: Date.now() - embStart,
      model: 'embedding-3',
      dimensions: embedding.length,
      vector: embedding,
      tokensUsed,
    })

    // ----------------------------------------------------------------
    // Step 3 - Retrieval
    // ----------------------------------------------------------------
    const retStart = Date.now()
    let retrievalResults: RetrievalResult[] = []
    let hybridWeights: { vector: number; keyword: number } | undefined

    const retrieveOpts = { topK: top_k, collectionId: collection_id }

    if (subQueries && subQueries.length > 0) {
      // Multi-query: run retrieval for each sub-query, then merge and deduplicate
      const allResults: RetrievalResult[] = []
      for (const sq of subQueries) {
        const res = await runRetrieval(sq, mode, retrieveOpts)
        allResults.push(...res.results)
        if (res.hybridWeights) hybridWeights = res.hybridWeights
      }
      // Also run for the main query
      const mainRes = await runRetrieval(effectiveQuery, mode, retrieveOpts)
      allResults.push(...mainRes.results)
      if (mainRes.hybridWeights) hybridWeights = mainRes.hybridWeights

      // Deduplicate by chunkId, keeping the highest score
      const seen = new Map<string, RetrievalResult>()
      for (const r of allResults) {
        const existing = seen.get(r.chunkId)
        if (!existing || r.score > existing.score) {
          seen.set(r.chunkId, r)
        }
      }
      retrievalResults = Array.from(seen.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, top_k * 2) // Keep more for reranking
    } else {
      const res = await runRetrieval(effectiveQuery, mode, retrieveOpts)
      retrievalResults = res.results
      hybridWeights = res.hybridWeights
    }

    tracer.recordRetrieval({
      durationMs: Date.now() - retStart,
      mode: mode as 'semantic' | 'keyword' | 'hybrid',
      totalCandidates: retrievalResults.length,
      retrieved: Math.min(retrievalResults.length, top_k),
      results: retrievalResults,
      hybridWeights,
    })

    // ----------------------------------------------------------------
    // Step 4 - Reranking (optional)
    // ----------------------------------------------------------------
    let finalResults = retrievalResults.slice(0, top_k)
    let rerankedItems: Awaited<ReturnType<typeof rerankResults>> | undefined

    if (rerank && retrievalResults.length > 0) {
      const rerankOutput = await rerankResults(question, retrievalResults, top_k)
      rerankedItems = rerankOutput

      tracer.recordReranking({
        durationMs: rerankOutput.durationMs,
        model: 'kimi-reranker',
        before: rerankOutput.before,
        after: rerankOutput.after,
        filtered: rerankOutput.filtered,
      })

      // Use reranked ordering to select final results
      if (rerankOutput.after.length > 0) {
        const resultMap = new Map(retrievalResults.map((r) => [r.chunkId, r]))
        finalResults = rerankOutput.after
          .map((item) => resultMap.get(item.chunkId))
          .filter((r): r is RetrievalResult => r !== undefined)
      }
    }

    // ----------------------------------------------------------------
    // Step 5 - Prompt Construction
    // ----------------------------------------------------------------
    const promptResult = constructPrompt(
      question,
      finalResults,
      rerankedItems?.after
    )

    tracer.recordPromptConstruction({
      durationMs: promptResult.durationMs,
      template: 'rag-qa-v1',
      systemPrompt: promptResult.systemPrompt,
      contextChunks: promptResult.contextChunks,
      fullPrompt: promptResult.fullPrompt,
      tokenBreakdown: promptResult.tokenBreakdown,
    })

    // ----------------------------------------------------------------
    // Encode pre-stream trace data as a custom header
    // ----------------------------------------------------------------
    const preStreamTrace = tracer.getPreStreamTrace()
    const traceHeaderValue = Buffer.from(
      JSON.stringify(preStreamTrace)
    ).toString('base64')

    // ----------------------------------------------------------------
    // Step 6 - Generation (streaming)
    // ----------------------------------------------------------------
    const selectedModel = model === 'glm' ? glmModel : kimiModel
    const modelName = model === 'glm' ? 'glm-4-flash' : 'moonshot-v1-128k'
    const generationStart = Date.now()

    const result = streamText({
      model: selectedModel,
      system: promptResult.systemPrompt,
      prompt: promptResult.userPrompt,
      onFinish: async ({ text, usage }) => {
        // Record generation step
        const sources = finalResults.map((r) => ({
          chunkId: r.chunkId,
          documentTitle: r.documentTitle,
          relevance: r.score > 0.8 ? 'high' : r.score > 0.5 ? 'medium' : 'low',
        }))

        const promptTokens = usage?.inputTokens ?? 0
        const completionTokens = usage?.outputTokens ?? 0

        tracer.recordGeneration({
          durationMs: Date.now() - generationStart,
          model: modelName,
          answer: text,
          tokensUsed: {
            prompt: promptTokens,
            completion: completionTokens,
            total: promptTokens + completionTokens,
          },
          sources,
          estimatedCost: estimateCost(modelName, promptTokens, completionTokens),
        })

        // Run evaluation asynchronously (best-effort)
        try {
          const contextText = finalResults.map((r) => r.content).join('\n\n')
          const assessment = await evaluateAnswer(question, text, contextText)
          tracer.recordEvaluation(assessment)
        } catch {
          // Evaluation failure is non-critical
        }

        // Save the complete trace to Supabase (best-effort)
        try {
          const finalTrace = tracer.finalize()
          const supabase = createServerSupabaseClient()
          await supabase.from('query_traces').insert({
            id: finalTrace.id,
            question: finalTrace.question,
            trace_data: finalTrace,
            created_at: finalTrace.timestamp,
          })
        } catch {
          // Trace persistence failure is non-critical
          console.error('Failed to save query trace')
        }
      },
    })

    return result.toTextStreamResponse({
      headers: {
        'X-RAG-Trace': traceHeaderValue,
      },
    })
  } catch (error) {
    console.error('RAG query error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error during RAG query',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

async function runRetrieval(
  query: string,
  mode: string,
  options: { topK: number; collectionId?: string }
): Promise<{
  results: RetrievalResult[]
  hybridWeights?: { vector: number; keyword: number }
}> {
  switch (mode) {
    case 'keyword': {
      const res = await keywordRetrieve(query, {
        topK: options.topK,
        collectionId: options.collectionId,
      })
      return { results: res.results }
    }
    case 'hybrid': {
      const res = await hybridRetrieve(query, {
        topK: options.topK,
        collectionId: options.collectionId,
      })
      return { results: res.results, hybridWeights: res.hybridWeights }
    }
    case 'semantic':
    default: {
      const res = await semanticRetrieve(query, {
        topK: options.topK,
        collectionId: options.collectionId,
      })
      return { results: res.results }
    }
  }
}

function estimateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  // Rough cost estimates per 1M tokens (CNY)
  const rates: Record<string, { prompt: number; completion: number }> = {
    'moonshot-v1-128k': { prompt: 60, completion: 60 },
    'glm-4-flash': { prompt: 1, completion: 1 },
  }
  const rate = rates[model] ?? { prompt: 10, completion: 10 }
  return (
    (promptTokens / 1_000_000) * rate.prompt +
    (completionTokens / 1_000_000) * rate.completion
  )
}
