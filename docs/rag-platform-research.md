# RAG 平台技术选型调研

> 调研日期：2026-03-16
> 背景：基于现有 Vercel + Supabase 技术栈，构建通用 RAG 中心服务

---

## 一、向量数据库选型

### 核心结论：Supabase pgvector 是最佳起步选择

你已经在用 Supabase，**不需要引入新的向量数据库**。Supabase 内置 pgvector 扩展，直接在 Postgres 中存储和检索向量。

### Supabase pgvector 能力

| 能力 | 详情 |
|------|------|
| 向量存储 | pgvector 扩展，支持高维向量存储 |
| 搜索模式 | 语义搜索、关键词搜索、混合搜索（三种都支持） |
| 嵌入生成 | 可通过 Edge Functions 部署开源模型，或调用 OpenAI |
| 权限控制 | 基于 RLS（行级安全）的向量访问控制 |
| 生态集成 | OpenAI、Hugging Face、LangChain 官方支持 |
| 生产验证 | Berri AI、Firecrawl、Markprompt 等已在生产使用 |

### 优势

- **零额外基础设施**：向量和业务数据在同一个 Postgres 实例中
- **成本最低**：不需要额外付费，pgvector 是 Supabase 免费功能
- **RLS 权限控制**：可以限制不同用户只能搜索自己有权限的文档
- **与 Vercel 天然集成**：Vercel Marketplace 有 Supabase 官方集成

### 适用规模

- **5-10M 向量以内**：pgvector 完全胜任
- **超过 10M 向量**：考虑迁移到专用向量数据库

### 其他向量数据库对比（备选方案）

| 数据库 | 特点 | 定价 | 适用场景 |
|--------|------|------|----------|
| **Pinecone** | 全托管 Serverless，零运维 | 存储 $0.33/GB/月 + 按读写计费 | 大规模生产、零运维需求 |
| **Qdrant** | Rust 实现，复杂过滤性能强 | 1GB 永久免费 | 需要复杂元数据过滤 |
| **Weaviate** | GraphQL API，混合搜索最强 | Cloud 起步 $25/月 | RAG Agent、多模态数据 |
| **Milvus** | GPU 加速，支持十亿级向量 | 开源自部署 / Zilliz Cloud | 超大规模向量检索 |
| **Chroma** | 轻量级，适合原型 | 开源免费 | PoC 和本地开发 |

### 建议路线

```
阶段1（现在）：Supabase pgvector  → 零成本，快速验证
阶段2（规模增长）：评估是否需要 Pinecone/Qdrant → 当向量 >5M 或延迟要求 <50ms
```

---

## 二、通用 RAG 中心服务架构

### 目标

构建一个中心化的 RAG 服务，作为基础设施支撑多个上层应用（类似"知识中台"）。

### 推荐技术栈

```
┌─────────────────────────────────────────────────────┐
│                    上层应用                            │
│  App A (客服)  │  App B (文档问答)  │  App C (搜索)    │
└───────────────────────┬─────────────────────────────┘
                        │ REST API / tRPC
┌───────────────────────▼─────────────────────────────┐
│              RAG 中心服务 (Next.js API Routes)         │
│                                                       │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────┐   │
│  │ 数据摄入  │  │ 检索引擎   │  │ 生成层 (LLM)     │   │
│  │ Pipeline  │  │ Retriever │  │ Generator        │   │
│  └──────────┘  └───────────┘  └──────────────────┘   │
│                                                       │
│  部署: Vercel Serverless Functions                     │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│                  数据层                                │
│  Supabase Postgres    │  Supabase pgvector            │
│  (业务数据 + 缓存)     │  (向量嵌入 + 语义搜索)         │
└─────────────────────────────────────────────────────┘
```

### 各层技术选择

#### 1. 应用框架 & 部署

| 组件 | 推荐 | 理由 |
|------|------|------|
| **Web 框架** | Next.js (App Router) | 已在 Vercel 生态，API Routes 做后端 |
| **部署平台** | Vercel | 已在用，Serverless Functions 适合 API 服务 |
| **长时间任务** | Supabase Edge Functions / Vercel Cron | 文档摄入等重任务 |
| **语言** | TypeScript | 全栈统一，类型安全 |

#### 2. RAG 框架

| 框架 | 推荐度 | 说明 |
|------|--------|------|
| **LangChain.js** | 推荐 | TypeScript 生态最成熟，编排能力强，社区最大 |
| **LlamaIndex.TS** | 备选 | 检索性能更优（~6ms vs ~10ms），但 TS 版功能滞后 |
| **Vercel AI SDK** | 推荐搭配 | 原生流式输出、模型切换，与 Vercel 深度集成 |

**建议组合**：LangChain.js（编排 + 检索）+ Vercel AI SDK（流式生成 + 前端集成）

#### 3. 数据摄入层

| 组件 | 推荐 |
|------|------|
| 文档解析 | LangChain Document Loaders（80+ 数据源连接器）|
| 网页抓取 | Firecrawl（支持 JS 渲染）|
| 文本分块 | LangChain Text Splitters（递归字符 + Token 感知）|
| 嵌入模型 | OpenAI text-embedding-3-small（性价比）或 BGE-M3（多语言）|

#### 4. 检索层

