import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { HybridSearchEngine, DocumentChunk } from "../04-hybrid-search/hybrid-search.js";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI(apiKey ? { apiKey } : {});

export interface TransformedQueries {
  original: string;
  multiQueries: string[];
  stepBackQuery: string;
  hypotheticalDocument: string;
}

export interface QueryTransformerOptions {
  model?: string;
}

export interface ExpandedRetrievalResult {
  id: string;
  text: string;
  rrfScore: number;
  matchedQueriesCount: number;
  metadata?: Record<string, any>;
}

/**
 * QueryTransformer implements 3 foundational query transformation strategies:
 * 1. Multi-Query Expansion (lexical and perspective diversity)
 * 2. Step-Back Prompting (high-level abstract principles)
 * 3. Hypothetical Document Embeddings - HyDE (pseudo-document generation for dense retrieval)
 */
export class QueryTransformer {
  private model: string;

  constructor(options: QueryTransformerOptions = {}) {
    this.model = options.model ?? "gemini-3.6-flash";
  }

  /**
   * Generates alternative semantic and lexical reformulations of the original query.
   */
  async generateMultiQueries(query: string, count = 3): Promise<string[]> {
    const systemInstruction = `You are a search query optimizer for technical RAG architectures.
Generate exactly ${count} alternative, complementary reformulations of the user query covering diverse technical angles, terminology, and synonyms.
Return ONLY a valid JSON array of strings: ["query 1", "query 2", ...]`;

    try {
      const response = await ai.models.generateContent({
        model: this.model,
        contents: `Original Query: "${query}"`,
        config: {
          systemInstruction,
          temperature: 0.3,
          responseMimeType: "application/json",
        },
      });

      const parsed: string[] = JSON.parse(response.text || "[]");
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [query];
    } catch {
      return [query];
    }
  }

  /**
   * Generates a broader, higher-level conceptual question (Step-Back Prompting).
   */
  async generateStepBackQuery(query: string): Promise<string> {
    const systemInstruction = `You are an expert in conceptual abstraction.
Given a specific technical problem or query, formulate a broader "step-back" question focusing on the underlying core concepts, protocols, or theoretical principles.
Return ONLY the generated question as plain text with no quotes or preamble.`;

    try {
      const response = await ai.models.generateContent({
        model: this.model,
        contents: query,
        config: {
          systemInstruction,
          temperature: 0.1,
        },
      });

      return response.text?.trim() || query;
    } catch {
      return query;
    }
  }

  /**
   * Generates a hypothetical technical answer passage to bridge query-document semantic space (HyDE).
   */
  async generateHypotheticalDocument(query: string): Promise<string> {
    const systemInstruction = `Write a brief hypothetical technical documentation passage (1 paragraph of 50-80 words) that directly answers the given query.
Adopt a formal, authoritative technical documentation tone without caveats.`;

    try {
      const response = await ai.models.generateContent({
        model: this.model,
        contents: query,
        config: {
          systemInstruction,
          temperature: 0.2,
        },
      });

      return response.text?.trim() || query;
    } catch {
      return query;
    }
  }

  /**
   * Executes all 3 transformation strategies concurrently.
   */
  async transform(query: string): Promise<TransformedQueries> {
    const [multiQueries, stepBackQuery, hypotheticalDocument] = await Promise.all([
      this.generateMultiQueries(query),
      this.generateStepBackQuery(query),
      this.generateHypotheticalDocument(query),
    ]);

    return {
      original: query,
      multiQueries,
      stepBackQuery,
      hypotheticalDocument,
    };
  }
}

/**
 * MultiQueryRetriever orchestrates parallel multi-query execution across transformed variants,
 * aggregating RRF scores cumulatively with deduplication.
 */
export class MultiQueryRetriever {
  constructor(
    private transformer: QueryTransformer,
    private hybridEngine: HybridSearchEngine
  ) {}

  async retrieveExpanded(
    originalQuery: string,
    topKPerQuery = 2,
    finalTopK = 5
  ): Promise<ExpandedRetrievalResult[]> {
    const transformed = await this.transformer.transform(originalQuery);

    const allQueriesToSearch = [
      originalQuery,
      ...transformed.multiQueries,
      transformed.stepBackQuery,
      transformed.hypotheticalDocument,
    ];

    // Execute parallel searches across hybrid engine
    const searchPromises = allQueriesToSearch.map((q) =>
      this.hybridEngine.search(q, topKPerQuery)
    );
    const resultsArray = await Promise.all(searchPromises);

    // Deduplicate and accumulate RRF scores across all retrieval signals
    const aggregatedResults = new Map<
      string,
      { id: string; text: string; rrfScore: number; matchedQueriesCount: number; metadata?: Record<string, any> }
    >();

    for (const results of resultsArray) {
      for (const item of results) {
        const existing = aggregatedResults.get(item.id);
        if (existing) {
          existing.rrfScore += item.rrfScore; // Cumulative signal reinforcement
          existing.matchedQueriesCount += 1;
        } else {
          aggregatedResults.set(item.id, {
            id: item.id,
            text: item.text,
            rrfScore: item.rrfScore,
            matchedQueriesCount: 1,
            metadata: item.metadata,
          });
        }
      }
    }

    return Array.from(aggregatedResults.values())
      .sort((a, b) => b.rrfScore - a.rrfScore)
      .slice(0, finalTopK);
  }
}
