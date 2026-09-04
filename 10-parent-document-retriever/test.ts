import { ParentDocumentRetriever, ParentDocument } from "./parent-document-retriever.js";
import "dotenv/config";

async function runParentDocumentTest() {
  console.log("==================================================================");
  console.log("🧪 Testing Parent-Document Retriever & Hierarchical Chunking (Module 10)");
  console.log("==================================================================\n");

  const retriever = new ParentDocumentRetriever();

  // Full rich parent documents containing complete operational specifications
  const docs: ParentDocument[] = [
    {
      id: "auth_policy_doc",
      text: `Directiva de Seguridad 2026: Autenticación en Plataforma.
Todos los endpoints públicos deben requerir tokens JWT firmados con RS256.
Configuración de expiración: Los access tokens deben tener una validez estricta de 15 minutos.
Procedimiento de rotación: Al detectar clock skew mayor a 30 segundos, el Gateway forzará la renovación contra el auth server.
Sanciones y auditoría: Cualquier intento de bypass será registrado en CloudTrail bajo el evento UnauthenticatedAccessWarning.`,
      metadata: { category: "security", compliance: "ISO-27001" },
    },
    {
      id: "database_backup_doc",
      text: `Manual Operativo: Respaldo y Recuperación ante Desastres.
Las réplicas de lectura de PostgreSQL se sincronizan cada 5 minutos en zonas multirregión.
Los backups completos se ejecutan a las 02:00 UTC con compresión zstandard.
En caso de fallo crítico en el nodo primario, el switchover automático promueve la réplica secundaria en menos de 45 segundos.
Las claves de cifrado en reposo para los snapshots son gestionadas por AWS KMS con rotación anual automática.`,
      metadata: { category: "database", sla: "99.99%" },
    },
  ];

  // Sentence / line splitter for generating granular child chunks
  const sentenceSplitter = (text: string) =>
    text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

  console.log("1️⃣ [INGESTION] Splitting Parent Documents into Focused Child Chunks...");
  await retriever.addDocuments(docs, sentenceSplitter);
  console.log(`   ✅ Ingested ${retriever.getParentCount()} Parent Documents.`);
  console.log(`   ✅ Generated and embedded ${retriever.getChildCount()} Child Chunks in dense vector store.\n`);
  console.log("------------------------------------------------------------------");

  const query = "¿Qué algoritmo de firma se exige para los tokens y cuánto dura su validez?";
  console.log("2️⃣ [HIERARCHICAL RETRIEVAL] Searching Child Embeddings & Hydrating Full Parents:");
  console.log(`   ❓ User Query: "${query}"\n`);

  const results = await retriever.retrieve(query, 2);

  results.forEach((doc, idx) => {
    console.log(`   🏆 [Hydrated Parent #${idx + 1}] ID: [${doc.id}]`);
    console.log(`      🎯 Best Child Match Score: ${doc.matchedChildScore.toFixed(4)}`);
    console.log(`      🔍 Triggering Child Chunk: "${doc.matchedChildText}"`);
    console.log(`      📄 Full Untruncated Parent Document Context:\n`);
    console.log(`------------------------------------------------------------------`);
    console.log(doc.text);
    console.log(`------------------------------------------------------------------\n`);
  });

  // Assertions
  const topDoc = results[0];
  const hasRS256 = topDoc?.text.includes("RS256");
  const hasClockSkew = topDoc?.text.includes("clock skew");
  const hasCloudTrail = topDoc?.text.includes("CloudTrail");

  if (topDoc && topDoc.id === "auth_policy_doc" && hasRS256 && hasClockSkew && hasCloudTrail) {
    console.log("   ✅ SUCCESS: Child chunk matched specific query tokens (RS256 / 15m), and the FULL parent document");
    console.log("   ✅ was successfully hydrated with all surrounding context (clock skew and CloudTrail audit) intact!");
  } else {
    console.log(`   ⚠️ WARNING: Expected full auth_policy_doc with surrounding sections, got ${topDoc?.id}`);
  }

  console.log("\n==================================================================");
  console.log("🎉 Parent-Document Hierarchical Retrieval test complete!");
  console.log("==================================================================");
}

runParentDocumentTest().catch((err) => {
  console.error("❌ Test error:", err);
  process.exit(1);
});
