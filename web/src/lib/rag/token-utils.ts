/**
 * Approximate token counting without WASM dependency.
 * For Chinese text: ~1.5 tokens per character.
 * For English text: ~0.75 tokens per word (~4 chars per token).
 * This is sufficient for a learning demo; production would use tiktoken.
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;

  let tokens = 0;
  for (const char of text) {
    if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(char)) {
      // CJK characters: ~1.5 tokens each
      tokens += 1.5;
    } else if (/\s/.test(char)) {
      // Whitespace: ~0.25 tokens
      tokens += 0.25;
    } else {
      // Latin/other: ~0.25 tokens per char (roughly 4 chars per token)
      tokens += 0.25;
    }
  }

  return Math.ceil(tokens);
}

/**
 * Split text into approximately equal token-sized chunks.
 * Returns array of { text, tokenCount } objects.
 */
export function splitByTokens(
  text: string,
  chunkSize: number,
  chunkOverlap: number
): Array<{ text: string; tokenCount: number }> {
  if (!text) return [];

  const totalTokens = estimateTokenCount(text);
  if (totalTokens <= chunkSize) {
    return [{ text, tokenCount: totalTokens }];
  }

  // Estimate chars per token ratio for this specific text
  const charsPerToken = text.length / totalTokens;
  const chunkChars = Math.floor(chunkSize * charsPerToken);
  const overlapChars = Math.floor(chunkOverlap * charsPerToken);
  const step = Math.max(1, chunkChars - overlapChars);

  const results: Array<{ text: string; tokenCount: number }> = [];

  for (let start = 0; start < text.length; start += step) {
    const end = Math.min(start + chunkChars, text.length);
    const chunk = text.slice(start, end);
    results.push({ text: chunk, tokenCount: estimateTokenCount(chunk) });
    if (end >= text.length) break;
  }

  return results;
}
