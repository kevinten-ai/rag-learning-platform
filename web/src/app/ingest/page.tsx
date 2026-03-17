"use client";

import { useState, useCallback, useRef } from "react";
import { Download, Loader2, FileUp, ClipboardPaste, Link2, BookOpen, Upload, Sparkles } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SAMPLE_DOCUMENTS } from "@/lib/rag/sample-documents";

import { PipelineFlow, type PipelineStep } from "@/components/pipeline/PipelineFlow";
import { StepCard } from "@/components/pipeline/StepCard";
import { ChunkComparison } from "@/components/chunks/ChunkComparison";
import { VectorPreview } from "@/components/vectors/VectorPreview";
import { SimilarityHeatmap } from "@/components/vectors/SimilarityHeatmap";

import type { ChunkResult } from "@/types/rag";

interface IngestResult {
  success: boolean;
  document_id: string;
  collection_id: string;
  document: {
    title: string;
    markdown: string;
    structure: { headings: Array<{ level: number; text: string }> };
    elements: Array<{ type: string; content: string }>;
    stats: { totalChars: number; headingCount: number; paragraphCount: number; codeBlockCount: number; listCount: number };
  };
  chunks: Array<ChunkResult & { vectorPreview: number[] }>;
  visualization: {
    umap_3d: Array<{ x: number; y: number; z: number }>;
    similarity_matrix: number[][];
    vector_previews: number[][];
  };
  stages: Record<string, { status: string; duration_ms: number; data?: unknown }>;
  chunks_created: number;
  duration_ms: number;
}

const initialSteps: PipelineStep[] = [
  { id: "fetch", label: "① 获取文档", status: "idle" },
  { id: "parse", label: "② 解析内容", status: "idle" },
  { id: "chunk", label: "③ 文本分块", status: "idle" },
  { id: "embed", label: "④ 向量嵌入", status: "idle" },
];

