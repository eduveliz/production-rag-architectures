import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { DocumentChunk } from "../04-hybrid-search/hybrid-search.js";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI(apiKey ? { apiKey } : {});

export interface EnrichedChunk extends DocumentChunk {
  originalText: string;
  contextHeader: string;
}

export interface ContextualEnricherOptions {
  model?: string;
}

/**
 * ContextualEnricher implements Anthropic-style Contextual Retrieval / Chunk Pre-Enrichment.
 * It analyzes orphan document chunks against the global document context and generates
 * succinct, targeted situational context headers (clarifying implicit project names,
 * entities, versions, time periods, and architectural scope) prior to dense and sparse indexing.
 */
export class ContextualEnricher {
  private model: string;

  constructor(options: ContextualEnricherOptions = {}) {
    this.model = options.model ?? "gemini-3.1-flash-lite";
  }

  /**
   * Generates a concise, situational context header for an isolated chunk using the full document.
   */
  public async generateChunkContext(
    fullDocument: string,
    chunk: string
  ): Promise<string> {
    const systemInstruction = `You are a RAG architectural assistant specialized in semantic data enrichment and contextual retrieval.
You are provided with a complete technical document and an isolated chunk extracted from it.
Your task is to write 1 to 2 concise sentences (maximum 40 words) that situate this chunk within the global context of the full document.
Explicitly disambiguate implicit entities, systems, project names, technical scopes, versions, or timeframes not mentioned in the orphan chunk.
Return ONLY the succinct contextual text without tags, Markdown formatting, or meta-explanations.`;

    const userPrompt = `
<full_document>
${fullDocument}
</full_document>

<chunk>
${chunk}
</chunk>
`;

    try {
      const response = await ai.models.generateContent({
        model: this.model,
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: 0.0,
        },
      });

      return response.text?.trim() || "";
    } catch (err: any) {
      console.error("Context generation warning:", err?.message || err);
      return "";
    }
  }

  /**
   * Processes a list of raw orphan chunks, producing enriched, context-prepended chunks ready for indexing.
   */
  public async enrichChunks(
    fullDocument: string,
    rawChunks: { id: string; text: string; metadata?: Record<string, unknown> }[]
  ): Promise<EnrichedChunk[]> {
    const enriched: EnrichedChunk[] = [];

    for (const raw of rawChunks) {
      const contextHeader = await this.generateChunkContext(fullDocument, raw.text);
      const contextualizedText = contextHeader
        ? `[Context: ${contextHeader}]\n${raw.text}`
        : raw.text;

      enriched.push({
        id: raw.id,
        text: contextualizedText,
        originalText: raw.text,
        contextHeader,
        metadata: raw.metadata,
      });
    }

    return enriched;
  }
}
