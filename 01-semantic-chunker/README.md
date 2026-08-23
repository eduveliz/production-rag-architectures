# Module 1: Semantic Chunking vs. Fixed-Size Chunking

## 🎯 Objetivo
Evitar la fragmentación de ideas y la dilución de vectores causada por el *fixed-size chunking* (división por longitud fija de caracteres). Implementamos un pipeline de **Semantic Chunking** que evalúa la distancia semántica (mediante similitud de coseno sobre embeddings de oraciones consecutivas) y segmenta el texto únicamente cuando detecta un cambio real de tópico.

---

## 🔬 Fundamento Teórico & Matemático

### 1. Descomposición en Oraciones
El texto se divide en oraciones individuales usando expresiones regulares basadas en signos de puntuación (`.`, `?`, `!`):
$$\text{Sentences} = [s_1, s_2, \dots, s_n]$$

### 2. Generación de Embeddings
Cada oración $s_i$ es convertida en un vector denso $\vec{v}_i \in \mathbb{R}^d$ usando el modelo de embeddings de Google Gemini (`gemini-embedding-001`):
$$\vec{v}_i = \text{Embed}(s_i)$$

### 3. Similitud de Coseno
Para cada par de oraciones consecutivas $(s_i, s_{i+1})$, calculamos la similitud de coseno:
$$\text{CosineSimilarity}(\vec{v}_i, \vec{v}_{i+1}) = \frac{\vec{v}_i \cdot \vec{v}_{i+1}}{\|\vec{v}_i\| \|\vec{v}_{i+1}\|}$$

### 4. Segmentación por Umbral ($\tau$)
- Si $\text{CosineSimilarity}(\vec{v}_i, \vec{v}_{i+1}) \ge \tau$: Las oraciones pertenecen al mismo contexto temático y se mantienen en el mismo chunk.
- Si $\text{CosineSimilarity}(\vec{v}_i, \vec{v}_{i+1}) < \tau$: Se detecta una ruptura temática $\rightarrow$ corte y creación de un nuevo chunk.

---

## 🚀 Cómo Ejecutar

### 1. Variables de Entorno
Asegúrate de tener tu `.env` configurado:
```env
GEMINI_API_KEY="tu_api_key"
```

### 2. Ejecutar la Prueba de Validación
```bash
npm run test:01
```
o directamente con `tsx`:
```bash
npx tsx --env-file=.env 01-semantic-chunker/test.ts
```
