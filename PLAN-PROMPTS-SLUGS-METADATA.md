# 📋 PLAN - PROMPTS SLUGS + METADATA PATTERN

**Date** : 4 novembre 2025  
**Objectif** : Conformité 100% au pattern mentions  
**Standard** : GAFAM - Production-ready

---

## 🎯 VISION FINALE

### Pattern Uniforme (Mentions = Prompts)

| Type | Format Texte | Metadata | Backend |
|------|--------------|----------|---------|
| **Mentions** | `@slug` | `mentions[]` | Injection context |
| **Prompts** | `/slug` | `prompts[]` | Remplacement par template |

### Flow Complet

```
1. User sélectionne prompt dans menu
   → Insère /slug dans texte
   → Stocke dans usedPrompts[]

2. Message envoyé au backend
   → Texte: "lorem /slug test"
   → Metadata: prompts: [{ id, slug, template }]

3. Backend traite
   → Remplace /slug par template
   → Envoie au LLM

4. Message stocké en DB
   → content: "lorem /slug test" (compact)
   → prompts: [{ id, slug }] (metadata)

5. Affichage bulle user
   → Parse usedPrompts[]
   → Colore /slug en vert
   → Jamais le template visible
```

---

## 📊 ÉTAPES DÉTAILLÉES

### PHASE 1 : MIGRATION DB (30 min)

#### 1.1 Ajouter colonne slug à editor_prompts

**Fichier** : `supabase/migrations/20251104_add_slug_to_editor_prompts.sql`

```sql
-- Ajouter colonne slug
ALTER TABLE editor_prompts
ADD COLUMN slug TEXT;

-- Générer slugs depuis name existant
UPDATE editor_prompts
SET slug = lower(
  regexp_replace(
    regexp_replace(
      regexp_replace(name, '[éèêë]', 'e', 'g'),
      '[àâä]', 'a', 'g'
    ),
    '[^a-z0-9]+', '-', 'g'
  )
);

-- Rendre slug obligatoire + unique
ALTER TABLE editor_prompts
ALTER COLUMN slug SET NOT NULL,
ADD CONSTRAINT editor_prompts_user_slug_key UNIQUE(user_id, slug);

-- Index pour recherche rapide
CREATE INDEX idx_editor_prompts_slug ON editor_prompts(slug);

-- Commentaire
COMMENT ON COLUMN editor_prompts.slug IS 'Slug unique du prompt (pour mentions /slug)';
```

**Vérifications** :
- ✅ Slugs générés pour tous prompts existants
- ✅ Pas de doublons (UNIQUE constraint)
- ✅ Index pour performance

---

#### 1.2 Ajouter colonne prompts à chat_messages

**Fichier** : `supabase/migrations/20251104_add_prompts_to_messages.sql`

```sql
-- Ajouter colonne prompts (JSONB metadata)
ALTER TABLE chat_messages
ADD COLUMN prompts JSONB DEFAULT '[]'::jsonb;

-- Index GIN pour recherche dans JSONB
CREATE INDEX idx_chat_messages_prompts ON chat_messages USING gin(prompts);

-- Commentaire
COMMENT ON COLUMN chat_messages.prompts IS 'Metadata des prompts utilisés (format: [{ id, slug, name }])';

-- Validation : tableau d'objets avec id/slug obligatoires
ALTER TABLE chat_messages
ADD CONSTRAINT chat_messages_prompts_valid CHECK (
  jsonb_typeof(prompts) = 'array'
);
```

**Format attendu** :
```json
[
  {
    "id": "uuid-xxx",
    "slug": "voyage-visuel",
    "name": "Voyage Visuel"
  }
]
```

**Vérifications** :
- ✅ Colonne JSONB (pas une table - acceptable pour metadata légère)
- ✅ Index GIN pour recherche
- ✅ Validation format array

---

### PHASE 2 : TYPES TYPESCRIPT (15 min)

#### 2.1 Mettre à jour EditorPrompt

**Fichier** : `src/types/editorPrompts.ts`

```typescript
export interface EditorPrompt {
  id: string;
  user_id: string;
  name: string;
  slug: string; // ✅ NOUVEAU
  prompt_template: string;
  description: string | null;
  icon: string;
  context: 'editor' | 'chat' | 'both';
  agent_id: string | null;
  created_at: string;
  updated_at: string;
}
```

