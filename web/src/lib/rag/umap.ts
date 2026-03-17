import { UMAP } from 'umap-js';

interface UMAPResult {
  points3D: Array<{ x: number; y: number; z: number }>;
}

export function computeUMAP3D(embeddings: number[][]): UMAPResult {
  const n = embeddings.length;

  // Edge case: fewer than 3 embeddings — UMAP needs a minimum neighborhood size.
  // Return deterministic spread coordinates instead.
  if (n < 3) {
    const spread: Array<{ x: number; y: number; z: number }> = [];
    for (let i = 0; i < n; i++) {
      spread.push({
        x: i * 5,
        y: 0,
        z: 0,
      });
    }
    return { points3D: spread };
  }

  const umap = new UMAP({
    nComponents: 3,
    nNeighbors: Math.min(15, n - 1), // nNeighbors must be < n
    minDist: 0.1,
  });

  const projected = umap.fit(embeddings);

  const points3D = projected.map((point) => ({
    x: point[0],
    y: point[1],
    z: point[2],
  }));

  return { points3D };
}

export function computeSimilarityMatrix(embeddings: number[][]): number[][] {
  const n = embeddings.length;

  // Pre-compute magnitudes
  const magnitudes = embeddings.map((vec) => {
    let sum = 0;
    for (let i = 0; i < vec.length; i++) {
      sum += vec[i] * vec[i];
    }
    return Math.sqrt(sum);
  });

  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1; // self-similarity is always 1
    for (let j = i + 1; j < n; j++) {
      let dot = 0;
      for (let k = 0; k < embeddings[i].length; k++) {
        dot += embeddings[i][k] * embeddings[j][k];
      }
      const denom = magnitudes[i] * magnitudes[j];
      const similarity = denom === 0 ? 0 : dot / denom;
      const rounded = parseFloat(similarity.toFixed(4));
      matrix[i][j] = rounded;
      matrix[j][i] = rounded;
    }
  }

  return matrix;
}
