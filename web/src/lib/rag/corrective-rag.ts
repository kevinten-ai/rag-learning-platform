import { generateText } from 'ai'
import { arkModel } from '@/lib/llm/ark'
import type { RetrievalResult } from '@/types/rag'

export interface CRAGAssessment {
  decision: 'correct' | 'ambiguous' | 'incorrect'
  relevanceScore: number
  reasoning: string
  suggestedRefinement?: string
  filteredChunks: RetrievalResult[]
}

const CRAG_PROMPT = `你是一个检索质量评估专家。评估检索到的文档片段是否能充分回答用户问题。

请以 JSON 格式返回评估结果：
{
  "relevanceScore": 0.85,
  "decision": "correct",
  "reasoning": "检索结果包含了回答问题所需的关键信息",
  "suggestedRefinement": ""
}

评分标准：
- correct (relevanceScore > 0.7): 检索结果高度相关，可以直接用于生成回答
- ambiguous (relevanceScore 0.4-0.7): 部分相关，需要补充检索。请在 suggestedRefinement 中给出改进的查询语句
- incorrect (relevanceScore < 0.4): 检索结果与问题无关。请在 suggestedRefinement 中给出全新的查询语句

只输出 JSON，不要输出其他内容。`

export async function assessRetrieval(
  question: string,
  chunks: RetrievalResult[]
): Promise<CRAGAssessment> {
  const start = Date.now()

  const candidateList = chunks
    .map(
      (c, i) =>
        `[${i}] (score: ${c.score.toFixed(3)}) ${c.content.slice(0, 300)}`
    )
    .join('\n\n')

  try {
    const { text } = await generateText({
      model: arkModel,
      system: CRAG_PROMPT,
      prompt: `用户问题：${question}\n\n检索到 ${chunks.length} 个文档片段：\n${candidateList}`,
      temperature: 0.1,
    })

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in CRAG response')
    }

    const parsed = JSON.parse(jsonMatch[0])
    const relevanceScore = Math.min(1, Math.max(0, Number(parsed.relevanceScore) || 0))

    let decision: CRAGAssessment['decision']
    if (relevanceScore > 0.7) {
      decision = 'correct'
    } else if (relevanceScore >= 0.4) {
      decision = 'ambiguous'
    } else {
      decision = 'incorrect'
    }

    // Filter out low-relevance chunks for ambiguous/incorrect
    const filteredChunks =
      decision === 'correct'
        ? chunks
        : chunks.filter((c) => c.score > 0.3)

    return {
      decision,
      relevanceScore,
      reasoning: parsed.reasoning || '',
      suggestedRefinement: parsed.suggestedRefinement || undefined,
      filteredChunks,
    }
  } catch {
    // Fallback: assume correct if assessment fails
    return {
      decision: 'correct',
      relevanceScore: 0.7,
      reasoning: '评估失败，使用默认通过',
      filteredChunks: chunks,
    }
  }
}

export function getCRAGDuration(startMs: number): number {
  return Date.now() - startMs
}
