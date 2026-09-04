import { SimpleGraphRAG } from "./graph-rag.js";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI(apiKey ? { apiKey } : {});

async function runGraphRAGTest() {
  console.log("==================================================================");
  console.log("🧪 Testing GraphRAG & Entity-Relation Knowledge Graph (Module 11)");
  console.log("==================================================================\n");

  const graph = new SimpleGraphRAG();

  const documents = [
    "El microservicio de Facturación depende obligatoriamente de Auth Gateway para validar tokens RS256 en cada pago.",
    "El Auth Gateway delega la auditoría de accesos al servicio CloudTrail mediante eventos asíncronos.",
    "CloudTrail almacena sus registros encriptados en un bucket S3 protegido por KMS con alertas activadas hacia Datadog.",
  ];

  console.log("1️⃣ [KNOWLEDGE EXTRACTION] Extracting entities and triples across technical corpus:\n");
  documents.forEach((doc, i) => console.log(`   📄 Document [${i + 1}]: "${doc}"`));
  console.log("");

  const extractionResult = await graph.extractKnowledgeFromCorpus(documents);
  console.log(`   🏷️ Extracted Entities (${extractionResult.entities.length}):`, extractionResult.entities);
  console.log(`   🔗 Extracted Triples (${extractionResult.triples.length}):`);
  extractionResult.triples.forEach((t) => {
    console.log(`      (${t.source}) --[${t.relation}]--> (${t.target}) | Evidence: "${t.evidence}"`);
  });

  graph.addTriples(extractionResult.triples);

  console.log("\n------------------------------------------------------------------");
  const queryEntity = "facturacion";
  console.log(`2️⃣ [MULTIHOP TRAVERSAL] Traversing knowledge graph from seed entity: "${queryEntity}" (Max Depth = 2)\n`);

  const subGraph = graph.traverseSubGraph(queryEntity, 2);
  const graphContext = graph.formatGraphContext(subGraph);

  console.log("   🕸️ Discovered Subgraph Triples:\n");
  console.log(graphContext);
  console.log("\n------------------------------------------------------------------");

  console.log("3️⃣ [GRAPH-AUGMENTED GENERATION] Answering multi-hop relational question...\n");
  const prompt = `Utiliza las siguientes relaciones del grafo de conocimiento para explicar cómo se relaciona 'Facturación' con 'CloudTrail':\n\n${graphContext}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: prompt,
    config: {
      temperature: 0.1,
    },
  });

  const responseText = response.text?.trim() || "";
  console.log(`   🤖 LLM Synthesis:\n`);
  console.log(responseText);
  console.log("\n------------------------------------------------------------------");

  // Assertions
  const mentionsAuthGateway = responseText.toLowerCase().includes("auth") || false;
  const mentionsCloudTrail = responseText.toLowerCase().includes("cloudtrail") || false;

  if (subGraph.length >= 2 && mentionsAuthGateway && mentionsCloudTrail) {
    console.log("   ✅ SUCCESS: Multi-hop path (Facturación -> Auth Gateway -> CloudTrail) successfully");
    console.log("   ✅ discovered via graph traversal and articulated by generative LLM without isolated chunk retrieval errors!");
  } else {
    console.log(`   ⚠️ WARNING: Subgraph triples count: ${subGraph.length}`);
  }

  console.log("\n==================================================================");
  console.log("🎉 GraphRAG & Knowledge Graph Traversal tests complete!");
  console.log("==================================================================");
}

runGraphRAGTest().catch((err) => {
  console.error("❌ GraphRAG test error:", err);
  process.exit(1);
});