| 组件 | 推荐 |
|------|------|
| 向量检索 | Supabase pgvector |
| 混合搜索 | pgvector 语义 + Postgres 全文搜索 |
| 查询增强 | HyDE（假设文档嵌入）+ Multi-query 扩展 |
| 重排序 | Cohere Rerank API 或 BGE Rerank |

#### 5. 生成层

| 组件 | 推荐 |
|------|------|
| LLM | OpenAI GPT-4o / Claude（按需切换）|
| 流式输出 | Vercel AI SDK `streamText()` |
| 安全护栏 | Guardrails AI（防注入、防幻觉）|

#### 6. 评估 & 监控

| 组件 | 推荐 |
|------|------|
| RAG 评估 | RAGAS（检索相关性、忠实度、答案正确性）|
| 幻觉检测 | TruLens |
| 可观测性 | LangSmith / Langfuse（链路追踪）|

---

## 三、部署方案

### 方案 A：全 Vercel + Supabase（推荐起步）

```
前端 & API：     Vercel（Next.js）
向量 & 数据库：   Supabase（pgvector + Postgres）
文档摄入任务：   Supabase Edge Functions 或 Vercel Cron Jobs
LLM 调用：      OpenAI API / Anthropic API
```

**优点**：零运维、与现有栈一致、成本低（按量计费）
**限制**：Vercel 函数 60s 超时（Pro 300s），大文档摄入需要拆分

### 方案 B：Vercel + Supabase + 独立计算层（规模化）

```
前端 & API：     Vercel（Next.js）
向量 & 数据库：   Supabase（pgvector + Postgres）
重计算任务：     Railway / Fly.io（长时间运行的摄入任务）
消息队列：       Supabase Realtime / Inngest（任务编排）
LLM 调用：      OpenAI API / Anthropic API
```

**优点**：突破 Serverless 超时限制，适合大批量文档处理
**适用**：当文档量大、摄入频繁时

---

## 四、核心 API 设计（参考）

RAG 中心服务对外暴露的核心接口：

```typescript
// 1. 文档摄入
POST /api/rag/ingest
Body: { source: "url" | "file" | "text", content: string, metadata: object }

// 2. 语义查询
POST /api/rag/query
Body: { question: string, filters?: object, topK?: number }
Response: { answer: string, sources: Source[], confidence: number }

// 3. 向量搜索（底层）
POST /api/rag/search
Body: { query: string, filters?: object, topK?: number, mode: "semantic" | "keyword" | "hybrid" }
Response: { results: Document[] }

// 4. 知识库管理
GET    /api/rag/collections           // 列出知识库
POST   /api/rag/collections           // 创建知识库
DELETE /api/rag/collections/:id       // 删除知识库
GET    /api/rag/collections/:id/stats // 知识库统计
```

---

## 五、实施路线建议

```
Phase 1 - 基础 RAG（1-2 周）
├── Supabase 启用 pgvector 扩展
├── 搭建 Next.js API Routes
├── 实现文档摄入 → 分块 → 嵌入 → 存储
└── 实现基础语义搜索 + LLM 问答

Phase 2 - 检索优化（1-2 周）
├── 实现混合搜索（向量 + 全文）
├── 加入查询改写 / HyDE
├── 加入 Reranking
└── 搭建评估框架（RAGAS）

Phase 3 - 服务化（1-2 周）
├── 多知识库支持（Collection 概念）
├── API 鉴权 + 多租户
├── 流式输出
└── 对接第一个上层应用

Phase 4 - 进阶（按需）
├── GraphRAG / 知识图谱
├── 多模态文档支持
├── 对话记忆
└── 用户反馈闭环
```

---

## 参考资料

- [Supabase AI & Vectors 文档](https://supabase.com/docs/guides/ai)
- [Supabase pgvector 文档](https://supabase.com/docs/guides/database/extensions/pgvector)
- [Supabase RAG with Permissions](https://supabase.com/docs/guides/ai/rag-with-permissions)
- [Modern RAG Tech Stack - Firecrawl](https://www.firecrawl.dev/blog/modern-rag-tech-stack)
- [Best Vector Databases for Production RAG 2026](https://engineersguide.substack.com/p/best-vector-databases-rag)
- [Best Vector Databases 2026 - Firecrawl](https://www.firecrawl.dev/blog/best-vector-databases)
- [Building Production RAG Systems 2026](https://brlikhon.engineer/blog/building-production-rag-systems-in-2026-complete-architecture-guide)
- [LlamaIndex vs LangChain 2026](https://contabo.com/blog/llamaindex-vs-langchain-which-one-to-choose-in-2026/)
- [RAG Frameworks Comparison](https://research.aimultiple.com/rag-frameworks/)
- [Supabase Edge Functions Architecture](https://supabase.com/docs/guides/functions/architecture)
- [Vercel AI SDK](https://vercel.com/ai)
- [LangChain + Supabase pgvector Guide](https://dev.to/gautam_kumar_d3daad738680/langchain-supabase-vector-store-pgvector-a-beginner-friendly-guide-5h33)
- [Vector DB Comparison: Pinecone vs Weaviate vs Qdrant](https://xenoss.io/blog/vector-database-comparison-pinecone-qdrant-weaviate)
