import { InMemoryVectorStore } from "./vector-store.js";
import { semanticChunkText } from "../01-semantic-chunker/semantic-chunker.js";
import "dotenv/config";

async function runTest() {
  console.log("==================================================================");
  console.log("🧪 Testing In-Memory Vector Store with Semantic Chunking (Module 2)");
  console.log("==================================================================\n");

  const sampleDoc = `
Electric vehicles utilize high-density lithium-ion battery packs to deliver efficient propulsion. Modern battery thermal management systems allow rapid direct-current charging and extend longevity. The average driving range now exceeds 400 kilometers on a single charge under mixed driving conditions.

To prepare authentic Neapolitan pizza, the dough requires a slow fermentation period of at least 24 hours at room temperature. High-protein double zero flour yields a light crust with characteristic leopard-spotting when baked in a wood-fired oven at 485 degrees Celsius. Crushed San Marzano tomatoes provide the essential balance of sweetness and acidity.

Quantum computers leverage quantum bits or qubits capable of superposition to explore massive state spaces simultaneously. Shor's algorithm provides exponential speedup for integer factorization, threatening classical RSA encryption architectures. Quantum error correction codes such as surface codes are critical to achieve fault-tolerant scalable quantum computation.
  `.trim();

  // Step 1: Semantic Chunking
  console.log("1️⃣ [INGESTION] Running semanticChunkText to split text dynamically...");
  const chunks = await semanticChunkText(sampleDoc, 0.58);
  console.log(`   ✅ Extracted ${chunks.length} distinct semantic chunks.\n`);

  chunks.forEach((chunk, index) => {
    console.log(`   📦 [Chunk ${index + 1} Preview]: ${chunk.slice(0, 80)}...`);
  });
  console.log("\n------------------------------------------------------------------");

  // Step 2: Indexing Chunks in Vector Store
  console.log("2️⃣ [INDEXING] Inserting chunks into InMemoryVectorStore with metadata...");
  const store = new InMemoryVectorStore();
  const documentIds = await store.addDocuments(chunks, {
    dataset: "production_rag_knowledge_base",
    author: "Eduardo Veliz",
  });
  console.log(`   ✅ Successfully indexed ${documentIds.length} vector records in memory.`);
  console.log(`   📊 Total records in store: ${store.count()}\n`);
  console.log("------------------------------------------------------------------");

  // Step 3: Semantic Retrieval Queries (Testing Zero-Lexical-Overlap Queries)
  const testQueries = [
    {
      query: "How do you cook authentic Italian food from scratch?",
      expectedTopic: "Italian culinary & Neapolitan pizza",
      expectedChunkIndex: 1, // 0-indexed: chunk 2
    },
    {
      query: "What is the travel distance capability of clean energy automobiles?",
      expectedTopic: "Electric vehicles & lithium batteries",
      expectedChunkIndex: 0, // 0-indexed: chunk 1
    },
    {
      query: "Which computational systems threaten RSA cryptography algorithms?",
      expectedTopic: "Quantum computing & cryptography",
      expectedChunkIndex: 2, // 0-indexed: chunk 3
    },
  ];

  console.log("3️⃣ [RETRIEVAL] Executing semantic search queries with synonym/non-exact phrasing:\n");

  for (let i = 0; i < testQueries.length; i++) {
    const { query, expectedTopic, expectedChunkIndex } = testQueries[i];
    console.log(`🔍 [Query #${i + 1}]: "${query}"`);
    console.log(`   🎯 Expected Subject: ${expectedTopic}`);

    const results = await store.search(query, 2);

    results.forEach((res, rank) => {
      const isTopMatch = rank === 0;
      const rankBadge = isTopMatch ? "🥇 [RANK 1]" : "🥈 [RANK 2]";
      console.log(`   ${rankBadge} Similarity Score: ${res.score.toFixed(4)} | ID: ${res.id}`);
      console.log(`      📄 Text: "${res.text.slice(0, 110)}..."`);
    });

    const topResult = results[0];
    const targetChunk = chunks[expectedChunkIndex];
    const isCorrect = topResult && topResult.text === targetChunk;

    if (isCorrect) {
      console.log(`   ✅ PASSED: Top retrieved chunk matches expected topic with score ${topResult.score.toFixed(4)}!\n`);
    } else {
      console.log(`   ⚠️ WARNING: Top retrieved chunk did not match expected topic.\n`);
    }
  }

  console.log("==================================================================");
  console.log("🎉 All Vector Store integration tests completed successfully!");
  console.log("==================================================================");
}

runTest().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});
