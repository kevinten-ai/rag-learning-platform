import { createMoonshotAI } from '@ai-sdk/moonshotai'

export const kimi = createMoonshotAI({
  apiKey: process.env.MOONSHOT_API_KEY,
})

export const kimiModel = kimi('moonshot-v1-128k')
