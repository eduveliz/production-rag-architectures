import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI(apiKey ? { apiKey } : {});

export interface VectorRecord {
  id: string;
  text: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

export interface SearchResult {
  id: string;
  text: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface VectorStoreOptions {
  model?: string;
}

export class InMemoryVectorStore {
  private records: VectorRecord[] = [];
  private model: string;

  constructor(options: VectorStoreOptions = {}) {
    this.model = options.model ?? "gemini-embedding-001";
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) {
      throw new Error("Vectors must have the same non-zero length for cosine similarity calculation.");
    }
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await ai.models.embedContent({
      model: this.model,
      contents: text,
    });

    const values =
      response.embeddings?.[0]?.values ??
      (response as any).embedding?.values;

    if (!values || values.length === 0) {
      throw new Error(`Failed to generate embedding for input: "${text.slice(0, 50)}..."`);
    }

    return values;
  }

  async addDocuments(
    chunks: string[],
    metadata: Record<string, any> = {}
  ): Promise<string[]> {
    const ids: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i].trim();
      if (!chunkText) continue;

      const embedding = await this.generateEmbedding(chunkText);
      const id = `chunk_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`;

      this.records.push({
        id,
        text: chunkText,
        embedding,
        metadata: { ...metadata, chunkIndex: i },
      });

      ids.push(id);
    }

    return ids;
  }

  async addDocument(
    text: string,
    metadata: Record<string, any> = {}
  ): Promise<string> {
    const ids = await this.addDocuments([text], metadata);
    return ids[0];
  }

  async search(query: string, topK = 2): Promise<SearchResult[]> {
    if (this.records.length === 0) {
      return [];
    }

    // 1. Generate dense embedding vector for the user query
    const queryVector = await this.generateEmbedding(query);

    // 2. Calculate cosine similarity against all stored vector records
    const scoredResults = this.records.map((record) => ({
      id: record.id,
      text: record.text,
      score: this.cosineSimilarity(queryVector, record.embedding),
      metadata: record.metadata,
    }));

    // 3. Sort by descending similarity score and return topK
    return scoredResults
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  count(): number {
    return this.records.length;
  }

  getRecords(): VectorRecord[] {
    return [...this.records];
  }

  clear(): void {
    this.records = [];
  }
}
