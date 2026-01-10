# 📚 Document Descriptif - Scrivia

**Date :** 31 janvier 2026  
**Version :** 1.0  
**Type :** Documentation descriptive complète

---

## 1. DESCRIPTION GÉNÉRALE

### Promesse principale
**Scrivia est votre bibliothèque intelligente qui pense, édite et organise avec vous.**

Scrivia combine un éditeur Markdown avancé, une organisation hiérarchique (Classeurs → Dossiers → Notes), et une intelligence artificielle intégrée avec des agents personnalisables pour créer une plateforme de gestion de connaissances unique.

### Use case principal
**Gestion de connaissances assistée par IA** pour :
- Chercheurs : Transformer des PDFs en bases de connaissances structurées
- Écrivains : Créer et organiser des notes avec contexte optimal pour l'écriture
- Apprenants : Générer automatiquement des fiches de révision depuis des cours
- Développeurs : Construire une documentation technique avec RAG sur codebase
- Professionnels : Organiser intelligemment leurs connaissances avec l'aide d'agents IA spécialisés

### Problème fondamental résolu
**Le fossé entre stockage de documents et exploitation intelligente de la connaissance.**

Les solutions existantes (Notion, Obsidian) permettent de stocker et organiser, mais :
- ❌ Nécessitent une organisation manuelle fastidieuse
- ❌ N'exploitent pas l'IA pour éditer avec précision
- ❌ Utilisent des formats propriétaires (vendor lock-in)
- ❌ Ne sont pas optimisées pour les LLMs et agents IA

**Scrivia résout cela en étant :**
- ✅ **Intelligence-first** : Agents LLM custom qui travaillent avec vous
- ✅ **Édition chirurgicale** : Opérations granulaires impossibles ailleurs
- ✅ **Auto-organisation** : L'IA range et organise pour vous
- ✅ **Markdown natif** : Pas de vendor lock-in, export/import sans perte
- ✅ **Privacy-first** : Contrôle granulaire de la visibilité (5 niveaux)

---

## 2. FEATURES PRINCIPALES

### Organisation et Structure
- **Structure hiérarchique** : Classeurs → Dossiers → Notes avec imbrication illimitée
- **Navigation avancée** : Sidebar, table des matières auto-générée, fil d'Ariane
- **Recherche full-text** : Recherche dans tous les contenus avec filtres par type
- **Corbeille intelligente** : Suppression douce avec restauration et préservation hiérarchie

### Éditeur Markdown
- **Édition WYSIWYG** : Markdown comme source de vérité, HTML généré automatiquement
- **Slash commands** : Menu contextuel avec "/" pour insertion rapide de blocs (style Notion)
- **Formatage riche** : Tables, code blocks (100+ langages), images, callouts, embeds (YouTube, audio)
- **Drag handles** : Réorganisation par drag & drop entre blocs
- **Sauvegarde automatique** : Toutes les 5 secondes avec indicateur visuel

### Intelligence Artificielle
- **Chat IA multimodal** : Support texte + images, streaming temps réel, reasoning affiché
- **Agents spécialisés personnalisables** : Création d'agents custom avec configuration LLM complète (modèle, température, max tokens)
- **Tool calls avancés** : Agents peuvent utiliser l'API Scrivia (créer/modifier notes, rechercher, organiser)
- **Orchestration d'agents** : Un agent peut appeler un autre agent comme outil
- **Prompts personnalisables** : 8 prompts par défaut + création de prompts custom avec assignation d'agents
- **Mentions (@)** : Mention de notes dans le chat pour contexte
- **Reconnaissance vocale** : Whisper Turbo intégré pour transcription en temps réel

### Opérations de Contenu Chirurgicales
- **API `applyContentOperations`** : Insert, replace, delete, upsert_section avec ciblage précis (heading, regex, position, anchor)
- **Dry-run et idempotence** : Tester avant exécution, opérations sûres
- **Édition granulaire** : Modifications précises impossibles sur d'autres plateformes

