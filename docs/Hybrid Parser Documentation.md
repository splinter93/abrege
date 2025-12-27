# 📘 Guide d'Implémentation - Hybrid PDF Parser API

**Version** : 1.1.0  
**Date** : 2025  
**Public cible** : Agents LLM implémentant le parser dans Scrivia et Synesia  
**API** : Factoria Hybrid PDF Parser V4

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Endpoints](#endpoints)
4. [Payloads d'Entrée/Sortie](#payloads-dentréesortie)
5. [Exemples d'Utilisation](#exemples-dutilisation)
6. [Règles et Bonnes Pratiques](#règles-et-bonnes-pratiques)
7. [Gestion d'Erreurs](#gestion-derreurs)
8. [Cas d'Usage Spécifiques](#cas-dusage-spécifiques)
9. [Intégration Scrivia/Synesia](#intégration-scrivia-synesia)
10. [Performance et Limites](#performance-et-limites)
11. [Troubleshooting](#troubleshooting)

---

## 🎯 Vue d'ensemble

### Qu'est-ce que le Hybrid PDF Parser ?

Le **Hybrid PDF Parser V4** est un service qui combine deux technologies complémentaires pour extraire le contenu des PDFs :

- **`pdf-parse`** : Extraction de texte propre avec gestion des colonnes
- **PDFPlumber** : Extraction de tableaux structurés en JSON

**Avantage** : Meilleur des deux mondes - texte lisible + tableaux structurés.

### Caractéristiques Principales

✅ **Multi-format** : `markdown`, `text`, `json`  
✅ **Split par page** : Optimisé pour RAG (Retrieval-Augmented Generation)  
✅ **Presets métier** : `insurance`, `invoice`, `contract`, `scientific`  
✅ **Mode dégradé** : Continue même si un service downstream est indisponible  
✅ **Traçabilité** : Chaque requête a un `requestId` unique (UUID)

### URLs de l'API

| Environnement | URL | Usage |
|--------------|-----|-------|
| **Production (Proxy)** | `https://factoria-nine.vercel.app` | ✅ **Recommandé** pour clients externes |
| **Railway (Direct)** | `https://hybrid-parser.up.railway.app` | Accès direct au microservice |

**⚠️ Important** : Utilise le proxy Next.js en production pour la sécurité et la gestion des erreurs.

---

## 🏗️ Architecture

### Schéma de Fonctionnement

```
┌─────────────────┐
│   Client App    │
│ (Scrivia/Synesia)│
└────────┬────────┘
         │ POST /api/pdf/hybrid-parse-v4
         │ multipart/form-data
         ▼
┌─────────────────────────┐
│   Next.js Proxy         │
│ /api/pdf/hybrid-parse-v4│
└────────┬────────────────┘
         │ Forward to Railway
         ▼
┌─────────────────────────┐
│  Hybrid Parser Service   │
│  (Railway Microservice)  │
└─────┬───────────┬───────┘
      │           │
      ▼           ▼
┌──────────┐  ┌──────────────┐
│pdf-parse │  │  PDFPlumber  │
│(texte)   │  │  (tableaux)  │
└──────────┘  └──────────────┘
```

### Flux de Traitement

1. **Client** envoie PDF via `multipart/form-data`
2. **Proxy Next.js** valide et forward vers Railway
3. **Service Railway** :
   - Appelle `pdf-parse` pour le texte (requis)
   - Appelle `PDFPlumber` pour les tableaux (optionnel)
   - Combine les résultats
   - Applique les options (preset, split_by_page, etc.)
4. **Retour** : JSON structuré avec texte + tableaux + metadata

### Mode Dégradé

Si **PDFPlumber** est indisponible :
- ✅ Le parsing continue avec `pdf-parse` uniquement
- ✅ Retourne le texte sans tableaux
- ✅ Status : `degraded` (mais fonctionnel)

Si **pdf-parse** est indisponible :
- ❌ Échec total (le texte est requis)

---

## 🔌 Endpoints

### 1. Health Check

**GET** `/api/pdf/hybrid-parse-v4`

Vérifie l'état du service et des dépendances.

#### Réponse Succès (200)

```json
{
  "service": "Hybrid PDF Parser V4",
  "upstream": {
    "status": "healthy",
    "services": {
      "pdfParse": true,
      "pdfPlumber": true
    },
    "version": "1.1.0"
  }
}
```

#### Réponse Dégradée (200)

```json
{
  "service": "Hybrid PDF Parser V4",
  "upstream": {
    "status": "degraded",
    "services": {
      "pdfParse": true,
      "pdfPlumber": false
    },
    "version": "1.1.0"
  }
}
```

#### Réponse Erreur (502)

```json
{
  "service": "Hybrid PDF Parser V4",
  "status": "degraded",
  "error": "Service unavailable"
}
```

---

### 2. Parse PDF

**POST** `/api/pdf/hybrid-parse-v4`

Parse un PDF avec les options configurées.

#### Headers

```
Content-Type: multipart/form-data
```

#### Query Parameters

| Paramètre | Type | Default | Description |
|-----------|------|---------|-------------|
| `result_type` | `string` | `markdown` | Format de sortie : `markdown`, `text`, `json` |
| `split_by_page` | `boolean` | `false` | Retourner un tableau `pages[]` pour RAG |
| `preset` | `string` | `default` | Preset métier : `default`, `insurance`, `invoice`, `contract`, `scientific` |
| `include_tables` | `boolean` | `true` | Inclure les tableaux JSON dans la réponse |

#### Body (multipart/form-data)

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `file` | `File` | ✅ Oui | PDF à parser (max 50MB recommandé) |

#### Exemple de Requête

```bash
curl -X POST \
  "https://factoria-nine.vercel.app/api/pdf/hybrid-parse-v4?result_type=markdown&split_by_page=true&preset=insurance" \
  -F "file=@document.pdf"
```

---

## 📦 Payloads d'Entrée/Sortie

### Payload d'Entrée

**Format** : `multipart/form-data`

```typescript
interface RequestPayload {
  file: File; // PDF file (binary)
}

// Query params
interface QueryParams {
  result_type?: 'markdown' | 'text' | 'json';
  split_by_page?: boolean;
  preset?: 'default' | 'insurance' | 'invoice' | 'contract' | 'scientific';
  include_tables?: boolean;
}
```

### Payload de Sortie (Succès)

#### Format Standard (split_by_page=false)

```typescript
interface ParseSuccessResponse {
  requestId: string; // UUID v4
  success: true;
  data: {
    fullText: string; // Texte brut extrait
    fullMarkdown: string; // Markdown avec tableaux insérés
    tables?: TableData[]; // Tableaux JSON (si include_tables=true)
    metadata: {
      title?: string;
      producer?: string;
      author?: string;
      // ... autres métadonnées PDF
    };
    stats: {
      totalPages: number;
      totalLength: number; // Caractères
      wordCount: number;
      tableCount: number;
      processingTime: number; // ms
      resultType: 'markdown' | 'text' | 'json';
      splitByPage: boolean;
      preset: string;
    };
  };
}
```

#### Format Paginé (split_by_page=true)

```typescript
interface ParseSuccessResponsePaged {
  requestId: string;
  success: true;
  data: {
    pages: PageResult[]; // ✅ Présent si split_by_page=true
    // fullText et fullMarkdown peuvent être absents
    tables?: TableData[];
    metadata: Record<string, unknown>;
    stats: Stats;
  };
}

interface PageResult {
  pageNumber: number; // 1-indexed
  text: string; // Texte de la page
  markdown: string; // Markdown de la page
  tables: TableData[]; // Tableaux de la page
  metadata: {
    wordCount: number;
    readingTime: number; // Minutes estimées (200 mots/min)
  };
}
```

#### Structure des Tableaux

```typescript
type TableCell = string | null;
type TableRow = TableCell[];
type TableData = TableRow[]; // Array de rows

// Exemple
const table: TableData = [
  ["Garantie", "Franchise", "Plafond", "Prime Annuelle"], // Header
  ["Vol Basique", "150€", "2 000€", "120€"], // Row 1
  ["Vol Premium", "200€", "5 000€", "180€"], // Row 2
];
```

### Payload d'Erreur

```typescript
interface ErrorResponse {
  success: false;
  error: string; // Message d'erreur descriptif
  requestId?: string; // UUID si disponible
}
```

#### Codes HTTP et Erreurs

| Code | Scénario | Exemple |
|------|----------|---------|
| **200** | Succès | Parsing réussi |
| **400** | Requête invalide | Fichier manquant, `result_type` invalide |
| **500** | Erreur serveur | Erreur interne du service |
| **502** | Service downstream KO | `pdf-parse` ou `PDFPlumber` indisponible |

---

## 💡 Exemples d'Utilisation

### Exemple 1 : Parsing Simple (Markdown)

**Cas d'usage** : Extraire le contenu d'un PDF en markdown pour affichage.

```typescript
const formData = new FormData();
formData.append('file', pdfFile);

const response = await fetch(
  'https://factoria-nine.vercel.app/api/pdf/hybrid-parse-v4?result_type=markdown',
  {
    method: 'POST',
    body: formData,
  }
);

const result = await response.json();

if (result.success) {
  console.log('Markdown:', result.data.fullMarkdown);
  console.log('Tableaux:', result.data.tables);
  console.log('Stats:', result.data.stats);
}
```

**Résultat** :
```json
{
  "requestId": "d127418e-99d5-446a-8e2f-523689bee398",
  "success": true,
  "data": {
    "fullMarkdown": "# Document\n\nTexte extrait...\n\n| Garantie | Franchise |\n|----------|-----------|\n| Vol Basique | 150€ |",
    "tables": [[["Garantie", "Franchise"], ["Vol Basique", "150€"]]],
    "stats": {
      "totalPages": 1,
      "wordCount": 60,
      "tableCount": 1,
      "processingTime": 398
    }
  }
}
```

---

### Exemple 2 : Parsing pour RAG (Split par Page)

**Cas d'usage** : Préparer un PDF pour l'indexation vectorielle (RAG).

```typescript
const response = await fetch(
  'https://factoria-nine.vercel.app/api/pdf/hybrid-parse-v4?split_by_page=true&result_type=markdown',
  {
    method: 'POST',
    body: formData,
  }
);

const result = await response.json();

if (result.success && result.data.pages) {
  // Indexer chaque page séparément
  for (const page of result.data.pages) {
    await indexVectorDB({
      content: page.markdown,
      pageNumber: page.pageNumber,
      metadata: {
        wordCount: page.metadata.wordCount,
        readingTime: page.metadata.readingTime,
      },
    });
  }
}
```

**Résultat** :
```json
{
  "success": true,
  "data": {
    "pages": [
      {
        "pageNumber": 1,
        "text": "Texte page 1...",
        "markdown": "Markdown page 1...",
        "tables": [],
        "metadata": {
          "wordCount": 250,
          "readingTime": 1
        }
      },
      {
        "pageNumber": 2,
        "text": "Texte page 2...",
        "markdown": "Markdown page 2...",
        "tables": [[["Header", "Value"], ["Data", "123"]]],
        "metadata": {
          "wordCount": 180,
          "readingTime": 1
        }
      }
    ],
    "stats": {
      "totalPages": 2,
      "splitByPage": true
    }
  }
}
```

---

### Exemple 3 : Parsing avec Preset Insurance

**Cas d'usage** : Parser un contrat d'assurance avec heuristiques optimisées.

```typescript
const response = await fetch(
  'https://factoria-nine.vercel.app/api/pdf/hybrid-parse-v4?preset=insurance&result_type=json',
  {
    method: 'POST',
    body: formData,
  }
);

const result = await response.json();
// Le preset "insurance" ajuste les heuristiques pour mieux extraire
// les garanties, franchises, plafonds, etc.
```

---

### Exemple 4 : Parsing Sans Tableaux

**Cas d'usage** : Extraire uniquement le texte (plus rapide).

```typescript
const response = await fetch(
  'https://factoria-nine.vercel.app/api/pdf/hybrid-parse-v4?include_tables=false',
  {
    method: 'POST',
    body: formData,
  }
);

// Résultat sans champ "tables"
```

---

## ✅ Règles et Bonnes Pratiques

### 1. Validation des Fichiers

**⚠️ TOUJOURS valider avant l'envoi** :

```typescript
function validatePDFFile(file: File): { valid: boolean; error?: string } {
  // Vérifier le type
  if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
    return { valid: false, error: 'Seuls les fichiers PDF sont acceptés' };
  }

  // Vérifier la taille (50MB max recommandé)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    return { valid: false, error: 'Fichier trop volumineux (max 50MB)' };
  }

  return { valid: true };
}
```

### 2. Gestion des Timeouts

**⚠️ TOUJOURS définir un timeout** :

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s

try {
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    signal: controller.signal,
  });
  clearTimeout(timeoutId);
} catch (error) {
  if (error.name === 'AbortError') {
    // Timeout - gérer l'erreur
  }
}
```

### 3. Traçabilité avec requestId

**✅ TOUJOURS logger le `requestId`** :

```typescript
const result = await parsePDF(file);

if (result.success) {
  logger.info('PDF parsed successfully', {
    requestId: result.requestId,
    stats: result.data.stats,
  });
} else {
  logger.error('PDF parsing failed', {
    requestId: result.requestId,
    error: result.error,
  });
}
```

### 4. Choix du Format de Sortie

| Format | Usage | Avantages |
|-------|-------|-----------|
| `markdown` | ✅ **Recommandé** | Texte lisible + tableaux formatés |
| `text` | Affichage simple | Texte brut uniquement |
| `json` | Traitement programmatique | Structure complète |

**Règle** : Utilise `markdown` par défaut sauf besoin spécifique.

### 5. Split par Page pour RAG

**✅ Utilise `split_by_page=true` pour** :
- Indexation vectorielle (RAG)
- Recherche sémantique
- Chunking optimisé

**❌ N'utilise PAS `split_by_page=true` pour** :
- Affichage simple
- Export complet
- Traitement global du document

### 6. Presets Métier

| Preset | Usage | Optimisations |
|--------|-------|---------------|
| `default` | ✅ Par défaut | Heuristiques générales |
| `insurance` | Contrats d'assurance | Garanties, franchises, plafonds |
| `invoice` | Factures | Montants, dates, références |
| `contract` | Contrats légaux | Clauses, signatures |
| `scientific` | Articles scientifiques | Formules, références, citations |

**Règle** : Choisis le preset selon le type de document.

### 7. Gestion des Erreurs

**✅ TOUJOURS gérer les cas d'erreur** :

```typescript
async function parsePDFSafe(file: File) {
  try {
    const response = await fetch(url, { method: 'POST', body: formData });
    const result = await response.json();

    if (!response.ok) {
      // Erreur HTTP (400, 500, 502)
      throw new Error(result.error || `HTTP ${response.status}`);
    }

    if (!result.success) {
      // Erreur métier
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    // Erreur réseau, timeout, etc.
    logger.error('PDF parsing failed', { error });
    throw error;
  }
}
```

---

## 🚨 Gestion d'Erreurs

### Erreurs Communes et Solutions

#### 1. "No file provided"

**Cause** : Fichier manquant dans le FormData.

**Solution** :
```typescript
const formData = new FormData();
formData.append('file', file); // ✅ Vérifier que file existe
```

#### 2. "Invalid result_type"

**Cause** : Valeur invalide pour `result_type`.

**Solution** :
```typescript
const validTypes = ['markdown', 'text', 'json'];
if (!validTypes.includes(resultType)) {
  throw new Error(`result_type must be one of: ${validTypes.join(', ')}`);
}
```

#### 3. "fetch failed" (502)

**Cause** : Service downstream indisponible.

**Solution** :
```typescript
// Retry avec backoff exponentiel
async function parseWithRetry(file: File, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await parsePDF(file);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * Math.pow(2, i)); // Backoff
    }
  }
}
```

#### 4. Timeout

**Cause** : PDF trop volumineux ou service lent.

**Solution** :
- Augmenter le timeout (max 30s recommandé)
- Vérifier la taille du fichier avant l'envoi
- Utiliser `include_tables=false` pour accélérer

#### 5. Mode Dégradé

**Détection** :
```typescript
const health = await fetch('/api/pdf/hybrid-parse-v4').then(r => r.json());

if (health.upstream?.status === 'degraded') {
  // PDFPlumber indisponible - tableaux absents
  console.warn('Service dégradé - tableaux non disponibles');
}
```

**Comportement** : Le parsing continue mais sans tableaux.

---

## 🎯 Cas d'Usage Spécifiques

### Cas 1 : Upload de Document dans Scrivia

**Scénario** : L'utilisateur upload un PDF dans Scrivia Chat.

```typescript
// 1. Upload du fichier
const file = event.target.files[0];
const formData = new FormData();
formData.append('file', file);

// 2. Parsing avec split par page pour RAG
const response = await fetch(
  `${API_URL}/api/pdf/hybrid-parse-v4?split_by_page=true&result_type=markdown`,
  {
    method: 'POST',
    body: formData,
  }
);

const result = await response.json();

if (result.success) {
  // 3. Indexer dans la knowledge base
  for (const page of result.data.pages) {
    await scriviaKnowledgeBase.add({
      content: page.markdown,
      source: 'pdf',
      pageNumber: page.pageNumber,
      metadata: {
        requestId: result.requestId,
        stats: result.data.stats,
      },
    });
  }

  // 4. Afficher un résumé à l'utilisateur
  showMessage(`PDF parsé : ${result.data.stats.totalPages} pages, ${result.data.stats.wordCount} mots`);
}
```

---

### Cas 2 : Extraction de Données Structurées (Synesia)

**Scénario** : Extraire des données d'une facture pour traitement automatique.

```typescript
// 1. Parser avec preset invoice
const response = await fetch(
  `${API_URL}/api/pdf/hybrid-parse-v4?preset=invoice&result_type=json&include_tables=true`,
  {
    method: 'POST',
    body: formData,
  }
);

const result = await response.json();

if (result.success) {
  // 2. Extraire les tableaux (lignes de facture)
  const invoiceLines = result.data.tables?.[0] || [];

  // 3. Parser les données
  const invoiceData = {
    total: extractTotal(result.data.fullText),
    date: extractDate(result.data.fullText),
    lines: invoiceLines.slice(1).map(row => ({
      description: row[0],
      quantity: parseFloat(row[1]),
      price: parseFloat(row[2]),
      total: parseFloat(row[3]),
    })),
  };

  // 4. Sauvegarder dans Synesia
  await synesiaStorage.save('invoices', invoiceData);
}
```

---

### Cas 3 : Affichage de Document dans l'UI

**Scénario** : Afficher le contenu d'un PDF dans l'interface utilisateur.

```typescript
// 1. Parsing simple (pas de split)
const response = await fetch(
  `${API_URL}/api/pdf/hybrid-parse-v4?result_type=markdown`,
  {
    method: 'POST',
    body: formData,
  }
);

const result = await response.json();

if (result.success) {
  // 2. Afficher le markdown (avec rendu)
  const markdownHTML = markdownToHTML(result.data.fullMarkdown);
  document.getElementById('content').innerHTML = markdownHTML;

  // 3. Afficher les stats
  showStats({
    pages: result.data.stats.totalPages,
    words: result.data.stats.wordCount,
    tables: result.data.stats.tableCount,
    time: `${result.data.stats.processingTime}ms`,
  });
}
```

---

## 🔗 Intégration Scrivia/Synesia

### Architecture Recommandée

```
┌─────────────────┐
│  Scrivia/Synesia│
│     Frontend    │
└────────┬───────┘
          │
          ▼
┌─────────────────┐
│  API Gateway    │
│  (Next.js API)  │
└────────┬───────┘
          │
          ▼
┌─────────────────────────┐
│  Hybrid Parser Service   │
│  (Factoria API)          │
└─────────────────────────┘
```

### Service Wrapper TypeScript

**Crée un service réutilisable** :

```typescript
// services/pdfParserService.ts

interface ParseOptions {
  resultType?: 'markdown' | 'text' | 'json';
  splitByPage?: boolean;
  preset?: 'default' | 'insurance' | 'invoice' | 'contract' | 'scientific';
  includeTables?: boolean;
}

interface ParseResult {
  requestId: string;
  success: boolean;
  data?: {
    fullText?: string;
    fullMarkdown?: string;
    pages?: Array<{
      pageNumber: number;
      text: string;
      markdown: string;
      tables: any[];
    }>;
    tables?: any[];
    metadata: Record<string, unknown>;
    stats: {
      totalPages: number;
      wordCount: number;
      tableCount: number;
      processingTime: number;
    };
  };
  error?: string;
}

export class PDFParserService {
  private baseUrl: string;

  constructor(baseUrl = 'https://factoria-nine.vercel.app') {
    this.baseUrl = baseUrl;
  }

  async parse(file: File, options: ParseOptions = {}): Promise<ParseResult> {
    const formData = new FormData();
    formData.append('file', file);

    const params = new URLSearchParams();
    if (options.resultType) params.set('result_type', options.resultType);
    if (options.splitByPage) params.set('split_by_page', 'true');
    if (options.preset) params.set('preset', options.preset);
    if (options.includeTables === false) params.set('include_tables', 'false');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(
        `${this.baseUrl}/api/pdf/hybrid-parse-v4?${params.toString()}`,
        {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        const error = await response.json();
        return {
          requestId: error.requestId || '',
          success: false,
          error: error.error || `HTTP ${response.status}`,
        };
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeout);
      return {
        requestId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'down';
    services: { pdfParse: boolean; pdfPlumber: boolean };
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pdf/hybrid-parse-v4`);
      const data = await response.json();

      if (response.ok && data.upstream) {
        return {
          status: data.upstream.status,
          services: data.upstream.services,
        };
      }

      return { status: 'down', services: { pdfParse: false, pdfPlumber: false } };
    } catch {
      return { status: 'down', services: { pdfParse: false, pdfPlumber: false } };
    }
  }
}

// Export singleton
export const pdfParserService = new PDFParserService();
```

### Utilisation dans Scrivia

```typescript
// Dans un composant React ou hook
import { pdfParserService } from '@/services/pdfParserService';

async function handlePDFUpload(file: File) {
  // 1. Validation
  if (!file.type.includes('pdf')) {
    showError('Seuls les fichiers PDF sont acceptés');
    return;
  }

  // 2. Parsing avec split pour RAG
  const result = await pdfParserService.parse(file, {
    resultType: 'markdown',
    splitByPage: true,
    preset: 'default',
  });

  if (!result.success) {
    showError(`Erreur : ${result.error}`);
    return;
  }

  // 3. Indexer dans la knowledge base
  if (result.data?.pages) {
    for (const page of result.data.pages) {
      await indexInVectorDB({
        content: page.markdown,
        metadata: {
          pageNumber: page.pageNumber,
          requestId: result.requestId,
        },
      });
    }
  }

  // 4. Afficher succès
  showSuccess(`PDF parsé : ${result.data?.stats.totalPages} pages`);
}
```

### Utilisation dans Synesia

```typescript
// Dans un agent Synesia
import { pdfParserService } from '@/services/pdfParserService';

async function processPDFDocument(file: File, context: AgentContext) {
  // 1. Parsing avec preset selon le contexte
  const preset = context.documentType || 'default';
  const result = await pdfParserService.parse(file, {
    resultType: 'json',
    preset: preset as any,
    includeTables: true,
  });

  if (!result.success) {
    throw new Error(`PDF parsing failed: ${result.error}`);
  }

  // 2. Extraire les données structurées
  const extractedData = {
    text: result.data?.fullText,
    markdown: result.data?.fullMarkdown,
    tables: result.data?.tables,
    metadata: result.data?.metadata,
    stats: result.data?.stats,
  };

  // 3. Sauvegarder dans le storage Synesia
  await context.storage.save('pdf_documents', {
    id: result.requestId,
    ...extractedData,
    createdAt: new Date(),
  });

  return extractedData;
}
```

---

## ⚡ Performance et Limites

### Limites Techniques

| Limite | Valeur | Notes |
|--------|--------|-------|
| **Taille max fichier** | 50MB | Recommandé (peut varier selon config) |
| **Timeout** | 30s | Configuré côté serveur |
| **Pages max** | Illimité | Performance dégrade avec > 100 pages |
| **Tableaux max** | Illimité | Chaque tableau ajoute du temps de traitement |

### Optimisations

#### 1. Désactiver les Tableaux si Non Nécessaires

```typescript
// Plus rapide si pas besoin de tableaux
await pdfParserService.parse(file, {
  includeTables: false, // ✅ Accélère le parsing
});
```

#### 2. Utiliser le Format Text pour Affichage Simple

```typescript
// Plus rapide que markdown (pas de formatage)
await pdfParserService.parse(file, {
  resultType: 'text', // ✅ Plus rapide
});
```

#### 3. Split par Page Uniquement pour RAG

```typescript
// Ne pas split si pas besoin
await pdfParserService.parse(file, {
  splitByPage: false, // ✅ Plus rapide
});
```

### Monitoring

**Métriques à suivre** :
- Temps de traitement (`stats.processingTime`)
- Taux d'erreur (502, 500)
- Mode dégradé (PDFPlumber indisponible)

**Exemple de logging** :
```typescript
const result = await pdfParserService.parse(file);

logger.info('PDF parsing metrics', {
  requestId: result.requestId,
  processingTime: result.data?.stats.processingTime,
  pages: result.data?.stats.totalPages,
  tables: result.data?.stats.tableCount,
  success: result.success,
});
```

---

## 🔧 Troubleshooting

### Problème 1 : Timeout Fréquents

**Symptômes** : Erreurs de timeout sur fichiers volumineux.

**Solutions** :
1. Vérifier la taille du fichier (< 50MB)
2. Utiliser `include_tables=false` pour accélérer
3. Augmenter le timeout côté client (max 30s côté serveur)
4. Split le PDF en plusieurs parties si possible

---

### Problème 2 : Tableaux Manquants

**Symptômes** : `tables: []` ou `tableCount: 0` alors que le PDF contient des tableaux.

**Solutions** :
1. Vérifier le health check : `pdfPlumber` doit être `true`
2. Si mode dégradé : PDFPlumber est indisponible (temporaire)
3. Vérifier que `include_tables=true` (par défaut)
4. Certains PDFs complexes peuvent ne pas être détectés

---

### Problème 3 : Texte Mal Formaté

**Symptômes** : Texte avec colonnes mélangées ou mal structuré.

**Solutions** :
1. Utiliser `result_type=markdown` (meilleur formatage)
2. Essayer un preset différent (`preset=insurance`, etc.)
3. Vérifier que le PDF n'est pas scanné (OCR nécessaire)

---

### Problème 4 : Erreur 502 (Service Unavailable)

**Symptômes** : `502 Bad Gateway` fréquent.

**Solutions** :
1. Vérifier le health check : `/api/pdf/hybrid-parse-v4` (GET)
2. Si `status: degraded` : Service partiellement disponible
3. Implémenter retry avec backoff exponentiel
4. Contacter l'équipe si persistant

---

### Problème 5 : Metadata Manquante

**Symptômes** : `metadata: {}` vide.

**Solutions** :
1. Normal si le PDF n'a pas de métadonnées
2. Vérifier que `pdf-parse` fonctionne (health check)
3. Certains PDFs n'ont pas de métadonnées

---

## 📚 Ressources Complémentaires

### Documentation API

- **Schéma OpenAPI** : `openapi/factoria-hybrid-pdf-parser-api.json`
- **Health Check** : `GET /api/pdf/hybrid-parse-v4`
- **Parse Endpoint** : `POST /api/pdf/hybrid-parse-v4`

### Code Source

- **Route Next.js** : `src/app/api/pdf/hybrid-parse-v4/route.ts`
- **Service Railway** : `services/hybrid-parser/`
- **Types TypeScript** : `src/lib/services/types/hybridPdfParser.types.ts`

### Guides Connexes

- **Guide OpenAPI** : `docs/OPENAPI GUIDELINES.md`
- **Guide Excellence Code** : `docs/GUIDE-EXCELLENCE-CODE.md`

---

## ✅ Checklist d'Implémentation

Avant de livrer ton implémentation, vérifie :

- [ ] ✅ Validation des fichiers PDF (type + taille)
- [ ] ✅ Gestion des timeouts (30s max)
- [ ] ✅ Logging du `requestId` pour traçabilité
- [ ] ✅ Gestion des erreurs (400, 500, 502)
- [ ] ✅ Retry avec backoff pour erreurs 502
- [ ] ✅ Health check avant parsing critique
- [ ] ✅ Choix approprié du format (`markdown` par défaut)
- [ ] ✅ Split par page uniquement pour RAG
- [ ] ✅ Preset adapté au type de document
- [ ] ✅ Tests avec différents types de PDFs
- [ ] ✅ Monitoring des métriques (temps, erreurs)

---

## 🎯 Résumé pour l'Agent LLM

**En résumé, pour implémenter le Hybrid PDF Parser** :

1. **Utilise le proxy Next.js** : `https://factoria-nine.vercel.app/api/pdf/hybrid-parse-v4`
2. **Format par défaut** : `result_type=markdown`, `split_by_page=false`
3. **Pour RAG** : `split_by_page=true` pour indexer page par page
4. **Gestion d'erreurs** : Toujours vérifier `result.success` et logger le `requestId`
5. **Performance** : Désactive `include_tables` si pas nécessaire
6. **Presets** : Choisis selon le type de document (insurance, invoice, etc.)

**Le service est robuste** : Mode dégradé si PDFPlumber KO, retry recommandé pour 502.

---

**Bonne implémentation ! 🚀**

*Documentation maintenue par l'équipe Factoria - Dernière mise à jour : 2025*

