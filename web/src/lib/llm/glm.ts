import { createZhipu } from 'zhipu-ai-provider'

export const zhipu = createZhipu({
  apiKey: process.env.ZHIPU_API_KEY,
})

export const glmModel = zhipu('glm-4-flash')
