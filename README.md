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
| **06** | *Coming Soon* | Contextual Embeddings & Late Chunking Architectures | ⏳ Upcoming |
| **07** | *Coming Soon* | Graph-RAG & Agentic Multi-Hop Retrieval | ⏳ Upcoming |
| **08** | *Coming Soon* | Evaluation Frameworks (RAGAS / TruLens) & Observability | ⏳ Upcoming |

---

### 🔀 Hybrid Search with Reciprocal Rank Fusion (RRF)

#### Why Dense Embeddings Alone Fail in Technical Environments
While dense embeddings excel at capturing high-level conceptual nuances, they suffer from a well-known vulnerability in production technical systems:
1. **Exact Matches & Rare Tokens**: Model identifiers, SKUs, API keys, error codes, and class names (e.g., `AuthService JWT-9042`) have low representation in dense latent spaces and get diluted across vector dimensions.
2. **Out-of-Vocabulary (OOV) Jargon**: Highly domain-specific abbreviations and symbols produce suboptimal cosine similarities.

#### The Solution: BM25 + Reciprocal Rank Fusion (RRF)
Hybrid search pairs **Sparse Lexical Search (BM25)** for exact keyword matching with **Dense Semantic Vectors** for conceptual coverage, uniting both ranking systems using **Reciprocal Rank Fusion (RRF)**:

$$RRF(d) = \sum_{m \in M} \frac{1}{k + r_m(d)}$$

Where:
- $M = \{\text{BM25}, \text{DenseVector}\}$ denotes the set of retrieval rankers.
- $r_m(d) \in \{1, 2, \dots\}$ represents the 1-based ordinal rank of document $d$ within retriever $m$.
- $k = 60$ is the standard smoothing parameter that ensures balanced weight distribution without requiring complex score normalization or distribution calibration.

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
| **06** | *Próximamente* | Contextual Embeddings y Arquitecturas de Late Chunking | ⏳ Próximo |
| **07** | *Próximamente* | Graph-RAG y Recuperación Agéntica Multi-Salto | ⏳ Próximo |
| **08** | *Próximamente* | Frameworks de Evaluación (RAGAS / TruLens) y Observabilidad | ⏳ Próximo |

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
```
