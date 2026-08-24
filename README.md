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
| **04** | *Coming Soon* | Contextual Embeddings & Hybrid Search (Dense + Sparse / BM25) | ⏳ Upcoming |
| **05** | *Coming Soon* | Re-ranking Pipelines & Cross-Encoder Architectures | ⏳ Upcoming |
| **06** | *Coming Soon* | Graph-RAG & Agentic Retrieval | ⏳ Upcoming |
| **07** | *Coming Soon* | Evaluation Frameworks (RAGAS / TruLens) & Observability | ⏳ Upcoming |

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
| **04** | *Próximamente* | Contextual Embeddings y Búsqueda Híbrida (Densa + Dispersa / BM25) | ⏳ Próximo |
| **05** | *Próximamente* | Pipelines de Re-ranking y Arquitecturas Cross-Encoder | ⏳ Próximo |
| **06** | *Próximamente* | Graph-RAG y Recuperación Agéntica | ⏳ Próximo |
| **07** | *Próximamente* | Frameworks de Evaluación (RAGAS / TruLens) y Observabilidad | ⏳ Próximo |

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
```
