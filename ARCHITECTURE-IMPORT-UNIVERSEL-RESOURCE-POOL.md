# Scrivia — Import universel (“aspirateur à contenus”) & Resource Pool greffé au Chat

## Résumé

Objectif : permettre d’**injecter n’importe quel contenu** (PDF, Markdown, CSV, URL web, YouTube… puis audio) dans Scrivia, le **convertir en notes** (markdown canonique + provenance), et permettre à l’agent d’**exploiter un corpus attaché au chat** (dossier/classeur) sans exploser les tokens.

Ce document propose une architecture **scalable**, **idempotente**, **sans JSONB collections**, et alignée avec les patterns déjà présents dans le codebase.

---

## État actuel (briques déjà présentes)

### Upload / files

- **UI** : `src/components/UnifiedUploadZone.tsx`
  - Supporte **drag & drop** + saisie d’**URL**.
- **API** : `POST /api/ui/files/upload` (`src/app/api/ui/files/upload/route.ts`)
  - Supporte :
    - **fichier local** via URL pré-signée S3
    - **externalUrl** (enregistre un record en base, sans upload S3)
  - Conserve un `requestId` et écrit un audit trail (`file_events`).

### Chat context (point clé pour “pool de ressources”)

Il existe déjà un mécanisme “propre” pour injecter du contexte dans les messages LLM :

- **`attachedNotes`** : contenu complet (coûteux en tokens).
- **`mentionedNotes`** : **metadata only**, et incite à utiliser des tools pour charger le contenu au besoin.

Code :
- `src/services/chat/ChatContextBuilder.ts`
- `src/services/llm/context/ContextInjectionService.ts`
- `src/services/llm/context/providers/AttachedNotesContextProvider.ts`
- `src/services/llm/context/providers/MentionedNotesContextProvider.ts`

### Lecture on-demand du contenu des notes

- Service existant : `src/services/optimizedNoteService.ts`
  - `getNoteContent(noteRef, userId)` (slug ou UUID) : récupère le contenu complet (avec cache).

Cette brique permet un design “retrieval” : **ne pas pousser** le contenu complet du classeur/dossier dans le prompt, mais le **fetcher à la demande**.

---

## Problème produit à résoudre

1) **Ingestion universelle** : un seul point d’entrée “Upload/Import” qui route vers le bon pipeline selon l’entrée :
- fichier local (PDF, Markdown, CSV…)
- URL web
- URL YouTube
- (plus tard) audio / vidéo + traduction audio via Gemini

2) **Conversion robuste en note** :
- extraction (texte, structure)
- normalisation en **markdown canonique**
- provenance / citations (au minimum : URL, timestamps, segments)

3) **Exploitation en chat** :
- l’utilisateur attache un **pool** (dossier/classeur) à une session de chat
- l’agent sait “ce corpus existe”, et utilise des tools pour retrouver/charger seulement ce dont il a besoin

---

## Contraintes non-négociables (prod 1M+ users)

- **Pas de JSONB collections** (threads/messages/import-jobs stockés en array JSON) : tables dédiées + index + contraintes.
- **Idempotence** : operation_id / request_id + UNIQUE constraints.
- **Pas de traitement lourd dans une route Next** (PDF/scrape) : exécution **asynchrone**.
- **Sécurité** : anti-SSRF, timeouts, quotas, taille max, sanitization.
- **Token budget** : éviter d’injecter des corpus entiers en prompt.

---

## Architecture cible : Import universel = Router + Pipelines + Jobs

### Vue d’ensemble

- **Entrée** : l’utilisateur fournit une URL ou un fichier.
- **Router** : détecte le type (webpage/youtube/pdf/markdown/csv/…).
- **Pipelines** : un module par type (responsabilité unique).
- **Jobs** : exécution asynchrone, idempotente, retry-safe.
- **Sortie** : création/mise à jour d’une note (`articles`) + liens de provenance.

---

## Modèle de données proposé (sans JSONB)

### `import_requests`

Représente l’intention d’import (source → destination → état).