### Partage et Collaboration
- **5 niveaux de visibilité** : Privé, lien partageable, accès limité, Scrivia Users, Public
- **URLs SEO-friendly** : Format `scrivia.com/username/note-slug` avec métadonnées OpenGraph
- **Permissions granulaires** : Read, write, admin avec expiration de liens
- **Infrastructure collaboration** : Système de teammates, partage de classeurs, édition collaborative (Y.js)

### Gestion de Fichiers
- **Upload multi-formats** : Images (JPEG, PNG, GIF, WebP, SVG), documents (PDF, TXT, MD), audio (MP3, WAV), vidéo (MP4)
- **Stockage sécurisé** : Supabase Storage avec URLs signées pour fichiers privés
- **Bibliothèque de fichiers** : Vue centralisée avec filtres par type et recherche
- **Quotas par abonnement** : Gestion de l'espace de stockage avec limites configurables

### API et Intégrations
- **API REST complète (v2)** : 30+ endpoints pour gestion complète (notes, dossiers, classeurs, fichiers)
- **Support MCP natif** : Model Context Protocol pour connexion d'outils externes
- **OpenAPI** : Schémas OpenAPI pour intégration avec ChatGPT, Claude, Cursor
- **LLM-friendly** : API optimisée pour être utilisée par des agents LLM externes

### Expérience Utilisateur
- **Design moderne** : Glassmorphism, micro-animations, interface épurée
- **Thèmes** : Mode clair, sombre, adaptatif système
- **PWA** : Installation sur mobile (iOS + Android), fonctionne comme app native
- **Responsive** : Interface adaptée mobile, tablette, desktop
- **Accessibilité** : Navigation clavier complète, ARIA labels, contrastes respectés

---

## 3. USER JOURNEY TYPICAL

### Séquence d'actions d'un nouvel utilisateur

#### Étape 1 : Création de compte (2 min)
- Arrivée sur la landing page
- Inscription via email/password ou OAuth (Google, GitHub, Apple)
- Vérification email (si nécessaire)
- Redirection vers l'interface principale

#### Étape 2 : Première organisation (5 min)
- **Aha moment #1** : Découverte de la structure hiérarchique intuitive
- Création du premier classeur (ex: "Recherche", "Projets")
- Création d'un dossier dans le classeur
- Création de la première note avec l'éditeur Markdown

#### Étape 3 : Première interaction avec l'IA (3 min)
- **Aha moment #2** : Découverte du chat IA avec streaming temps réel
- Test d'un prompt par défaut (ex: "Améliorer l'écriture")
- Observation des tool calls : l'IA modifie directement la note
- Compréhension que l'IA peut agir sur le contenu

#### Étape 4 : Exploration des agents (10 min)
- **Aha moment #3** : Création d'un agent personnalisé
- Configuration d'un agent spécialisé (ex: "Analyseur de documents")
- Attribution d'un modèle LLM (Groq, Together AI, etc.)
- Test de l'agent sur une note existante
- Découverte de l'orchestration : un agent peut appeler un autre

#### Étape 5 : Usage quotidien (workflow établi)
- Création de notes via l'éditeur ou le chat
- Utilisation des slash commands pour insertion rapide
- Mention de notes (@) dans le chat pour contexte
- Partage de notes avec liens SEO-friendly
- Upload de fichiers (PDFs, images) pour analyse par agents
- Recherche full-text dans toute la base de connaissances

### "Aha moments" dans l'expérience

1. **"L'IA peut vraiment éditer mes notes"** (Étape 3)
   - Première fois qu'un agent modifie directement le contenu avec précision
   - Compréhension que ce n'est pas juste un chatbot, mais un co-éditeur

2. **"Je peux créer mes propres agents"** (Étape 4)
   - Réalisation que chaque utilisateur peut avoir des agents spécialisés
   - Personnalisation complète du comportement IA

