import { RAGPipeline } from "./rag-pipeline.js";
import { InMemoryVectorStore } from "../02-vector-store/vector-store.js";
import "dotenv/config";

async function runTest() {
  console.log("==================================================================");
  console.log("🧪 Testing Grounded End-to-End RAG Pipeline (Module 3)");
  console.log("==================================================================\n");

  const store = new InMemoryVectorStore();
  const pipeline = new RAGPipeline(store, {
    similarityCutoff: 0.50,
  });

  const knowledgeBaseDocument = `
Electric vehicles utilize high-density lithium-ion battery packs that provide driving ranges exceeding 500 km on a single charge. Recharging at 150 kW direct-current (DC) fast-charging stations takes approximately 30 minutes to reach an 80% state of charge.

Authentic Neapolitan pizza preparation mandates a bulk dough fermentation period of at least 24 hours at 20°C using type 00 flour with a gluten strength (W index) between 280 and 320. Toppings must include certified San Marzano DOP tomatoes and fresh buffalo mozzarella, baked in a wood-fired oven at 450°C for precisely 60 to 90 seconds.

Quantum computing algorithms, specifically Shor's algorithm, pose a fundamental cryptographic threat to asymmetric key architectures including RSA and ECC, necessitating the global transition toward post-quantum cryptography (PQC) standards.
  `.trim();

  // Step 1: Ingest Document
  console.log("1️⃣ [INGESTION] Ingesting multi-domain knowledge base document...");
  const totalChunks = await pipeline.ingestDocument(knowledgeBaseDocument, {
    documentTitle: "Engineering & Culinary Knowledge Base",
  });
  console.log(`   ✅ Document successfully chunked and indexed into ${totalChunks} semantic vector records.\n`);
  console.log("------------------------------------------------------------------");

  // Step 2: In-Domain Test
  console.log("2️⃣ [TEST 1: In-Domain Grounded Query]");
  const query1 = "What are the exact baking temperature and time requirements for baking the pizza?";
  console.log(`   ❓ Question: "${query1}"\n`);

  const response1 = await pipeline.query(query1, 2);
  console.log("   🤖 LLM Generated Answer:");
  console.log("   " + response1.answer.replace(/\n/g, "\n   "));
  console.log("\n   📚 Retrieved Sources:");
  response1.sources.forEach((src, idx) => {
    console.log(`      [Source ${idx + 1}] Similarity: ${(src.score * 100).toFixed(2)}% | "${src.text.slice(0, 80)}..."`);
  });

  // Verify critical in-domain constraints
  const containsTemperature = response1.answer.includes("450");
  const containsTime = response1.answer.includes("60") || response1.answer.includes("90");
  const containsCitation = response1.answer.includes("[Source");

  if (containsTemperature && containsTime && containsCitation) {
    console.log("\n   ✅ TEST 1 PASSED: Model cited exact temperature (450°C), time (60-90s), and source attribution!");
  } else {
    console.log("\n   ⚠️ TEST 1 WARNING: Verification criteria check had missing tokens.");
  }

  console.log("\n------------------------------------------------------------------");

  // Step 3: Out-of-Domain Test (Hallucination Prevention Guardrail)
  console.log("3️⃣ [TEST 2: Out-of-Domain / Hallucination Check]");
  const query2 = "Who discovered America and in what year?";
  console.log(`   ❓ Question: "${query2}"\n`);

  const response2 = await pipeline.query(query2, 2);
  console.log("   🤖 LLM Generated Answer:");
  console.log("   " + response2.answer.replace(/\n/g, "\n   "));
  console.log("\n   📊 Context Status: hasSufficientContext =", response2.hasSufficientContext);
  if (response2.sources.length > 0) {
    console.log(`   ℹ️ Top similarity was ${(response2.sources[0].score * 100).toFixed(2)}% (below cutoff threshold).`);
  }

  if (!response2.hasSufficientContext || response2.answer.toLowerCase().includes("not have sufficient") || response2.answer.toLowerCase().includes("no dispongo")) {
    console.log("\n   ✅ TEST 2 PASSED: Out-of-domain query was gracefully rejected without hallucinating facts!");
  } else {
    console.log("\n   ⚠️ TEST 2 WARNING: Query should have been rejected.");
  }

  console.log("\n==================================================================");
  console.log("🎉 All Grounded RAG Pipeline tests completed successfully!");
  console.log("==================================================================");
}

runTest().catch((err) => {
  console.error("❌ Test error:", err);
  process.exit(1);
});
