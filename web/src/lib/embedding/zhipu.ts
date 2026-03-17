const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/embeddings'

interface EmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>
  usage: { prompt_tokens: number; total_tokens: number }
}

export async function generateEmbedding(
  text: string,
  dimensions: number = 1024
): Promise<{ embedding: number[]; tokensUsed: number }> {
  const response = await fetch(ZHIPU_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'embedding-3',
      input: text,
      dimensions,
    }),
  })

  if (!response.ok) {
    throw new Error(`Zhipu embedding API error: ${response.status}`)
  }

  const data: EmbeddingResponse = await response.json()

  if (!data.data || data.data.length === 0 || !data.data[0]) {
    throw new Error(
      'Zhipu embedding API returned an empty or invalid data array — no embedding was produced for the given input'
    )
  }

  return {
    embedding: data.data[0].embedding,
    tokensUsed: data.usage.total_tokens,
  }
}

export async function batchGenerateEmbeddings(
  texts: string[],
  dimensions: number = 1024,
  batchSize: number = 16
): Promise<Array<{ embedding: number[]; tokensUsed: number }>> {
  const results: Array<{ embedding: number[]; tokensUsed: number }> = []

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map((text) => generateEmbedding(text, dimensions))
    )
    results.push(...batchResults)
  }

  return results
}

interface BatchEmbeddingResult {
  embeddings: Array<{ embedding: number[]; tokensUsed: number; durationMs: number }>;
  totalTokensUsed: number;
  totalDurationMs: number;
}

export async function batchGenerateEmbeddingsWithStats(
  texts: string[],
  dimensions: number = 1024,
  batchSize: number = 16
): Promise<BatchEmbeddingResult> {
  const overallStart = Date.now()
  const embeddings: Array<{ embedding: number[]; tokensUsed: number; durationMs: number }> = []

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(async (text) => {
        const itemStart = Date.now()
        const result = await generateEmbedding(text, dimensions)
        const durationMs = Date.now() - itemStart
        return {
          embedding: result.embedding,
          tokensUsed: result.tokensUsed,
          durationMs,
        }
      })
    )
    embeddings.push(...batchResults)
  }

  const totalDurationMs = Date.now() - overallStart
  const totalTokensUsed = embeddings.reduce((sum, e) => sum + e.tokensUsed, 0)

  return {
    embeddings,
    totalTokensUsed,
    totalDurationMs,
  }
}