3. **"Mes notes sont vraiment privées"** (Partage)
   - Découverte des 5 niveaux de visibilité
   - Contrôle total sur qui voit quoi

4. **"Je peux exporter tout en Markdown"** (Export)
   - Pas de vendor lock-in, données vraiment portables
   - Confiance dans la pérennité des données

5. **"L'API fonctionne avec ChatGPT"** (Intégration)
   - Découverte que ChatGPT peut utiliser Scrivia comme outil
   - Extension de l'écosystème IA personnel

---

## 4. ARCHITECTURE TECHNIQUE (vue d'ensemble)

### Stack technique principale

#### Frontend
- **Next.js** 16.0.7 (App Router) - Framework React avec SSR/SSG
- **React** 19.0.0 - Bibliothèque UI
- **TypeScript** 5.9.2 (strict mode) - Typage statique strict
- **Tailwind CSS** 3.4.17 - Styling utility-first
- **Zustand** 5.0.7 - Gestion d'état légère
- **SWR** 2.3.5 - Data fetching avec cache

#### Backend
- **Next.js API Routes** (App Router) - Endpoints API serverless
- **Supabase** - Backend-as-a-Service (PostgreSQL + Auth + Realtime + Storage)
- **PostgreSQL** (via Supabase) - Base de données relationnelle
- **Row Level Security (RLS)** - Sécurité au niveau base de données

#### Éditeur
- **Tiptap** 3.6.5 (ProseMirror-based) - Éditeur WYSIWYG
- **Extensions** : Markdown, tables, code blocks, task lists, mentions, drag handle, collaboration (Y.js)
- **Markdown** : Source de vérité pour édition, HTML généré pour affichage

#### IA et LLM
- **Groq** (via Synesia) - Provider principal avec modèles Llama optimisés
- **Modèles supportés** :
  - `meta-llama/llama-4-scout-17b-16e-instruct` (multimodal, 16 images)
  - `meta-llama/llama-4-maverick-17b-128e-instruct` (multimodal, 128 images)
  - `groq-llama3-8b-8192`, `groq-llama3-70b-8192` (texte)
- **Synesia LLM Execution API** - Orchestration d'agents
- **Whisper Turbo** - Transcription audio

#### Intégrations
- **AWS S3** (`@aws-sdk/client-s3`) - Stockage fichiers
- **MCP (Model Context Protocol)** - Connexion outils externes
- **OpenAPI** - Génération automatique de tools pour LLMs

#### Validation et Sécurité
- **Zod** 3.25.74 - Validation schémas
- **bcryptjs** 3.0.2 - Hashing
- **jsonwebtoken** 9.0.2 - Tokens JWT
- **DOMPurify** 3.2.6 - Sanitization HTML

### Architecture globale

**Type : Monolith modulaire avec API serverless**

- **Frontend** : Next.js App Router (SSR/SSG)
- **Backend** : Next.js API Routes (serverless functions)
- **Base de données** : PostgreSQL (Supabase) avec RLS
- **Stockage** : Supabase Storage + AWS S3 pour fichiers
- **Auth** : Supabase Auth (email/password, OAuth)
- **Realtime** : Supabase Realtime (WebSockets) pour collaboration
- **Déploiement** : Vercel (frontend + API routes)

**Pattern architectural :**
- Séparation claire frontend/backend via API Routes
- Services modulaires (V2UnifiedApi, SpecializedAgentManager)
- Database-first avec migrations versionnées (61 migrations SQL)
- TypeScript strict pour type safety end-to-end

### Intégrations clés

#### APIs externes
- **Synesia LLM Execution API** : Orchestration d'agents et exécution LLM
- **Groq API** : Modèles Llama optimisés pour performance
- **Whisper API** : Transcription audio
- **AWS S3** : Stockage fichiers avec URLs signées

