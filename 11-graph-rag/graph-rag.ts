import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI(apiKey ? { apiKey } : {});

export interface GraphTriple {
  source: string;
  relation: string;
  target: string;
  evidence: string;
}

export interface ExtractionResult {
  entities: string[];
  triples: GraphTriple[];
}

export interface GraphRAGOptions {
  model?: string;
}

/**
 * SimpleGraphRAG extracts structured entity-relation knowledge triples (Subject -> Predicate -> Object)
 * from unstructured text and builds an in-memory directed knowledge graph to enable multihop reasoning.
 */
export class SimpleGraphRAG {
  // In-memory directed adjacency list: sourceEntity (normalized) -> outgoing triples
  private adjacencyList: Map<string, GraphTriple[]> = new Map();
  private model: string;

  constructor(options: GraphRAGOptions = {}) {
    this.model = options.model ?? "gemini-3.1-flash-lite";
  }

  /**
   * Extracts entities and relational triples from technical text using Gemini structured JSON.
   */
  public async extractKnowledge(chunkText: string): Promise<ExtractionResult> {
    return this.extractFromPrompt(`Texto a procesar:\n"""\n${chunkText}\n"""`);
  }

  /**
   * Batch extracts entities and triples from multiple documents in a single LLM call to optimize throughput and rate limits.
   */
  public async extractKnowledgeFromCorpus(chunks: string[]): Promise<ExtractionResult> {
    const formatted = chunks
      .map((c, i) => `[Documento ${i + 1}]:\n"${c}"`)
      .join("\n\n");
    return this.extractFromPrompt(`Corpus a procesar:\n${formatted}`);
  }

  private async extractFromPrompt(contentPrompt: string, maxRetries = 3): Promise<ExtractionResult> {
    const systemInstruction = `Eres un motor experto de Information Extraction y Knowledge Graph Engineering.
Tu tarea es leer el texto técnico y extraer:
1. Entidades técnicas clave (sustantivos, sistemas, microservicios, protocolos, componentes, servicios cloud).
2. Relaciones dirigidas precisas en formato de ternas: source -> relation -> target. Normaliza los nombres de entidades en minúsculas y snake_case o texto simple.
3. Evidencia textual breve que sustenta la relación.

Responde ÚNICAMENTE en JSON con el siguiente esquema:
{
  "entities": ["entidad1", "entidad2"],
  "triples": [
    { "source": "entidad1", "relation": "ACCION_O_VINCULO", "target": "entidad2", "evidence": "breve cita textual" }
  ]
}`;

    const modelsToTry = [this.model, "gemini-3.1-flash-lite", "gemini-3.6-flash"];

    for (const currentModel of modelsToTry) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: currentModel,
            contents: contentPrompt,
            config: {
              systemInstruction,
              temperature: 0.0,
              responseMimeType: "application/json",
            },
          });

          const parsed = this.parseJSON(response.text || "{}");
          if (parsed.triples.length > 0 || parsed.entities.length > 0) {
            return parsed;
          }
        } catch (err: any) {
          if (attempt === maxRetries) {
            break; // Try next model
          }
          const retryMatch = err?.message?.match(/retry in ([\d\.]+)s/i);
          const waitSec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) + 1 : 2;
          await new Promise((res) => setTimeout(res, waitSec * 1000));
        }
      }
    }

    return { entities: [], triples: [] };
  }

  /**
   * Robust JSON parsing with markdown block stripping and regex extraction.
   */
  private parseJSON(text: string): ExtractionResult {
    try {
      const clean = text
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      const parsed = JSON.parse(clean);
      return {
        entities: Array.isArray(parsed.entities) ? parsed.entities : [],
        triples: Array.isArray(parsed.triples) ? parsed.triples : [],
      };
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          return {
            entities: Array.isArray(parsed.entities) ? parsed.entities : [],
            triples: Array.isArray(parsed.triples) ? parsed.triples : [],
          };
        } catch {
          // Fall through
        }
      }
      return { entities: [], triples: [] };
    }
  }

  /**
   * Adds extracted triples to the in-memory directed graph.
   */
  public addTriples(triples: GraphTriple[]): void {
    for (const triple of triples) {
      const src = this.normalizeEntity(triple.source);
      const tgt = this.normalizeEntity(triple.target);
      const existing = this.adjacencyList.get(src) || [];
      existing.push({
        ...triple,
        source: src,
        target: tgt,
      });
      this.adjacencyList.set(src, existing);
    }
  }

  /**
   * Performs Breadth-First Search (BFS) graph traversal starting from a seed entity (or matching entities) up to maxDepth.
   * Enables resolving multi-hop relationships spanning across disjoint chunks.
   */
  public traverseSubGraph(startEntity: string, maxDepth = 2): GraphTriple[] {
    const rootPattern = this.normalizeEntity(startEntity);
    
    // Find matching starting entities in graph (exact or substring match)
    const seedNodes: string[] = [];
    for (const key of this.adjacencyList.keys()) {
      if (key === rootPattern || key.includes(rootPattern) || rootPattern.includes(key)) {
        seedNodes.push(key);
      }
    }

    if (seedNodes.length === 0) {
      seedNodes.push(rootPattern);
    }

    const visitedNodes = new Set<string>();
    const collectedTriples: GraphTriple[] = [];
    const queue: { entity: string; depth: number }[] = [];

    for (const seed of seedNodes) {
      visitedNodes.add(seed);
      queue.push({ entity: seed, depth: 0 });
    }

    while (queue.length > 0) {
      const { entity, depth } = queue.shift()!;
      if (depth >= maxDepth) continue;

      const edges = this.adjacencyList.get(entity) || [];
      for (const edge of edges) {
        collectedTriples.push(edge);
        const target = this.normalizeEntity(edge.target);
        if (!visitedNodes.has(target)) {
          visitedNodes.add(target);
          queue.push({ entity: target, depth: depth + 1 });
        }
      }
    }

    return collectedTriples;
  }

  /**
   * Serializes a subgraph into structured text format for injection into generative LLM prompts.
   */
  public formatGraphContext(triples: GraphTriple[]): string {
    if (triples.length === 0) return "No se encontraron relaciones directas o multi-salto en el grafo de conocimiento.";
    return triples
      .map(
        (t) =>
          `(${t.source}) --[${t.relation}]--> (${t.target}) | Evidencia: "${t.evidence}"`
      )
      .join("\n");
  }

  public getEntities(): string[] {
    return Array.from(this.adjacencyList.keys());
  }

  public getAllTriples(): GraphTriple[] {
    const all: GraphTriple[] = [];
    for (const edges of this.adjacencyList.values()) {
      all.push(...edges);
    }
    return all;
  }

  public normalizeEntity(entity: string): string {
    return entity
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Strip diacritics / accents: ó -> o, etc.
      .trim()
      .replace(/[\s-]+/g, "_");
  }
}
