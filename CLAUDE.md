# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI RAG Pipeline — a Node.js system that converts Feishu (飞书) documents into a RAG knowledge base using a three-stage pipeline: **Clone** (collect from Feishu API) → **Clean** (AI-enhanced content processing via OpenAI) → **Upload** (vector embeddings + Elasticsearch indexing). MongoDB provides incremental update caching.

## Commands

```bash
# Install dependencies
npm install

# Run full pipeline
npm start                    # or: npm run pipeline
npm start pipeline --folders "folder1,folder2"

# Run individual stages
npm run clone                # document collection only
npm run clean                # AI content processing only
npm run upload               # ES indexing only

# Testing
npm test                     # run all tests
npm test -- --watch          # watch mode
npx jest tests/config/validator.test.js   # single test file
npx jest --testNamePattern="should validate"  # by test name

# Lint
npm run lint                 # eslint src/**/*.js

# Build (lint + test)
npm run build

# Dev mode (Node --watch)
npm run dev

# Docker
docker-compose up -d         # start all services (ES, MongoDB, Redis, etc.)
```

## Architecture

**Three-stage pipeline** orchestrated by `PipelineOrchestrator`:

```
src/index.js (RAGPipeline)  →  CLI entry point, command parsing
  └─ pipeline-orchestrator.js   →  stage coordination, health checks
       ├─ stages/clone-stage.js     →  Feishu doc collection + incremental detection
       ├─ stages/clean-stage.js     →  AI content enhancement + document splitting
       └─ stages/upload-stage.js    →  embedding generation + ES bulk indexing
```

**Services** (`src/services/`): each wraps a single external dependency:
- `feishu-client.js` — Feishu API with auto-refreshing tenant tokens
- `openai-service.js` — GPT-4 for title/summary/keywords + ada-002 embeddings, with concurrency queue
- `elasticsearch-client.js` — index management + vector similarity search
- `mongodb-cache.js` — hash-based change detection for incremental updates
- `logger.js` — Winston JSON logger with child logger pattern

**Config** (`src/config/`): all settings via environment variables, validated by `ConfigValidator` at startup. See `config.example.js` for required vars (Feishu, OpenAI, ES, MongoDB credentials).

## Key Conventions

- **CommonJS modules** (`require`/`module.exports`), not ESM
- **File naming**: kebab-case (`feishu-client.js`)
- **Stage interface**: each stage implements `initialize()`, `execute(options)`, `cleanup()`, `healthCheck()`
- **Inter-stage data**: stages pass standardized result objects with `{ stage, success, duration, stats, documents, errors }`
- **Error handling**: try-catch with Winston logging at every boundary; individual document failures don't stop the batch
- **Test setup**: `tests/setup.js` provides mock env vars, mock logger, and document factories — tests don't hit real APIs

## Test Coverage

Jest coverage thresholds: 70% branches, 80% functions/lines/statements. Coverage excludes `src/index.js` and `src/config/`. Test timeout is 30 seconds.

## CLI Flags

`--force-full` (full recollection), `--force-reprocess` (skip AI cache), `--force-reindex` (rebuild ES index), `--batch-size N`, `--max-concurrent N`, `--skip-stages stage1,stage2`.
