import { generateText } from 'ai'
import { kimiModel } from '@/lib/llm/kimi'

const MULTI_QUERY_PROMPT = `你是一个查询扩展专家。给定一个用户问题，请从不同角度生成 3-5 个变体查询，以提高知识库检索的召回率。

要求：
1. 每个变体应关注问题的不同方面或使用不同的表述方式
2. 包含同义词替换、上下位概念等
3. 保持与原始问题的语义一致性
4. 以 JSON 数组格式返回，例如：["查询1", "查询2", "查询3"]
5. 只输出 JSON 数组，不要输出其他内容`

export async function generateMultiQuery(
  question: string
): Promise<{ subQueries: string[]; durationMs: number }> {
  const start = Date.now()

  const { text } = await generateText({
    model: kimiModel,
    system: MULTI_QUERY_PROMPT,
    prompt: question,
  })

  let subQueries: string[]
  try {
    // Extract JSON array from the response, handling possible markdown code blocks
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('No JSON array found in LLM response')
    }
    subQueries = JSON.parse(jsonMatch[0])
    if (!Array.isArray(subQueries)) {
      throw new Error('Parsed result is not an array')
    }
    subQueries = subQueries.filter((q) => typeof q === 'string' && q.trim().length > 0)
  } catch {
    // Fallback: split by newlines if JSON parsing fails
    subQueries = text
      .split('\n')
      .map((line) => line.replace(/^\d+[.)\s]+/, '').trim())
      .filter((line) => line.length > 0)
  }

  return {
    subQueries,
    durationMs: Date.now() - start,
  }
}
