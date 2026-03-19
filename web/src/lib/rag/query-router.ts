import { generateObject } from 'ai'
import { glmModel } from '@/lib/llm/glm'
import { z } from 'zod'

const RouteSchema = z.object({
  type: z.enum(['simple', 'analytical', 'comparison', 'no_rag']),
  reasoning: z.string(),
  suggestedEnhancers: z.array(z.string()),
  suggestedRetrieval: z.enum(['semantic', 'keyword', 'hybrid']),
  suggestedTopK: z.number(),
  needsReranking: z.boolean(),
})

export type QueryRoute = z.infer<typeof RouteSchema>

export async function routeQuery(question: string): Promise<QueryRoute> {
  const { object } = await generateObject({
    model: glmModel,
    schema: RouteSchema,
    system: `你是一个RAG查询路由专家。根据用户问题的类型和复杂度，决定最优的检索策略。

规则：
- simple（简单事实查询）：直接语义检索，top_k=3，不需要增强器，不需要重排序
  示例：XX是什么？XX的定义？
- analytical（分析性问题）：需要hyde增强，top_k=8，需要重排序
  示例：为什么XX会导致YY？XX的原理是什么？
- comparison（对比性问题）：需要multi-query展开，hybrid检索，top_k=10，需要重排序
  示例：XX和YY有什么区别？对比XX与YY的优缺点
- no_rag（不需要检索）：闲聊、数学计算等不需要外部知识的问题
  示例：你好、1+1等于几、今天天气怎么样

suggestedEnhancers 可选值：rewrite, hyde, multi-query`,
    prompt: `用户问题：${question}`,
    temperature: 0.1,
    maxOutputTokens: 200,
  })
  return object
}
