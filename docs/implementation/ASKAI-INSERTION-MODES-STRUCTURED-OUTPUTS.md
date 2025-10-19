# AskAI: Modes d'insertion & Structured Outputs

**Date:** 19 octobre 2025  
**Statut:** ✅ Implémenté  
**Version:** 1.0.0

---

## 🎯 Vue d'ensemble

Deux améliorations majeures pour le système AskAI :

1. **Modes d'insertion flexibles** : Replace, Append, Prepend
2. **Structured Outputs** : Éliminer les phrases parasites du LLM

---

## 1️⃣ Modes d'insertion flexibles

### Problème résolu

Avant, **tous les prompts** remplaçaient la sélection :
```typescript
editor.chain().focus().deleteSelection().insertContent(result).run();
```

Certains prompts nécessitent d'**ajouter après** (développer, expliquer) plutôt que de remplacer.

### Solution implémentée

Ajout d'un champ `insertion_mode` avec 3 valeurs possibles :

```typescript
export type InsertionMode = 'replace' | 'append' | 'prepend';

interface EditorPrompt {
  // ... autres champs
  insertion_mode: InsertionMode; // Défaut: 'replace'
}
```

### Comportements

| Mode | Comportement | Cas d'usage |
|------|--------------|-------------|
| `replace` | Remplace la sélection | Corriger, reformuler, raccourcir, simplifier |
| `append` | Ajoute **après** la sélection (conserve l'original) | Expliquer, développer, continuer, détailler |
| `prepend` | Ajoute **avant** la sélection (conserve l'original) | Ajouter intro, contexte |

### Exemple d'utilisation

#### Prompt "Corriger l'orthographe" (replace)
```
Sélection: "le chein court vite"
Mode: replace
Résultat: "Le chien court vite" ← Remplace la sélection
```

#### Prompt "Expliquer le concept" (append)
```
Sélection: "La photosynthèse"
Mode: append
Résultat: 
  "La photosynthèse
  
  Explication : La photosynthèse est le processus..." ← Ajoute après
```

#### Prompt "Ajouter une introduction" (prepend)
```
Sélection: "Le contenu principal..."
Mode: prepend
Résultat:
  "Introduction : Ce document traite de...
  
  Le contenu principal..." ← Ajoute avant
```

### Implémentation

**Migration SQL :**
```sql
ALTER TABLE editor_prompts
ADD COLUMN insertion_mode TEXT NOT NULL DEFAULT 'replace'
CHECK (insertion_mode IN ('replace', 'append', 'prepend'));
```

**Logique dans FloatingMenuNotion.tsx :**
```typescript
const insertionMode = prompt.insertion_mode || 'replace';
const { from, to } = editor.state.selection;

switch (insertionMode) {
  case 'replace':
    editor.chain().focus().deleteSelection().insertContent(result).run();
    break;
    
  case 'append':
    editor.chain()
      .focus(to) // Position après la sélection
      .insertContent('\n\n' + result) // Avec saut de ligne
      .run();
    break;
    
  case 'prepend':
    editor.chain()
      .focus(from) // Position avant la sélection
      .insertContent(result + '\n\n') // Avec saut de ligne
      .run();
    break;
}
```

---

## 2️⃣ Structured Outputs

### Problème résolu

Le LLM ajoute des phrases parasites :
```
❌ "Voici la correction : Le texte corrigé..."
❌ "J'ai reformulé le texte comme suit : ..."
❌ "Voilà le résultat : ..."
```

L'utilisateur veut **uniquement** le contenu demandé, sans introduction.

### Solution implémentée

Utilisation des **structured outputs** (JSON Schema) pour forcer le LLM à retourner **uniquement** le contenu.

```typescript
interface EditorPrompt {
  // ... autres champs
  use_structured_output: boolean;
  output_schema?: OutputSchema | null;
}

interface OutputSchema {
  type: 'object';
  properties: {
    content: {
      type: 'string';
      description: string;
    };
  };
  required: ['content'];
}
```

### Comportement

**Sans structured output :**
```json
{
  "response": "Voici la correction : Le texte corrigé..."
}
```

**Avec structured output :**
```json
{
  "response": {
    "content": "Le texte corrigé..." // ✅ Uniquement le contenu
  }
}
```

### Implémentation

**Migration SQL :**
```sql
ALTER TABLE editor_prompts
ADD COLUMN use_structured_output BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE editor_prompts
ADD COLUMN output_schema JSONB;
```

**Logique dans EditorPromptExecutor.ts :**
```typescript
// 1. Préparer la requête avec structured output si activé
if (prompt.use_structured_output && prompt.output_schema) {
  requestPayload.response_format = {
    type: 'json_schema',
    json_schema: {
      name: 'editor_prompt_response',
      strict: true,
      schema: prompt.output_schema
    }
  };
  
  // Instruction explicite
  requestPayload.message += '\n\nIMPORTANT: Return ONLY the requested content in the "content" field. NO introduction, NO explanation.';
}

// 2. Parser la réponse JSON
if (prompt.use_structured_output && responseText) {
  try {
    const parsed = JSON.parse(responseText);
    if (parsed && typeof parsed.content === 'string') {
      responseText = parsed.content; // Extraire uniquement le contenu
    }
  } catch (parseError) {
    // Fallback sur le texte brut si parsing échoue
  }
}
```

### Exemple de schéma

```typescript
const outputSchema = {
  type: 'object',
  properties: {
    content: {
      type: 'string',
      description: 'Le texte corrigé, sans aucune introduction ni explication'
    }
  },
  required: ['content']
};
```

---

## 📊 Configuration recommandée des prompts

### Prompts de correction/reformulation → replace + structured

```typescript
{
  name: "Corriger l'orthographe",
  insertion_mode: 'replace',
  use_structured_output: true,
  output_schema: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'Le texte corrigé, sans introduction'
      }
    },
    required: ['content']
  }
}
```

**Prompts concernés :**
- Corriger l'orthographe
- Reformuler
- Raccourcir
- Simplifier
- Traduire

### Prompts d'expansion → append + NO structured

```typescript
{
  name: "Expliquer le concept",
  insertion_mode: 'append',
  use_structured_output: false // Phrase d'intro OK ici
}
```

**Prompts concernés :**
- Expliquer le concept
- Développer
- Continuer la rédaction
- Détailler
- Compléter

### Prompts d'intro → prepend + structured

```typescript
{
  name: "Ajouter une introduction",
  insertion_mode: 'prepend',
  use_structured_output: true
}
```

---

## 🔧 Migration automatique

La migration SQL applique automatiquement les bons paramètres aux prompts existants :

```sql
-- Prompts d'expansion → append
UPDATE editor_prompts
SET insertion_mode = 'append'
WHERE LOWER(name) LIKE '%développer%'
   OR LOWER(name) LIKE '%expliquer%'
   OR LOWER(name) LIKE '%continuer%'
   OR LOWER(name) LIKE '%détailler%';

-- Prompts de correction → structured output
UPDATE editor_prompts
SET 
  use_structured_output = true,
  output_schema = jsonb_build_object(...)
WHERE LOWER(name) LIKE '%corriger%'
   OR LOWER(name) LIKE '%reformuler%'
   OR LOWER(name) LIKE '%raccourcir%'
   OR LOWER(name) LIKE '%simplifier%';
```

---

## 🎨 UX

### Indicateurs visuels (à implémenter)

**Option 1 : Badge sur le prompt**
```tsx
<div className="prompt-item">
  <span>{prompt.name}</span>
  {prompt.insertion_mode === 'append' && (
    <Badge>Ajoute après</Badge>
  )}
  {prompt.use_structured_output && (
    <Badge>Format strict</Badge>
  )}
</div>
```

**Option 2 : Tooltip**
```tsx
<Tooltip>
  <span>{prompt.name}</span>
  <TooltipContent>
    Mode: {prompt.insertion_mode === 'replace' ? 'Remplace' : 'Ajoute après'}
    {prompt.use_structured_output && ' • Format strict'}
  </TooltipContent>
</Tooltip>
```

---

## 📝 Guide création de prompts

### Checklist pour un nouveau prompt

1. **Définir le mode d'insertion**
   - Le prompt **remplace** le texte ? → `replace`
   - Le prompt **ajoute du contenu** après ? → `append`
   - Le prompt **ajoute une intro** avant ? → `prepend`

2. **Définir si structured output nécessaire**
   - Le LLM doit retourner **exactement** ce qui est demandé ? → `true`
   - Le LLM peut ajouter une intro/phrase de transition ? → `false`

3. **Exemples**

| Prompt | insertion_mode | use_structured_output | Raison |
|--------|----------------|----------------------|---------|
| Traduire en anglais | `replace` | `true` | Replace + format strict |
| Résumer | `replace` | `true` | Replace + format strict |
| Continuer l'histoire | `append` | `false` | Ajout + phrase de transition OK |
| Expliquer ce code | `append` | `false` | Ajout + "Explication :" OK |
| Ajouter titre | `prepend` | `true` | Avant + uniquement le titre |

---

## 🚀 Bénéfices

### 1. Meilleure UX
- ✅ Plus de flexibilité (3 modes au lieu d'1)
- ✅ Comportement intuitif selon le type de prompt
- ✅ Conservation du contenu original quand pertinent

### 2. Qualité des résultats
- ✅ Élimination des phrases parasites
- ✅ Réponses strictement conformes à la demande
- ✅ Meilleure cohérence

### 3. Cas d'usage couverts
| Besoin | Avant | Après |
|--------|-------|-------|
| Corriger texte | ✅ Replace | ✅ Replace + strict |
| Expliquer concept | ❌ Écrase la sélection | ✅ Append (garde l'original) |
| Continuer rédaction | ❌ Écrase | ✅ Append |
| Ajouter intro | ❌ Impossible | ✅ Prepend |

---

## 🔮 Évolutions futures

### 1. UI de configuration
Interface pour configurer les prompts directement dans l'app :
```tsx
<PromptEditor>
  <Select label="Mode d'insertion">
    <Option value="replace">Remplacer</Option>
    <Option value="append">Ajouter après</Option>
    <Option value="prepend">Ajouter avant</Option>
  </Select>
  
  <Checkbox label="Format strict (structured output)" />
</PromptEditor>
```

### 2. Prévisualisation
Montrer à l'utilisateur où le contenu sera inséré :
```
[Texte sélectionné] ← REPLACE ici
[Texte sélectionné] | APPEND ici →
← PREPEND ici | [Texte sélectionné]
```

### 3. Mode "Smart"
Détection automatique du meilleur mode selon le prompt :
```typescript
function detectBestMode(promptName: string): InsertionMode {
  if (/expliquer|développer|continuer/i.test(promptName)) {
    return 'append';
  }
  if (/intro|préambule/i.test(promptName)) {
    return 'prepend';
  }
  return 'replace';
}
```

---

## 📚 Ressources

- [Migration SQL](/supabase/migrations/20251019_add_editor_prompt_improvements.sql)
- [Types TypeScript](/src/types/editorPrompts.ts)
- [Exécuteur de prompts](/src/services/editorPromptExecutor.ts)
- [Interface utilisateur](/src/components/editor/FloatingMenuNotion.tsx)

---

**Implémentation complète et testée ✅**

