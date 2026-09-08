import { EmbeddingSemanticRouter, RouteDefinition } from "./semantic-router.js";
import "dotenv/config";

async function runSemanticRouterTestSuite() {
  console.log("==================================================================");
  console.log("🧪 Testing High-Throughput Semantic Router (Module 15)");
  console.log("==================================================================\n");

  const router = new EmbeddingSemanticRouter();

  console.log("1️⃣ [PRECOMPUTING] Registering and Vectorizing Route Utterances...");
  const routes: RouteDefinition[] = [
    {
      name: "CHITCHAT",
      threshold: 0.78,
      utterances: [
        "hola, ¿cómo estás?",
        "buenos días asistente",
        "muchas gracias por tu ayuda",
        "adiós, que tengas buen día",
      ],
    },
    {
      name: "STRUCTURED_SQL",
      threshold: 0.75,
      utterances: [
        "cuántas transacciones hubo este mes",
        "dame el total de ventas del último trimestre",
        "promedio de ingresos por usuario",
        "muéstrame el reporte consolidado de facturación",
      ],
    },
    {
      name: "DOCS_RAG",
      threshold: 0.74,
      utterances: [
        "cómo configurar alta disponibilidad en redis",
        "directivas de autenticación jwt y certificados",
        "arquitectura de tolerancia a fallos en kubernetes",
        "procedimiento de rotación de credenciales kms",
      ],
    },
  ];

  const startTime = performance.now();
  await router.registerRoutes(routes);
  const registrationDuration = (performance.now() - startTime).toFixed(2);
  console.log(`   ✅ Precomputed embeddings for ${routes.length} routes in ${registrationDuration} ms.\n`);
  console.log("------------------------------------------------------------------");

  console.log("2️⃣ [BENCHMARK & DISPATCH] Routing User Queries with Zero LLM Prompts...\n");

  const testCases = [
    {
      query: "¡Hola! Espero que estés bien",
      expectedRoute: "CHITCHAT",
    },
    {
      query: "¿Cuál fue el volumen total facturado en marzo?",
      expectedRoute: "STRUCTURED_SQL",
    },
    {
      query: "¿Cómo implemento la rotación de claves en KMS?",
      expectedRoute: "DOCS_RAG",
    },
    {
      query: "¿Podrías decirme una receta de pasta casera con salsa pesto?",
      expectedRoute: null, // Fallback
    },
  ];

  let allPassed = true;

  for (let i = 0; i < testCases.length; i++) {
    const { query, expectedRoute } = testCases[i];
    const res = await router.route(query);
    const destination = res.matchedRoute ? `[${res.matchedRoute}]` : "[FALLBACK / DEFAULT_PATH]";
    const passed = res.matchedRoute === expectedRoute;

    if (!passed) allPassed = false;

    console.log(`   📋 Case ${i + 1}: "${query}"`);
    console.log(`      🎯 Matched Route:     ${destination}`);
    console.log(`      🏆 Best Cosine Score: ${res.score.toFixed(4)}`);
    if (res.matchedUtterance) {
      console.log(`      🔗 Nearest Utterance: "${res.matchedUtterance}"`);
    }
    console.log(`      ⚡ Roundtrip Latency: ${res.latencyMs.toFixed(2)} ms`);
    console.log(`      ${passed ? "✅ PASS" : "❌ FAIL"}\n`);
  }

  console.log("------------------------------------------------------------------");
  if (allPassed) {
    console.log("   ✅ SUCCESS: All queries routed with high confidence & deterministic fallback!");
    console.log("   ✅ Substituted expensive multi-second LLM prompts with sub-millisecond local vector arithmetic.");
  } else {
    console.log("   ⚠️ WARNING: Some test cases did not match expected route.");
  }

  console.log("\n==================================================================");
  console.log("🎉 Semantic Router tests complete!");
  console.log("==================================================================");
}

runSemanticRouterTestSuite().catch((err) => {
  console.error("❌ Semantic Router test error:", err);
  process.exit(1);
});
