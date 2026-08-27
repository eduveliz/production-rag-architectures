import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { HybridSearchEngine, DocumentChunk } from "../04-hybrid-search/hybrid-search.js";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI(apiKey ? { apiKey } : {});

export interface ScoredChunk {
  id: string;
  text: string;
  initialScore: number;
  rerankScore: number;
  justification?: string;
  metadata?: Record<string, any>;
}

export interface RerankerOptions {
  model?: string;
  temperature?: number;
}

/**
 * TwoStageRAGRetriever implements a production-grade 2-stage retrieval pipeline:
 * - Stage 1 (Candidate Generation): Fast & Broad Hybrid Search (BM25 + Dense Vectors via RRF).
 * - Stage 2 (Precision Re-ranking): Full Cross-Attention deep semantic evaluation & re-scoring.
 */
export class TwoStageRAGRetriever {
  private model: string;
  private temperature: number;

  constructor(
    private hybridEngine: HybridSearchEngine,
    options: RerankerOptions = {}
  ) {
    this.model = options.model ?? "gemini-3.6-flash";
    this.temperature = options.temperature ?? 0.0;
  }

  /**
   * Evaluates and re-ranks candidate chunks using deep cross-attention semantic scoring.
   * @param query Search query from user.
   * @param candidates Initial candidates retrieved from stage 1.
   * @returns Re-ranked and scored candidates sorted by descending rerank score.
   */
  public async rerank(
    query: string,
    candidates: { id: string; text: string; rrfScore: number; metadata?: Record<string, any> }[]
  ): Promise<ScoredChunk[]> {
    if (candidates.length === 0) return [];

    // Format structured candidate payload for cross-scoring
    const candidateListText = candidates
      .map((c, i) => `[ID: ${c.id}] (Candidate ${i + 1}):\n${c.text}`)
      .join("\n\n");

    const systemInstruction = `You are a high-precision semantic relevance evaluation engine (Cross-Encoder / Re-ranker).
Your task is to critically score how relevant, precise, and sufficient each candidate fragment is to answer the user's query.
Assign a strict normalized score from 0.0 to 1.0 to each ID.
Criteria:
- 0.90 - 1.00: Directly answers all constraints and entities in the query.
- 0.60 - 0.89: Partially relevant or related context but misses key constraints.
- 0.00 - 0.59: Irrelevant or wrong technological stack/domain.

Respond ONLY in valid JSON format following this exact schema:
[
  { "id": "doc_id", "score": 0.95, "reason": "brief technical justification" }
]`;

    const userPrompt = `Query: "${query}"\n\nCandidates to evaluate:\n${candidateListText}`;

    try {
      const response = await ai.models.generateContent({
        model: this.model,
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: this.temperature,
          responseMimeType: "application/json",
        },
      });

      const parsedScores: { id: string; score: number; reason: string }[] = JSON.parse(
        response.text || "[]"
      );
      const scoreMap = new Map(parsedScores.map((s) => [s.id, s]));

      return candidates
        .map((cand) => {
          const evalData = scoreMap.get(cand.id);
          return {
            id: cand.id,
            text: cand.text,
            initialScore: cand.rrfScore,
            rerankScore: evalData ? evalData.score : 0,
            justification: evalData?.reason || "Score assigned by re-ranker model",
            metadata: cand.metadata,
          };
        })
        .sort((a, b) => b.rerankScore - a.rerankScore);
    } catch (e) {
      console.warn("⚠️ Warning: Error parsing reranker scores, falling back to initial RRF ranking:", e);
      return candidates.map((c) => ({
        id: c.id,
        text: c.text,
        initialScore: c.rrfScore,
        rerankScore: c.rrfScore,
        justification: "Fallback: Initial RRF score preserved due to evaluation error",
        metadata: c.metadata,
      }));
    }
  }

  /**
   * Complete Two-Stage Retrieval Pipeline:
   * - Stage 1: Retrieves `broadTopK` initial candidates using Hybrid Search (BM25 + Embeddings).
   * - Stage 2: Re-ranks and returns the top `finalTopK` most relevant candidates.
   */
  public async retrieve(
    query: string,
    broadTopK = 10,
    finalTopK = 3
  ): Promise<ScoredChunk[]> {
    // 1. First-Stage Retrieval (High recall, fast execution)
    const initialCandidates = await this.hybridEngine.search(query, broadTopK);

    // 2. Second-Stage Re-ranking (High precision, cross-attention scoring)
    const reranked = await this.rerank(query, initialCandidates);

    return reranked.slice(0, finalTopK);
  }
}
