export interface BenchmarkItem {
  id: string
  question: string
  groundTruth: string
  relevantKeywords: string[]
  category: 'factual' | 'analytical' | 'comparison' | 'multi-hop'
  difficulty: 'easy' | 'medium' | 'hard'
}

export const BENCHMARK_DATASET: BenchmarkItem[] = [
  // Factual - Easy
  {
    id: 'b01',
    question: 'RAG 的全称是什么？它的三个主要阶段是什么？',
    groundTruth:
      'RAG 全称是 Retrieval-Augmented Generation（检索增强生成）。三个主要阶段是：检索（Retrieval）、增强（Augmentation）和生成（Generation）。',
    relevantKeywords: ['检索', '增强', '生成', 'Retrieval', 'Augmented', 'Generation'],
    category: 'factual',
    difficulty: 'easy',
  },
  {
    id: 'b02',
    question: '向量数据库的核心功能是什么？',
    groundTruth:
      '向量数据库的核心功能是存储和检索高维向量数据，通过计算向量之间的相似度（如余弦相似度）来实现语义搜索。',
    relevantKeywords: ['向量', '相似度', '语义', '高维', '存储', '检索'],
    category: 'factual',
    difficulty: 'easy',
  },
  // Factual - Medium
  {
    id: 'b03',
    question: '什么是文本嵌入（Embedding）？它在 RAG 中的作用是什么？',
    groundTruth:
      '文本嵌入是将文本转换为固定维度的数值向量表示的过程。在 RAG 中，嵌入用于将查询和文档片段映射到同一向量空间，通过向量相似度进行语义检索。',
    relevantKeywords: ['嵌入', '向量', '语义', '检索', '维度', 'Embedding'],
    category: 'factual',
    difficulty: 'medium',
  },
  // Analytical - Medium
  {
    id: 'b04',
    question: 'RAG 系统如何缓解大语言模型的幻觉问题？',
    groundTruth:
      'RAG 通过在生成前检索相关文档，将真实的知识库内容作为上下文注入提示词，约束模型基于事实信息生成回答，从而减少模型编造不存在信息的幻觉现象。',
    relevantKeywords: ['幻觉', '知识库', '上下文', '检索', '事实', '约束'],
    category: 'analytical',
    difficulty: 'medium',
  },
  {
    id: 'b05',
    question: '分块（Chunking）策略对 RAG 系统的检索质量有什么影响？',
    groundTruth:
      '分块策略直接影响检索精度和召回率。块太大会引入噪声，降低精度；块太小会丢失上下文，降低召回率。理想的分块应在语义边界处切分，保持每个块的语义完整性。',
    relevantKeywords: ['分块', '检索', '精度', '召回', '语义', '上下文'],
    category: 'analytical',
    difficulty: 'medium',
  },
  // Comparison - Medium
  {
    id: 'b06',
    question: '语义检索和关键词检索各自的优缺点是什么？',
    groundTruth:
      '语义检索通过向量相似度匹配，能理解同义词和语义相似性，但计算开销大、对专业术语可能不精确。关键词检索通过精确匹配，速度快且对专业术语准确，但无法理解语义相似性。混合检索结合两者优势。',
    relevantKeywords: ['语义', '关键词', '相似度', '精确', '混合', 'BM25'],
    category: 'comparison',
    difficulty: 'medium',
  },
  // Analytical - Hard
  {
    id: 'b07',
    question: 'HyDE（假设性文档嵌入）技术的原理是什么？为什么它能改善检索效果？',
    groundTruth:
      'HyDE 让 LLM 先生成一篇假设性的回答文档，然后对这篇假设文档进行嵌入而非直接嵌入问题。因为假设文档的语言风格更接近知识库中的文档，所以在向量空间中与真实文档的距离更近，从而提高检索精度。',
    relevantKeywords: ['HyDE', '假设', '嵌入', '文档', '向量', '相似度'],
    category: 'analytical',
    difficulty: 'hard',
  },
  // Multi-hop - Hard
  {
    id: 'b08',
    question: '在一个完整的 RAG 管道中，从用户提问到最终回答，数据经历了哪些关键转换？',
    groundTruth:
      '数据经历的关键转换：1) 查询理解（查询改写/扩展）→ 2) 查询向量化（文本转嵌入向量）→ 3) 向量检索（余弦相似度匹配）→ 4) 重排序（相关性精排）→ 5) 提示词构建（上下文拼接）→ 6) LLM 生成（流式回答）→ 7) 质量评估',
    relevantKeywords: ['查询', '向量化', '检索', '重排序', '提示词', '生成', '评估'],
    category: 'multi-hop',
    difficulty: 'hard',
  },
  // Comparison - Hard
  {
    id: 'b09',
    question: '递归分块和语义分块各在什么场景下更有效？',
    groundTruth:
      '递归分块在结构化文档（如有段落、标题的文档）中更有效，因为它按层级分隔符递归切分，保持文档结构。语义分块在内容主题变化频繁的文档中更有效，因为它基于相邻句子的语义相似度来确定分割点，能在真正的主题边界处切分。',
    relevantKeywords: ['递归', '语义', '分块', '结构', '相似度', '分隔符'],
    category: 'comparison',
    difficulty: 'hard',
  },
  // Multi-hop - Hard
  {
    id: 'b10',
    question: '如果 RAG 系统检索到的文档质量很差，有哪些技术手段可以改善最终回答质量？',
    groundTruth:
      '可以采用：1) CRAG（纠正性检索增强生成）——评估检索质量，质量差时自动优化查询重新检索；2) Self-RAG——生成后逐段自反思，检测是否有源文档支持；3) 重排序——用 LLM 过滤不相关文档；4) 多查询扩展——从多个角度检索增加召回率。',
    relevantKeywords: ['CRAG', 'Self-RAG', '重排序', '多查询', '检索质量', '自反思'],
    category: 'multi-hop',
    difficulty: 'hard',
  },
]

export const BENCHMARK_CONFIGS = [
  {
    id: 'baseline',
    name: '基础 RAG',
    description: '语义检索，无增强，无重排序',
    config: {
      retrievalMode: 'semantic',
      enhancers: [] as string[],
      rerank: false,
      topK: 5,
    },
  },
  {
    id: 'enhanced',
    name: '增强 RAG',
    description: '混合检索 + 查询改写 + 重排序',
    config: {
      retrievalMode: 'hybrid',
      enhancers: ['rewrite'],
      rerank: true,
      topK: 8,
    },
  },
  {
    id: 'advanced',
    name: '高级 RAG',
    description: '混合检索 + HyDE + 多查询 + 重排序',
    config: {
      retrievalMode: 'hybrid',
      enhancers: ['hyde', 'multi-query'],
      rerank: true,
      topK: 10,
    },
  },
  {
    id: 'full',
    name: '完整 RAG',
    description: '混合检索 + 全部增强 + 重排序 + CRAG',
    config: {
      retrievalMode: 'hybrid',
      enhancers: ['rewrite', 'hyde', 'multi-query'],
      rerank: true,
      topK: 10,
    },
  },
]
