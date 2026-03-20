import { createZhipu } from 'zhipu-ai-provider'

export const zhipu = createZhipu({
  apiKey: process.env.GLM_API_KEY,
})

/** Fast model for pipeline steps (embedding, routing, reranking, etc.) */
export const glmModel = zhipu(process.env.GLM_MODEL || 'glm-4-flash')

/** Teacher model (GLM-5) for educational analysis and explanations */
export const glmTeacherModel = zhipu(process.env.GLM_TEACHER_MODEL || 'glm-5')
