import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI(apiKey ? { apiKey } : {});

export interface ParentDocument {
  id: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface ChildChunk {
  id: string;
  parentId: string;
  text: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
}

export interface ScoredParentDocument extends ParentDocument {
  matchedChildScore: number;
  matchedChildText: string;
}

export interface ParentRetrieverOptions {
  model?: string;
}

/**
 * ParentDocumentRetriever implements a Hierarchical "Small-to-Big" Retrieval architecture.
 * It resolves the Chunk Size Dilemma by decoupling retrieval embeddings (small focused child chunks)
 * from generation context (full rich parent documents).
 */
export class ParentDocumentRetriever {
  private docStore: Map<string, ParentDocument> = new Map();
  private childStore: ChildChunk[] = [];
  private model: string;

  constructor(options: ParentRetrieverOptions = {}) {
    this.model = options.model ?? "gemini-embedding-001";
  }

  /**
   * Generates dense embedding vector using the configured Gemini embedding model.
   */
  private async getEmbedding(text: string): Promise<number[]> {
    const response = await ai.models.embedContent({
      model: this.model,
      contents: text,
    });

    const values =
      response.embeddings?.[0]?.values ??
      (response as any).embedding?.values;

    if (!values || values.length === 0) {
      throw new Error(`Failed to generate embedding for text: "${text.slice(0, 40)}..."`);
    }

    return values;
  }

  /**
   * Calculates cosine similarity between two dense vectors.
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) {
      throw new Error("Vectors must have the same non-zero length.");
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

  /**
   * Ingests parent documents, splits each parent into child chunks, generates embeddings
   * exclusively for the child chunks, and maps parent-child relationships.
   */
  public async addDocuments(
    parents: ParentDocument[],
    childSplitter: (text: string) => string[]
  ): Promise<void> {
    for (const parent of parents) {
      this.docStore.set(parent.id, parent);

      const rawChildTexts = childSplitter(parent.text);
      for (let i = 0; i < rawChildTexts.length; i++) {
        const childText = rawChildTexts[i].trim();
        if (!childText) continue;

        const embedding = await this.getEmbedding(childText);
        this.childStore.push({
          id: `${parent.id}_child_${i}`,
          parentId: parent.id,
          text: childText,
          embedding,
          metadata: parent.metadata,
        });
      }
    }
  }

  /**
   * Retrieves matching child chunks and hydrates their full parent documents without duplication.
   * @param query Search query from user.
   * @param topKChildren Number of top child matches to consider for parent hydration.
   * @returns Deduplicated list of full ParentDocuments with matched child scores.
   */
  public async retrieve(query: string, topKChildren = 4): Promise<ScoredParentDocument[]> {
    if (this.childStore.length === 0) return [];

    const queryEmbedding = await this.getEmbedding(query);

    // 1. Score query embedding against all indexed child chunks
    const scoredChildren = this.childStore
      .map((child) => ({
        child,
        score: this.cosineSimilarity(queryEmbedding, child.embedding!),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topKChildren);

    // 2. Deduplicate and hydrate corresponding parent documents
    const retrievedParents: ScoredParentDocument[] = [];
    const seenParentIds = new Set<string>();

    for (const match of scoredChildren) {
      const parentId = match.child.parentId;
      if (!seenParentIds.has(parentId)) {
        seenParentIds.add(parentId);
        const parentDoc = this.docStore.get(parentId);
        if (parentDoc) {
          retrievedParents.push({
            ...parentDoc,
            matchedChildScore: match.score,
            matchedChildText: match.child.text,
          });
        }
      }
    }

    return retrievedParents;
  }

  public getChildCount(): number {
    return this.childStore.length;
  }

  public getParentCount(): number {
    return this.docStore.size;
  }

  public clear(): void {
    this.docStore.clear();
    this.childStore = [];
  }
}
