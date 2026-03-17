import { createZhipu } from 'zhipu-ai-provider'

export const zhipu = createZhipu({
  apiKey: process.env.GLM_API_KEY,
})

export const glmModel = zhipu(process.env.GLM_MODEL || 'glm-4-flash')
