/**
 * Feishu Document Block Parser
 *
 * Converts feishu docx API block responses into Markdown and structured
 * metadata suitable for the RAG learning demo. Based on the reference
 * implementation in feishu-processor.js but enhanced with full block type
 * coverage and structural analysis.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ParsedDocument {
  markdown: string;
  structure: {
    headings: Array<{ level: number; text: string; position: number }>;
  };
  elements: Array<{
    type: 'heading' | 'paragraph' | 'code' | 'list' | 'table' | 'quote' | 'divider';
    content: string;
    position: number;
  }>;
  stats: {
    totalChars: number;
    headingCount: number;
    paragraphCount: number;
    codeBlockCount: number;
    listCount: number;
  };
}

// ---------------------------------------------------------------------------
// Feishu block_type numeric constants
// See: https://open.feishu.cn/document/server-docs/docs/docs/docx-v1/document-block/batch_update
// ---------------------------------------------------------------------------

const BlockType = {
  PAGE: 1,
  TEXT: 2,
  HEADING1: 3,
  HEADING2: 4,
  HEADING3: 5,
  HEADING4: 6,
  HEADING5: 7,
  HEADING6: 8,
  HEADING7: 9,
  HEADING8: 10,
  HEADING9: 11,
  BULLET: 12,
  ORDERED: 13,
  CODE: 14,
  QUOTE: 15,
  TODO: 17,
  BITABLE: 18,
  CALLOUT: 19,
  CHAT_CARD: 20,
  DIAGRAM: 21,
  DIVIDER: 22,
  FILE: 23,
  GRID: 24,
  GRID_COLUMN: 25,
  IFRAME: 26,
  IMAGE: 27,
  ISV: 28,
  MINDNOTE: 29,
  SHEET: 30,
  TABLE: 31,
  TABLE_CELL: 32,
  VIEW: 33,
  QUOTE_CONTAINER: 34,
  TASK: 35,
  OKR: 36,
  WIKI_CATALOG: 40,
} as const;

// Mapping from language code number to language name for code blocks.
// The feishu API returns a numeric language identifier in code block style.
const CODE_LANGUAGES: Record<number, string> = {
  1: 'plaintext',
  2: 'abap',
  3: 'ada',
  4: 'apache',
  5: 'apex',
  6: 'assembly',
  7: 'bash',
  8: 'csharp',
  9: 'cpp',
  10: 'c',
  11: 'cobol',
  12: 'css',
  13: 'coffeescript',
  14: 'd',
  15: 'dart',
  16: 'delphi',
  17: 'django',
  18: 'dockerfile',
  19: 'erlang',
  20: 'fortran',
  21: 'foxpro',
  22: 'go',
  23: 'groovy',
  24: 'html',
  25: 'htmlbars',
  26: 'http',
  27: 'haskell',
  28: 'json',
  29: 'java',
  30: 'javascript',
  31: 'julia',
  32: 'kotlin',
  33: 'latex',
  34: 'lisp',
  35: 'logo',
  36: 'lua',
  37: 'matlab',
  38: 'makefile',
  39: 'markdown',
  40: 'nginx',
  41: 'objective-c',
  42: 'openedgeabl',
  43: 'perl',
  44: 'php',
  45: 'plsql',
  46: 'protobuf',
  47: 'python',
  48: 'r',
  49: 'rpm',
  50: 'ruby',
  51: 'rust',
  52: 'sas',
  53: 'sass',
  54: 'scala',
  55: 'scheme',
  56: 'scss',
  57: 'shell',
  58: 'sql',
  59: 'swift',
  60: 'thrift',
  61: 'typescript',
  62: 'vbscript',
  63: 'visual-basic',
  64: 'xml',
  65: 'yaml',
  66: 'cmake',
  67: 'diff',
  68: 'gams',
  69: 'gauss',
  70: 'glsl',
  71: 'graphql',
  72: 'julia-repl',
  73: 'lasso',
  74: 'less',
  75: 'zig',
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Text element shape used across page / text / heading / bullet / ordered / code blocks.
 */
interface TextElement {
  text_run?: {
    content: string;
    text_element_style?: {
      bold?: boolean;
      italic?: boolean;
      strikethrough?: boolean;
      underline?: boolean;
      inline_code?: boolean;
      link?: { url: string };
    };
  };
  mention_doc?: {
    title?: string;
    url?: string;
  };
  equation?: {
    content: string;
  };
}

/**
 * Minimal block shape we care about. The real SDK type is enormous so we use
 * a loose definition here and access properties defensively.
 */
interface FeishuBlock {
  block_id?: string;
  parent_id?: string;
  block_type: number;
  children?: string[];
  // Text-bearing blocks share the same element structure but live under
  // different property names (text, heading1, bullet, ordered, code, etc.)
  [key: string]: unknown;
}

