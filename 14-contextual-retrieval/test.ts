import { ContextualEnricher } from "./contextual-retrieval.js";
import { HybridSearchEngine } from "../04-hybrid-search/hybrid-search.js";
import { InMemoryVectorStore } from "../02-vector-store/vector-store.js";
import "dotenv/config";

async function runContextualRetrievalTestSuite() {
  console.log("==================================================================");
  console.log("🧪 Testing Contextual Retrieval & Chunk Pre-Enrichment (Module 14)");
  console.log("==================================================================\n");

  const enricher = new ContextualEnricher();
  const vectorStore = new InMemoryVectorStore();
  const searchEngine = new HybridSearchEngine(vectorStore);

  const fullReport = `
Informe de Arquitectura e Infraestructura: Migración Cloud Q3 2026 para Proyecto Nexus.
El proyecto Nexus gestiona los microservicios de liquidación y pagos transfronterizos.
Durante este trimestre, la latencia promedio en el procesamiento de transacciones disminuyó un 35% gracias a la adopción de instancias Graviton3 y compresión de payloads.
Sin embargo, el consumo de memoria en los pods de liquidación aumentó un 12% debido a la retención temporal de estados de idempotencia en Redis.
`;

  // Raw orphan chunks (missing explicit project name "Nexus" and timeframe "Q3 2026")
  const rawChunks = [
    {
      id: "chunk_latency_metrics",
      text: "La latencia promedio en el procesamiento de transacciones disminuyó un 35% gracias a la adopción de instancias Graviton3 y compresión de payloads.",
      metadata: { metric: "latency", component: "transaction_processing" },
    },
    {
      id: "chunk_memory_usage",
      text: "El consumo de memoria en los pods de liquidación aumentó un 12% debido a la retención temporal de estados de idempotencia en Redis.",
      metadata: { metric: "memory", component: "settlement_pods" },
    },
  ];

  console.log("1️⃣ [ENRICHMENT] Generating Situational Context Headers with Gemini...");
  const enrichedChunks = await enricher.enrichChunks(fullReport, rawChunks);

  enrichedChunks.forEach((chunk, index) => {
    console.log(`\n   📄 Chunk ${index + 1} [ID: ${chunk.id}]`);
    console.log(`   🏷️  Generated Context Header:\n      "${chunk.contextHeader}"`);
    console.log(`   📝 Final Indexable Text:\n      ${chunk.text.replace(/\n/g, "\n      ")}`);
  });

  console.log("\n------------------------------------------------------------------");
  console.log("2️⃣ [INDEXING] Ingesting Enriched Chunks into Hybrid Search Engine...");
  await searchEngine.addDocuments(enrichedChunks);
  console.log(`   ✅ Indexed ${enrichedChunks.length} enriched chunks.\n`);

  console.log("------------------------------------------------------------------");
  console.log("3️⃣ [RETRIEVAL] Querying with Entities Absent in Raw Chunks...");
  const testQuery = "¿Cuánto mejoró la latencia en el proyecto Nexus durante 2026?";
  console.log(`   👤 User Query: "${testQuery}"\n`);

  const results = await searchEngine.search(testQuery, 2);

  console.log("   📦 Retrieval Results (Ranked by Hybrid RRF):");
  results.forEach((res, rank) => {
    console.log(`      #${rank + 1} [ID: ${res.id}] | RRF Score: ${res.rrfScore.toFixed(4)}`);
    console.log(`         Snippet: "${res.text.slice(0, 100)}..."`);
  });

  console.log("\n------------------------------------------------------------------");
  const topResult = results[0];
  const matchedTarget = topResult?.id === "chunk_latency_metrics";
  const containsContext =
    topResult?.text.toLowerCase().includes("nexus") ||
    topResult?.text.includes("2026");

  if (matchedTarget && containsContext) {
    console.log("   ✅ SUCCESS: Contextual Retrieval successfully matched 'chunk_latency_metrics' as #1!");
    console.log("   ✅ The injected situational header resolved entity & temporal ambiguity across BM25 & Dense Vectors.");
  } else {
    console.log(`   ⚠️ WARNING: Match Target: ${matchedTarget}, Contains Context: ${containsContext}`);
  }

  console.log("\n==================================================================");
  console.log("🎉 Contextual Retrieval tests complete!");
  console.log("==================================================================");
}

runContextualRetrievalTestSuite().catch((err) => {
  console.error("❌ Contextual Retrieval test error:", err);
  process.exit(1);
});