#### 2.2 Mettre à jour PromptMention

**Fichier** : `src/types/promptMention.ts`

```typescript
export interface PromptMention {
  id: string;
  slug: string;              // ✅ NOUVEAU (au lieu de name)
  name: string;              // Garder pour affichage tooltip
  prompt_template?: string;  // Optionnel (pas besoin en metadata)
  description?: string | null;
  context?: 'editor' | 'chat' | 'both';
}
```

#### 2.3 Mettre à jour ChatMessage

**Fichier** : `src/types/chat.ts`

```typescript
export interface ChatMessage {
  // ... existing
  mentions?: NoteMention[];
  prompts?: PromptMention[]; // ✅ NOUVEAU
}
```

---

### PHASE 3 : FRONTEND REFACTO (45 min)

#### 3.1 Modifier handleSelectPrompt (slug au lieu de name)

**Fichier** : `src/hooks/useChatInputHandlers.ts`

```typescript
const handleSelectPrompt = useCallback((prompt: EditorPrompt) => {
  // ✅ Utiliser SLUG au lieu de name
  const promptText = `/${prompt.slug}`; // Avant: /${prompt.name}
  
  const newPrompt: PromptMention = {
    id: prompt.id,
    slug: prompt.slug,      // ✅ NOUVEAU
    name: prompt.name,
    // PAS prompt_template ici (pas besoin dans metadata)
  };
  
  // ...
}, [usedPrompts, setUsedPrompts]);
```

#### 3.2 Parser slugs dans TextareaWithMentions

**Fichier** : `src/components/chat/TextareaWithMentions.tsx`

```typescript
// ✅ Détecter UNIQUEMENT les prompts stockés dans usedPrompts[]
usedPrompts.forEach(prompt => {
  const searchPattern = `/${prompt.slug}`; // Avant: /${prompt.name}
  
  // ...
});
```

#### 3.3 Parser slugs dans UserMessageText

**Fichier** : `src/components/chat/UserMessageText.tsx`

```typescript
// ✅ Utiliser prompts[] metadata (comme mentions[])
const prompts = message.prompts || [];

prompts.forEach(prompt => {
  const searchPattern = `/${prompt.slug}`;
  
  // Colorer en vert
});
```

#### 3.4 Supprimer remplacement dans useChatSend

**Fichier** : `src/hooks/useChatSend.ts`

```typescript
// ❌ SUPPRIMER replacePromptsWithTemplates (déplacé au backend)

const sendInternal = async (...) => {
  // ✅ NE PLUS remplacer les prompts ici
  // Le message garde /slug tel quel
  
  const content = buildMessageContent(message, images); // Pas de remplacement
  
  // ✅ NOUVEAU : Passer usedPrompts comme metadata
  onSend(content, images, notesWithContent, mentions, usedPrompts);
};
```

#### 3.5 Mettre à jour signatures

**Fichiers** :
- `src/components/chat/ChatInput.tsx`
- `src/components/chat/ChatInputContainer.tsx`
- `src/components/chat/ChatFullscreenV2.tsx`

```typescript
// ✅ onSend accepte prompts metadata
onSend: (
  message: string | MessageContent,
  images?: ImageAttachment[],
  notes?: NoteWithContent[],
  mentions?: NoteMention[],
  prompts?: PromptMention[] // ✅ Metadata envoyée au backend
) => void;
```

---

### PHASE 4 : BACKEND API (1h)

#### 4.1 Mettre à jour API sendMessage

**Fichier** : `src/app/api/chat/[sessionId]/send/route.ts`

```typescript
// ✅ Accepter prompts dans body
const bodySchema = z.object({
  message: z.union([z.string(), messageContentSchema]),
  images: z.array(imageAttachmentSchema).optional(),
  notes: z.array(noteWithContentSchema).optional(),
  mentions: z.array(noteMentionSchema).optional(),
  prompts: z.array(promptMentionSchema).optional() // ✅ NOUVEAU
});

const { message, images, notes, mentions, prompts } = validatedBody;
```

#### 4.2 Remplacer prompts avant LLM

**Fichier** : `src/services/chat/ChatMessageProcessor.ts` (ou dans route.ts)

