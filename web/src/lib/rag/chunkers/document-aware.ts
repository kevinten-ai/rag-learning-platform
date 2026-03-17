import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { nanoid } from 'nanoid';
import { estimateTokenCount } from '../token-utils';
import type { ChunkerOptions, ChunkResult } from '@/types/rag';

interface Section {
  heading: string;
  level: number;
  content: string;
  headingPath: string[];
}

function parseMarkdownSections(content: string): Section[] {
  const lines = content.split('\n');
  const sections: Section[] = [];
  let currentSection: Section | null = null;
  const headingStack: { heading: string; level: number }[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      if (currentSection) {
        sections.push(currentSection);
      }

      const level = headingMatch[1].length;
      const heading = headingMatch[2].trim();

      while (
        headingStack.length > 0 &&
        headingStack[headingStack.length - 1].level >= level
      ) {
        headingStack.pop();
      }
      headingStack.push({ heading, level });

      currentSection = {
        heading,
        level,
        content: '',
        headingPath: headingStack.map((h) => h.heading),
      };
    } else if (currentSection) {
      currentSection.content += (currentSection.content ? '\n' : '') + line;
    } else {
      currentSection = {
        heading: '',
        level: 0,
        content: line,
        headingPath: [],
      };
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

function groupSections(
  sections: Section[]
): { content: string; headingPath: string[] }[] {
  const groups: { content: string; headingPath: string[] }[] = [];
  let currentGroup: { content: string; headingPath: string[] } | null = null;

  for (const section of sections) {
    const sectionText = section.heading
      ? `${'#'.repeat(section.level)} ${section.heading}\n${section.content}`
      : section.content;

    if (section.level <= 2) {
      if (currentGroup && currentGroup.content.trim()) {
        groups.push(currentGroup);
      }
      currentGroup = {
        content: sectionText.trim(),
        headingPath: section.headingPath,
      };
    } else {
      if (currentGroup) {
        currentGroup.content += '\n\n' + sectionText.trim();
      } else {
        currentGroup = {
          content: sectionText.trim(),
          headingPath: section.headingPath,
        };
      }
    }
  }

  if (currentGroup && currentGroup.content.trim()) {
    groups.push(currentGroup);
  }

  return groups;
}

const CHINESE_SEPARATORS = ['\n\n', '\n', '。', '！', '？', '；', '，', ' ', ''];

export async function documentAwareChunk(
  content: string,
  options: ChunkerOptions
): Promise<ChunkResult[]> {
  const { chunkSize, chunkOverlap } = options;

  if (!content || content.trim().length === 0) {
    return [];
  }

  const sections = parseMarkdownSections(content);
  const groups = groupSections(sections);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: CHINESE_SEPARATORS,
  });

  const chunks: ChunkResult[] = [];
  let chunkIndex = 0;

  for (const group of groups) {
    const tokenCount = estimateTokenCount(group.content);

    if (tokenCount <= chunkSize) {
      chunks.push({
        id: nanoid(),
        content: group.content,
        tokenCount,
        chunkIndex,
        metadata: {
          strategy: 'document-aware',
          headingPath: group.headingPath,
        },
      });
      chunkIndex++;
    } else {
      const subDocs = await splitter.createDocuments([group.content]);

      for (const subDoc of subDocs) {
        chunks.push({
          id: nanoid(),
          content: subDoc.pageContent,
          tokenCount: estimateTokenCount(subDoc.pageContent),
          chunkIndex,
          metadata: {
            strategy: 'document-aware',
            headingPath: group.headingPath,
          },
        });
        chunkIndex++;
      }
    }
  }

  return chunks;
}
