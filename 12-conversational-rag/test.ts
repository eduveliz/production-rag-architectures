import { ConversationalRAGSession } from "./conversational-rag.js";
import { HybridSearchEngine, DocumentChunk } from "../04-hybrid-search/hybrid-search.js";
import { InMemoryVectorStore } from "../02-vector-store/vector-store.js";
import "dotenv/config";

async function runConversationalRAGTest() {
  console.log("==================================================================");
  console.log("🧪 Testing Conversational RAG & Contextual Condensation (Module 12)");
  console.log("==================================================================\n");

  const vectorStore = new InMemoryVectorStore();
  const searchEngine = new HybridSearchEngine(vectorStore);
  const chatSession = new ConversationalRAGSession(searchEngine);

  const corpus: DocumentChunk[] = [
    {
      id: "doc_redis_cluster",
      text: "Redis Cluster requiere un mínimo de 3 nodos maestros para tolerancia a fallas y utiliza un total de 16384 hash slots para distribuir las claves.",
      metadata: { technology: "redis", topic: "clustering" },
    },
    {
      id: "doc_redis_memory",
      text: "Para Redis Cluster en producción se recomienda aprovisionar al menos 8 GB de RAM por nodo y configurar maxmemory-policy en volatile-lru.",
      metadata: { technology: "redis", topic: "memory_provisioning" },
    },
    {
      id: "doc_postgres_pgbouncer",
      text: "PgBouncer en modo de pooling de transacciones permite gestionar miles de conexiones concurrentes en PostgreSQL con bajo consumo de memoria.",
      metadata: { technology: "postgres", topic: "connection_pooling" },
    },
  ];

  console.log("1️⃣ [INDEXING] Ingesting technical corpus into Hybrid Search Engine...");
  await searchEngine.addDocuments(corpus);
  console.log(`   ✅ Indexed ${corpus.length} documents.\n`);
  console.log("------------------------------------------------------------------");

  // ==========================================================================
  // Turn 1: Direct Initial Query
  // ==========================================================================
  const query1 = "¿Cuántos nodos maestros necesita un clúster de Redis?";
  console.log("2️⃣ [TURN 1: Direct Independent Question]");
  console.log(`   👤 User Query: "${query1}"\n`);

  const t1 = await chatSession.chat(query1, 2);
  console.log(`   🔄 Standalone Query: "${t1.standAloneQuery}"`);
  console.log(`   📦 Top Retrieved Docs: [${t1.retrievedContextIds.join(", ")}]`);
  console.log(`   🤖 Assistant Answer:\n   ${t1.answer}\n`);

  console.log("------------------------------------------------------------------");

  // ==========================================================================
  // Turn 2: Anaphoric / Context-Dependent Follow-up Query
  // ==========================================================================
  const query2 = "¿Y cuánta memoria RAM se recomienda por nodo?";
  console.log("3️⃣ [TURN 2: Context-Dependent Follow-Up with Anaphora/Ellipsis]");
  console.log(`   👤 User Follow-Up Query: "${query2}" (Ambiguous without history)\n`);

  const t2 = await chatSession.chat(query2, 2);
  console.log(`   🔄 Rewritten Standalone Query: "${t2.standAloneQuery}"`);
  console.log(`   📦 Top Retrieved Docs: [${t2.retrievedContextIds.join(", ")}]`);
  console.log(`   🤖 Assistant Answer:\n   ${t2.answer}\n`);

  console.log("------------------------------------------------------------------");

  // Assertions
  const turn1Success = t1.retrievedContextIds[0] === "doc_redis_cluster";
  const turn2Success = t2.retrievedContextIds[0] === "doc_redis_memory";
  const coreferenceResolved =
    t2.standAloneQuery.toLowerCase().includes("redis") ||
    t2.answer.includes("8 GB");

  if (turn1Success && turn2Success && coreferenceResolved) {
    console.log("   ✅ SUCCESS: Turn 2 ambiguous query was accurately condensed into a standalone Redis question,");
    console.log("   ✅ successfully ranking 'doc_redis_memory' as #1 without topic dilution!");
  } else {
    console.log(`   ⚠️ WARNING: Turn 1: ${turn1Success}, Turn 2: ${turn2Success}, Coref: ${coreferenceResolved}`);
  }

  console.log("\n==================================================================");
  console.log("🎉 Conversational RAG & Contextual Condensation tests complete!");
  console.log("==================================================================");
}

runConversationalRAGTest().catch((err) => {
  console.error("❌ Conversational RAG test error:", err);
  process.exit(1);
});