```typescript
/**
 * Remplace les /slug par leurs templates dans le message
 * ✅ BACKEND UNIQUEMENT (invisible pour user)
 */
function replacePromptsInMessage(
  content: string,
  prompts: PromptMention[]
): string {
  let finalContent = content;
  
  for (const prompt of prompts) {
    const pattern = `/${prompt.slug}`;
    
    // Charger le template depuis DB si pas fourni
    if (!prompt.prompt_template) {
      const dbPrompt = await loadPrompt(prompt.id);
      prompt.prompt_template = dbPrompt.prompt_template;
    }
    
    // Validation
    if (!prompt.prompt_template?.trim()) {
      logger.warn('[ChatMessageProcessor] Template vide ignoré:', prompt.slug);
      continue;
    }
    
    // Remplacement
    if (finalContent.includes(pattern)) {
      finalContent = finalContent.replace(pattern, prompt.prompt_template + '\n\n');
      
      logger.info('[ChatMessageProcessor] ✅ Prompt remplacé:', {
        slug: prompt.slug,
        templateLength: prompt.prompt_template.length
      });
    }
  }
  
  return finalContent;
}

// Dans le flow d'envoi
const contentForLLM = replacePromptsInMessage(messageContent, prompts);
```

#### 4.3 Stocker metadata prompts en DB

**Fichier** : `src/app/api/chat/[sessionId]/send/route.ts`

```typescript
// Construire metadata prompts légère (sans template)
const promptsMetadata = prompts?.map(p => ({
  id: p.id,
  slug: p.slug,
  name: p.name
})) || [];

// Insérer message avec metadata
const { data: newMessage, error: insertError } = await supabase
  .from('chat_messages')
  .insert({
    session_id: sessionId,
    role: 'user',
    content: messageContent, // Garde /slug tel quel
    sequence_number: nextSeq,
    mentions: mentions || [],
    prompts: promptsMetadata // ✅ NOUVEAU
  });
```

#### 4.4 Charger prompts à l'affichage

**Fichier** : `src/app/api/chat/[sessionId]/messages/route.ts`

```typescript
// Messages déjà chargés avec prompts[] metadata
// Frontend parse et colore les /slug
```

---

### PHASE 5 : AFFICHAGE MESSAGES (30 min)

#### 5.1 Parser prompts dans UserMessageText

**Fichier** : `src/components/chat/UserMessageText.tsx`

```typescript
const UserMessageText = ({ content, mentions = [], prompts = [] }) => {
  const processedContent = useMemo(() => {
    const parts: ContentPart[] = [];
    let remaining = content;
    
    // Trouver occurrences mentions + prompts
    const allMatches: Match[] = [];
    
    // ✅ Mentions
    mentions.forEach(mention => {
      const pattern = `@${mention.slug}`;
      let index = remaining.indexOf(pattern);
      while (index !== -1) {
        allMatches.push({ type: 'mention', index, length: pattern.length, data: mention });
        index = remaining.indexOf(pattern, index + 1);
      }
    });
    
    // ✅ Prompts
    prompts.forEach(prompt => {
      const pattern = `/${prompt.slug}`;
      let index = remaining.indexOf(pattern);
      while (index !== -1) {
        allMatches.push({ type: 'prompt', index, length: pattern.length, data: prompt });
        index = remaining.indexOf(pattern, index + 1);
      }
    });
    
    // Trier + parser
    allMatches.sort((a, b) => a.index - b.index);
    
    // ...
  }, [content, mentions, prompts]);
  
  // Affichage
  return (
    <>
      {parts.map((part, i) => {
        if (part.type === 'prompt') {
          return (
            <span 
              key={i}
              className="user-message-prompt"
              title={part.data.name}
            >
              /{part.data.slug}
            </span>
          );
        }
        // ...
      })}
    </>
  );
};
```

---

### PHASE 6 : VALIDATION & CLEANUP (15 min)

#### 6.1 Supprimer code obsolète

**Fichiers à nettoyer** :
- `src/hooks/useChatSend.ts` : Supprimer `replacePromptsWithTemplates`
- `src/hooks/useInputDetection.ts` : Pas de changement (déjà OK)
- `src/components/chat/TextareaWithMentions.tsx` : Remplacer `name` par `slug`

#### 6.2 Mettre à jour useMentionDeletion

