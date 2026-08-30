import { RAGEvaluator, EvaluationInput } from "./evaluator.js";
import "dotenv/config";

async function runEvaluationTests() {
  console.log("==================================================================");
  console.log("🧪 Testing Automated RAG Evaluation & LLM-as-a-Judge (Module 6)");
  console.log("==================================================================\n");

  const evaluator = new RAGEvaluator({
    faithfulnessThreshold: 0.85,
    relevanceThreshold: 0.80,
  });

  const contextData = [
    "Los clústeres de Kubernetes en producción requieren etcd en almacenamiento SSD con al menos 3 nodos para consenso Raft.",
    "El cifrado en reposo para Secrets de Kubernetes se configura mediante el proveedor KMS o EncryptionConfig.",
  ];

  console.log("📚 Ground Truth Context:");
  contextData.forEach((c, idx) => console.log(`   [Context ${idx + 1}] ${c}`));
  console.log("\n------------------------------------------------------------------");

  // ==========================================================================
  // Test 1: Grounded & Relevant Response
  // ==========================================================================
  console.log("1️⃣ [TEST 1: Grounded and Relevant Response (Should PASS Guardrail)]");
  const test1: EvaluationInput = {
    query: "¿Cuántos nodos etcd se recomiendan para un clúster de Kubernetes y qué almacenamiento usan?",
    retrievedContext: contextData,
    generatedAnswer: "Se recomiendan al menos 3 nodos para el consenso Raft y deben usar almacenamiento SSD.",
  };

  console.log(`   ❓ Query: "${test1.query}"`);
  console.log(`   🤖 Generated Answer: "${test1.generatedAnswer}"\n`);

  const res1 = await evaluator.evaluate(test1);
  console.log("   📊 Evaluation Verdict:");
  console.log(`      • Faithfulness Score: ${res1.faithfulnessScore.toFixed(2)} / 1.00`);
  console.log(`        Justification: "${res1.faithfulnessReason}"`);
  console.log(`      • Answer Relevance Score: ${res1.answerRelevanceScore.toFixed(2)} / 1.00`);
  console.log(`        Justification: "${res1.answerRelevanceReason}"`);
  console.log(`      • Passed Guardrail: ${res1.passedGuardrail ? "✅ TRUE" : "❌ FALSE"}\n`);

  if (res1.passedGuardrail && res1.faithfulnessScore >= 0.9) {
    console.log("   ✅ TEST 1 PASSED: Evaluator verified full factual grounding and high relevance!");
  } else {
    console.log("   ⚠️ TEST 1 FAILED: Expected pass with faithfulness >= 0.90");
  }

  console.log("\n------------------------------------------------------------------");

  // ==========================================================================
  // Test 2: Hallucinated Response (Fabricated Claim Outside Context)
  // ==========================================================================
  console.log("2️⃣ [TEST 2: Hallucinated Response with External Data (Should FAIL Guardrail)]");
  const test2: EvaluationInput = {
    query: "¿Cómo se configuran los nodos etcd?",
    retrievedContext: contextData,
    generatedAnswer: "Se necesitan 3 nodos SSD y además debes usar NGINX Ingress Controller en el puerto 443.",
  };

  console.log(`   ❓ Query: "${test2.query}"`);
  console.log(`   🤖 Generated Answer: "${test2.generatedAnswer}"\n`);

  const res2 = await evaluator.evaluate(test2);
  console.log("   📊 Evaluation Verdict:");
  console.log(`      • Faithfulness Score: ${res2.faithfulnessScore.toFixed(2)} / 1.00`);
  console.log(`        Justification: "${res2.faithfulnessReason}"`);
  console.log(`      • Answer Relevance Score: ${res2.answerRelevanceScore.toFixed(2)} / 1.00`);
  console.log(`        Justification: "${res2.answerRelevanceReason}"`);
  console.log(`      • Passed Guardrail: ${res2.passedGuardrail ? "❌ TRUE (Unexpected)" : "🛡️ BLOCKED (Expected)"}\n`);

  if (!res2.passedGuardrail && res2.faithfulnessScore < 0.85) {
    console.log("   ✅ TEST 2 PASSED: Evaluator caught ungrounded NGINX Ingress hallucination and blocked output!");
  } else {
    console.log("   ⚠️ TEST 2 FAILED: Hallucinated response was not properly caught.");
  }

  console.log("\n==================================================================");
  console.log("🎉 All Automated Evaluation & LLM-as-a-Judge tests completed!");
  console.log("==================================================================");
}

runEvaluationTests().catch((err) => {
  console.error("❌ Evaluation test error:", err);
  process.exit(1);
});