- **Champs (suggestion)** :
  - `id` (uuid)
  - `user_id` (uuid, index)
  - `source_kind` (`file` | `url`)
  - `source_file_id` (uuid nullable) — référence `files.id`
  - `source_url` (text nullable)
  - `detected_type` (`pdf` | `markdown` | `csv` | `webpage` | `youtube` | `audio` | `unknown`)
  - `destination_kind` (`folder` | `classeur`)
  - `destination_id` (uuid)
  - `status` (`queued` | `running` | `succeeded` | `failed` | `cancelled`)
  - `attempt_count` (int)
  - `last_error` (text nullable) — message court, pas de stack
  - `created_at`, `updated_at`, `started_at`, `finished_at`
  - `operation_id` (text) — idempotence côté client (optionnel mais recommandé)
  - `source_fingerprint` (text) — hash stable (URL canonicalisée / sha256 file)

- **Contraintes** :
  - UNIQUE `(user_id, operation_id)` si fourni
  - UNIQUE `(user_id, source_fingerprint, destination_kind, destination_id)` pour éviter doublons

### `import_jobs` (option A) ou “jobs dans import_requests” (option B)

- **Option A (recommandée)** : table `import_jobs` séparée pour gérer la queue proprement.
  - `id`, `import_request_id`, `status`, `lease_expires_at`, `worker_id`, `sequence_number`, etc.
  - UNIQUE `(import_request_id)` (1 job actif par import)
  - Index sur `(status, lease_expires_at)`

- **Option B** : champs job directement dans `import_requests` (plus simple mais moins flexible).

### Provenance / sources

Objectif : permettre citations + audit.

- **MVP** : `import_sources`
  - `id`, `user_id`, `import_request_id`
  - `kind` (`webpage`|`youtube`|`file`)
  - `url`, `title`, `retrieved_at`
  - `content_sha256`

- **Plus tard** : tables de segments/chunks pour citations précises (ex : `import_source_segments` avec offsets).

---

## Router (détection) — règles recommandées

### Si entrée = URL

- Si hostname match YouTube (`youtube.com`, `youtu.be`) → `youtube`
- Sinon :
  - HEAD/GET léger pour `content-type` et taille (si possible)
  - Si `application/pdf` ou extension `.pdf` → `pdf`
  - Sinon → `webpage`

### Si entrée = file_id

Basé sur `files.mime_type` + extension du `filename` :
- `application/pdf` → `pdf`
- `text/markdown` / `.md` → `markdown`
- `text/csv` / `.csv` → `csv`
- (plus tard) audio/video MIME → `audio`

---

## Pipelines (modules) — responsabilités & sorties

Chaque pipeline doit produire :
- un **markdown canonique** (source de vérité)
- un set minimal de **metadata** (titre, provenance)
- éventuellement des **artifacts** (transcript, pages, tableaux…)

### `WebPageImportPipeline`

- Téléchargement HTTP (timeouts stricts).
- Anti-SSRF (voir Sécurité).
- Extraction “readability” + nettoyage.
- Conversion en markdown (titres/listes/tableaux).
- Persist : créer une note + stocker `source_url`.

### `YouTubeImportPipeline`

- Extraire `videoId`.
- Récupérer transcript si dispo.
- Sinon : fallback (plus tard) transcription via audio.
- Générer markdown :
  - résumé + sections
  - transcript structuré (chapitres)

### `PdfImportPipeline`

- Télécharger/charger le PDF.
- Extraction :
  - texte (si text layer)
  - fallback OCR (plus tard)
- Produire markdown avec structure :
  - titres détectés
  - pages / sections
- Important : logguer les métriques (pages, temps, taille).

### `MarkdownImportPipeline`

- Lire le fichier.
- Sanitization markdown (déjà existant côté serveur).
- Créer note.

### `CsvImportPipeline`

- Parsing CSV (taille max).
- Générer un markdown utile :
  - aperçu (head)
  - stats (colonnes)
  - table markdown si raisonnable, sinon “dataset summary”.

### (Plus tard) `AudioImportPipeline`

- Transcription + traduction (Gemini ou autre).
- Alignement timestamps.
- Génération note + chapitrage.

---

## Exécution asynchrone (Jobs) — design anti-race

### Pourquoi asynchrone

PDF + scraping + YouTube + audio peuvent dépasser :
- timeouts serverless
- budgets CPU/mémoire
- limites de retry automatique

