import { generateText } from 'ai'
import { arkModel } from '@/lib/llm/ark'

export interface SelfRAGReflection {
  paragraph: string
  isRelevant: boolean
  isSupported: boolean
  isComplete: boolean
  needsMoreRetrieval: boolean
  critique: string
}

export interface SelfRAGResult {
  answer: string
  reflections: SelfRAGReflection[]
  additionalRetrievals: number
  wasRevised: boolean
  durationMs: number
}

const REFLECTION_PROMPT = `你是一个回答质量审查专家。评估生成的回答段落质量。

请以 JSON 格式返回：
{
  "isRelevant": true,
  "isSupported": true,
  "isComplete": false,
  "needsMoreRetrieval": true,
  "critique": "该段落缺少关于XX的具体数据",
  "refinedQuery": "XX的具体数据和统计"
}

评估标准：
- isRelevant: 该段落是否与用户问题相关
- isSupported: 该段落内容是否有参考资料支持（非编造）
- isComplete: 该段落是否充分回答了它涉及的方面
- needsMoreRetrieval: 是否需要检索更多资料来补充
- critique: 简要说明存在的问题
- refinedQuery: 如果 needsMoreRetrieval 为 true，给出补充检索的查询语句

只输出 JSON，不要输出其他内容。`

export async function selfRAGGenerate(
  question: string,
  chunks: Array<{ content: string; chunkId?: string }>,
  retrieveFn: (query: string) => Promise<Array<{ content: string }>>,
): Promise<SelfRAGResult> {
  const start = Date.now()

  // Build numbered context
  const context = chunks
    .map((c, i) => `[${i + 1}] ${c.content}`)
    .join('\n\n')

  let allContext = context
  let additionalRetrievals = 0
  const reflections: SelfRAGReflection[] = []

  // Step 1: Generate initial answer
  const { text: initialAnswer } = await generateText({
    model: arkModel,
    system: `根据参考资料回答问题。使用 [N] 标注引用来源。保持准确、简洁。\n\n参考资料：\n${allContext}`,
    prompt: question,
    maxOutputTokens: 1000,
  })

  // Step 2: Split into paragraphs and reflect
  const paragraphs = initialAnswer
    .split('\n\n')
    .filter((p) => p.trim().length > 20)

  for (const paragraph of paragraphs) {
    try {
      const { text } = await generateText({
        model: arkModel,
        system: REFLECTION_PROMPT,
        prompt: `问题：${question}\n\n参考资料（前3000字）：\n${allContext.slice(0, 3000)}\n\n待评估段落：\n${paragraph}`,
        temperature: 0.1,
      })

      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        reflections.push({
          paragraph,
          isRelevant: true,
          isSupported: true,
          isComplete: true,
          needsMoreRetrieval: false,
          critique: '',
        })
        continue
      }

      const parsed = JSON.parse(jsonMatch[0])
      reflections.push({
        paragraph,
        isRelevant: !!parsed.isRelevant,
        isSupported: !!parsed.isSupported,
        isComplete: !!parsed.isComplete,
        needsMoreRetrieval: !!parsed.needsMoreRetrieval,
        critique: parsed.critique || '',
      })

      // If needs more retrieval, fetch additional context (max 2 rounds)
      if (parsed.needsMoreRetrieval && parsed.refinedQuery && additionalRetrievals < 2) {
        const moreChunks = await retrieveFn(parsed.refinedQuery)
        if (moreChunks.length > 0) {
          const newContext = moreChunks
            .map((c, i) => `[${chunks.length + additionalRetrievals * 3 + i + 1}] ${c.content}`)
            .join('\n\n')
          allContext += '\n\n' + newContext
          additionalRetrievals++
        }
      }
    } catch {
      reflections.push({
        paragraph,
        isRelevant: true,
        isSupported: true,
        isComplete: true,
        needsMoreRetrieval: false,
        critique: '',
      })
    }
  }

  // Step 3: If any paragraph was not supported, regenerate
  const hasIssues = reflections.some(
    (r) => !r.isSupported || !r.isRelevant
  )

  if (hasIssues && additionalRetrievals > 0) {
    const critiques = reflections
      .filter((r) => !r.isSupported || !r.isRelevant)
      .map((r) => r.critique)
      .filter(Boolean)
      .join('; ')

    const { text: revisedAnswer } = await generateText({
      model: arkModel,
      system: `根据参考资料重新回答问题。之前的回答存在以下问题：${critiques}。请修正这些问题。使用 [N] 标注引用来源。\n\n参考资料：\n${allContext}`,
      prompt: question,
      maxOutputTokens: 1000,
    })

    return {
      answer: revisedAnswer,
      reflections,
      additionalRetrievals,
      wasRevised: true,
      durationMs: Date.now() - start,
    }
  }

  return {
    answer: initialAnswer,
    reflections,
    additionalRetrievals,
    wasRevised: false,
    durationMs: Date.now() - start,
  }
}
