import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { TwoStageRAGRetriever } from "../05-reranker/reranker.js";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI(apiKey ? { apiKey } : {});

export type RouteDestination =
  | "DIRECT_RESPONSE"
  | "STRUCTURED_QUERY"
  | "VECTOR_RAG";

export interface RoutingDecision {
  destination: RouteDestination;
  confidence: number;
  reasoning: string;
}

export interface AdaptiveRouterOptions {
  model?: string;
}

export interface AdaptiveExecutionResult {
  route: RouteDestination;
  confidence: number;
  reasoning: string;
  output: string;
}

/**
 * AdaptiveRAGRouter analyzes user query intent and dynamically routes the request
 * to the optimal specialized execution subsystem (Direct LLM, Structured SQL/API, or Full Two-Stage Vector RAG).
 */
export class AdaptiveRAGRouter {
  private model: string;

  constructor(options: AdaptiveRouterOptions = {}) {
    this.model = options.model ?? "gemini-3.6-flash";
  }

  /**
   * Evaluates query intent and returns a structured routing decision.
   */
  async routeQuery(query: string): Promise<RoutingDecision> {
    const systemInstruction = `You are a high-speed intelligent query dispatcher for an enterprise AI architecture.
Classify the incoming user query into EXACTLY one of the following three execution categories:

1. DIRECT_RESPONSE: Greetings, conversational pleasantries, general logic, basic arithmetic, or simple non-domain questions that do not require external knowledge retrieval.
2. STRUCTURED_QUERY: Questions requesting exact quantitative metrics, column-based relational aggregations, sales totals, counts, or tabular database reports.
3. VECTOR_RAG: Technical domain questions, documentation lookups, systems architecture, policy manuals, debugging, or unstructured text knowledge.

Return ONLY a valid JSON object with the following schema:
{
  "destination": "DIRECT_RESPONSE" | "STRUCTURED_QUERY" | "VECTOR_RAG",
  "confidence": number (0.0 to 1.0),
  "reasoning": "concise technical justification"
}`;

    try {
      const response = await ai.models.generateContent({
        model: this.model,
        contents: `User Query: "${query}"`,
        config: {
          systemInstruction,
          temperature: 0.0,
          responseMimeType: "application/json",
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      return {
        destination: parsed.destination ?? "VECTOR_RAG",
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.8,
        reasoning: parsed.reasoning || "Categorized based on semantic intent",
      };
    } catch {
      return {
        destination: "VECTOR_RAG",
        confidence: 0.5,
        reasoning: "Fallback to Vector RAG due to classification parsing exception.",
      };
    }
  }

  /**
   * Dispatches and executes the query through the selected subsystem pipeline.
   */
  async execute(
    query: string,
    retriever: TwoStageRAGRetriever
  ): Promise<AdaptiveExecutionResult> {
    const decision = await this.routeQuery(query);

    switch (decision.destination) {
      case "DIRECT_RESPONSE": {
        const response = await ai.models.generateContent({
          model: this.model,
          contents: query,
          config: {
            temperature: 0.2,
          },
        });

        return {
          route: "DIRECT_RESPONSE",
          confidence: decision.confidence,
          reasoning: decision.reasoning,
          output: response.text?.trim() || "No response generated.",
        };
      }

      case "STRUCTURED_QUERY": {
        // Simulated deterministic SQL / Analytics execution path
        const mockStructuredResult =
          `[SQL Analytics Engine] Executed: SELECT SUM(amount) AS total_sales, COUNT(*) AS txn_count FROM platform_sales WHERE period = 'last_month';\n` +
          `-> Result: Total Gross Volume: $142,500.00 USD across 1,840 transactions.`;

        return {
          route: "STRUCTURED_QUERY",
          confidence: decision.confidence,
          reasoning: decision.reasoning,
          output: mockStructuredResult,
        };
      }

      case "VECTOR_RAG":
      default: {
        // Execute Two-Stage Retrieval (Hybrid Search + Deep Re-ranking)
        const relevantDocs = await retriever.retrieve(query, 5, 2);
        const contextText = relevantDocs
          .map((d, i) => `[Document ${i + 1}] (Re-rank Score: ${d.rerankScore.toFixed(2)}):\n${d.text}`)
          .join("\n\n---\n\n");

        const response = await ai.models.generateContent({
          model: this.model,
          contents: `
<context>
${contextText}
</context>

Question: ${query}
`,
          config: {
            systemInstruction:
              "You are a precise technical assistant. Answer the user question based strictly on the provided context.",
            temperature: 0.1,
          },
        });

        return {
          route: "VECTOR_RAG",
          confidence: decision.confidence,
          reasoning: decision.reasoning,
          output: response.text?.trim() || "No response generated.",
        };
      }
    }
  }
}
