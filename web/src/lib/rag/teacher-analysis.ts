import { streamText, generateText } from 'ai'
import { arkTeacherModel } from '@/lib/llm/ark'
import type { RAGTrace } from '@/types/rag'

/**
 * Ark teacher analysis module.
 *
 * Uses the configured Ark teacher model to provide educational explanations
 * of the RAG pipeline results, helping users understand:
 * - Why certain retrieval results were chosen
 * - How reranking changed the ordering
 * - Whether the answer quality is good and why
 * - What could be improved in the pipeline configuration
 */

const STEP_EXPLANATION_PROMPT = `你是一位 RAG（检索增强生成）技术教学专家。你正在帮助用户理解一个 RAG 系统的运行过程。

你的任务是分析 RAG 管道某一步骤的执行数据，并给出教学性的解释。

要求：
1. 用通俗易懂的语言解释这一步做了什么
2. 分析结果是否理想，为什么
3. 给出具体的优化建议
4. 使用类比或示例帮助理解
5. 控制在 200 字以内
6. 使用中文`

const FULL_ANALYSIS_PROMPT = `你是一位 RAG（检索增强生成）技术教学专家。你正在帮助用户全面理解一次 RAG 查询的完整过程。

请分析这次查询的完整 trace 数据，给出结构化的教学分析报告。

分析维度：
1. 🔄 **管道总览**：这次查询经历了哪些步骤？整体耗时如何？
2. 🎯 **检索质量**：检索到的文档是否与问题相关？相似度分数分布如何？
3. 🔀 **策略选择**：使用了哪些增强策略（改写/HyDE/多路查询）？是否合适？
4. 📊 **重排序效果**：重排序前后的变化说明了什么？
5. ✅ **答案质量**：评估分数如何？忠实度和完整性是否达标？
6. 💡 **优化建议**：如果要提升这次查询的效果，应该调整哪些参数？

要求：
- 用通俗易懂的语言，适合 RAG 初学者阅读
- 结合具体数据（分数、耗时、块数等）进行分析
- 每个维度 2-3 句话
- 使用中文`

export type StepKey =
  | 'queryRouting'
  | 'queryUnderstanding'
  | 'embedding'
  | 'retrieval'
  | 'crag'
  | 'reranking'
  | 'promptConstruction'
  | 'generation'
  | 'selfRag'
  | 'evaluation'

const STEP_NAMES: Record<StepKey, string> = {
  queryRouting: '查询路由',
  queryUnderstanding: '查询增强',
  embedding: '向量嵌入',
  retrieval: '文档检索',
  crag: 'CRAG 校正检索',
  reranking: '重排序',
  promptConstruction: 'Prompt 构造',
  generation: 'LLM 生成',
  selfRag: 'Self-RAG 反思',
  evaluation: '质量评估',
}

/**
 * Generate an educational explanation for a specific pipeline step.
 */
export async function explainStep(
  stepKey: StepKey,
  stepData: unknown,
  question: string
): Promise<string> {
  const stepName = STEP_NAMES[stepKey] || stepKey

  const { text } = await generateText({
    model: arkTeacherModel,
    system: STEP_EXPLANATION_PROMPT,
    prompt: `步骤名称：${stepName}\n\n用户问题：${question}\n\n步骤执行数据：\n${JSON.stringify(stepData, null, 2).slice(0, 3000)}`,
    temperature: 0.3,
    maxOutputTokens: 400,
  })

  return text.trim()
}

/**
 * Stream a full educational analysis of a complete RAG trace.
 */
export function streamFullAnalysis(trace: RAGTrace) {
  const traceJson = JSON.stringify(trace, null, 2).slice(0, 8000)

  return streamText({
    model: arkTeacherModel,
    system: FULL_ANALYSIS_PROMPT,
    prompt: `用户问题：${trace.question}\n\n完整 Trace 数据：\n${traceJson}`,
    temperature: 0.3,
    maxOutputTokens: 1200,
  })
}

/**
 * Generate a comparison analysis between two RAG configurations.
 */
export async function compareConfigs(
  question: string,
  configA: { name: string; metrics: Record<string, number> },
  configB: { name: string; metrics: Record<string, number> }
): Promise<string> {
  const { text } = await generateText({
    model: arkTeacherModel,
    system: `你是一位 RAG 技术教学专家。对比两组 RAG 配置的性能指标，用通俗语言解释差异原因和最佳选择。使用中文，控制在 300 字以内。`,
    prompt: `问题：${question}\n\n配置 A（${configA.name}）：\n${JSON.stringify(configA.metrics, null, 2)}\n\n配置 B（${configB.name}）：\n${JSON.stringify(configB.metrics, null, 2)}`,
    temperature: 0.3,
    maxOutputTokens: 500,
  })

  return text.trim()
}
