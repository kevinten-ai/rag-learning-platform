"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Layers,
  Scissors,
  Search,
  Sparkles,
  ShieldCheck,
  BarChart3,
  Brain,
  ArrowRight,
  GitBranch,
  Repeat,
  MessageSquare,
  Target,
  Zap,
  Eye,
  SplitSquareVertical,
  Network,
} from "lucide-react";

interface Technique {
  name: string;
  nameEn: string;
  category: "chunking" | "retrieval" | "enhancement" | "generation" | "evaluation";
  description: string;
  keyBenefit: string;
  tryLink: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TECHNIQUES: Technique[] = [
  // Chunking
  {
    name: "固定大小分块",
    nameEn: "Fixed-Size Chunking",
    category: "chunking",
    description: "按固定 token 数分割文档，支持重叠窗口。最基础的分块策略。",
    keyBenefit: "简单高效，适合均匀文本",
    tryLink: "/lab",
    icon: Scissors,
  },
  {
    name: "递归字符分块",
    nameEn: "Recursive Character Splitting",
    category: "chunking",
    description: "使用多级分隔符（段落→句子→字符）递归分割，优先在高层级边界切分。",
    keyBenefit: "保持段落和句子完整性",
    tryLink: "/lab",
    icon: GitBranch,
  },
  {
    name: "语义分块",
    nameEn: "Semantic Chunking",
    category: "chunking",
    description: "计算相邻句子的嵌入相似度，在语义突变点切分。每个块保持主题一致。",
    keyBenefit: "真正的语义边界切分",
    tryLink: "/lab",
    icon: Brain,
  },
  {
    name: "文档结构分块",
    nameEn: "Document-Aware Chunking",
    category: "chunking",
    description: "解析 Markdown 标题层级，按文档结构切分。每个块携带标题路径元数据。",
    keyBenefit: "保留文档结构上下文",
    tryLink: "/lab",
    icon: SplitSquareVertical,
  },
  {
    name: "上下文增强分块",
    nameEn: "Contextual Retrieval",
    category: "chunking",
    description: "Anthropic 提出的技术。LLM 为每个块生成上下文前缀，描述其在文档中的位置和主题。",
    keyBenefit: "检索质量提升约 35%",
    tryLink: "/lab",
    icon: Sparkles,
  },
  // Retrieval
  {
    name: "语义检索",
    nameEn: "Semantic Retrieval",
    category: "retrieval",
    description: "将查询和文档编码为向量，通过余弦相似度匹配最相关的内容。",
    keyBenefit: "理解同义词和语义相似性",
    tryLink: "/query",
    icon: Search,
  },
  {
    name: "关键词检索 (BM25)",
    nameEn: "Keyword Retrieval",
    category: "retrieval",
    description: "使用 PostgreSQL 全文检索和 BM25 排序算法，精确匹配关键词。",
    keyBenefit: "精确术语匹配，速度快",
    tryLink: "/query",
    icon: Target,
  },
  {
    name: "混合检索 (RRF)",
    nameEn: "Hybrid Retrieval with RRF",
    category: "retrieval",
    description: "同时运行语义和关键词检索，用 Reciprocal Rank Fusion 融合排序结果。",
    keyBenefit: "结合两种检索的优势",
    tryLink: "/query",
    icon: Network,
  },
  {
    name: "句窗检索",
    nameEn: "Sentence Window Retrieval",
    category: "retrieval",
    description: "用小块做精准匹配，返回时扩展到相邻块，提供更完整的上下文。",
    keyBenefit: "精准匹配 + 完整上下文",
    tryLink: "/query",
    icon: Eye,
  },
  // Enhancement
  {
    name: "查询改写",
    nameEn: "Query Rewriting",
    category: "enhancement",
    description: "LLM 将用户口语化的问题改写为更规范、更适合检索的表述。",
    keyBenefit: "优化检索词，提高匹配率",
    tryLink: "/query",
    icon: MessageSquare,
  },
  {
    name: "假设性文档嵌入 (HyDE)",
    nameEn: "Hypothetical Document Embeddings",
    category: "enhancement",
    description: "LLM 先生成一篇假设性回答文档，再对其做嵌入检索。文档级嵌入比问题级更接近目标。",
    keyBenefit: "弥补查询-文档词汇鸿沟",
    tryLink: "/query",
    icon: Sparkles,
  },
  {
    name: "多查询扩展",
    nameEn: "Multi-Query Expansion",
    category: "enhancement",
    description: "将一个问题分解为 3-5 个语义变体，分别检索后去重合并结果。",
    keyBenefit: "覆盖不同表述角度",
    tryLink: "/query",
    icon: Repeat,
  },
  {
    name: "自适应查询路由",
    nameEn: "Adaptive Query Routing",
    category: "enhancement",
    description: "LLM 分类问题类型（简单/分析/对比/无需检索），自动选择最优管道配置。",
    keyBenefit: "智能匹配策略，兼顾质量和速度",
    tryLink: "/query",
    icon: Zap,
  },
  {
    name: "复杂问题分解",
    nameEn: "Query Decomposition",
    category: "enhancement",
    description: "将复杂的多部分问题分解为可独立回答的子问题，分别检索回答后合成。",
    keyBenefit: "处理复杂多跳推理问题",
    tryLink: "/query",
    icon: GitBranch,
  },
  // Generation
  {
    name: "LLM 重排序",
    nameEn: "LLM-based Reranking",
    category: "generation",
    description: "用 LLM 评估每个候选文档与问题的相关性，重新排序并过滤不相关结果。",
    keyBenefit: "精细化相关性判断",
    tryLink: "/query",
    icon: ArrowRight,
  },
  {
    name: "纠正性 RAG (CRAG)",
    nameEn: "Corrective RAG",
    category: "generation",
    description: "生成前评估检索质量。如果检索不充分，自动优化查询并重新检索。",
    keyBenefit: "防止低质量检索导致错误回答",
    tryLink: "/query",
    icon: ShieldCheck,
  },
  {
    name: "自反思 RAG (Self-RAG)",
    nameEn: "Self-Reflective RAG",
    category: "generation",
    description: "生成后逐段自我反思：是否相关？是否有依据？是否完整？不合格则自动修订。",
    keyBenefit: "自动检测和纠正幻觉",
    tryLink: "/query",
    icon: Brain,
  },
  {
    name: "引用标注",
    nameEn: "Citation Grounding",
    category: "generation",
    description: "回答中使用 [1][2] 内联引用标注，每个论点都链接到具体的源文档。",
    keyBenefit: "可验证的答案溯源",
    tryLink: "/query",
    icon: MessageSquare,
  },
  // Evaluation
  {
    name: "三维质量评估",
    nameEn: "3-Dimension Quality Evaluation",
    category: "evaluation",
    description: "LLM 从相关性、忠实性、完整性三个维度评分（0-1），全面衡量回答质量。",
    keyBenefit: "多角度量化评估",
    tryLink: "/query",
    icon: BarChart3,
  },
];

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  chunking: { label: "分块", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  retrieval: { label: "检索", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  enhancement: { label: "增强", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" },
  generation: { label: "生成", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" },
  evaluation: { label: "评估", color: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300" },
};

export default function TechniquesPage() {
  const categories = ["chunking", "retrieval", "enhancement", "generation", "evaluation"] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Layers className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">
            RAG 技术目录
            <Badge className="ml-3 text-sm" variant="secondary">
              {TECHNIQUES.length} 项技术
            </Badge>
          </h1>
          <p className="text-muted-foreground">
            本平台实现的全部 RAG 技术一览 — 每一项都可交互体验、全程可视化追踪
          </p>
        </div>
      </div>

      {/* Pipeline flow indicator */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {categories.map((cat, i) => (
          <div key={cat} className="flex items-center gap-2 shrink-0">
            <Badge className={CATEGORY_META[cat].color}>
              {CATEGORY_META[cat].label}
              <span className="ml-1 opacity-70">
                ({TECHNIQUES.filter((t) => t.category === cat).length})
              </span>
            </Badge>
            {i < categories.length - 1 && (
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      {/* Technique cards by category */}
      {categories.map((category) => {
        const techniques = TECHNIQUES.filter((t) => t.category === category);
        const meta = CATEGORY_META[category];

        return (
          <div key={category} className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Badge className={meta.color}>{meta.label}</Badge>
              <span className="text-muted-foreground text-sm font-normal">
                {techniques.length} 项技术
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {techniques.map((tech) => (
                <Card
                  key={tech.nameEn}
                  className="hover:shadow-md transition-shadow group"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="p-1.5 bg-muted rounded">
                        <tech.icon className="h-4 w-4" />
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        已实现
                      </Badge>
                    </div>
                    <CardTitle className="text-base mt-2">{tech.name}</CardTitle>
                    <CardDescription className="text-xs font-mono">
                      {tech.nameEn}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {tech.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                        {tech.keyBenefit}
                      </span>
                      <Link
                        href={tech.tryLink}
                        className="text-xs text-primary hover:underline opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                      >
                        试一试 <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
