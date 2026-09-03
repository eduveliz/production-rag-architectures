import { QueryTransformer, MultiQueryRetriever } from "./query-transformer.js";
import { HybridSearchEngine, DocumentChunk } from "../04-hybrid-search/hybrid-search.js";
import { InMemoryVectorStore } from "../02-vector-store/vector-store.js";
import "dotenv/config";

async function runQueryTransformationTest() {
  console.log("==================================================================");
  console.log("🧪 Testing Query Transformation Pipelines & Expansion (Module 8)");
  console.log("==================================================================\n");

  const vectorStore = new InMemoryVectorStore();
  const hybridEngine = new HybridSearchEngine(vectorStore);
  const transformer = new QueryTransformer();
  const multiRetriever = new MultiQueryRetriever(transformer, hybridEngine);

  const corpus: DocumentChunk[] = [
    {
      id: "doc_jwt_clock_skew",
      text: "El error 401 por Clock Skew ocurre cuando existe un desfase de tiempo entre el servidor que emite el JWT y el backend que lo verifica. Se soluciona configurando 'clockTolerance: 30' en el verificador.",
      metadata: { category: "security", issue: "clock_skew_jwt" },
    },
    {
      id: "doc_cors_gateway",
      text: "Los errores 403 en API Gateway suelen deberse a falta de headers Access-Control-Allow-Origin en respuestas OPTIONS.",
      metadata: { category: "networking", issue: "cors_gateway" },
    },
    {
      id: "doc_db_pool_timeout",
      text: "El timeout de conexiones a Postgres se mitiga ajustando max_connections y utilizando un Connection Pooler como PgBouncer.",
      metadata: { category: "database", issue: "connection_pool_timeout" },
    },
  ];

  console.log("1️⃣ [INDEXING] Ingesting technical corpus into Hybrid Engine...");
  await hybridEngine.addDocuments(corpus);
  console.log(`   ✅ Indexed ${corpus.length} documents.\n`);
  console.log("------------------------------------------------------------------");

  const ambiguousUserQuery = "el token me da error de tiempo en backend";

  console.log("2️⃣ [QUERY TRANSFORMATION] Expanding ambiguous user query:");
  console.log(`   ❓ Original Ambiguous Query: "${ambiguousUserQuery}"\n`);

  const transformations = await transformer.transform(ambiguousUserQuery);
  console.log("   🔄 Multi-Query Variants:");
  transformations.multiQueries.forEach((q, i) => console.log(`      [Variant ${i + 1}] "${q}"`));

  console.log(`\n   🔭 Step-Back Conceptual Query:`);
  console.log(`      "${transformations.stepBackQuery}"`);

  console.log(`\n   📄 HyDE (Hypothetical Document Embedding Passage):`);
  console.log(`      "${transformations.hypotheticalDocument}"\n`);

  console.log("------------------------------------------------------------------");
  console.log("3️⃣ [PARALLEL MULTI-QUERY RETRIEVAL & CUMULATIVE RRF SCORING]...\n");

  const retrievedDocs = await multiRetriever.retrieveExpanded(ambiguousUserQuery, 2, 3);

  retrievedDocs.forEach((doc, rank) => {
    const isTop = rank === 0;
    const badge = isTop ? "🥇 [RANK 1]" : rank === 1 ? "🥈 [RANK 2]" : "🥉 [RANK 3]";
    console.log(`   ${badge} ID: [${doc.id}]`);
    console.log(`      📈 Cumulative RRF Score: ${doc.rrfScore.toFixed(5)} (Matched across ${doc.matchedQueriesCount} query signals)`);
    console.log(`      📄 Text: "${doc.text.slice(0, 100)}..."\n`);
  });

  // Assertion
  const topResult = retrievedDocs[0];
  if (topResult && topResult.id === "doc_jwt_clock_skew" && topResult.rrfScore > 0.04) {
    console.log("   ✅ SUCCESS: 'doc_jwt_clock_skew' achieved Rank #1 with reinforced cumulative score across transformed query signals!");
  } else {
    console.log(`   ⚠️ WARNING: Expected doc_jwt_clock_skew at Rank 1, got ${topResult?.id}`);
  }

  console.log("\n==================================================================");
  console.log("🎉 All Query Transformation & Expansion tests completed!");
  console.log("==================================================================");
}

runQueryTransformationTest().catch((err) => {
  console.error("❌ Test error:", err);
  process.exit(1);
});
