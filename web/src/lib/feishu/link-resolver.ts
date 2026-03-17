/**
 * Feishu Document Link Resolver
 *
 * Parses feishu document URLs to extract document IDs and types.
 * Supports docx, wiki, and doc URL formats across all feishu domains.
 */

export interface FeishuLinkInfo {
  documentId: string;
  type: 'docx' | 'wiki' | 'doc';
  rawUrl: string;
}

const SUPPORTED_TYPES = ['docx', 'wiki', 'doc'] as const;
type SupportedType = (typeof SUPPORTED_TYPES)[number];

/**
 * Regex pattern to match feishu document URLs.
 *
 * Captures:
 *   1. Document type (docx | wiki | doc)
 *   2. Document ID (path segment after the type)
 *
 * Supports:
 *   - Any subdomain: xxx.feishu.cn, xxx.larksuite.com
 *   - Query parameters and hash fragments (stripped)
 *   - Trailing slashes
 */
const FEISHU_URL_PATTERN =
  /^https?:\/\/[a-zA-Z0-9_-]+\.(?:feishu\.cn|larksuite\.com)\/(docx|wiki|doc)\/([A-Za-z0-9_-]+)/;

/**
 * Parse a feishu document URL and extract the document ID and type.
 *
 * @param url - The feishu document URL to parse
 * @returns Parsed link information containing documentId, type, and rawUrl
 * @throws Error if the URL is empty, not a valid feishu URL, or has an unsupported type
 *
 * @example
 * ```ts
 * resolveFeishuLink('https://xxx.feishu.cn/docx/ABC123')
 * // => { documentId: 'ABC123', type: 'docx', rawUrl: 'https://xxx.feishu.cn/docx/ABC123' }
 *
 * resolveFeishuLink('https://xxx.feishu.cn/wiki/XYZ789?query=1#section')
 * // => { documentId: 'XYZ789', type: 'wiki', rawUrl: '...' }
 * ```
 */
export function resolveFeishuLink(url: string): FeishuLinkInfo {
  if (!url || typeof url !== 'string') {
    throw new Error('Feishu link is required: received an empty or non-string value');
  }

  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    throw new Error('Feishu link is required: received an empty string');
  }

  // Validate it looks like a URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmedUrl);
  } catch {
    throw new Error(
      `Invalid URL format: "${trimmedUrl}". Expected a valid feishu URL like https://xxx.feishu.cn/docx/DOCUMENT_ID`
    );
  }

  // Validate domain
  const hostname = parsedUrl.hostname;
  if (!hostname.endsWith('.feishu.cn') && !hostname.endsWith('.larksuite.com')) {
    throw new Error(
      `Unsupported domain: "${hostname}". Only *.feishu.cn and *.larksuite.com domains are supported`
    );
  }

  // Extract type and document ID using regex
  const match = trimmedUrl.match(FEISHU_URL_PATTERN);
  if (!match) {
    throw new Error(
      `Unable to parse feishu document URL: "${trimmedUrl}". ` +
        `Expected format: https://xxx.feishu.cn/{docx|wiki|doc}/DOCUMENT_ID`
    );
  }

  const [, rawType, documentId] = match;

  // Validate the type is supported (should always pass given the regex, but be defensive)
  if (!SUPPORTED_TYPES.includes(rawType as SupportedType)) {
    throw new Error(
      `Unsupported document type: "${rawType}". Supported types: ${SUPPORTED_TYPES.join(', ')}`
    );
  }

  if (!documentId) {
    throw new Error(
      `Missing document ID in URL: "${trimmedUrl}". The URL path must include a document ID after the type segment`
    );
  }

  return {
    documentId,
    type: rawType as SupportedType,
    rawUrl: trimmedUrl,
  };
}
