import type { RetrievalResult, ContextChunk, RankItem } from '@/types/rag'

const SYSTEM_TEMPLATE = `你是一个基于知识库的问答助手。根据提供的参考资料回答用户问题。

要求：
1. 必须在回答中使用 [1]、[2] 等标注引用了哪些参考资料
2. 每个关键论点都必须有引用标注
3. 如果参考资料不足以回答问题，明确说明
4. 保持回答准确、简洁、有理有据
5. 如果问题涉及多个方面，请分点回答`

/**
 * Construct the prompt for the LLM generation step.
 * Assembles the system prompt, context chunks from retrieval,
 * and the user's query into a final prompt string.
 */
export function constructPrompt(
  question: string,
  retrievalResults: RetrievalResult[],
  rerankedItems?: RankItem[]
): {
  systemPrompt: string
  userPrompt: string
  fullPrompt: string
  contextChunks: ContextChunk[]
  tokenBreakdown: { system: number; context: number; query: number; total: number }
  durationMs: number
} {
  const start = Date.now()

  // Determine which results to use: reranked order if available, otherwise original
  let orderedResults: RetrievalResult[]
  if (rerankedItems && rerankedItems.length > 0) {
    const resultMap = new Map(retrievalResults.map((r) => [r.chunkId, r]))
    orderedResults = rerankedItems
      .map((item) => resultMap.get(item.chunkId))
      .filter((r): r is RetrievalResult => r !== undefined)
  } else {
    orderedResults = retrievalResults
  }

  // Build context chunks
  const contextChunks: ContextChunk[] = orderedResults.map((r) => ({
    chunkId: r.chunkId,
    content: r.content,
    source: r.documentTitle || '未知来源',
  }))

  // Build the context section of the prompt
  // Number each chunk with [1], [2], etc. so the model can cite them
  const contextSection = contextChunks
    .map(
      (chunk, i) =>
        `[${i + 1}]（来源：${chunk.source}）\n${chunk.content}`
    )
    .join('\n\n')

  const systemPrompt = SYSTEM_TEMPLATE
  const userPrompt = `参考文档：\n${contextSection}\n\n用户问题：${question}`
  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`

  // Rough token estimation (Chinese: ~1.5 tokens/char, English: ~0.25 tokens/word)
  const estimateTokens = (text: string) => Math.ceil(text.length * 0.7)

  const systemTokens = estimateTokens(systemPrompt)
  const contextTokens = estimateTokens(contextSection)
  const queryTokens = estimateTokens(question)

  return {
    systemPrompt,
    userPrompt,
    fullPrompt,
    contextChunks,
    tokenBreakdown: {
      system: systemTokens,
      context: contextTokens,
      query: queryTokens,
      total: systemTokens + contextTokens + queryTokens,
    },
    durationMs: Date.now() - start,
  }
}