**Fichier** : `src/hooks/useMentionDeletion.ts`

```typescript
// Supprimer par slug (au lieu de name)
for (const prompt of usedPrompts) {
  const promptText = `/${prompt.slug}`; // Avant: /${prompt.name}
  // ...
}
```

---

## 🗂️ STRUCTURE FINALE

### Database Schema

```sql
-- editor_prompts
CREATE TABLE editor_prompts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,              -- ✅ NOUVEAU
  prompt_template TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  context TEXT CHECK (context IN ('editor', 'chat', 'both')),
  agent_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, slug)            -- ✅ NOUVEAU
);

-- chat_messages
CREATE TABLE chat_messages (
  -- ...
  content TEXT NOT NULL,           -- Contient /slug
  mentions JSONB DEFAULT '[]',     -- [{ id, slug, name }]
  prompts JSONB DEFAULT '[]'       -- ✅ NOUVEAU [{ id, slug, name }]
);
```

### TypeScript Types

```typescript
// EditorPrompt (table complète)
interface EditorPrompt {
  id: string;
  slug: string;              // ✅ NOUVEAU
  name: string;
  prompt_template: string;
  // ...
}

// PromptMention (metadata légère)
interface PromptMention {
  id: string;
  slug: string;              // ✅ NOUVEAU
  name: string;              // Pour tooltip
  // PAS prompt_template (économie tokens)
}

// ChatMessage (avec metadata)
interface ChatMessage {
  content: string;           // "lorem /slug test"
  mentions?: NoteMention[];
  prompts?: PromptMention[]; // ✅ NOUVEAU
}
```

### Flow Complet

```
Frontend (Input)
  → User sélectionne "Voyage Visuel"
  → Insère /voyage-visuel
  → usedPrompts: [{ id, slug: "voyage-visuel", name: "Voyage Visuel" }]

Frontend (Send)
  → POST /api/chat/{id}/send
  → Body: { content: "/voyage-visuel lorem", prompts: [{ id, slug, name }] }

Backend (API)
  → Valide Zod
  → Charge templates depuis DB si besoin
  → Remplace /voyage-visuel par template
  → Envoie au LLM: "Template du prompt\n\nlorem"
  → Stocke en DB: { content: "/voyage-visuel lorem", prompts: [{ id, slug, name }] }

Backend (Response)
  → Retourne message avec metadata prompts[]

Frontend (Display)
  → Parse prompts[] metadata
  → Colore /voyage-visuel en vert
  → Tooltip: "Voyage Visuel"
```

---

## 📋 CHECKLIST COMPLÈTE

### Phase 1 : Database ✅
- [ ] Migration add slug to editor_prompts
- [ ] Migration add prompts to chat_messages
- [ ] Générer slugs pour prompts existants
- [ ] Tester contraintes UNIQUE
- [ ] Vérifier indexes

### Phase 2 : Types ✅
- [ ] EditorPrompt + slug
- [ ] PromptMention + slug (sans template)
- [ ] ChatMessage + prompts[]
- [ ] Zod schemas updated

### Phase 3 : Frontend ✅
- [ ] handleSelectPrompt → /slug
- [ ] TextareaWithMentions → parse slug
- [ ] UserMessageText → parse prompts[] metadata
- [ ] useMentionDeletion → supprime par slug
- [ ] SUPPRIMER replacePromptsWithTemplates (frontend)

### Phase 4 : Backend ✅
- [ ] API accepte prompts[] metadata
- [ ] Valide Zod prompts[]
- [ ] Charge templates depuis DB
- [ ] Remplace /slug avant LLM
- [ ] Stocke prompts[] metadata en DB

### Phase 5 : Tests ✅
- [ ] Sélection prompt → /slug inséré
- [ ] Affichage input → /slug vert
- [ ] Envoi → prompts[] metadata
- [ ] Backend → template remplacé
- [ ] DB → prompts[] stocké
- [ ] Affichage bulle → /slug vert
- [ ] Suppression → state sync

---

## ⚡ ORDRE D'EXÉCUTION

### Étape 1 : Database (BLOQUER)
```bash
1. Créer migrations
2. Appliquer à DB
3. Vérifier slugs générés
4. Tester UNIQUE constraints
```
**Durée** : 30 min  
**Blockers** : Aucun autre step avant validation