/**
 * Extract the text elements array from a block, regardless of which property
 * holds it (text, heading1..heading9, bullet, ordered, code, etc.)
 */
function getBlockElements(block: FeishuBlock): TextElement[] | null {
  const { block_type } = block;

  // Determine the property name based on block_type
  const propName = getBlockPropertyName(block_type);
  if (!propName) return null;

  const data = block[propName] as { elements?: TextElement[] } | undefined;
  return data?.elements ?? null;
}

/**
 * Map block_type number to the property name on the block object.
 */
function getBlockPropertyName(blockType: number): string | null {
  switch (blockType) {
    case BlockType.PAGE:
      return 'page';
    case BlockType.TEXT:
      return 'text';
    case BlockType.HEADING1:
      return 'heading1';
    case BlockType.HEADING2:
      return 'heading2';
    case BlockType.HEADING3:
      return 'heading3';
    case BlockType.HEADING4:
      return 'heading4';
    case BlockType.HEADING5:
      return 'heading5';
    case BlockType.HEADING6:
      return 'heading6';
    case BlockType.HEADING7:
      return 'heading7';
    case BlockType.HEADING8:
      return 'heading8';
    case BlockType.HEADING9:
      return 'heading9';
    case BlockType.BULLET:
      return 'bullet';
    case BlockType.ORDERED:
      return 'ordered';
    case BlockType.CODE:
      return 'code';
    default:
      return null;
  }
}

/**
 * Convert an array of text elements into a plain-text string, applying
 * inline Markdown formatting where appropriate.
 */
function renderElements(elements: TextElement[]): string {
  return elements
    .map((el) => {
      if (el.text_run) {
        let text = el.text_run.content;
        const style = el.text_run.text_element_style;

        if (style) {
          if (style.inline_code) {
            text = `\`${text}\``;
          } else {
            if (style.bold) text = `**${text}**`;
            if (style.italic) text = `*${text}*`;
            if (style.strikethrough) text = `~~${text}~~`;
          }

          if (style.link?.url) {
            const decodedUrl = tryDecodeUrl(style.link.url);
            text = `[${text}](${decodedUrl})`;
          }
        }

        return text;
      }

      if (el.mention_doc) {
        const title = el.mention_doc.title || 'link';
        const url = el.mention_doc.url || '';
        return url ? `[${title}](${url})` : title;
      }

      if (el.equation) {
        return `$${el.equation.content}$`;
      }

      return '';
    })
    .join('');
}

/**
 * Attempt to decode a URL that may be percent-encoded. If decoding fails
 * (malformed URI), return the original string.
 */
function tryDecodeUrl(url: string): string {
  try {
    return decodeURIComponent(url);
  } catch {
    return url;
  }
}

/**
 * Get the heading level (1-9) from a block_type number.
 * Returns null if the block is not a heading.
 */
function getHeadingLevel(blockType: number): number | null {
  if (blockType >= BlockType.HEADING1 && blockType <= BlockType.HEADING9) {
    return blockType - BlockType.HEADING1 + 1;
  }
  return null;
}

/**
 * Resolve the language string for a code block.
 */