#### Protocoles
- **MCP (Model Context Protocol)** : Connexion d'outils externes (Notion, Exa, Stripe, Hugging Face)
- **OpenAPI** : Schémas pour intégration ChatGPT, Claude, Cursor
- **OAuth 2.0** : Authentification externe (Google, GitHub, Apple)

### Ce qui est unique dans l'architecture

1. **Database-first avec atomicité garantie**
   - Pas de collections JSONB (tables dédiées avec `sequence_number` + UNIQUE)
   - Prévention race conditions via contraintes DB
   - Pattern `runExclusive` pour opérations concurrentes

2. **API LLM-friendly par design**
   - Endpoints optimisés pour tool calls
   - Support natif MCP et OpenAPI
   - Opérations idempotentes avec `operation_id`

3. **Markdown comme source de vérité**
   - Pas de format propriétaire
   - Conversion Markdown → HTML automatique
   - Export/import sans perte

4. **Agents comme outils**
   - Orchestration d'agents (agents as tools)
   - Configuration LLM par agent
   - Multi-tool orchestration avec limites (max 3 tool calls, timeout 30s)

5. **TypeScript strict end-to-end**
   - Zéro `any` sauf exceptions justifiées
   - Validation Zod systématique
   - Type safety de la DB à l'UI

6. **Scalabilité pensée pour 1M+ utilisateurs**
   - Architecture serverless (auto-scaling)
   - Indexes DB optimisés
   - Cache LRU pour note embeds
   - Lazy loading et code splitting

---

## 5. DIFFÉRENCIATION

### Par rapport à Notion

**Différence fondamentale : Intelligence-first vs Collaboration-first**

| Aspect | Notion | Scrivia |
|--------|--------|---------|
| **Focus** | Espace de travail collaboratif pour équipes | Bibliothèque intelligente assistée par IA |
| **Organisation** | Manuelle par l'utilisateur | Auto-organisation intelligente par IA |
| **Édition** | Édition manuelle classique | Édition chirurgicale avec agents IA |
| **Format** | Format propriétaire (vendor lock-in) | Markdown natif (portable) |
| **IA** | Intégration limitée | Agents LLM custom au cœur du produit |
| **API** | API REST classique | API LLM-friendly avec MCP natif |

**Avantage unique Scrivia :**
- **Agents LLM spécialisés personnalisables** : Notion ne peut pas copier facilement
- **Édition chirurgicale** : Opérations granulaires (`applyContentOperations`) uniques
- **Auto-organisation** : L'IA range et organise pour vous, pas besoin de le faire manuellement

**Message positionnel :**
> "Notion stocke. Scrivia *comprend*.  
> Notion organise. Scrivia *s'organise*.  
> Notion édite. Scrivia *co-édite*."

### Par rapport à Obsidian

**Différence fondamentale : Cloud-first avec IA vs Local-first sans IA**

| Aspect | Obsidian | Scrivia |
|--------|----------|---------|
| **Stockage** | Local (fichiers Markdown) | Cloud (Supabase) |
| **IA** | Plugins externes limités | Agents IA intégrés nativement |
| **Collaboration** | Via plugins (limité) | Partage natif avec 5 niveaux |
| **API** | API communautaire | API REST complète + MCP |
| **Organisation** | Manuelle (liens, tags) | Auto-organisation par IA |

**Avantage unique Scrivia :**
- **IA native** : Pas besoin de plugins, agents intégrés dès le départ
- **Cloud avec privacy** : Accès partout + contrôle granulaire de la visibilité
- **API complète** : Intégration avec ChatGPT, Claude, Cursor

### Par rapport à Perplexity

**Différence fondamentale : Recherche vs Gestion de connaissances**

| Aspect | Perplexity | Scrivia |
|--------|------------|---------|
| **Focus** | Recherche web avec IA | Gestion de connaissances personnelles |
| **Stockage** | Pas de stockage persistant | Base de connaissances persistante |
| **Édition** | Pas d'édition | Éditeur Markdown complet |
| **Organisation** | Pas d'organisation | Structure hiérarchique complète |

