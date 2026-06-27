export function parseJsonObject<T>(content: string): T {
  const normalized = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')

  try {
    return JSON.parse(normalized) as T
  } catch {
    const match = normalized.match(/\{[\s\S]*\}/)
    if (!match) {
      throw new Error('Model response did not include a JSON object')
    }
    return JSON.parse(match[0]) as T
  }
}
