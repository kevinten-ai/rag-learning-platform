import { generateText } from 'ai'
import { glmModel } from '@/lib/llm/glm'

const HYDE_PROMPT = `你是一个知识库文档生成专家。给定一个用户问题，请生成一段假设性的知识库文档段落，这段内容应该是回答该问题时最可能在知识库中找到的原始文档片段。

要求：
1. 生成的内容应像真实的知识库文档，包含具体的技术细节和描述
2. 使用专业且客观的语言风格
3. 长度控制在 150-300 字
4. 只输出文档段落，不要输出其他解释性内容`

export async function generateHyDE(
  question: string
): Promise<{ hydeDocument: string; durationMs: number }> {
  const start = Date.now()

  const { text } = await generateText({
    model: glmModel,
    system: HYDE_PROMPT,
    prompt: question,
  })

  return {
    hydeDocument: text.trim(),
    durationMs: Date.now() - start,
  }
}