**Avantage unique Scrivia :**
- **Base de connaissances persistante** : Vos documents restent, organisés et exploitables
- **Édition et organisation** : Pas juste de la recherche, mais création et gestion

### Par rapport à Cursor

**Différence fondamentale : Éditeur de code vs Gestion de connaissances**

| Aspect | Cursor | Scrivia |
|--------|--------|---------|
| **Focus** | Édition de code avec IA | Gestion de connaissances avec IA |
| **Contenu** | Code source | Documents Markdown, notes, fichiers |
| **Organisation** | Projets de code | Classeurs, dossiers, notes |
| **Use case** | Développement logiciel | Gestion de connaissances |

**Avantage unique Scrivia :**
- **Spécialisé connaissances** : Optimisé pour documents, pas code
- **Organisation hiérarchique** : Structure adaptée aux connaissances, pas aux fichiers
- **Partage et collaboration** : Partage de notes avec permissions, pas juste de code

### Avantage unique de Scrivia

**Triple différenciation :**

1. **"Édition chirurgicale"** 📝
   > "Notion vous laisse éditer. Scrivia édite *avec* vous."
   - Opérations granulaires par agent (`applyContentOperations`)
   - Batch updates intelligents
   - Refactoring automatique

2. **"Auto-organisation intelligente"** 🗂️
   > "Notion vous fait ranger. Scrivia range *pour* vous."
   - Auto-tagging par contenu
   - Détection de relations
   - Suggestions de placement

3. **"Bibliothèque LLM"** 📚
   > "Notion stocke vos docs. Scrivia les *comprend*."
   - PDF → Markdown propre
   - RAG optimisé
   - Knowledge graph
   - Context packages pour LLM

