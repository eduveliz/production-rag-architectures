# Production RAG Architectures 🚀

> **Mastering Production-Grade Retrieval-Augmented Generation (RAG) & Advanced AI Engineering.**
>
> *Languages:* [English](#-english) | [Español](#-español)

---

## 🇺🇸 English

### 📖 Overview
This repository contains production-grade implementations, architectural patterns, research paper breakdowns, and practical modules for building scalable, reliable, and high-accuracy **Retrieval-Augmented Generation (RAG)** systems.

### 🗺️ Modules Roadmap

| # | Module | Description | Status |
|---|---|---|---|
| **01** | [`01-semantic-chunker`](./01-semantic-chunker) | Semantic Chunking using Gemini Embeddings & Cosine Thresholding vs Fixed-Size Chunking | ✅ Completed |
| **02** | [`02-vector-store`](./02-vector-store) | In-Memory Vector Store & Cosine Similarity Dense Retrieval Pipeline | ✅ Completed |
| **03** | [`03-rag-pipeline`](./03-rag-pipeline) | Grounded End-to-End RAG Pipeline with Context Framing & Anti-Hallucination Guardrails | ✅ Completed |
| **04** | [`04-hybrid-search`](./04-hybrid-search) | Hybrid Search: BM25 Sparse Lexical Search + Dense Vectors + Reciprocal Rank Fusion (RRF) | ✅ Completed |
| **05** | [`05-reranker`](./05-reranker) | Two-Stage Retrieval: Cross-Encoder Re-ranking & Deep Attention Re-scoring | ✅ Completed |
| **06** | [`06-evaluator`](./06-evaluator) | Automated Evaluation: LLM-as-a-Judge & The RAG Triad (Faithfulness & Relevance) | ✅ Completed |
| **07** | [`07-guardrails`](./07-guardrails) | Context Poisoning & Security Guardrails: Fast-Path Regex, Neural Inspection & CDATA Isolation | ✅ Completed |
| **08** | [`08-query-transformer`](./08-query-transformer) | Query Transformation Pipelines: Multi-Query Expansion, Step-Back Prompting & HyDE | ✅ Completed |
| **09** | [`09-adaptive-router`](./09-adaptive-router) | Adaptive Query Routing & Agentic Dispatch: Direct LLM, Structured SQL, and Vector RAG | ✅ Completed |
| **10** | [`10-parent-document-retriever`](./10-parent-document-retriever) | Parent-Document Retrieval & Hierarchical Chunking (Small-to-Big Retrieval) | ✅ Completed |
| **11** | [`11-graph-rag`](./11-graph-rag) | GraphRAG: Entity-Relation Extraction, Directed Knowledge Graph & Multi-Hop Traversal | ✅ Completed |
| **12** | *Coming Soon* | Contextual Embeddings & Late Chunking Architectures | ⏳ Upcoming |

---

### 🔀 Hybrid Search with Reciprocal Rank Fusion (RRF)

#### Why Dense Embeddings Alone Fail in Technical Environments
While dense embeddings excel at capturing high-level conceptual nuances, they suffer from a well-known vulnerability in production technical systems:
1. **Exact Matches & Rare Tokens**: Model identifiers, SKUs, API keys, error codes, and class names (e.g., `AuthService JWT-9042`) have low representation in dense latent spaces and get diluted across vector dimensions.
2. **Out-of-Vocabulary (OOV) Jargon**: Highly domain-specific abbreviations and symbols produce suboptimal cosine similarities.

#### The Solution: BM25 + Reciprocal Rank Fusion (RRF)
Hybrid search pairs **Sparse Lexical Search (BM25)** for exact keyword matching with **Dense Semantic Vectors** for conceptual coverage, uniting both ranking systems using **Reciprocal Rank Fusion (RRF)**:

$$RRF(d) = \sum_{m \in M} \frac{1}{k + r_m(d)}$$

---

### 🎯 Two-Stage Retrieval: Bi-Encoders vs. Cross-Encoders (Re-ranking)

Production RAG systems balance throughput and precision using a **Two-Stage Retrieval Pipeline**:

```
[Entire Corpus: 100,000+ docs]
          │
          ▼ (Stage 1: Fast Hybrid Retrieval / Bi-Encoders)
[Top-K Candidates: 20-50 docs]
          │
          ▼ (Stage 2: Cross-Encoder Re-ranker / Deep Cross-Attention)
[Final Precision Top-N Chunks for LLM Generation]
```

---

### ⚖️ Automated Evaluation & LLM-as-a-Judge (The RAG Triad)

Continuous evaluation in production relies on **LLM-as-a-Judge** scoring the three core pillars of **The RAG Triad**:

1. **Context Relevance ($Q \rightarrow C$)**: Measures whether the retrieved chunks are relevant and noise-free.
2. **Faithfulness / Groundedness ($C \rightarrow A$)**: Evaluates whether every factual claim in the generated answer is strictly supported by the context, preventing hallucinations:
   $$\text{Faithfulness} = \frac{|\text{Verified Claims Supported by } C|}{|\text{Total Claims in } A|}$$
3. **Answer Relevance ($Q \rightarrow A$)**: Ensures the model directly answers the user's intent without wandering or evading.

---

### 🛡️ Context Poisoning & Security Guardrails

To protect production pipelines against **Indirect Prompt Injections** and adversarial context hijacking (OWASP LLM01 & LLM05), a multi-layer defense-in-depth framework is applied:

1. **Layer 1 — Fast-Path Regex Filter ($< 1\text{ms}$)**: Scans for explicit instruction overrides, roleplay triggers, and exfiltration patterns.
2. **Layer 2 — Deep Neural LLM Classifier**: Uses a zero-temperature model to identify subtle and indirect adversarial payloads.
3. **Layer 3 — Structural CDATA Context Isolation**: Wraps chunks inside XML `<document id="..."><![CDATA[ ... ]]></document>` blocks and sanitizes control tags to prevent delimiter escape.

---

### 🔄 Query Transformation Pipelines (Multi-Query, Step-Back & HyDE)

To overcome ambiguous or poorly formulated user queries:

1. **Multi-Query Expansion**: Generates $K$ alternative technical reformulations.
2. **Step-Back Prompting**: Extracts high-level conceptual questions.
3. **Hypothetical Document Embeddings (HyDE)**: Generates a dense hypothetical answer passage to query in document-document space.

---

### 🧭 Adaptive Query Routing & Agentic Dispatch

1. **`DIRECT_RESPONSE`**: Handles greetings and general conversational logic with zero retrieval latency and minimal token consumption.
2. **`STRUCTURED_QUERY`**: Routes analytical aggregation queries (e.g., sales metrics, counts) to deterministic SQL engines.
3. **`VECTOR_RAG`**: Directs complex technical documentation questions to the full Two-Stage Hybrid Search & Re-ranking pipeline.

---

### 🌲 Parent-Document Retrieval & Hierarchical Chunking (Small-to-Big)

1. **Index Small**: Splits parent documents into focused child chunks (sentences) and generates embeddings only for the child chunks to maximize semantic density.
2. **Retrieve Big**: Matches query vectors against child embeddings, then dynamically hydrates the full parent document to supply rich, untruncated context to the generative LLM.

---

### 🕸️ GraphRAG & Multi-Hop Relational Traversal

Flat vector search struggles with questions whose answers bridge across disparate documents. **GraphRAG**:
1. **Extracts Triples**: Extracts structured directed knowledge triples ($\text{Subject} \xrightarrow{\text{Relation}} \text{Object}$) with textual evidence quotes.
2. **Directed Graph Storage**: Builds an in-memory directed graph representing microservices, databases, and dependencies.
3. **Multi-Hop Traversal**: Executes Breadth-First Search (BFS) starting from query seed entities up to depth $N$, allowing the LLM to explain indirect dependencies (e.g., *Billing* $\rightarrow$ *Auth Gateway* $\rightarrow$ *CloudTrail*).

---

### 🛠️ Getting Started

#### Prerequisites
- **Node.js**: `v20+` (v24 recommended)
- **Gemini API Key**: from [Google AI Studio](https://aistudio.google.com/)

#### Installation
```bash
npm install
```

#### Environment Configuration
Create a `.env` file in the root directory:
```bash
cp .env.example .env
```
Add your API key:
```env
GEMINI_API_KEY="your-gemini-api-key-here"
```

#### Running Modules
Each module provides its dedicated execution script:
```bash
# Run Module 01: Semantic Chunker
npm run test:01

# Run Module 02: In-Memory Vector Store
npm run test:02

# Run Module 03: Grounded RAG Pipeline
npm run test:03

# Run Module 04: Hybrid Search (BM25 + RRF)
npm run test:04

# Run Module 05: Two-Stage Re-ranking Pipeline
npm run test:05

# Run Module 06: Automated Evaluation & LLM-as-a-Judge
npm run test:06

# Run Module 07: Security Guardrails & Context Sanitization
npm run test:07

# Run Module 08: Query Transformation Pipelines (Multi-Query, Step-Back, HyDE)
npm run test:08

# Run Module 09: Adaptive Query Routing & Dispatch
npm run test:09

# Run Module 10: Parent-Document Retrieval & Hierarchical Chunking
npm run test:10

# Run Module 11: GraphRAG & Multi-Hop Traversal
npm run test:11
```

---

## 🇪🇸 Español

### 📖 Descripción General
Este repositorio contiene implementaciones de nivel de producción, patrones de arquitectura, análisis de papers de investigación y módulos prácticos para construir sistemas de **Generación Aumentada por Recuperación (RAG)** escalables, confiables y de alta precisión.

### 🗺️ Hoja de Ruta de Módulos

| # | Módulo | Descripción | Estado |
|---|---|---|---|
| **01** | [`01-semantic-chunker`](./01-semantic-chunker) | Semantic Chunking con Embeddings de Gemini y Similitud de Coseno vs Fixed-Size Chunking | ✅ Completado |
| **02** | [`02-vector-store`](./02-vector-store) | Vector Store en Memoria y Pipeline de Recuperación Densa por Similitud de Coseno | ✅ Completado |
| **03** | [`03-rag-pipeline`](./03-rag-pipeline) | Pipeline RAG End-to-End con Anclaje Estricto, Delimitación de Contexto y Guardrails | ✅ Completado |
| **04** | [`04-hybrid-search`](./04-hybrid-search) | Búsqueda Híbrida: BM25 Léxico Disperso + Vectores Densos + Reciprocal Rank Fusion (RRF) | ✅ Completado |
| **05** | [`05-reranker`](./05-reranker) | Recuperación en Dos Etapas: Re-ranking con Cross-Encoder y Atención Profunda | ✅ Completado |
| **06** | [`06-evaluator`](./06-evaluator) | Evaluación Automatizada: LLM-as-a-Judge y la Tríada RAG (Fidelidad y Relevancia) | ✅ Completado |
| **07** | [`07-guardrails`](./07-guardrails) | Envenenamiento de Contexto y Guardrails: Filtro Regex, Inspección Neuronal y CDATA | ✅ Completado |
| **08** | [`08-query-transformer`](./08-query-transformer) | Transformación de Consultas: Multi-Query, Step-Back Prompting y HyDE | ✅ Completado |
| **09** | [`09-adaptive-router`](./09-adaptive-router) | Enrutamiento Adaptativo de Consultas y Despacho Agéntico: Directo, SQL y Vector RAG | ✅ Completado |
| **10** | [`10-parent-document-retriever`](./10-parent-document-retriever) | Recuperación de Documento Padre y Chunking Jerárquico (Small-to-Big Retrieval) | ✅ Completado |
| **11** | [`11-graph-rag`](./11-graph-rag) | GraphRAG: Extracción de Entidades-Relaciones, Grafo Dirigido y Travesía Multi-Salto | ✅ Completado |
| **12** | *Próximamente* | Contextual Embeddings y Arquitecturas de Late Chunking | ⏳ Próximo |

---

### 🔀 Búsqueda Híbrida con Reciprocal Rank Fusion (RRF)

La búsqueda híbrida combina **Búsqueda Léxica Dispersa (BM25)** para coincidencias exactas con **Vectores Semánticos Densos** para abstracción conceptual, fusionando ambos sistemas mediante **Reciprocal Rank Fusion (RRF)**:

$$RRF(d) = \sum_{m \in M} \frac{1}{k + r_m(d)}$$

---

### 🎯 Recuperación en Dos Etapas: Bi-Encoders vs. Cross-Encoders (Re-ranking)

1. **Etapa 1 (Bi-Encoders / Búsqueda Híbrida)**: Generación rápida de candidatos de alto recall sobre todo el corpus en milisegundos.
2. **Etapa 2 (Cross-Encoder / Re-ranker)**: Evaluación con atención cruzada token a token sobre los mejores candidatos preseleccionados ($K=20-50$), ordenando con máxima precisión antes de enviar el contexto al LLM generativo.

---

### ⚖️ Evaluación Automatizada y LLM-as-a-Judge (La Tríada RAG)

1. **Relevancia del Contexto ($Q \rightarrow C$)**: Pureza del contexto recuperado.
2. **Fidelidad / Anclaje (*Faithfulness*) ($C \rightarrow A$)**: Detección y eliminación de alucinaciones.
3. **Relevancia de la Respuesta ($Q \rightarrow A$)**: Alineación con la intención del usuario.

---

### 🛡️ Envenenamiento de Contexto y Guardrails de Seguridad

1. **Capa 1 — Filtro Heurístico Rápido (Regex $< 1\text{ms}$)**: Bloqueo de jailbreaks.
2. **Capa 2 — Clasificador Neuronal Profundo**: Detección de inyecciones semánticas indirectas.
3. **Capa 3 — Encapsulamiento Estructural con CDATA**: Aislamiento seguro de fragmentos.

---

### 🔄 Pipelines de Transformación de Consultas (Multi-Query, Step-Back y HyDE)

1. **Multi-Query Expansion**: Variantes complementarias de la consulta.
2. **Step-Back Prompting**: Abstracción conceptual de principios fundamentales.
3. **Hypothetical Document Embeddings (HyDE)**: Generación de pasajes hipotéticos para búsqueda documento a documento.

---

### 🧭 Enrutamiento Adaptativo de Consultas y Despacho Agéntico

1. **`DIRECT_RESPONSE`**: Respuestas conversacionales sin costo de recuperación.
2. **`STRUCTURED_QUERY`**: Consultas analíticas sobre bases de datos SQL.
3. **`VECTOR_RAG`**: Documentación técnica mediante búsqueda híbrida y re-ranking.

---

### 🌲 Recuperación de Documento Padre y Chunking Jerárquico (Small-to-Big)

1. **Indexación con Hijos (Small)**: Embeddings atómicos de oraciones sin dilución semántica.
2. **Recuperación con Padres (Big)**: Hidratación del documento padre completo para entregar contexto íntegro al LLM.

---

### 🕸️ GraphRAG y Razonamiento Multi-Salto

1. **Extracción Estructurada de Ternas**: Extrae relaciones explícitas ($\text{Sujeto} \xrightarrow{\text{Relación}} \text{Objeto}$) con evidencias textuales.
2. **Almacén de Grafo Dirigido**: Indexa entidades y aristas en memoria.
3. **Recorrido BFS Multi-Salto**: Conecta dependencias indirectas entre documentos aislados (ej. *Facturación* $\rightarrow$ *Auth Gateway* $\rightarrow$ *CloudTrail*).

---

### 🛠️ Primeros Pasos

#### Requisitos Previos
- **Node.js**: `v20+` (v24 recomendado)
- **Gemini API Key**: obtenida en [Google AI Studio](https://aistudio.google.com/)

#### Instalación
```bash
npm install
```

#### Configuración de Variables de Entorno
Copia el archivo `.env.example` a `.env`:
```bash
cp .env.example .env
```
Agrega tu clave de API:
```env
GEMINI_API_KEY="tu_gemini_api_key"
```

#### Ejecución de Módulos
```bash
# Ejecutar Módulo 01: Semantic Chunker
npm run test:01

# Ejecutar Módulo 02: Vector Store en Memoria
npm run test:02

# Ejecutar Módulo 03: Pipeline RAG con Anclaje Estricto
npm run test:03

# Ejecutar Módulo 04: Búsqueda Híbrida (BM25 + RRF)
npm run test:04

# Ejecutar Módulo 05: Re-ranking en Dos Etapas
npm run test:05

# Ejecutar Módulo 06: Evaluación Automatizada (Tríada RAG)
npm run test:06

# Ejecutar Módulo 07: Guardrails de Seguridad y Sanitización
npm run test:07

# Ejecutar Módulo 08: Transformación de Consultas (Multi-Query, Step-Back, HyDE)
npm run test:08

# Ejecutar Módulo 09: Enrutamiento Adaptativo de Consultas
npm run test:09

# Ejecutar Módulo 10: Recuperación de Documento Padre (Small-to-Big)
npm run test:10

# Ejecutar Módulo 11: GraphRAG y Travesía Multi-Salto
npm run test:11
```
