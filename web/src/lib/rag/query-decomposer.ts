import { generateText } from 'ai'
import { glmModel } from '@/lib/llm/glm'

export interface DecompositionResult {
  isComplex: boolean
  subQuestions: Array<{
    question: string
    dependsOn: number[]
  }>
  synthesisStrategy: 'merge' | 'compare' | 'sequential'
  durationMs: number
}

const DECOMPOSE_PROMPT = `你是一个问题分解专家。判断用户的问题是否是复合问题，如果是，将其分解为可独立回答的子问题。

请以 JSON 格式返回：
{
  "isComplex": true,
  "subQuestions": [
    { "question": "子问题1", "dependsOn": [] },
    { "question": "子问题2", "dependsOn": [0] }
  ],
  "synthesisStrategy": "merge"
}

规则：
- 简单的单一问题：isComplex=false，subQuestions 包含原问题即可
- 复合问题分解为 2-4 个子问题
- dependsOn 标注该子问题依赖哪些前置子问题的答案（用索引号）
- synthesisStrategy:
  - merge: 合并各子问题的答案（适用于多方面的问题）
  - compare: 对比分析（适用于对比类问题）
  - sequential: 按顺序串联（适用于因果链条类问题）

只输出 JSON，不要输出其他内容。`

export async function decomposeQuery(
  question: string
): Promise<DecompositionResult> {
  const start = Date.now()

  try {
    const { text } = await generateText({
      model: glmModel,
      system: DECOMPOSE_PROMPT,
      prompt: question,
      temperature: 0.1,
    })

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in decomposition response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    return {
      isComplex: !!parsed.isComplex,
      subQuestions: Array.isArray(parsed.subQuestions)
        ? parsed.subQuestions.map(
            (sq: { question?: string; dependsOn?: number[] }) => ({
              question: sq.question || question,
              dependsOn: Array.isArray(sq.dependsOn) ? sq.dependsOn : [],
            })
          )
        : [{ question, dependsOn: [] }],
      synthesisStrategy: ['merge', 'compare', 'sequential'].includes(
        parsed.synthesisStrategy
      )
        ? parsed.synthesisStrategy
        : 'merge',
      durationMs: Date.now() - start,
    }
  } catch {
    // Fallback: treat as simple question
    return {
      isComplex: false,
      subQuestions: [{ question, dependsOn: [] }],
      synthesisStrategy: 'merge',
      durationMs: Date.now() - start,
    }
  }
}

const SYNTHESIZE_PROMPT = `你是一个答案合成专家。将多个子问题的答案合成为一个完整、连贯的回答。

要求：
- 保留所有引用标注 [N]
- 去除重复内容
- 保持逻辑连贯
- 如果是对比类问题，明确列出异同点`

export async function synthesizeAnswers(
  originalQuestion: string,
  subAnswers: Array<{ question: string; answer: string }>,
  strategy: 'merge' | 'compare' | 'sequential'
): Promise<{ synthesized: string; durationMs: number }> {
  const start = Date.now()

  const subContent = subAnswers
    .map((sa, i) => `子问题 ${i + 1}：${sa.question}\n回答：${sa.answer}`)
    .join('\n\n---\n\n')

  const strategyHint =
    strategy === 'compare'
      ? '请以对比分析的方式合成答案，明确列出各方面的异同。'
      : strategy === 'sequential'
        ? '请按照因果逻辑顺序串联各个子回答。'
        : '请将各个子回答合并为一个完整的答案。'

  const { text } = await generateText({
    model: glmModel,
    system: `${SYNTHESIZE_PROMPT}\n\n${strategyHint}`,
    prompt: `原始问题：${originalQuestion}\n\n${subContent}`,
    maxOutputTokens: 1500,
  })

  return {
    synthesized: text.trim(),
    durationMs: Date.now() - start,
  }
}
