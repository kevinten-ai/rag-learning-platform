import { nanoid } from 'nanoid'
import type { RAGTrace, RetrievalResult, RankItem, ContextChunk, SourceRef } from '@/types/rag'

/**
 * RAGTracer collects timing and data for each step of the RAG pipeline,
 * building up a complete RAGTrace object for observability.
 */
export class RAGTracer {
  private traceId: string
  private question: string
  private startTime: number
  private trace: Partial<RAGTrace>

  constructor(question: string) {
    this.traceId = nanoid()
    this.question = question
    this.startTime = Date.now()
    this.trace = {
      id: this.traceId,
      question,
      timestamp: new Date().toISOString(),
      totalDurationMs: 0,
      steps: {} as RAGTrace['steps'],
    }
  }

  get id() {
    return this.traceId
  }

  recordQueryUnderstanding(data: {
    durationMs: number
    original: string
    rewritten?: string
    hydeDocument?: string
    subQueries?: string[]
    activeStrategies: string[]
  }) {
    this.trace.steps = {
      ...this.trace.steps!,
      queryUnderstanding: data,
    }
  }

  recordEmbedding(data: {
    durationMs: number
    model: string
    dimensions: number
    vector: number[]
    tokensUsed: number
  }) {
    this.trace.steps = {
      ...this.trace.steps!,
      embedding: {
        ...data,
        vectorPreview: data.vector.slice(0, 5),
      },
    }
  }

  recordRetrieval(data: {
    durationMs: number
    mode: 'semantic' | 'keyword' | 'hybrid'
    totalCandidates: number
    retrieved: number
    results: RetrievalResult[]
    hybridWeights?: { vector: number; keyword: number }
  }) {
    this.trace.steps = {
      ...this.trace.steps!,
      retrieval: data,
    }
  }

  recordReranking(data: {
    durationMs: number
    model: string
    before: RankItem[]
    after: RankItem[]
    filtered: string[]
  }) {
    this.trace.steps = {
      ...this.trace.steps!,
      reranking: data,
    }
  }

  recordPromptConstruction(data: {
    durationMs: number
    template: string
    systemPrompt: string
    contextChunks: ContextChunk[]
    fullPrompt: string
    tokenBreakdown: { system: number; context: number; query: number; total: number }
  }) {
    this.trace.steps = {
      ...this.trace.steps!,
      promptConstruction: data,
    }
  }

  recordGeneration(data: {
    durationMs: number
    model: string
    answer: string
    tokensUsed: { prompt: number; completion: number; total: number }
    sources: SourceRef[]
    estimatedCost: number
  }) {
    this.trace.steps = {
      ...this.trace.steps!,
      generation: data,
    }
  }

  recordEvaluation(data: {
    relevance: number
    faithfulness: number
    completeness: number
  }) {
    this.trace.evaluation = data
  }

  /**
   * Finalize and return the complete trace. Calculates total duration.
   */
  finalize(): RAGTrace {
    this.trace.totalDurationMs = Date.now() - this.startTime
    return this.trace as RAGTrace
  }

  /**
   * Return the partial trace (steps 1-5, before generation).
   * Used to send pre-stream trace data in response headers.
   */
  getPreStreamTrace(): Omit<RAGTrace, 'steps'> & {
    steps: Omit<RAGTrace['steps'], 'generation'>
  } {
    return {
      id: this.traceId,
      question: this.question,
      timestamp: this.trace.timestamp!,
      totalDurationMs: Date.now() - this.startTime,
      steps: {
        queryUnderstanding: this.trace.steps!.queryUnderstanding,
        embedding: this.trace.steps!.embedding,
        retrieval: this.trace.steps!.retrieval,
        reranking: this.trace.steps!.reranking,
        promptConstruction: this.trace.steps!.promptConstruction,
      } as RAGTrace['steps'],
    }
  }
}
