export interface CitationPart {
  type: 'text' | 'citation'
  content: string
  index?: number // 1-based index for citations
}

/**
 * Parse citation markers like [1], [2], etc. from text.
 * Splits the text into an array of text segments and citation segments.
 */
export function parseCitations(text: string): CitationPart[] {
  const parts: CitationPart[] = []
  // Match [N] where N is one or more digits
  const citationRegex = /\[(\d+)\]/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = citationRegex.exec(text)) !== null) {
    // Add preceding text if any
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      })
    }

    // Add the citation
    const citationIndex = parseInt(match[1], 10)
    parts.push({
      type: 'citation',
      content: match[0],
      index: citationIndex,
    })

    lastIndex = match.index + match[0].length
  }

  // Add any remaining text after the last citation
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex),
    })
  }

  return parts
}