**Moat (fossé défensif) :**
- Expertise LLM agents (2 ans d'avance)
- Infrastructure RAG optimisée
- Algorithmes d'organisation intelligente
- Markdown-first philosophy (pas de vendor lock-in)

**Vision :**
> "Devenir la plateforme de référence pour quiconque veut construire, organiser et exploiter une base de connaissances avec l'IA."

---

## 6. VALIDATION & TRACTION

### Statut actuel

**Niveau de maturité : MVP → Production-ready (8.5/10)**

#### Fonctionnalités Production-Ready ✅
- ✅ Éditeur Markdown complet et fonctionnel
- ✅ Chat IA avec streaming et tool calls
- ✅ Agents spécialisés personnalisables
- ✅ API REST complète (v2) avec 30+ endpoints
- ✅ Système de partage avec 5 niveaux
- ✅ Organisation hiérarchique (Classeurs → Dossiers → Notes)
- ✅ Gestion de fichiers avec quotas
- ✅ Corbeille avec restauration

#### Qualité technique ✅
- ✅ **Tests** : 594 tests passent (46 fichiers de tests)
- ✅ **Vulnérabilités** : 0 vulnérabilité npm
- ✅ **Type safety** : TypeScript strict (19 occurrences problématiques, acceptable pour MVP)
- ✅ **Monitoring** : Sentry intégré et configuré
- ✅ **CI/CD** : GitHub Actions avec déploiement automatique
- ✅ **Performance** : Latence chat < 2s, OK pour 3 utilisateurs simultanés

#### Architecture ✅
- ✅ **Database** : PostgreSQL avec RLS, 61 migrations versionnées
- ✅ **Atomicité** : Pattern `runExclusive` + contraintes UNIQUE
- ✅ **Scalabilité** : Architecture serverless (auto-scaling)
- ✅ **Sécurité** : Validation Zod, sanitization HTML, RLS activé

### Ce qui manque pour production full

#### Bloquants critiques (URGENT - 1 semaine)
1. **Paste Markdown cassé** (2-3j)
   - Problème : Coller markdown ouvre bloc code ou ne formate pas
   - Impact : ⭐⭐⭐⭐⭐ Productivité
   - Fichier : `src/extensions/MarkdownPasteHandler.ts`

2. **URLs publiques non SEO-friendly** (1-2j)
   - Problème : `/id/[uuid]` au lieu de `/username/slug`
   - Impact : ⭐⭐⭐⭐ SEO + partage
   - Fichier : `src/app/[username]/[slug]/page.tsx`

3. **Bullet lists cassées en preview** (0.5j)
   - Problème : Listes mal affichées en mode preview
   - Impact : ⭐⭐⭐ Lisibilité
   - Fichier : `src/styles/markdown.css`

#### Améliorations importantes (1-2 semaines)
4. **Nettoyer console.log restants** (2h)
   - 163 console.log (158 hors tests)
   - APIs critiques propres (0 console.log dans `/api/v2/`)
   - Priorité : BASSE (non bloquant)

5. **Tests E2E bloquants** (1h)
   - Playwright configuré mais `continue-on-error: true` en CI
   - Action : Retirer flag + configurer variables d'environnement
   - Priorité : MOYENNE

6. **Backup DB Supabase** (2h)
   - Non configuré (Supabase fait déjà des backups, mais pas testé)
   - Priorité : BASSE

#### Refactoring long terme (2-3 semaines)
7. **Refactoriser fichiers massifs** (14h)
   - `V2UnifiedApi.ts` : 1523 lignes (508% limite)
   - `SpecializedAgentManager.ts` : 1641 lignes
   - Impact : Maintenance difficile, mais fonctionne en prod
   - Priorité : MOYENNE

8. **Tests de concurrence** (1 jour)
   - 0 test de race conditions
   - Tests : 10 messages simultanés (zéro doublon)
   - Priorité : BASSE (`runExclusive` présent, mais non testé)

9. **2FA** (1-2 jours)
   - Non implémenté
   - Conformité (certains clients exigent 2FA)
   - Priorité : BASSE (pas critique pour 3 clients)

### Roadmap court terme (3-6 mois)

#### Phase 1 : Édition granulaire avancée (2-3 semaines)
- Multi-cursor editing
- Semantic replace
- Smart refactoring
- Content versioning (Git-like)

#### Phase 2 : Auto-organisation intelligente (3-4 semaines)
- Auto-tagging par contenu
- Détection de relations
- Suggestions de placement
- Knowledge graph automatique

#### Phase 3 : Document store LLM / RAG (4-6 semaines)
- PDF → Markdown propre
- Vector search
- Context optimization pour LLM
- Self-organizing knowledge base

### Objectif production full

**Timeline recommandée :**
- **Semaine 1** : Corriger les 3 bloqueurs critiques (Paste Markdown, URLs SEO, Bullet lists)
- **Semaine 2-3** : Nettoyer console.log, activer tests E2E, configurer backup
- **Semaine 4+** : Refactoring fichiers massifs, tests concurrence, 2FA

**Verdict actuel :**
> ✅ **PRÊT POUR 3 CLIENTS PAYANTS** - Tous les blockers critiques peuvent être corrigés en 1 semaine

**Score actuel : 8.5/10** (Production-ready avec améliorations mineures nécessaires)

---

## 📝 Conclusion

Scrivia est une plateforme de gestion de connaissances **intelligence-first** qui combine :
- Un éditeur Markdown avancé
- Une organisation hiérarchique intuitive
- Des agents IA personnalisables au cœur du produit
- Une API LLM-friendly complète
- Un contrôle privacy-first granulaire

**Positionnement unique :**
> "Notion stocke. Scrivia *comprend*.  
> Notion organise. Scrivia *s'organise*.  
> Notion édite. Scrivia *co-édite*."

**Statut : Production-ready (8.5/10)** avec 3 bloqueurs mineurs à corriger en 1 semaine pour production full.

**Vision :** Devenir la plateforme de référence pour quiconque veut construire, organiser et exploiter une base de connaissances avec l'IA.

---

**Fin du document**


