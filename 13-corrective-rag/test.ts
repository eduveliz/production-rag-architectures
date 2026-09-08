import { CorrectiveRAGPipeline } from "./corrective-rag.js";
import { HybridSearchEngine, DocumentChunk } from "../04-hybrid-search/hybrid-search.js";
import { InMemoryVectorStore } from "../02-vector-store/vector-store.js";
import "dotenv/config";

async function runCRAGTestSuite() {
  console.log("==================================================================");
  console.log("🧪 Testing Corrective RAG (CRAG) & Retrieval Auditing (Module 13)");
  console.log("==================================================================\n");

  const vectorStore = new InMemoryVectorStore();
  const searchEngine = new HybridSearchEngine(vectorStore);
  const crag = new CorrectiveRAGPipeline(searchEngine);

  const corpus: DocumentChunk[] = [
    {
      id: "policy_sla_gold",
      text: "Los clientes de nivel Gold disponen de un SLA garantizado de resolución de incidentes críticos de 2 horas con soporte telefónico 24/7.",
      metadata: { tier: "gold", type: "sla_policy" },
    },
    {
      id: "policy_sla_silver",
      text: "Los clientes de nivel Silver disponen de un SLA de respuesta inicial de 8 horas en horario laboral estándar.",
      metadata: { tier: "silver", type: "sla_policy" },
    },
  ];

  console.log("1️⃣ [INDEXING] Ingesting enterprise SLA policies into Hybrid Search Engine...");
  await searchEngine.addDocuments(corpus);
  console.log(`   ✅ Indexed ${corpus.length} policy documents.\n`);
  console.log("------------------------------------------------------------------");

  // ==========================================================================
  // Case 1: In-Domain Query with Sufficient Information (CORRECT)
  // ==========================================================================
  const query1 = "¿Cuál es el SLA para incidentes críticos de clientes Gold?";
  console.log("2️⃣ [CASE 1: In-Domain Query with Full Direct Context]");
  console.log(`   👤 User Query: "${query1}"\n`);

  const res1 = await crag.answerWithCorrection(query1);
  console.log(`   🔍 Retrieval Audit Status: [${res1.audit.status}] (Score: ${res1.audit.confidenceScore})`);
  console.log(`   📋 Reasoning: ${res1.audit.reasoning}`);
  if (res1.audit.filteredKnowledge) {
    console.log(`   💡 Filtered Knowledge:\n      "${res1.audit.filteredKnowledge.trim()}"`);
  }
  console.log(`   🤖 Assistant Answer:\n   ${res1.answer}\n`);

  console.log("------------------------------------------------------------------");

  // ==========================================================================
  // Case 2: Out-of-Domain Query (INCORRECT - Triggers Safe Fallback)
  // ==========================================================================
  const query2 = "¿Cómo configuro un túnel VPN IPSec en un router Cisco?";
  console.log("3️⃣ [CASE 2: Out-of-Domain Query with Irrelevant Knowledge]");
  console.log(`   👤 User Query: "${query2}"\n`);

  const res2 = await crag.answerWithCorrection(query2);
  console.log(`   🔍 Retrieval Audit Status: [${res2.audit.status}] (Score: ${res2.audit.confidenceScore})`);
  console.log(`   📋 Reasoning: ${res2.audit.reasoning}`);
  console.log(`   🤖 Assistant Answer:\n   ${res2.answer}\n`);

  console.log("------------------------------------------------------------------");

  // ==========================================================================
  // Case 3: Partial / Ambiguous Query (AMBIGUOUS - Bounded Synthesis)
  // ==========================================================================
  const query3 = "¿Cuál es el SLA de resolución para clientes Platinum y Silver?";
  console.log("4️⃣ [CASE 3: Partial Knowledge Query with Missing Entities]");
  console.log(`   👤 User Query: "${query3}"\n`);

  const res3 = await crag.answerWithCorrection(query3);
  console.log(`   🔍 Retrieval Audit Status: [${res3.audit.status}] (Score: ${res3.audit.confidenceScore})`);
  console.log(`   📋 Reasoning: ${res3.audit.reasoning}`);
  console.log(`   🤖 Assistant Answer:\n   ${res3.answer}\n`);

  console.log("------------------------------------------------------------------");

  // Assertions
  const c1Correct = res1.audit.status === "CORRECT";
  const c2Incorrect = res1.audit.status !== "INCORRECT" && res2.audit.status === "INCORRECT";
  const c2NoHallucination = !res2.answer.toLowerCase().includes("gold") && !res2.answer.toLowerCase().includes("silver");

  if (c1Correct && c2Incorrect && c2NoHallucination) {
    console.log("   ✅ SUCCESS: CRAG correctly classified Case 1 as CORRECT and Case 2 as INCORRECT.");
    console.log("   ✅ Safe fallback blocked noise injection and prevented hallucination!");
  } else {
    console.log(`   ⚠️ WARNING: Evaluation flags: C1=${c1Correct}, C2=${c2Incorrect}, NoHallucination=${c2NoHallucination}`);
  }

  console.log("\n==================================================================");
  console.log("🎉 Corrective RAG (CRAG) tests complete!");
  console.log("==================================================================");
}

runCRAGTestSuite().catch((err) => {
  console.error("❌ CRAG test error:", err);
  process.exit(1);
});
