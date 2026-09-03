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
| **10** | *Coming Soon* | Graph-RAG & Agentic Multi-Hop Retrieval | ⏳ Upcoming |

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

#### Bi-Encoders vs. Cross-Encoders Comparison

| Dimension | Bi-Encoder (Stage 1: Vector Index) | Cross-Encoder (Stage 2: Re-ranker) |
|---|---|---|
| **Architecture** | Dual towers: $E(q)$ and $E(d)$ encoded independently | Single tower: $E([q; \text{SEP}; d])$ encoded jointly |
| **Token Interaction** | No cross-token attention between query and document | Full $O(L^2)$ multi-head self-attention between every query/doc token pair |
| **Computational Speed** | Ultra-fast ($< 5\text{ms}$) via Approximate Nearest Neighbor (ANN) | Computationally heavier ($10-50\text{ms}$ over small candidate batch) |
| **Constraint Resolution** | Moderate (may match related frameworks or false synonyms) | High (strictly evaluates specific frameworks, versions, and negations) |

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

Naive architectures push all queries through heavy vector retrieval. **Adaptive Routing** analyzes intent and dispatches requests to the optimal specialized engine:

1. **`DIRECT_RESPONSE`**: Handles greetings and general conversational logic with zero retrieval latency and minimal token consumption.
2. **`STRUCTURED_QUERY`**: Routes analytical aggregation queries (e.g., sales metrics, counts) to deterministic SQL engines.
3. **`VECTOR_RAG`**: Directs complex technical documentation questions to the full Two-Stage Hybrid Search & Re-ranking pipeline.

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
| **10** | *Próximamente* | Graph-RAG y Recuperación Agéntica Multi-Salto | ⏳ Próximo |

---

### 🔀 Búsqueda Híbrida con Reciprocal Rank Fusion (RRF)

#### Por qué los Embeddings Densos Fallan en Entornos Técnicos
Aunque los vectores densos capturan eficazmente la semántica conceptual, presentan limitaciones críticas en producción técnica:
1. **Coincidencias Exactas y Tokens Raros**: Identificadores de código, SKUs, UUIDs, nombres de clases (`AuthService`), códigos de error y tokens como `JWT-9042` se diluyen en las dimensiones del espacio latente.
2. **Vocabulario Fuera de Distribución (OOV)**: Términos hiperespecializados y abreviaturas técnicas no se proyectan con suficiente distancia discriminatoria.

#### La Solución: BM25 + Reciprocal Rank Fusion (RRF)
La búsqueda híbrida combina **Búsqueda Léxica Dispersa (BM25)** para coincidencias exactas con **Vectores Semánticos Densos** para abstracción conceptual, fusionando ambos sistemas mediante **Reciprocal Rank Fusion (RRF)**:

$$RRF(d) = \sum_{m \in M} \frac{1}{k + r_m(d)}$$

---

### 🎯 Recuperación en Dos Etapas: Bi-Encoders vs. Cross-Encoders (Re-ranking)

Los sistemas RAG de producción equilibran velocidad y precisión mediante un **Pipeline de Dos Etapas**:

1. **Etapa 1 (Bi-Encoders / Búsqueda Híbrida)**: Generación rápida de candidatos de alto recall sobre todo el corpus en milisegundos.
2. **Etapa 2 (Cross-Encoder / Re-ranker)**: Evaluación con atención cruzada token a token sobre los mejores candidatos preseleccionados ($K=20-50$), ordenando con máxima precisión antes de enviar el contexto al LLM generativo.

---

### ⚖️ Evaluación Automatizada y LLM-as-a-Judge (La Tríada RAG)

La evaluación continua en producción implementa el patrón **LLM-as-a-Judge** midiendo **La Tríada RAG**:

1. **Relevancia del Contexto ($Q \rightarrow C$)**: Evalúa la pureza y ausencia de ruido en los fragmentos recuperados.
2. **Fidelidad / Anclaje (*Faithfulness*) ($C \rightarrow A$)**: Valida que cada dato emitido por el modelo esté fundamentado en los fragmentos provistos, detectando alucinaciones:
   $$\text{Faithfulness} = \frac{\text{Afirmaciones válidas en } C}{\text{Total de afirmaciones en } A}$$
3. **Relevancia de la Respuesta ($Q \rightarrow A$)**: Verifica que el modelo responda con precisión a la pregunta del usuario.

---

### 🛡️ Envenenamiento de Contexto y Guardrails de Seguridad

Para proteger las arquitecturas RAG frente a **Inyecciones Indirectas de Prompts** y manipulaciones adversarias (OWASP LLM01 y LLM05), se despliega una defensa en profundidad de tres capas:

1. **Capa 1 — Filtro Heurístico Rápido (Regex $< 1\text{ms}$)**: Detección instantánea de patrones de anulación de instrucciones y jailbreak.
2. **Capa 2 — Clasificador Neuronal Profundo**: Modelo LLM a temperatura cero especializado en detectar inyecciones sutiles y esteganográficas.
3. **Capa 3 — Encapsulamiento Estructural con CDATA**: Aislamiento dentro de bloques XML `<document id="..."><![CDATA[ ... ]]></document>` con saneamiento de etiquetas para prevenir escapes de delimitador.

---

### 🔄 Pipelines de Transformación de Consultas (Multi-Query, Step-Back y HyDE)

Para resolver consultas ambiguas, incompletas o con discrepancia de vocabulario:

1. **Multi-Query Expansion**: Genera variantes alternativas para explorar diferentes facetas léxicas y sinónimos.
2. **Step-Back Prompting**: Formula una pregunta más amplia sobre los principios teóricos o conceptos arquitectónicos subyacentes.
3. **Hypothetical Document Embeddings (HyDE)**: Genera un texto hipotético de respuesta que se indexa en el espacio vectorial para buscar documento contra documento.

---

### 🧭 Enrutamiento Adaptativo de Consultas y Despacho Agéntico

En lugar de procesar todas las solicitudes mediante búsquedas vectoriales pesadas, el **Enrutador Adaptativo** clasifica la intención y despacha a:

1. **`DIRECT_RESPONSE`**: Respuestas conversacionales y lógica general sin latencia de recuperación ni costos de embeddings.
2. **`STRUCTURED_QUERY`**: Consultas analíticas y agregaciones numéricas ejecutadas de forma determinista sobre bases de datos SQL.
3. **`VECTOR_RAG`**: Documentación técnica y manuales complejos enrutados al pipeline completo de búsqueda híbrida y re-ranking.

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
Cada módulo cuenta con su propio comando de prueba:
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
```
