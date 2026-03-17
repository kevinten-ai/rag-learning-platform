import { generateText } from 'ai'
import { kimiModel } from '@/lib/llm/kimi'
import type { RetrievalResult, RankItem } from '@/types/rag'

const RERANK_PROMPT = `你是一个文档相关性排序专家。给定一个用户问题和一组候选文档片段，请根据与问题的相关性对它们进行排序。

请以 JSON 格式返回排序结果，格式为：
{
  "rankings": [
    { "index": 0, "score": 95 },
    { "index": 2, "score": 80 },
    ...
  ],
  "filtered": [1, 4]
}

其中：
- rankings: 按相关性从高到低排列的文档索引和分数(0-100)
- filtered: 与问题完全不相关的文档索引列表
- 只输出 JSON，不要输出其他内容`

interface RerankOutput {
  rankings: Array<{ index: number; score: number }>
  filtered: number[]
}

export async function rerankResults(
  question: string,
  results: RetrievalResult[],
  topK: number = 5
): Promise<{
  before: RankItem[]
  after: RankItem[]
  filtered: string[]
  durationMs: number
}> {
  const start = Date.now()

  // Record the "before" state
  const before: RankItem[] = results.map((r, i) => ({
    chunkId: r.chunkId,
    score: r.score,
    rank: i + 1,
  }))

  // Build the prompt with numbered candidate chunks
  const candidateList = results
    .map((r, i) => `[文档 ${i}]\n${r.content.slice(0, 500)}`)
    .join('\n\n')

  const userPrompt = `用户问题：${question}\n\n候选文档片段：\n${candidateList}`

  const { text } = await generateText({
    model: kimiModel,
    system: RERANK_PROMPT,
    prompt: userPrompt,
  })

  // Parse the LLM response
  let rerankOutput: RerankOutput
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON object found in reranker response')
    }
    rerankOutput = JSON.parse(jsonMatch[0])
  } catch {
    // Fallback: return original ordering if parsing fails
    return {
      before,
      after: before.slice(0, topK),
      filtered: [],
      durationMs: Date.now() - start,
    }
  }

  // Build the "after" state from LLM rankings
  const filteredIndices = new Set(rerankOutput.filtered ?? [])
  const filteredChunkIds: string[] = []

  for (const idx of filteredIndices) {
    if (idx >= 0 && idx < results.length) {
      filteredChunkIds.push(results[idx].chunkId)
    }
  }

  const after: RankItem[] = (rerankOutput.rankings ?? [])
    .filter(
      (r) =>
        r.index >= 0 &&
        r.index < results.length &&
        !filteredIndices.has(r.index)
    )
    .slice(0, topK)
    .map((r, i) => ({
      chunkId: results[r.index].chunkId,
      score: r.score / 100, // Normalize to 0-1
      rank: i + 1,
    }))

  return {
    before,
    after,
    filtered: filteredChunkIds,
    durationMs: Date.now() - start,
  }
}
