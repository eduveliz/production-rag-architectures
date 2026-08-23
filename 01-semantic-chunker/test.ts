import { semanticChunkText, cosineSimilarity } from "./semantic-chunker.js";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

async function runTest() {
  console.log("==================================================");
  console.log("🧪 Testing Semantic Chunking Pipeline (Module 1)");
  console.log("==================================================\n");

  const sampleText = `
Quantum computing leverages the principles of quantum mechanics such as superposition and entanglement to perform complex computations. Unlike classical bits that represent either a zero or a one, qubits can exist in multiple states simultaneously. This quantum parallelism enables quantum algorithms like Shor and Grover to solve intractable problems exponentially faster.

Authentic Italian culinary tradition relies heavily on fresh ingredients, slow fermentation, and precise pasta craftsmanship. Classic carbonara requires cured pork jowl known as guanciale, pecorino romano cheese, fresh egg yolks, and freshly cracked black pepper without any cream. Hand-kneaded dough made from semolina flour produces the optimal al dente texture desired by master chefs.

The abyssal zones of the deep ocean represent some of the most extreme and least explored ecosystems on Earth. Organisms living near hydrothermal vents have evolved chemosynthesis rather than photosynthesis to thrive in complete darkness. Unique bioluminescent adaptations allow deep-sea species to attract prey, communicate, and evade predators under immense hydrostatic pressures.
  `.trim();

  console.log("📄 Input Text (3 distinct paragraphs):\n" + sampleText + "\n");
  console.log("--------------------------------------------------");

  const sentences = sampleText
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`📊 Sentences detected (${sentences.length} total):\n`);
  sentences.forEach((s, idx) => {
    console.log(`  [S${idx + 1}] ${s}`);
  });

  console.log("\n📐 Pairwise Similarities between Consecutive Sentences:\n");

  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI(apiKey ? { apiKey } : {});
  const embeddings = await Promise.all(
    sentences.map(async (sentence) => {
      const response = await ai.models.embedContent({
        model: "gemini-embedding-001",
        contents: sentence,
      });
      return response.embeddings?.[0]?.values ?? (response as any).embedding?.values;
    })
  );

  const threshold = 0.58;

  for (let i = 0; i < sentences.length - 1; i++) {
    const similarity = cosineSimilarity(embeddings[i], embeddings[i + 1]);
    const isCut = similarity < threshold;
    const marker = isCut ? "✂️ [TOPIC SHIFT -> CHUNK CUT]" : "🔗 [SAME CHUNK]";
    console.log(
      `  S${i + 1} ↔ S${i + 2}: Cosine = ${similarity.toFixed(4)}  ${marker}`
    );
  }

  console.log("\n--------------------------------------------------");
  console.log(`🔍 Executing semanticChunkText (threshold = ${threshold})...\n`);

  try {
    const chunks = await semanticChunkText(sampleText, threshold);

    console.log(`✅ Chunking complete! Total chunks created: ${chunks.length}\n`);

    chunks.forEach((chunk, index) => {
      console.log(`📦 =================== CHUNK #${index + 1} ===================`);
      console.log(chunk);
      console.log("========================================================\n");
    });

    if (chunks.length === 3) {
      console.log("🎉 SUCCESS: Exactly 3 semantic chunks generated corresponding to the 3 distinct topics!");
    } else {
      console.log(`ℹ️ Generated ${chunks.length} chunks.`);
    }
  } catch (error) {
    console.error("❌ Error during semantic chunking test:", error);
    process.exit(1);
  }
}

runTest();
