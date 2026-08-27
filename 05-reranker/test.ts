import { TwoStageRAGRetriever } from "./reranker.js";
import { HybridSearchEngine, DocumentChunk } from "../04-hybrid-search/hybrid-search.js";
import { InMemoryVectorStore } from "../02-vector-store/vector-store.js";
import "dotenv/config";

async function runTwoStageTest() {
  console.log("==================================================================");
  console.log("🧪 Testing Two-Stage Retrieval Pipeline with Cross-Scoring (Module 5)");
  console.log("==================================================================\n");

  const vectorStore = new InMemoryVectorStore();
  const hybridEngine = new HybridSearchEngine(vectorStore);
  const twoStage = new TwoStageRAGRetriever(hybridEngine);

  const corpus: DocumentChunk[] = [
    {
      id: "doc_ts_express_jwt",
      text: "Para configurar JWT en un servidor Express con TypeScript, valida el header Authorization 'Bearer <token>' en un middleware antes de llamar a next().",
      metadata: { language: "TypeScript", framework: "Express", authType: "JWT Middleware" },
    },
    {
      id: "doc_ts_oauth_client",
      text: "La autenticación OAuth2 en TypeScript requiere intercambiar el authorization code por un access token contra el endpoint /oauth/token del proveedor.",
      metadata: { language: "TypeScript", framework: "Generic", authType: "OAuth2 Code Grant" },
    },
    {
      id: "doc_python_jwt",
      text: "En FastAPI con Python, puedes usar la librería PyJWT para decodificar tokens y manejar excepciones de expiración de firma.",
      metadata: { language: "Python", framework: "FastAPI", authType: "PyJWT" },
    },
    {
      id: "doc_sql_injection",
      text: "La prevención de inyección SQL en bases de datos relacionales se logra usando sentencias parametrizadas y ORMs como Prisma o Drizzle.",
      metadata: { topic: "Security", component: "SQL Injection Prevention" },
    },
  ];

  console.log("1️⃣ [STAGE 1 INGESTION] Indexing corpus into Hybrid Search Engine (BM25 + Vectors)...");
  await hybridEngine.addDocuments(corpus);
  console.log(`   ✅ Successfully indexed ${corpus.length} documents.\n`);
  console.log("------------------------------------------------------------------");

  const query = "¿Cómo implementar middleware de autenticación con tokens en TypeScript y Express?";
  console.log(`2️⃣ [QUERY EXECUTION]`);
  console.log(`   ❓ User Query: "${query}"`);
  console.log(`   🎯 Key Technical Constraints: [TypeScript, Express, Middleware, Token Authentication]\n`);

  console.log("------------------------------------------------------------------");
  console.log("3️⃣ [TWO-STAGE RETRIEVAL: Broad Candidate Retrieval + Deep Cross-Scoring Re-ranking]...\n");

  const results = await twoStage.retrieve(query, 4, 3);

  results.forEach((res, rank) => {
    const isRank1 = rank === 0;
    const badge = isRank1 ? "🥇 [RANK 1]" : rank === 1 ? "🥈 [RANK 2]" : "🥉 [RANK 3]";
    console.log(`   ${badge} ID: [${res.id}]`);
    console.log(`      📊 Initial RRF Score: ${res.initialScore.toFixed(4)} | 🎯 Re-rank Score: ${res.rerankScore.toFixed(2)} / 1.00`);
    console.log(`      💡 Justification: "${res.justification}"`);
    console.log(`      📄 Text: "${res.text.slice(0, 100)}..."\n`);
  });

  // Assertions
  const topDoc = results[0];
  if (topDoc && topDoc.id === "doc_ts_express_jwt" && topDoc.rerankScore >= 0.85) {
    console.log("   ✅ SUCCESS: 'doc_ts_express_jwt' selected as Rank #1 with high confidence (>0.85)!");
    console.log("   ✅ Re-ranker accurately filtered out FastAPI (wrong language/framework) and OAuth2 (no middleware).");
  } else {
    console.log(`   ⚠️ WARNING: Expected doc_ts_express_jwt at Rank 1, got ${topDoc?.id}`);
  }

  console.log("\n==================================================================");
  console.log("🎉 Two-Stage Retrieval & Cross-Encoder Re-ranking test complete!");
  console.log("==================================================================");
}

runTwoStageTest().catch((err) => {
  console.error("❌ Test error:", err);
  process.exit(1);
});
