import { generateText } from 'ai'
import { glmModel } from '@/lib/llm/glm'

const CONTEXT_PROMPT = `你是一个文档分析专家。给定一篇完整文档和其中的一个文本片段，请用1-2句话简要描述该片段在整篇文档中的位置和主题。

要求：
1. 说明该片段属于文档的哪个部分或章节
2. 概括该片段讨论的核心主题
3. 只输出描述语句，不要输出其他内容
4. 使用中文回答`

/**
 * Generate a short context prefix for a chunk describing where it fits
 * within the overall document (Anthropic's Contextual Retrieval technique).
 */
export async function generateChunkContext(
  fullDocument: string,
  chunk: string
): Promise<string> {
  // Truncate the full document to first 6000 chars to stay within token limits
  const truncatedDoc = fullDocument.slice(0, 6000)

  const { text } = await generateText({
    model: glmModel,
    system: CONTEXT_PROMPT,
    prompt: `<文档>\n${truncatedDoc}\n</文档>\n\n<片段>\n${chunk}\n</片段>`,
    temperature: 0.1,
    maxOutputTokens: 150,
  })

  return text.trim()
}
