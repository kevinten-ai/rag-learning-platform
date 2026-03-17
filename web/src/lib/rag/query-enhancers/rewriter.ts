import { generateText } from 'ai'
import { glmModel } from '@/lib/llm/glm'

const REWRITE_PROMPT = `你是一个查询优化专家。请将用户的原始问题改写为更适合知识库检索的查询语句。

改写要求：
1. 保留原始问题的核心意图
2. 补充可能的同义词或相关术语
3. 使语句更加明确和具体
4. 去除口语化表达，使用更规范的描述
5. 只输出改写后的查询语句，不要输出其他内容`

export async function rewriteQuery(
  question: string
): Promise<{ rewritten: string; durationMs: number }> {
  const start = Date.now()

  const { text } = await generateText({
    model: glmModel,
    system: REWRITE_PROMPT,
    prompt: question,
  })

  return {
    rewritten: text.trim(),
    durationMs: Date.now() - start,
  }
}
