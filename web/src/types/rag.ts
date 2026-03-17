export interface RAGTrace {
  id: string;
  question: string;
  timestamp: string;
  totalDurationMs: number;
  steps: {
    queryUnderstanding: {
      durationMs: number;
      original: string;
      rewritten?: string;
      hydeDocument?: string;
      subQueries?: string[];
      activeStrategies: string[];
    };
    embedding: {
      durationMs: number;
      model: string;
      dimensions: number;
      vector: number[];
      vectorPreview: number[];
      tokensUsed: number;
    };
    retrieval: {
      durationMs: number;
      mode: 'semantic' | 'keyword' | 'hybrid';
      totalCandidates: number;
      retrieved: number;
      results: RetrievalResult[];
      hybridWeights?: { vector: number; keyword: number };
    };
    reranking?: {
      durationMs: number;
      model: string;
      before: RankItem[];
      after: RankItem[];
      filtered: string[];
    };
    promptConstruction: {
      durationMs: number;
      template: string;
      systemPrompt: string;
      contextChunks: ContextChunk[];
      fullPrompt: string;
      tokenBreakdown: { system: number; context: number; query: number; total: number };
    };
    generation: {
      durationMs: number;
      model: string;
      answer: string;
      tokensUsed: { prompt: number; completion: number; total: number };
      sources: SourceRef[];
      estimatedCost: number;
    };
  };
  evaluation?: {
    relevance: number;
    faithfulness: number;
    completeness: number;
  };
}

export interface RetrievalResult {
  chunkId: string;
  content: string;
  score: number;
  scoreType: 'cosine' | 'bm25' | 'hybrid';
  documentTitle: string;
  metadata: Record<string, unknown>;
  vectorScore?: number;
  keywordScore?: number;
}

export interface RankItem {
  chunkId: string;
  score: number;
  rank: number;
}

export interface ContextChunk {
  chunkId: string;
  content: string;
  source: string;
}

export interface SourceRef {
  chunkId: string;
  documentTitle: string;
  relevance: string;
}

export interface ChunkResult {
  id: string;
  content: string;
  tokenCount: number;
  chunkIndex: number;
  metadata: {
    strategy: string;
    sourceTitle?: string;
    headingPath?: string[];
    overlapBefore?: string;
    overlapAfter?: string;
  };
}

export interface ChunkerOptions {
  chunkSize: number;
  chunkOverlap: number;
  separators?: string[];
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  chunk_strategy: string;
  chunk_size: number;
  chunk_overlap: number;
  embedding_model: string;
  embedding_dimensions: number;
  created_at: string;
}

export interface Document {
  id: string;
  collection_id: string;
  title: string;
  source_url?: string;
  source_type: string;
  raw_content?: string;
  metadata: Record<string, unknown>;
  token_count?: number;
  created_at: string;
}

export interface Chunk {
  id: string;
  document_id: string;
  collection_id: string;
  content: string;
  embedding?: number[];
  chunk_index: number;
  token_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
}
