import "dotenv/config";
import { InMemoryVectorStore } from "../02-vector-store/vector-store.js";

export interface DocumentChunk {
  id: string;
  text: string;
  metadata?: Record<string, any>;
}

export interface BM25SearchResult {
  id: string;
  score: number;
}

export interface HybridSearchResult {
  id: string;
  text: string;
  rrfScore: number;
  bm25Rank?: number;
  vectorRank?: number;
  metadata?: Record<string, any>;
}

/**
 * BM25 Sparse Lexical Search Index.
 * Implements Okapi BM25 ranking algorithm with term frequency saturation
 * and document length normalization.
 */
export class BM25Index {
  private docCount = 0;
  private avgDocLength = 0;
  private docLengths: Map<string, number> = new Map();
  private docTermFreqs: Map<string, Map<string, number>> = new Map();
  private invertedIndex: Map<string, Set<string>> = new Map();

  // Industry-standard BM25 hyperparameters
  private readonly k1 = 1.5;
  private readonly b = 0.75;

  // Standard bilingual stop words to prevent trivial grammatical prepositions from polluting lexical ranking
  private static readonly STOP_WORDS = new Set([
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "he",
    "in", "is", "it", "its", "of", "on", "that", "the", "to", "was", "were", "will", "with",
    "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "en", "para", "por",
    "con", "que", "es", "son", "al", "se", "su", "sus", "o", "u", "y", "e"
  ]);

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 1 && !BM25Index.STOP_WORDS.has(t));
  }

  public indexDocuments(docs: DocumentChunk[]): void {
    this.docCount = docs.length;
    let totalLength = 0;

    for (const doc of docs) {
      const tokens = this.tokenize(doc.text);
      const length = tokens.length;
      this.docLengths.set(doc.id, length);
      totalLength += length;

      const tfMap = new Map<string, number>();
      for (const token of tokens) {
        tfMap.set(token, (tfMap.get(token) || 0) + 1);
        if (!this.invertedIndex.has(token)) {
          this.invertedIndex.set(token, new Set());
        }
        this.invertedIndex.get(token)!.add(doc.id);
      }
      this.docTermFreqs.set(doc.id, tfMap);
    }

    this.avgDocLength = this.docCount > 0 ? totalLength / this.docCount : 0;
  }

  public search(query: string, topK = 5): BM25SearchResult[] {
    const queryTokens = this.tokenize(query);
    const scores = new Map<string, number>();

    for (const token of queryTokens) {
      const matchingDocs = this.invertedIndex.get(token);
      if (!matchingDocs) continue;

      // Inverse Document Frequency (IDF) with smoothing
      const df = matchingDocs.size;
      const idf = Math.log((this.docCount - df + 0.5) / (df + 0.5) + 1);

      for (const docId of matchingDocs) {
        const tf = this.docTermFreqs.get(docId)?.get(token) || 0;
        const docLength = this.docLengths.get(docId) || 0;

        // BM25 scoring formula with length normalization
        const numerator = tf * (this.k1 + 1);
        const denominator =
          tf +
          this.k1 * (1 - this.b + this.b * (this.avgDocLength > 0 ? docLength / this.avgDocLength : 1));
        const tokenScore = idf * (numerator / denominator);

        scores.set(docId, (scores.get(docId) || 0) + tokenScore);
      }
    }

    return Array.from(scores.entries())
      .map(([id, score]) => ({ id, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}

/**
 * Hybrid Search Engine fusing Sparse Lexical Search (BM25)
 * and Dense Semantic Search (Vector Embeddings) using Reciprocal Rank Fusion (RRF).
 */
export class HybridSearchEngine {
  private bm25 = new BM25Index();
  private docMap: Map<string, DocumentChunk> = new Map();

  constructor(private vectorStore: InMemoryVectorStore) {}

  public async addDocuments(docs: DocumentChunk[]): Promise<void> {
    docs.forEach((d) => this.docMap.set(d.id, d));
    this.bm25.indexDocuments(docs);
    await this.vectorStore.addDocuments(
      docs.map((d) => d.text),
      { indexedBy: "hybrid_search_engine" }
    );
  }

  /**
   * Performs hybrid search combining BM25 and Dense Vector search via RRF.
   * Formula: RRF(d) = \sum_{m \in M} \frac{1}{k + r_m(d)}
   * @param query Search query.
   * @param topK Number of final ranked results to return.
   * @param rrfK Smoothing constant (default: 60).
   */
  public async search(
    query: string,
    topK = 3,
    rrfK = 60
  ): Promise<HybridSearchResult[]> {
    // 1. Sparse Lexical Search (BM25)
    const bm25Results = this.bm25.search(query, 10);

    // 2. Dense Semantic Search (Embeddings)
    const vectorResults = await this.vectorStore.search(query, 10);

    // 3. Reciprocal Rank Fusion (RRF)
    const rrfScores = new Map<string, number>();
    const bm25RankMap = new Map<string, number>();
    const vectorRankMap = new Map<string, number>();

    // Accumulate BM25 reciprocal ranks
    bm25Results.forEach((res, index) => {
      const rank = index + 1; // 1-based rank
      bm25RankMap.set(res.id, rank);
      const current = rrfScores.get(res.id) || 0;
      rrfScores.set(res.id, current + 1 / (rrfK + rank));
    });

    // Accumulate Dense Vector Store reciprocal ranks
    vectorResults.forEach((res, index) => {
      const rank = index + 1; // 1-based rank
      // Match retrieved text back to original document ID
      const docEntry = Array.from(this.docMap.entries()).find(
        ([_, doc]) => doc.text === res.text
      );
      if (docEntry) {
        const docId = docEntry[0];
        vectorRankMap.set(docId, rank);
        const current = rrfScores.get(docId) || 0;
        rrfScores.set(docId, current + 1 / (rrfK + rank));
      }
    });

    // 4. Sort documents by descending RRF score
    return Array.from(rrfScores.entries())
      .map(([id, rrfScore]) => {
        const doc = this.docMap.get(id);
        return {
          id,
          text: doc?.text || "",
          rrfScore,
          bm25Rank: bm25RankMap.get(id),
          vectorRank: vectorRankMap.get(id),
          metadata: doc?.metadata,
        };
      })
      .sort((a, b) => b.rrfScore - a.rrfScore)
      .slice(0, topK);
  }
}
