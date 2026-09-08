import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { HybridSearchEngine } from "../04-hybrid-search/hybrid-search.js";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI(apiKey ? { apiKey } : {});

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export interface ConversationalResponse {
  standAloneQuery: string;
  answer: string;
  retrievedContextIds: string[];
}

export interface ConversationalOptions {
  model?: string;
  historyWindowSize?: number;
}

/**
 * ConversationalRAGSession maintains conversational chat history and performs
 * upstream contextual query condensation (anaphora & coreference resolution)
 * before executing retrieval, preventing topic dilution and vector pollution.
 */
export class ConversationalRAGSession {
  private history: ChatMessage[] = [];
  private model: string;
  private historyWindowSize: number;

  constructor(
    private searchEngine: HybridSearchEngine,
    options: ConversationalOptions = {}
  ) {
    this.model = options.model ?? "gemini-3.1-flash-lite";
    this.historyWindowSize = options.historyWindowSize ?? 6; // Last 3 user/model turns
  }

  /**
   * Recontextualizes ambiguous or pronoun-heavy follow-up queries into self-contained standalone questions.
   */
  public async condenseQuery(currentQuery: string): Promise<string> {
    if (this.history.length === 0) {
      return currentQuery;
    }

    const conversationContext = this.history
      .slice(-this.historyWindowSize)
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");

    const systemInstruction = `You are a query re-writing and coreference resolution module for conversational RAG systems.
Your exclusive task is to analyze the conversation history and the user's latest follow-up query.
If the latest query contains pronouns ("it", "they", "its"), ellipsis, or depends on previous conversation turns, rewrite it into a fully standalone, self-contained search query.
If the query is already independent and complete, return it unchanged.
DO NOT answer the question. Return ONLY the rewritten standalone query as plain text with no quotation marks or preamble.`;

    try {
      const response = await ai.models.generateContent({
        model: this.model,
        contents: `Conversation History:\n${conversationContext}\n\nLatest User Query: "${currentQuery}"`,
        config: {
          systemInstruction,
          temperature: 0.0,
        },
      });

      return response.text?.trim() || currentQuery;
    } catch {
      return currentQuery;
    }
  }

  /**
   * Executes a full conversational turn:
   * 1. Condenses query via coreference resolution
   * 2. Retrieves context using the standalone query
   * 3. Generates grounded answer
   * 4. Updates session history
   */
  public async chat(userQuery: string, topK = 3): Promise<ConversationalResponse> {
    // 1. Coreference & anaphora resolution
    const standAloneQuery = await this.condenseQuery(userQuery);

    // 2. Hybrid retrieval using the disambiguated standalone query
    const candidates = await this.searchEngine.search(standAloneQuery, topK);
    const contextText = candidates
      .map((c) => `[Document ID: ${c.id}]\n${c.text}`)
      .join("\n\n---\n\n");

    // 3. Grounded generation
    const prompt = `
<context>
${contextText}
</context>

Question: ${standAloneQuery}
`;

    let answer = "Could not generate response.";
    try {
      const generationResponse = await ai.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          systemInstruction:
            "You are a precise technical assistant. Answer the user question based strictly on the provided context.",
          temperature: 0.1,
        },
      });
      answer = generationResponse.text?.trim() || answer;
    } catch (err: any) {
      answer = `Error during generation: ${err?.message || err}`;
    }

    // 4. Update session history
    this.history.push({ role: "user", content: userQuery });
    this.history.push({ role: "model", content: answer });

    return {
      standAloneQuery,
      answer,
      retrievedContextIds: candidates.map((c) => c.id),
    };
  }

  public getHistory(): ChatMessage[] {
    return [...this.history];
  }

  public clearHistory(): void {
    this.history = [];
  }
}
