import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI(apiKey ? { apiKey } : {});

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) {
    throw new Error("Vectors must have the same non-zero length.");
  }
  const dot = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
  if (normA === 0 || normB === 0) return 0;
  return dot / (normA * normB);
}

export interface SemanticChunkOptions {
  similarityThreshold?: number;
  model?: string;
}

export async function semanticChunkText(
  text: string,
  options: number | SemanticChunkOptions = 0.75
): Promise<string[]> {
  const similarityThreshold =
    typeof options === "number" ? options : options.similarityThreshold ?? 0.75;
  const model =
    typeof options === "object" && options.model
      ? options.model
      : "gemini-embedding-001";

  // Split text into sentences by punctuation (. ? !) followed by whitespace
  const sentences = text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length <= 1) return sentences;

  // 1. Obtain embeddings for each sentence
  const embeddings: number[][] = await Promise.all(
    sentences.map(async (sentence) => {
      const response = await ai.models.embedContent({
        model,
        contents: sentence,
      });

      const values =
        response.embeddings?.[0]?.values ??
        (response as any).embedding?.values;

      if (!values || values.length === 0) {
        throw new Error(`Failed to generate embedding for sentence: "${sentence}"`);
      }
      return values;
    })
  );

  // 2. Group sentences when semantic similarity between consecutive sentences drops below threshold
  const chunks: string[] = [];
  let currentChunk = sentences[0];

  for (let i = 0; i < sentences.length - 1; i++) {
    const similarity = cosineSimilarity(embeddings[i], embeddings[i + 1]);

    if (similarity >= similarityThreshold) {
      currentChunk += " " + sentences[i + 1];
    } else {
      chunks.push(currentChunk);
      currentChunk = sentences[i + 1];
    }
  }
  chunks.push(currentChunk);

  return chunks;
}
