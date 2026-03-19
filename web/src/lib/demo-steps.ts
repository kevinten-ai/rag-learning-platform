export interface DemoStep {
  id: string
  title: string
  description: string
  page: string
  action?: string
  duration?: number // auto-advance after N seconds
}

export const DEMO_STEPS: DemoStep[] = [
  {
    id: 'welcome',
    title: '欢迎体验 Glass Box RAG',
    description:
      '本平台让 RAG 管道的每一步都透明可见。接下来将带您体验完整的 RAG 流程——从文档导入到智能问答。',
    page: '/',
  },
  {
    id: 'ingest',
    title: '第 1 步：文档摄入',
    description:
      '支持 4 种输入方式：粘贴文本、上传文件、飞书链接、示例文档。点击"一键导入全部"将示例文档导入知识库。',
    page: '/ingest',
  },
  {
    id: 'knowledge',
    title: '第 2 步：知识库可视化',
    description:
      '查看文档如何被切分为向量块，以及它们在高维向量空间中的分布。每个点代表一个文档块。',
    page: '/knowledge',
  },
  {
    id: 'query-simple',
    title: '第 3 步：智能问答',
    description:
      '提出问题，观察完整的 RAG 管道追踪——查询路由→增强→嵌入→检索→重排序→生成→评估。每一步都透明可见。',
    page: '/query',
  },
  {
    id: 'lab',
    title: '第 4 步：策略对比实验室',
    description:
      '对比不同的分块策略、检索方式、查询增强技术。用雷达图直观展示各策略的优劣。',
    page: '/lab',
  },
  {
    id: 'benchmark',
    title: '第 5 步：量化基准测试',
    description:
      '在标准化数据集上运行多组 RAG 配置，用数据证明每种技术带来的质量提升。',
    page: '/benchmark',
  },
  {
    id: 'techniques',
    title: '第 6 步：技术总览',
    description:
      '本平台实现了 19 项 RAG 技术，涵盖分块、检索、增强、生成、评估全流程。每一项都可交互体验。',
    page: '/techniques',
  },
]
