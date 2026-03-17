import { generateText } from 'ai'
import { glmModel } from '@/lib/llm/glm'

const EVAL_PROMPT = `你是一个 RAG 系统质量评估专家。请评估给定的问答结果质量。

你需要评估三个维度（每个维度 0-1 分，保留两位小数）：
1. relevance（相关性）：答案是否回答了用户的问题
2. faithfulness（忠实性）：答案是否忠实于参考文档，没有编造内容
3. completeness（完整性）：答案是否完整覆盖了问题的各个方面

请以 JSON 格式返回，例如：
{ "relevance": 0.85, "faithfulness": 0.90, "completeness": 0.75 }

只输出 JSON，不要输出其他内容。`

export async function evaluateAnswer(
  question: string,
  answer: string,
  context: string
): Promise<{
  relevance: number
  faithfulness: number
  completeness: number
}> {
  const userPrompt = `问题：${question}\n\n参考文档内容：\n${context}\n\n系统回答：\n${answer}`

  try {
    const { text } = await generateText({
      model: glmModel,
      system: EVAL_PROMPT,
      prompt: userPrompt,
    })

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON object found in evaluator response')
    }

    const result = JSON.parse(jsonMatch[0])
    return {
      relevance: Math.min(1, Math.max(0, Number(result.relevance) || 0)),
      faithfulness: Math.min(1, Math.max(0, Number(result.faithfulness) || 0)),
      completeness: Math.min(1, Math.max(0, Number(result.completeness) || 0)),
    }
  } catch {
    // Return neutral scores on failure
    return { relevance: 0.5, faithfulness: 0.5, completeness: 0.5 }
  }
}