function resolveCodeLanguage(block: FeishuBlock): string {
  const code = block.code as { style?: { language?: number } } | undefined;
  const langCode = code?.style?.language;
  if (langCode != null && CODE_LANGUAGES[langCode]) {
    return CODE_LANGUAGES[langCode];
  }
  return '';
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

/**
 * Parse an array of feishu document blocks (from the docx API
 * `documentBlock.list` response) into Markdown text plus structured metadata.
 *
 * @param blocks - The `items` / `blocks` array from the feishu docx block list response
 * @returns A ParsedDocument with markdown, structure, elements, and stats
 *
 * @example
 * ```ts
 * const res = await getDocumentContent(docId);
 * const parsed = parseFeishuBlocks(res.data?.items ?? []);
 * console.log(parsed.markdown);
 * ```
 */
export function parseFeishuBlocks(blocks: FeishuBlock[]): ParsedDocument {
  if (!blocks || !Array.isArray(blocks)) {
    return emptyDocument();
  }

  // Build a map from block_id -> block for child lookups (tables, callouts, etc.)
  const blockMap = new Map<string, FeishuBlock>();
  for (const block of blocks) {
    if (block.block_id) {
      blockMap.set(block.block_id, block);
    }
  }

  const markdownLines: string[] = [];
  const headings: ParsedDocument['structure']['headings'] = [];
  const elements: ParsedDocument['elements'] = [];
  const stats = {
    totalChars: 0,
    headingCount: 0,
    paragraphCount: 0,
    codeBlockCount: 0,
    listCount: 0,
  };

  let position = 0;

  for (const block of blocks) {
    const result = convertBlock(block, blockMap);
    if (result === null) continue;

    const { md, elementType, headingLevel } = result;

    markdownLines.push(md);

    // Track element
    const plainText = md.replace(/^#+\s*/, '').replace(/^[-*>\d.]+\s*/, '').trim();

    if (elementType) {
      elements.push({
        type: elementType,
        content: plainText,
        position,
      });
    }

    // Track headings
    if (headingLevel != null) {
      headings.push({
        level: headingLevel,
        text: plainText,
        position,
      });
      stats.headingCount++;
    }

    // Track stats
    switch (elementType) {
      case 'paragraph':
        stats.paragraphCount++;
        break;
      case 'code':
        stats.codeBlockCount++;
        break;
      case 'list':
        stats.listCount++;
        break;
    }

    position++;
  }

  const markdown = markdownLines.join('\n\n');
  stats.totalChars = markdown.length;

  return { markdown, structure: { headings }, elements, stats };
}

// ---------------------------------------------------------------------------
// Block conversion
// ---------------------------------------------------------------------------

interface ConvertResult {
  md: string;
  elementType: ParsedDocument['elements'][number]['type'] | null;
  headingLevel: number | null;
}

/**
 * Convert a single block to its Markdown representation.
 * Returns null for blocks we intentionally skip (page, grid_column, table_cell, etc.)
 */
function convertBlock(
  block: FeishuBlock,
  blockMap: Map<string, FeishuBlock>
): ConvertResult | null {
  const { block_type } = block;

  // ---- Page block (root container) -- skip ----
  if (block_type === BlockType.PAGE) {
    return null;
  }

  // ---- Text / paragraph ----
  if (block_type === BlockType.TEXT) {
    const text = extractText(block);
    if (!text) return null;
    return { md: text, elementType: 'paragraph', headingLevel: null };
  }

  // ---- Headings ----
  const headingLevel = getHeadingLevel(block_type);
  if (headingLevel !== null) {
    const text = extractText(block);
    const prefix = '#'.repeat(headingLevel);
    return { md: `${prefix} ${text}`, elementType: 'heading', headingLevel };
  }

  // ---- Bullet list ----
  if (block_type === BlockType.BULLET) {
    const text = extractText(block);
    return { md: `- ${text}`, elementType: 'list', headingLevel: null };
  }

  // ---- Ordered list ----
  if (block_type === BlockType.ORDERED) {
    const ordered = block.ordered as { style?: { sequence?: string } } | undefined;
    const seq = ordered?.style?.sequence || '1';
    const text = extractText(block);
    return { md: `${seq}. ${text}`, elementType: 'list', headingLevel: null };
  }

  // ---- Code block ----
  if (block_type === BlockType.CODE) {
    const language = resolveCodeLanguage(block);
    const text = extractText(block);
    const fenced = '```' + language + '\n' + text + '\n```';
    return { md: fenced, elementType: 'code', headingLevel: null };
  }

  // ---- Quote (legacy type 15) ----
  if (block_type === BlockType.QUOTE) {
    const text = extractText(block);
    const quoted = text
      .split('\n')
      .map((line: string) => `> ${line}`)
      .join('\n');
    return { md: quoted, elementType: 'quote', headingLevel: null };
  }

  // ---- Quote container (type 34) — children are the quoted blocks ----
  if (block_type === BlockType.QUOTE_CONTAINER) {
    const childTexts = resolveChildrenText(block, blockMap);
    if (!childTexts) return null;
    const quoted = childTexts
      .split('\n')
      .map((line: string) => `> ${line}`)
      .join('\n');
    return { md: quoted, elementType: 'quote', headingLevel: null };
  }

  // ---- Callout (treated as blockquote) ----
  if (block_type === BlockType.CALLOUT) {
    const childTexts = resolveChildrenText(block, blockMap);
    if (!childTexts) return null;
    const quoted = childTexts
      .split('\n')
      .map((line: string) => `> ${line}`)
      .join('\n');
    return { md: quoted, elementType: 'quote', headingLevel: null };
  }

  // ---- Todo ----
  if (block_type === BlockType.TODO) {
    const todoData = block.todo as { style?: { done?: boolean }; elements?: TextElement[] } | undefined;
    const done = todoData?.style?.done ? 'x' : ' ';
    const text = todoData?.elements ? renderElements(todoData.elements) : '';
    return { md: `- [${done}] ${text}`, elementType: 'list', headingLevel: null };
  }

  // ---- Divider ----
  if (block_type === BlockType.DIVIDER) {
    return { md: '---', elementType: 'divider', headingLevel: null };
  }

  // ---- Image ----
  if (block_type === BlockType.IMAGE) {
    const image = block.image as {
      token?: string;
      caption?: { content?: string };
    } | undefined;
    const token = image?.token || 'unknown';
    const caption = image?.caption?.content || 'image';
    return {
      md: `![${caption}](feishu://image/${token})`,
      elementType: 'paragraph',
      headingLevel: null,
    };
  }

  // ---- Table ----
  if (block_type === BlockType.TABLE) {
    const md = renderTable(block, blockMap);
    if (!md) return null;
    return { md, elementType: 'table', headingLevel: null };
  }

  // ---- Grid / Grid Column / Table Cell — structural containers, skip ----
  if (
    block_type === BlockType.GRID ||
    block_type === BlockType.GRID_COLUMN ||
    block_type === BlockType.TABLE_CELL
  ) {
    return null;
  }

  // ---- File ----
  if (block_type === BlockType.FILE) {
    const file = block.file as { name?: string; token?: string } | undefined;
    const name = file?.name || 'file';
    return { md: `[${name}]`, elementType: 'paragraph', headingLevel: null };
  }

  // ---- Iframe / embedded content ----
  if (block_type === BlockType.IFRAME) {
    const iframe = block.iframe as { component?: { url?: string } } | undefined;
    const url = iframe?.component?.url || '';
    return {
      md: url ? `[Embedded content](${url})` : '[Embedded content]',
      elementType: 'paragraph',
      headingLevel: null,
    };
  }

  // ---- Fallback: try to extract any text ----
  const text = extractText(block);
  if (text) {
    return { md: text, elementType: 'paragraph', headingLevel: null };
  }

  return null;
}

/**
 * Extract rendered text from a block using its elements array.
 */
function extractText(block: FeishuBlock): string {
  const elements = getBlockElements(block);
  if (!elements) return '';
  return renderElements(elements);
}

/**
 * Render the text of all children blocks, joined by newlines.
 * Used for container blocks like quote_container and callout.
 */
function resolveChildrenText(
  block: FeishuBlock,
  blockMap: Map<string, FeishuBlock>
): string | null {
  const childIds = block.children;
  if (!childIds || !Array.isArray(childIds) || childIds.length === 0) return null;

  const lines: string[] = [];
  for (const childId of childIds) {
    const childBlock = blockMap.get(childId);
    if (!childBlock) continue;
    const text = extractText(childBlock);
    if (text) lines.push(text);
  }

  return lines.length > 0 ? lines.join('\n') : null;
}

/**
 * Render a table block as a Markdown table.
 *
 * The feishu table block contains:
 *   - table.property.row_size / column_size
 *   - table.cells: flat array of block IDs (row-major order)
 *
 * Each cell block_id points to a TABLE_CELL block whose children are
 * text blocks inside the cell.
 */
function renderTable(
  block: FeishuBlock,
  blockMap: Map<string, FeishuBlock>
): string | null {
  const table = block.table as {
    cells?: string[];
    property?: { row_size?: number; column_size?: number };
  } | undefined;

  if (!table?.property) return null;

  const rowSize = table.property.row_size || 0;
  const colSize = table.property.column_size || 0;
  const cellIds = table.cells || [];

  if (rowSize === 0 || colSize === 0) return null;

  const rows: string[][] = [];

  for (let r = 0; r < rowSize; r++) {
    const row: string[] = [];
    for (let c = 0; c < colSize; c++) {
      const idx = r * colSize + c;
      const cellId = cellIds[idx];
      let cellText = '';

      if (cellId) {
        const cellBlock = blockMap.get(cellId);
        if (cellBlock) {
          // Table cell children are the actual content blocks
          const childIds = cellBlock.children;
          if (childIds && Array.isArray(childIds)) {
            const parts: string[] = [];
            for (const childId of childIds) {
              const childBlock = blockMap.get(childId);
              if (childBlock) {
                const text = extractText(childBlock);
                if (text) parts.push(text);
              }
            }
            cellText = parts.join(' ');
          }
        }
      }

      // Escape pipe characters inside cell text for Markdown table safety
      row.push(cellText.replace(/\|/g, '\\|'));
    }
    rows.push(row);
  }

  if (rows.length === 0) return null;

  const lines: string[] = [];

  // Header row
  lines.push('| ' + rows[0].join(' | ') + ' |');
  // Separator
  lines.push('| ' + rows[0].map(() => '---').join(' | ') + ' |');
  // Body rows
  for (let r = 1; r < rows.length; r++) {
    lines.push('| ' + rows[r].join(' | ') + ' |');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyDocument(): ParsedDocument {
  return {
    markdown: '',
    structure: { headings: [] },
    elements: [],
    stats: {
      totalChars: 0,
      headingCount: 0,
      paragraphCount: 0,
      codeBlockCount: 0,
      listCount: 0,
    },
  };
}