### Étape 2 : Types TypeScript
```bash
1. EditorPrompt + slug
2. PromptMention + slug
3. ChatMessage + prompts[]
4. Vérifier 0 erreur TS
```
**Durée** : 15 min  
**Dépend de** : Étape 1 terminée

### Étape 3 : Frontend
```bash
1. handleSelectPrompt → slug
2. Parsing → slug
3. Suppression → slug
4. VIRER replacePromptsWithTemplates
5. Tester affichage input
```
**Durée** : 45 min  
**Dépend de** : Étape 2 terminée

### Étape 4 : Backend
```bash
1. API route → accepter prompts[]
2. Charger templates DB
3. Remplacer avant LLM
4. Stocker metadata DB
5. Tester end-to-end
```
**Durée** : 1h  
**Dépend de** : Étape 3 terminée

### Étape 5 : Validation Finale
```bash
1. Tests manuels complets
2. Build production
3. Vérifier logs
4. Push
```
**Durée** : 15 min

---

## 🎯 AVANTAGES SOLUTION

### 1. Cohérence Totale

| Avant | Après |
|-------|-------|
| Mentions : metadata | ✅ Mentions : metadata |
| Prompts : remplacement frontend | ✅ Prompts : metadata |
| Bulle : template brut visible | ✅ Bulle : /slug compact |

### 2. Économie Tokens

**Avant** :
```
Bulle user: "Décris cette image de manière poétique et immersive en utilisant..."
            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
            Template complet = 50+ tokens
```

**Après** :
```
Bulle user: "/voyage-visuel lorem"
            ^^^^^^^^^^^^^^^^ 
            Slug = 2 tokens
```

**Économie** : ~50 tokens par prompt par message

### 3. UX Professionnelle

- ✅ Jamais de template visible (comme Cursor)
- ✅ Compact et lisible
- ✅ Cohérent avec mentions

### 4. Maintenabilité

- ✅ Pattern uniforme (mentions = prompts)
- ✅ Backend responsable remplacement
- ✅ Frontend juste affichage

---

## ⚠️ RISQUES & MITIGATIONS

### Risque 1 : Slugs en Conflit

**Problème** : "Améliorer" et "Améliorer le style" → même slug

**Mitigation** :
```typescript
// Ajouter suffixe si doublon
let slug = generateSlug(name);
let counter = 1;
while (await slugExists(userId, slug)) {
  slug = `${baseSlug}-${counter}`;
  counter++;
}
```

### Risque 2 : Migration Slugs Longs

**Problème** : Prompts existants avec noms longs

**Mitigation** :
```sql
-- Limiter longueur slug
UPDATE editor_prompts
SET slug = substring(slug, 1, 50);
```

### Risque 3 : Templates Manquants Backend

**Problème** : Metadata sans template → Requête DB

**Mitigation** :
```typescript
// Cache templates en mémoire (singleton)
const templateCache = new Map<string, string>();

async function getTemplate(promptId: string): Promise<string> {
  if (templateCache.has(promptId)) {
    return templateCache.get(promptId)!;
  }
  
  const template = await db.getPromptTemplate(promptId);
  templateCache.set(promptId, template);
  return template;
}
```

---

## 🏆 RÉSULTAT FINAL

### Pattern Uniforme

```typescript
// Mentions
{
  texte: "@slug",
  metadata: [{ id, slug, name }],
  backend: "Injection context"
}

// Prompts
{
  texte: "/slug",
  metadata: [{ id, slug, name }],
  backend: "Remplacement template"
}
```

### UX Professionnelle

- Input : `/slug` en vert
- Bulle : `/slug` en vert
- Template : Jamais visible
- Backend : Template au LLM

---

## ⏱️ ESTIMATION TOTALE

**Temps** : ~2h30  
**Complexité** : Moyenne  
**Risque** : Faible  

**Étapes** :
1. DB migrations : 30 min
2. Types TS : 15 min
3. Frontend : 45 min
4. Backend : 1h
5. Tests : 15 min

---

## 🚀 PRÊT À DÉMARRER ?

**Ordre** :
1. Migrations DB
2. Types TypeScript
3. Frontend refacto
4. Backend API
5. Validation complète

**Je commence par les migrations ?**