### Pattern de “claim” atomique

Un worker récupère le prochain job :
- `status = queued`
- puis transition atomique en `running` avec lease (évite 2 workers sur le même job)
- retries contrôlés, backoff, et `attempt_count` incrémenté.

### Idempotence

Indispensable : un import ne doit pas créer 2 notes identiques si l’utilisateur double-clique.

Stratégies :
- `operation_id` (client) + UNIQUE
- `source_fingerprint` + UNIQUE sur destination
- Notes : utiliser `slug`/ref stable si nécessaire

---

## Sécurité (critique pour scraping / URL)

### Anti-SSRF (obligatoire)

- Protocol uniquement `http`/`https`
- Refuser :
  - `localhost`, `127.0.0.1`, `0.0.0.0`
  - IP privées (10/8, 172.16/12, 192.168/16), link-local, IPv6 local
  - URLs avec userinfo (`user:pass@host`)
- Limites :
  - taille max download
  - redirects max
  - timeouts connect/read

### Sanitization

- HTML → markdown : éliminer scripts, iframes, trackers.
- Markdown final : passer par le sanitizer serveur existant.

### Quotas

- Par user : nombre d’imports/min, taille cumulée/jour.
- Par plan : limites PDF/audio.

---

## Resource Pool greffé au chat (dossier / classeur)

### Objectif

Dans une session chat, l’utilisateur attache un corpus (ex : “Marketing”, “Projet Scrivia”) pour que l’agent :
- sache que le corpus existe
- puisse chercher dedans
- et charger le contenu des notes **à la demande**

### Modèle de données proposé : `chat_session_resource_pools`

Join table (pas JSONB) :
- `id` (uuid)
- `user_id`
- `session_id`
- `pool_type` (`folder` | `classeur`)
- `pool_id` (uuid)
- `sequence_number` + UNIQUE `(session_id, sequence_number)`
- UNIQUE `(session_id, pool_type, pool_id)`
- `created_at`

### Injection dans le contexte LLM

**Principe** : injecter **metadata-only** (comme `mentionedNotes`) :
- nom du pool
- id/slug
- counts (nb notes)
- instructions “use tools to search/fetch note content”

On évite d’injecter le contenu complet de toutes les notes.

### Retrieval recommandé (tooling)

Outils nécessaires (ou à étendre) :
- `searchNotes(query, { folderId | classeurId })` → renvoie metadata + ids/slugs
- `getNoteContent(noteRef)` → déjà existant via services/API

---

## Plan d’implémentation (MVP)

1) **Définir le wedge MVP**
- Entrées : URL web + URL YouTube + PDF + Markdown + CSV
- Destination : **folder** (recommandé) + option classeur

2) **Créer ImportRequest + Router**
- `POST /api/v2/import` (url ou file_id)
- Détection type
- Enqueue job
- Réponse immédiate : import_id + status

3) **Mettre le worker (jobs async)**
- claim atomique + lease + retries
- logs structurés + metrics

4) **Implémenter les pipelines dans l’ordre**
- `MarkdownImportPipeline` / `CsvImportPipeline` (valider ossature)
- `WebPageImportPipeline`
- `YouTubeImportPipeline`
- `PdfImportPipeline`

5) **Resource pool chat**
- table join
- UI chips (attach/detach)
- injection context metadata-only
- searchNotes filtré par pool

---

## Alternatives rejetées (et pourquoi)

- **Tout faire dans une route Next (PDF/scraping)** : instable, timeouts, pas retry-safe.
- **Injecter tout le contenu d’un classeur dans le prompt** : tokens explosent, latence, coût.
- **Stocker pipeline/jobs en JSONB** : difficile à indexer, interdit par convention, maintenance pénible.

---

## Questions ouvertes (à trancher avant dev)

- **Priorité wedge** : URL web + YouTube + PDF (ordre exact) ?
- **Destination par défaut** : folder ou classeur ?
- **Niveau de provenance MVP** :
  - simple (URL + date + note générée)
  - ou segments/chunks dès le départ (citations précises)
- **Transcription YouTube** :
  - d’abord transcript natif si dispo
  - fallback audio (plus tard)





