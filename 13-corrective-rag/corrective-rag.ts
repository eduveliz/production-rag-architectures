import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { HybridSearchEngine, DocumentChunk } from "../04-hybrid-search/hybrid-search.js";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI(apiKey ? { apiKey } : {});

export type RetrievalConfidence = "CORRECT" | "AMBIGUOUS" | "INCORRECT";

export interface RetrievalAudit {
  status: RetrievalConfidence;
  confidenceScore: number;
  reasoning: string;
  filteredKnowledge?: string;
}

export interface CorrectiveRAGOptions {
  model?: string;
}

export interface CorrectiveRAGResult {
  answer: string;
  audit: RetrievalAudit;
  retrievedDocs: DocumentChunk[];
}

/**
 * CorrectiveRAGPipeline implements Corrective Retrieval-Augmented Generation (CRAG).
 * It evaluates retrieved document relevance via an active Retrieval Evaluator,
 * determines confidence (CORRECT, AMBIGUOUS, INCORRECT), and executes targeted corrective
 * pathways (direct verified generation, decomposed/refined generation, or explicit fallback routing)
 * to eliminate noise-induced hallucinations.
 */
export class CorrectiveRAGPipeline {
  private model: string;

  constructor(
    private searchEngine: HybridSearchEngine,
    options: CorrectiveRAGOptions = {}
  ) {
    this.model = options.model ?? "gemini-3.1-flash-lite";
  }

  /**
   * Critically assesses retrieved chunks against the query to evaluate informational sufficiency and relevance.
   */
  public async auditRetrievedContext(
    query: string,
    rawChunks: DocumentChunk[]
  ): Promise<RetrievalAudit> {
    if (rawChunks.length === 0) {
      return {
        status: "INCORRECT",
        confidenceScore: 0.0,
        reasoning: "No candidate documents were returned from initial retrieval.",
      };
    }

    const contextContent = rawChunks
      .map((c, i) => `[Doc ${i + 1} - ID: ${c.id}]\n${c.text}`)
      .join("\n\n");

    const systemInstruction = `You are a strict Retrieval Evaluator for production mission-critical RAG systems.
Analyze whether the provided documents provide sufficient, truthful, and direct information to answer the user's query.
Classify the retrieval status into exactly one of three states:
- CORRECT: The context contains direct, sufficient, and unambiguous information to answer the user's query.
- AMBIGUOUS: The context contains relevant or related background information, but is partial, incomplete, or mixed with distracting noise.
- INCORRECT: The context is irrelevant, out-of-domain, or completely lacks the necessary facts to answer the question.

Return ONLY a valid JSON object matching this schema:
{
  "status": "CORRECT" | "AMBIGUOUS" | "INCORRECT",
  "confidenceScore": number (0.0 to 1.0),
  "reasoning": "concise technical justification",
  "filteredKnowledge": "condensed distillation of only the verified facts relevant to the query (omit if INCORRECT)"
}`;

    try {
      const response = await ai.models.generateContent({
        model: this.model,
        contents: `User Query:\n"${query}"\n\nRetrieved Documents:\n${contextContent}`,
        config: {
          systemInstruction,
          temperature: 0.0,
          responseMimeType: "application/json",
        },
      });

      const text = response.text?.trim() || "{}";
      const cleanJson = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      const parsed = JSON.parse(cleanJson);

      return {
        status: parsed.status || "AMBIGUOUS",
        confidenceScore: typeof parsed.confidenceScore === "number" ? parsed.confidenceScore : 0.5,
        reasoning: parsed.reasoning || "Automated retrieval audit completed.",
        filteredKnowledge: parsed.filteredKnowledge,
      };
    } catch {
      return {
        status: "AMBIGUOUS",
        confidenceScore: 0.5,
        reasoning: "Audit parsing failure; treating conservatively as ambiguous.",
        filteredKnowledge: rawChunks.map((c) => c.text).join("\n"),
      };
    }
  }

  /**
   * Executes the dynamic corrective RAG workflow:
   * 1. Broad retrieval
   * 2. Context evaluation / audit
   * 3. Tri-state branch execution (CORRECT -> Refined generation, AMBIGUOUS -> Bounded generation, INCORRECT -> Safe fallback)
   */
  public async answerWithCorrection(
    query: string,
    topK = 3
  ): Promise<CorrectiveRAGResult> {
    // 1. Initial retrieval
    const candidates = await this.searchEngine.search(query, topK);
    const candidateChunks: DocumentChunk[] = candidates.map((c) => ({
      id: c.id,
      text: c.text,
      metadata: c.metadata,
    }));

    // 2. Active retrieval audit
    const audit = await this.auditRetrievedContext(query, candidateChunks);

    // 3. Dynamic branching based on confidence state
    switch (audit.status) {
      case "CORRECT": {
        const prompt = `Verified Technical Context:\n${audit.filteredKnowledge || candidateChunks.map((c) => c.text).join("\n")}\n\nUser Question: ${query}`;
        const resp = await ai.models.generateContent({
          model: this.model,
          contents: prompt,
          config: {
            systemInstruction:
              "You are a precise technical expert. Answer the user question concisely and accurately based strictly on the verified context.",
            temperature: 0.1,
          },
        });
        return {
          answer: resp.text?.trim() || "Unable to synthesize verified answer.",
          audit,
          retrievedDocs: candidateChunks,
        };
      }

      case "AMBIGUOUS": {
        const prompt = `Note: The retrieved context is partial or incomplete.
Verified partial knowledge:
${audit.filteredKnowledge || candidateChunks.map((c) => c.text).join("\n")}

User Question: ${query}

Instructions: Answer strictly using what can be formally proven from the verified partial context. Explicitly declare any missing gaps, limitations, or unverified aspects without hallucinating.`;
        const resp = await ai.models.generateContent({
          model: this.model,
          contents: prompt,
          config: {
            systemInstruction:
              "You are a cautious technical assistant. Provide bounded responses and explicitly state information boundaries.",
            temperature: 0.1,
          },
        });
        return {
          answer: resp.text?.trim() || "Unable to synthesize bounded answer.",
          audit,
          retrievedDocs: candidateChunks,
        };
      }

      case "INCORRECT":
      default: {
        // Safe fallback: Block noise injection and prevent hallucinations
        const fallbackPrompt = `The internal knowledge base does not contain relevant or authoritative information to answer the following query: "${query}".
Explain concisely that internal technical documentation is insufficient to answer this specific inquiry with certainty, preventing speculative hallucinations.`;
        const resp = await ai.models.generateContent({
          model: this.model,
          contents: fallbackPrompt,
          config: {
            systemInstruction:
              "You are a secure, truthful assistant. Formulate a professional fallback statement declaring missing knowledge without hallucinating or speculating.",
            temperature: 0.1,
          },
        });
        return {
          answer: resp.text?.trim() || "No authoritative internal documentation available.",
          audit,
          retrievedDocs: candidateChunks,
        };
      }
    }
  }
}
