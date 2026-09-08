import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI(apiKey ? { apiKey } : {});

export interface RouteDefinition {
  name: string;
  utterances: string[];
  threshold: number;
  description?: string;
}

export interface EncodedRoute {
  name: string;
  threshold: number;
  embeddings: number[][];
  utterances: string[];
}

export interface MatchResult {
  matchedRoute: string | null;
  score: number;
  latencyMs: number;
  matchedUtterance?: string;
}

export interface SemanticRouterOptions {
  model?: string;
}

/**
 * EmbeddingSemanticRouter provides ultra-fast, deterministic, zero-LLM intent classification.
 * It precomputes vector embeddings for canonical route utterances during service bootstrap
 * and evaluates incoming queries via vector cosine similarity in sub-millisecond local compute time,
 * eliminating the cost, variance, and high latency of generative LLM routing prompts.
 */
export class EmbeddingSemanticRouter {
  private encodedRoutes: EncodedRoute[] = [];
  private model: string;

  constructor(options: SemanticRouterOptions = {}) {
    this.model = options.model ?? "gemini-embedding-001";
  }

  /**
   * Computes dense semantic embedding for an input text using Gemini embedding models.
   */
  public async getEmbedding(text: string): Promise<number[]> {
    const response = await ai.models.embedContent({
      model: this.model,
      contents: text,
    });

    const values =
      response.embeddings?.[0]?.values ??
      (response as any).embedding?.values;

    if (!values || values.length === 0) {
      throw new Error(`Failed to calculate embedding for text: "${text.slice(0, 50)}..."`);
    }

    return values;
  }

  /**
   * Computes cosine similarity between two dense vectors.
   */
  public cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Precomputes and registers dense vectors for canonical route utterances during startup.
   */
  public async registerRoutes(routes: RouteDefinition[]): Promise<void> {
    this.encodedRoutes = [];

    for (const route of routes) {
      const embeddings: number[][] = [];
      for (const phrase of route.utterances) {
        const emb = await this.getEmbedding(phrase);
        embeddings.push(emb);
      }

      this.encodedRoutes.push({
        name: route.name,
        threshold: route.threshold,
        embeddings,
        utterances: [...route.utterances],
      });
    }
  }

  /**
   * Routes an incoming query against precomputed canonical vectors via cosine similarity.
   */
  public async route(query: string): Promise<MatchResult> {
    const start = performance.now();
    const queryEmb = await this.getEmbedding(query);

    let bestRoute: string | null = null;
    let highestScore = -1;
    let matchedUtterance: string | undefined = undefined;

    for (const route of this.encodedRoutes) {
      for (let i = 0; i < route.embeddings.length; i++) {
        const refEmb = route.embeddings[i];
        const score = this.cosineSimilarity(queryEmb, refEmb);

        if (score > highestScore) {
          highestScore = score;
          matchedUtterance = route.utterances[i];
          if (score >= route.threshold) {
            bestRoute = route.name;
          } else {
            bestRoute = null; // Below confidence threshold
          }
        }
      }
    }

    const latencyMs = performance.now() - start;

    return {
      matchedRoute: bestRoute,
      score: highestScore,
      latencyMs,
      matchedUtterance,
    };
  }

  public getRegisteredRoutes(): { name: string; utteranceCount: number; threshold: number }[] {
    return this.encodedRoutes.map((r) => ({
      name: r.name,
      utteranceCount: r.embeddings.length,
      threshold: r.threshold,
    }));
  }
}
