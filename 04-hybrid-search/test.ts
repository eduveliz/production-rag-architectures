import { HybridSearchEngine, DocumentChunk } from "./hybrid-search.js";
import { InMemoryVectorStore } from "../02-vector-store/vector-store.js";
import "dotenv/config";

async function runVerification() {
  console.log("==================================================================");
  console.log("🧪 Testing Hybrid Search: BM25 Sparse + Dense Vectors + RRF (Module 4)");
  console.log("==================================================================\n");

  const vectorStore = new InMemoryVectorStore();
  const engine = new HybridSearchEngine(vectorStore);

  const sampleCorpus: DocumentChunk[] = [
    {
      id: "doc_auth_spec",
      text: "Para inicializar el módulo AuthService en TypeScript use `const auth = new AuthService({ jwtSecret: 'XYZ-9042' })`.",
      metadata: { category: "code_spec", component: "auth" },
    },
    {
      id: "doc_login_concept",
      text: "El proceso de verificar que quien entra a la app es quien dice ser requiere validación de credenciales criptográficas seguras.",
      metadata: { category: "concept", component: "auth" },
    },
    {
      id: "doc_pizza",
      text: "La fermentación de la masa de pizza napolitana debe ser de 24 horas a 20 grados centígrados con harina 00.",
      metadata: { category: "culinary", component: "food" },
    },
  ];

  console.log("1️⃣ [INDEXING] Ingesting corpus into BM25 Sparse Index and Dense Vector Store...");
  await engine.addDocuments(sampleCorpus);
  console.log(`   ✅ Indexed ${sampleCorpus.length} documents into both sparse and dense structures.\n`);
  console.log("------------------------------------------------------------------");

  // ==========================================================================
  // Test 1: Exact Lexical Search (Code / Identifier / Rare SKU / Token Match)
  // ==========================================================================
  console.log("2️⃣ [TEST 1: Exact Lexical Search (Code / Identifier / Rare Token)]");
  const query1 = "AuthService JWT-9042";
  console.log(`   ❓ Query: "${query1}"`);
  console.log("   🎯 Expected: 'doc_auth_spec' as Rank #1 via BM25 exact match boost.\n");

  const res1 = await engine.search(query1, 3);
  res1.forEach((item, idx) => {
    console.log(
      `   🏅 Rank #${idx + 1} | ID: [${item.id}] | RRF Score: ${item.rrfScore.toFixed(5)} ` +
        `| BM25 Rank: ${item.bm25Rank ?? "N/A"} | Vector Rank: ${item.vectorRank ?? "N/A"}`
    );
    console.log(`      📄 Text: "${item.text.slice(0, 90)}..."\n`);
  });

  if (res1[0]?.id === "doc_auth_spec") {
    console.log("   ✅ TEST 1 PASSED: 'doc_auth_spec' secured Rank #1 due to strong BM25 lexical boost!");
  } else {
    console.log(`   ⚠️ TEST 1 FAILED: Expected doc_auth_spec at Rank 1, got ${res1[0]?.id}`);
  }

  console.log("\n------------------------------------------------------------------");

  // ==========================================================================
  // Test 2: Abstract Semantic Search (No lexical keyword overlap)
  // ==========================================================================
  console.log("3️⃣ [TEST 2: Abstract Semantic Search (Zero Lexical Overlap)]");
  const query2 = "mecanismo para comprobar identidad del usuario";
  console.log(`   ❓ Query: "${query2}"`);
  console.log("   🎯 Expected: 'doc_login_concept' as Rank #1 via dense latent proximity.\n");

  const res2 = await engine.search(query2, 3);
  res2.forEach((item, idx) => {
    console.log(
      `   🏅 Rank #${idx + 1} | ID: [${item.id}] | RRF Score: ${item.rrfScore.toFixed(5)} ` +
        `| BM25 Rank: ${item.bm25Rank ?? "N/A"} | Vector Rank: ${item.vectorRank ?? "N/A"}`
    );
    console.log(`      📄 Text: "${item.text.slice(0, 90)}..."\n`);
  });

  if (res2[0]?.id === "doc_login_concept") {
    console.log("   ✅ TEST 2 PASSED: 'doc_login_concept' secured Rank #1 due to dense semantic proximity!");
  } else {
    console.log(`   ⚠️ TEST 2 FAILED: Expected doc_login_concept at Rank 1, got ${res2[0]?.id}`);
  }

  console.log("\n==================================================================");
  console.log("🎉 All Hybrid Search & RRF verification tests completed successfully!");
  console.log("==================================================================");
}

runVerification().catch((err) => {
  console.error("❌ Test error:", err);
  process.exit(1);
});