export default function IngestPage() {
  const [url, setUrl] = useState("");
  const [pasteContent, setPasteContent] = useState("");
  const [pasteTitle, setPasteTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inputTab, setInputTab] = useState("paste");

  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<PipelineStep[]>(initialSteps);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [result, setResult] = useState<IngestResult | null>(null);

  // Separate chunk comparison state
  const [chunkResults, setChunkResults] = useState<Record<string, { chunks: ChunkResult[]; totalChunks: number; avgTokenCount: number }> | null>(null);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setFileContent(e.target?.result as string);
    };
    reader.readAsText(file);
  }, []);

  // Handle drop zone
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith(".md") || file.name.endsWith(".txt"))) {
        handleFileSelect(file);
      } else {
        toast.error("请上传 .md 或 .txt 文件");
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Generic ingest function that handles both URL and content modes
  const handleIngest = useCallback(
    async (options?: { content?: string; title?: string; source_type?: string }) => {
      const isContentMode = !!options?.content;
      if (!isContentMode && !url.trim()) return;

      setLoading(true);
      setResult(null);
      setChunkResults(null);

      const updateStep = (id: string, update: Partial<PipelineStep>) => {
        setSteps((prev) =>
          prev.map((s) => (s.id === id ? { ...s, ...update } : s))
        );
      };

      try {
        // Reset steps
        setSteps(initialSteps.map((s) => ({ ...s, status: "idle" })));

        // Stage 1: Fetch document
        updateStep("fetch", { status: "running" });
        setActiveStep("fetch");

        const body = isContentMode
          ? {
              content: options.content,
              title: options.title || "Untitled",
              source_type: options.source_type || "paste",
              chunk_strategy: "recursive",
            }
          : { url, chunk_strategy: "recursive" };

        const res = await fetch("/api/rag/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Ingest failed");
        }

        const data: IngestResult = await res.json();
        setResult(data);

        // Update all steps based on stages
        const stageMap: Record<string, string> = {
          fetch: "fetch",
          resolve: "fetch",
          parse: "parse",
          chunk: "chunk",
          embed: "embed",
          visualize: "embed",
          store: "embed",
        };

        for (const [stageKey, stage] of Object.entries(data.stages)) {
          const stepId = stageMap[stageKey];
          if (stepId) {
            updateStep(stepId, {
              status: "completed",
              durationMs: stage.duration_ms,
            });
          }
        }

        setActiveStep("parse");
        toast.success(`成功导入文档，生成 ${data.chunks_created} 个分块`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        toast.error(`导入失败: ${message}`);
        setSteps((prev) =>
          prev.map((s) =>
            s.status === "running" ? { ...s, status: "error" } : s
          )
        );
      } finally {
        setLoading(false);
      }
    },
    [url]
  );

  // Handle paste submit
  const handlePasteSubmit = useCallback(() => {
    if (!pasteContent.trim()) return;
    handleIngest({
      content: pasteContent,
      title: pasteTitle || "粘贴文档",
      source_type: "paste",
    });
  }, [pasteContent, pasteTitle, handleIngest]);

  // Handle file submit
  const handleFileSubmit = useCallback(() => {
    if (!fileContent.trim()) return;
    handleIngest({
      content: fileContent,
      title: selectedFile?.name || "上传文件",
      source_type: "file",
    });
  }, [fileContent, selectedFile, handleIngest]);

  // Handle Feishu submit (existing flow)
  const handleFeishuSubmit = useCallback(() => {
    handleIngest();
  }, [handleIngest]);

  // Handle sample document import
  const handleSampleImport = useCallback(
    (doc: { title: string; content: string }) => {
      handleIngest({
        content: doc.content,
        title: doc.title,
        source_type: "sample",
      });
    },
    [handleIngest]
  );

  // Handle import all samples via quick-start
  const handleImportAllSamples = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rag/quick-start", { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Quick start failed");
      }
      const data = await res.json();
      toast.success(`成功导入 ${data.documents_created ?? ""} 篇示例文档`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      toast.error(`批量导入失败: ${message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch chunk comparison for multiple strategies
  const handleChunkCompare = useCallback(
    async (options: { chunkSize: number; chunkOverlap: number }) => {
      if (!result?.document.markdown) return;
      try {
        const res = await fetch("/api/rag/chunk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: result.document.markdown,
            strategies: ["fixed-size", "recursive", "document-aware"],
            options,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setChunkResults(data.results);
        }
      } catch {
        // silently fail for comparison preview
      }
    },
    [result]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">文档摄入工坊</h1>
        <p className="mt-2 text-muted-foreground">
          选择输入方式，可视化解析、分块、嵌入全过程
        </p>
      </div>

      {/* Input Method Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="size-5" />
            选择文档来源
          </CardTitle>
          <CardDescription>
            支持粘贴文本、上传文件、飞书链接或使用示例文档
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={inputTab} onValueChange={setInputTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="paste" className="gap-1.5">
                <ClipboardPaste className="size-3.5" />
                粘贴文本
              </TabsTrigger>
              <TabsTrigger value="file" className="gap-1.5">
                <FileUp className="size-3.5" />
                上传文件
              </TabsTrigger>
              <TabsTrigger value="feishu" className="gap-1.5">
                <Link2 className="size-3.5" />
                飞书链接
              </TabsTrigger>
              <TabsTrigger value="samples" className="gap-1.5">
                <BookOpen className="size-3.5" />
                示例文档
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Paste text */}
            <TabsContent value="paste">
              <div className="space-y-3">
                <Input
                  placeholder="文档标题（可选）"
                  value={pasteTitle}
                  onChange={(e) => setPasteTitle(e.target.value)}
                  disabled={loading}
                />
                <Textarea
                  placeholder="在此粘贴 Markdown 或纯文本内容..."
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  disabled={loading}
                  className="min-h-[200px]"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {pasteContent.length > 0
                      ? `${pasteContent.length} 字符`
                      : "支持 Markdown 格式"}
                  </span>
                  <Button
                    onClick={handlePasteSubmit}
                    disabled={!pasteContent.trim() || loading}
                  >
                    {loading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Download className="size-4" />
                    )}
                    {loading ? "处理中..." : "开始处理"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: File upload */}
            <TabsContent value="file">
              <div className="space-y-3">
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 transition-colors hover:border-primary/40 hover:bg-muted/50"
                >
                  <Upload className="size-8 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      拖拽文件到此处，或点击选择文件
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      支持 .md、.txt 文件
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                  />
                </div>
                {selectedFile && (
                  <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center gap-2">
                      <FileUp className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {selectedFile.name}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </Badge>
                    </div>
                    <Button
                      onClick={handleFileSubmit}
                      disabled={!fileContent.trim() || loading}
                    >
                      {loading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Download className="size-4" />
                      )}
                      {loading ? "处理中..." : "开始处理"}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab 3: Feishu link (existing) */}
            <TabsContent value="feishu">
              <div className="flex gap-2">
                <Input
                  placeholder="https://xxx.feishu.cn/docx/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleFeishuSubmit()}
                  disabled={loading}
                />
                <Button
                  onClick={handleFeishuSubmit}
                  disabled={!url.trim() || loading}
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  {loading ? "处理中..." : "开始摄入"}
                </Button>
              </div>
            </TabsContent>

            {/* Tab 4: Sample documents */}
            <TabsContent value="samples">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  {SAMPLE_DOCUMENTS.map((doc, idx) => (
                    <Card
                      key={idx}
                      className="flex flex-col justify-between transition-colors hover:border-primary/30"
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{doc.title}</CardTitle>
                        <CardDescription className="line-clamp-3 text-xs">
                          {doc.content.slice(0, 100)}...
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handleSampleImport(doc)}
                          disabled={loading}
                        >
                          {loading ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Download className="size-3.5" />
                          )}
                          导入
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="flex justify-center">
                  <Button
                    onClick={handleImportAllSamples}
                    disabled={loading}
                    className="gap-2"
                  >
                    {loading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                    一键导入全部
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Pipeline Flow */}
      <PipelineFlow steps={steps} activeStep={activeStep} onStepClick={setActiveStep} />

      {/* Step Details */}
      {result && (
        <Tabs value={activeStep ?? "parse"} onValueChange={setActiveStep}>
          <TabsList>
            <TabsTrigger value="fetch">原始文档</TabsTrigger>
            <TabsTrigger value="parse">解析结果</TabsTrigger>
            <TabsTrigger value="chunk">分块策略</TabsTrigger>
            <TabsTrigger value="embed">向量嵌入</TabsTrigger>
          </TabsList>

          {/* Tab 1: Raw document */}
          <TabsContent value="fetch">
            <StepCard title="原始文档" status="completed">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Badge>{result.document.title}</Badge>
                  <Badge variant="outline">{result.document.stats.totalChars} 字符</Badge>
                </div>
                <div className="prose prose-sm max-h-96 max-w-none overflow-y-auto rounded-lg border p-4 dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {result.document.markdown}
                  </ReactMarkdown>
                </div>
              </div>
            </StepCard>
          </TabsContent>

          {/* Tab 2: Parsed structure */}
          <TabsContent value="parse">
            <StepCard title="解析结果" status="completed">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="mb-2 text-sm font-medium">文档结构树</h4>
                  <div className="space-y-1 rounded-lg border p-3">
                    {result.document.structure.headings.map((h, i) => (
                      <div
                        key={i}
                        className="text-sm"
                        style={{ paddingLeft: `${(h.level - 1) * 16}px` }}
                      >
                        <span className="text-muted-foreground">{"#".repeat(h.level)}</span>{" "}
                        {h.text}
                      </div>
                    ))}
                    {result.document.structure.headings.length === 0 && (
                      <p className="text-sm text-muted-foreground">无标题结构</p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-medium">内容统计</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(result.document.stats).map(([key, value]) => (
                      <div key={key} className="rounded-lg border p-2 text-center">
                        <div className="text-lg font-bold">{value}</div>
                        <div className="text-xs text-muted-foreground">{key}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </StepCard>
          </TabsContent>

          {/* Tab 3: Chunking */}
          <TabsContent value="chunk">
            <StepCard title="分块策略对比" status="completed">
              {chunkResults ? (
                <ChunkComparison
                  results={chunkResults}
                  onOptionsChange={handleChunkCompare}
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      使用 recursive 策略生成 {result.chunks.length} 个分块
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleChunkCompare({ chunkSize: 500, chunkOverlap: 50 })}
                    >
                      加载多策略对比
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {result.chunks.slice(0, 9).map((chunk) => (
                      <Card key={chunk.id}>
                        <CardContent className="p-3">
                          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                            <span>Chunk {chunk.chunkIndex + 1}</span>
                            <span>{chunk.tokenCount} tokens</span>
                          </div>
                          <p className="line-clamp-3 text-sm">{chunk.content}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {result.chunks.length > 9 && (
                    <p className="text-center text-sm text-muted-foreground">
                      ...还有 {result.chunks.length - 9} 个分块
                    </p>
                  )}
                </div>
              )}
            </StepCard>
          </TabsContent>

          {/* Tab 4: Embeddings */}
          <TabsContent value="embed">
            <StepCard title="向量嵌入可视化" status="completed">
              <div className="grid gap-4 md:grid-cols-2">
                {result.visualization.vector_previews[0] && (
                  <VectorPreview
                    vector={result.visualization.vector_previews[0]}
                    dimensions={1024}
                    label="Chunk 1 向量"
                  />
                )}
                <SimilarityHeatmap
                  matrix={result.visualization.similarity_matrix}
                  labels={result.chunks.map((_, i) => `C${i + 1}`)}
                />
              </div>
              <div className="mt-4 flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                3D UMAP 可视化 (共 {result.visualization.umap_3d.length} 个点)
                — 需要在客户端渲染
              </div>
            </StepCard>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
