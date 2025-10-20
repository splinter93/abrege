# 🔍 AUDIT CONTEXTE LLM - État actuel

Date : 20 octobre 2025

## 📊 CE QUI EXISTE DÉJÀ

### 1. **AppContext** (`src/services/llm/types.ts`)
```typescript
interface AppContext {
  type: 'article' | 'folder' | 'chat_session';
  id: string;
  name: string;
  content?: string;
  metadata?: Record<string, unknown>;
  uiContext?: unknown;
  activeNote?: { id, slug, name };
  activeClasseur?: { id, name };
  activeFolder?: { id, name };
}
```

### 2. **UIContext** (`src/services/llm/ContextCollector.ts`)
```typescript
interface UIContext {
  user: { name, username?, email? };
  page: { type, name, path };
  activeNote?: { id, slug, name };
  activeClasseur?: { id, name };
  activeFolder?: { id, name };
}
```

### 3. **Hooks disponibles**
- ✅ `useAppContext()` → Détecte automatiquement le contexte depuis l'URL
- ✅ `useUIContext()` → Collecte le contexte UI complet
- ✅ `useContextSection()` → Génère la section markdown

### 4. **Ce qui est injecté actuellement**
```markdown
## Contexte
- Utilisateur: John Doe
- Page: Assistant de chat
- Note active: Mon article (ID: xxx, Slug: mon-article)
```

---

## ❌ PROBLÈMES IDENTIFIÉS

### 1. **Duplication**
- `activeNote`, `activeClasseur`, `activeFolder` sont dans **AppContext ET UIContext**
- Confusion entre les deux interfaces

### 2. **Informations manquantes**
- ❌ **Date/heure locale** + timezone
- ❌ **Device type** (mobile/desktop)
- ❌ **Langue préférée** (FR/EN)
- ❌ **Historique récent** (dernières notes)

### 3. **Pas optimisé pour les tokens**
- Format markdown verbeux : `"Note active: Mon article (ID: xxx, Slug: mon-article)"`
- ~15 tokens alors qu'on pourrait faire en ~5 tokens

### 4. **Architecture confuse**
```typescript
// Actuellement
const contextWithSessionId = {
  ...appContext,        // AppContext
  sessionId,
  agentId,
  uiContext             // UIContext
};
```
→ Deux systèmes qui se chevauchent

---

## ✅ RECOMMANDATIONS

### 1. **Fusionner AppContext et UIContext**
Une seule interface `LLMContext` :

```typescript
interface LLMContext {
  // Session
  sessionId: string;
  agentId?: string;
  
  // Temporel (15 tokens)
  time: {
    local: string;        // "Lundi 20 oct, 23h15"
    timezone: string;     // "Europe/Paris"
  };
  
  // Utilisateur (10 tokens)
  user: {
    name: string;
    locale: 'fr' | 'en';
  };
  
  // Page actuelle (20 tokens)
  page: {
    type: 'chat' | 'editor' | 'folder' | 'classeur' | 'home';
    path: string;
  };
  
  // Contexte actif (30 tokens si présent)
  active?: {
    note?: { slug: string; title: string };
    folder?: { name: string };
    classeur?: { name: string };
  };
  
  // Device (5 tokens)
  device: 'mobile' | 'tablet' | 'desktop';
  
  // Historique condensé (30-50 tokens, optionnel)
  recent?: {
    notes: string[];      // Max 3 titres
    lastAction?: string;  // "edited note", "searched"
  };
}
```

### 2. **Format ultra-compact pour l'injection**
```markdown
## Context
📅 Mon 20 oct 23h15 (Paris) | 💻 Desktop | 🇫🇷 FR
📍 Chat
📝 Recent: [React Hooks, TypeScript Tips, Design Patterns]
```
→ Seulement ~40 tokens au lieu de ~100 !

### 3. **Architecture proposée**
```typescript
// 1 seul hook
const context = useLLMContext({
  includeRecent: true,  // opt-in pour l'historique
  maxRecentNotes: 3
});

// Génère automatiquement tout
{
  time: "Mon 20 oct 23h15 (Paris)",
  user: "John Doe",
  page: "chat",
  device: "desktop",
  locale: "fr",
  recent: ["React Hooks", "TypeScript"]
}
```

---

## 🎯 PLAN D'ACTION RECOMMANDÉ

### Phase 1 : Cleanup (1h)
1. ✅ Fusionner AppContext et UIContext → `LLMContext`
2. ✅ Supprimer les duplications
3. ✅ Nettoyer les hooks existants

### Phase 2 : Enrichissement (1h)
1. ✅ Ajouter date/heure + timezone
2. ✅ Ajouter détection device (hook existant)
3. ✅ Ajouter locale (depuis LanguageContext)

### Phase 3 : Optimisation (30min)
1. ✅ Format ultra-compact pour l'injection
2. ✅ Historique condensé (opt-in)
3. ✅ Budget tokens < 100

---

## 💰 COÛT EN TOKENS

**Actuellement** (~80-120 tokens) :
```markdown
## Contexte
- Utilisateur: John Doe (john@example.com)
- Page: Assistant de chat (/chat)
- Note active: Mon article sur React Hooks (ID: 123, Slug: react-hooks)
```

**Après optimisation** (~40-60 tokens) :
```markdown
## Context
📅 Mon 20 oct 23h15 (Paris) | 💻 Desktop | 🇫🇷 FR
📍 Chat
📝 Recent: React Hooks, TypeScript, Design Patterns
```

**Gain : -50% de tokens** tout en ayant PLUS d'infos ! 🎯

