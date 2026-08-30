import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI(apiKey ? { apiKey } : {});

export interface EvaluationInput {
  query: string;
  retrievedContext: string[];
  generatedAnswer: string;
}

export interface MetricScore {
  score: number;
  reason: string;
}

export interface EvaluationResult {
  faithfulnessScore: number;
  faithfulnessReason: string;
  answerRelevanceScore: number;
  answerRelevanceReason: string;
  passedGuardrail: boolean;
}

export interface RAGEvaluatorOptions {
  model?: string;
  faithfulnessThreshold?: number;
  relevanceThreshold?: number;
}

/**
 * RAGEvaluator implements an automated LLM-as-a-Judge evaluation engine
 * for production RAG pipelines, assessing the RAG Triad (Faithfulness & Answer Relevance).
 */
export class RAGEvaluator {
  private model: string;
  private faithfulnessThreshold: number;
  private relevanceThreshold: number;

  constructor(options: RAGEvaluatorOptions = {}) {
    this.model = options.model ?? "gemini-3.6-flash";
    this.faithfulnessThreshold = options.faithfulnessThreshold ?? 0.85;
    this.relevanceThreshold = options.relevanceThreshold ?? 0.80;
  }

  /**
   * Evaluates Faithfulness / Groundedness:
   * Assesses whether every factual claim in the generated answer is strictly supported
   * by the retrieved context, detecting hallucinations or ungrounded external knowledge.
   */
  async evaluateFaithfulness(
    context: string[],
    answer: string
  ): Promise<MetricScore> {
    const fullContext = context.join("\n---\n");
    const systemInstruction = `You are a strict factual integrity judge (Faithfulness Evaluator).
Critically analyze every atomic factual claim in the generated answer and determine if it is DIRECTLY and EXCLUSIVELY supported by the provided context.
Scoring Guidelines:
- 1.0: All claims and details are strictly grounded in the context.
- 0.0 - 0.5: The answer introduces hallucinations, external facts not in the context, or contradicts the context.
- 0.6 - 0.8: Mostly grounded but includes minor unverified extrapolations.

Return ONLY a valid JSON object with the following schema:
{
  "score": number (0.0 to 1.0),
  "reason": "concise technical justification"
}`;

    const userPrompt = `
<context>
${fullContext}
</context>

<generated_answer>
${answer}
</generated_answer>
`;

    try {
      const response = await ai.models.generateContent({
        model: this.model,
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: 0.0,
          responseMimeType: "application/json",
        },
      });

      const parsed: MetricScore = JSON.parse(response.text || "{}");
      return {
        score: typeof parsed.score === "number" ? parsed.score : 0,
        reason: parsed.reason || "No explanation provided by judge",
      };
    } catch (e) {
      console.warn("⚠️ Warning: Failed to parse faithfulness evaluation:", e);
      return { score: 0, reason: "Error parsing evaluation judge response." };
    }
  }

  /**
   * Evaluates Answer Relevance:
   * Assesses whether the generated response directly answers the user's question
   * without evading, introducing redundant fluff, or answering an orthogonal topic.
   */
  async evaluateAnswerRelevance(
    query: string,
    answer: string
  ): Promise<MetricScore> {
    const systemInstruction = `You are a semantic relevance judge (Answer Relevance Evaluator).
Determine whether the generated answer directly and comprehensively addresses the user's question without evading or rambling.
Scoring Guidelines:
- 0.9 - 1.0: Directly and precisely answers the user's question.
- 0.5 - 0.8: Partially answers or includes significant irrelevant filler.
- 0.0 - 0.4: Fails to address the question or answers an orthogonal topic.

Return ONLY a valid JSON object with the following schema:
{
  "score": number (0.0 to 1.0),
  "reason": "concise technical justification"
}`;

    const userPrompt = `
Question: "${query}"
Generated Answer: "${answer}"
`;

    try {
      const response = await ai.models.generateContent({
        model: this.model,
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: 0.0,
          responseMimeType: "application/json",
        },
      });

      const parsed: MetricScore = JSON.parse(response.text || "{}");
      return {
        score: typeof parsed.score === "number" ? parsed.score : 0,
        reason: parsed.reason || "No explanation provided by judge",
      };
    } catch (e) {
      console.warn("⚠️ Warning: Failed to parse answer relevance evaluation:", e);
      return { score: 0, reason: "Error parsing evaluation judge response." };
    }
  }

  /**
   * Performs a comprehensive evaluation across both Faithfulness and Answer Relevance metrics,
   * checking whether the interaction passes strict production guardrail thresholds.
   */
  async evaluate(input: EvaluationInput): Promise<EvaluationResult> {
    const [faithfulness, relevance] = await Promise.all([
      this.evaluateFaithfulness(input.retrievedContext, input.generatedAnswer),
      this.evaluateAnswerRelevance(input.query, input.generatedAnswer),
    ]);

    const passedGuardrail =
      faithfulness.score >= this.faithfulnessThreshold &&
      relevance.score >= this.relevanceThreshold;

    return {
      faithfulnessScore: faithfulness.score,
      faithfulnessReason: faithfulness.reason,
      answerRelevanceScore: relevance.score,
      answerRelevanceReason: relevance.reason,
      passedGuardrail,
    };
  }
}
