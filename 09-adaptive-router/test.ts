import { AdaptiveRAGRouter } from "./adaptive-router.js";
import { TwoStageRAGRetriever } from "../05-reranker/reranker.js";
import { HybridSearchEngine, DocumentChunk } from "../04-hybrid-search/hybrid-search.js";
import { InMemoryVectorStore } from "../02-vector-store/vector-store.js";
import "dotenv/config";

async function runAdaptiveRoutingTest() {
  console.log("==================================================================");
  console.log("🧪 Testing Adaptive Query Router & Agentic Dispatch (Module 9)");
  console.log("==================================================================\n");

  const vectorStore = new InMemoryVectorStore();
  const hybridEngine = new HybridSearchEngine(vectorStore);
  const retriever = new TwoStageRAGRetriever(hybridEngine);
  const router = new AdaptiveRAGRouter();

  const corpus: DocumentChunk[] = [
    {
      id: "doc_k8s_etcd",
      text: "La configuración de alta disponibilidad para etcd en Kubernetes requiere un quórum impar de nodos (3 o 5) para tolerar fallos de partición de red.",
      metadata: { component: "etcd", system: "kubernetes" },
    },
  ];

  console.log("1️⃣ [INDEXING] Ingesting domain knowledge into Vector RAG subsystem...");
  await hybridEngine.addDocuments(corpus);
  console.log(`   ✅ Indexed ${corpus.length} documents.\n`);
  console.log("------------------------------------------------------------------");

  const testCases = [
    {
      query: "¡Hola! ¿Cómo estás hoy?",
      expectedRoute: "DIRECT_RESPONSE",
      description: "Conversational greeting / No retrieval required",
    },
    {
      query: "¿Cuántas ventas totales se registraron el último mes en la plataforma?",
      expectedRoute: "STRUCTURED_QUERY",
      description: "Quantitative relational aggregation / Tabular analytics",
    },
    {
      query: "¿Cuántos nodos se recomiendan para configurar etcd en Kubernetes?",
      expectedRoute: "VECTOR_RAG",
      description: "Technical architecture manual / Semantic vector retrieval",
    },
  ];

  console.log("2️⃣ [ADAPTIVE ROUTING EVALUATION] Dispatching queries across 3 specialized subsystems:\n");

  for (let i = 0; i < testCases.length; i++) {
    const { query, expectedRoute, description } = testCases[i];
    console.log(`🔍 [Case #${i + 1}] "${query}"`);
    console.log(`   🎯 Type: ${description}`);

    const decision = await router.routeQuery(query);
    console.log(`   🧭 Decision: [${decision.destination}] (Confidence: ${(decision.confidence * 100).toFixed(1)}%)`);
    console.log(`   💡 Reasoning: "${decision.reasoning}"`);

    const execution = await router.execute(query, retriever);
    console.log(`   ⚡ Executed Pipeline: [${execution.route}]`);
    console.log(`   📄 Output Sample:\n   "${execution.output.slice(0, 160)}..."\n`);

    if (decision.destination === expectedRoute && execution.route === expectedRoute) {
      console.log(`   ✅ CASE #${i + 1} PASSED: Routed accurately to ${expectedRoute}!\n`);
    } else {
      console.log(`   ⚠️ CASE #${i + 1} FAILED: Expected ${expectedRoute}, got ${decision.destination}\n`);
    }
    console.log("------------------------------------------------------------------");
  }

  console.log("\n==================================================================");
  console.log("🎉 All Adaptive Query Routing tests completed successfully!");
  console.log("==================================================================");
}

runAdaptiveRoutingTest().catch((err) => {
  console.error("❌ Router test error:", err);
  process.exit(1);
});
