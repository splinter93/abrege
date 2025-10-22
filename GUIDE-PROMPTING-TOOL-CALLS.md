# 🎯 GUIDE PRATIQUE : MAÎTRISER LE PROMPTING DES TOOL CALLS

**Pour :** Développeur solo qui veut **peaufiner** le comportement multi-tool-calls  
**Niveau :** Tu connais les bases LLM, tu veux contrôler les détails  

---

## 📂 **LES 3 ZONES DE CONTRÔLE**

```
┌─────────────────────────────────────────────────────────────┐
│  1. PROMPTING (System Message)                              │
│     ├─ SystemMessageBuilder.ts        ← ⭐ TON LEVIER #1   │
│     ├─ toolCallInstructions.ts        ← Instructions tech   │
│     └─ templates.ts                   ← Templates généraux  │
│                                                              │
│  2. PARAMÈTRES LLM (Température, Top-P)                     │
│     ├─ stream/route.ts                ← Température route   │
│     └─ xai.ts                         ← Top-P provider      │
│                                                              │
│  3. FILTRAGE POST-GÉNÉRATION (Timeline)                     │
│     └─ useChatHandlers.ts             ← Filtre hallucinations│
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 **ZONE 1 : PROMPTING (TON LEVIER PRINCIPAL)**

### **📍 Fichier : `src/services/llm/SystemMessageBuilder.ts`**

**Lignes 79-132** : C'est **LE CŒUR** du système !

#### **🔧 SECTION 1 : Instructions Tool Calls (lignes 79-95)**

```typescript
content += `\n\n## Utilisation des Outils

RÈGLE IMPORTANTE : Avant d'appeler un outil, tu DOIS TOUJOURS :
1. Expliquer brièvement ce que tu vas faire
2. Puis appeler l'outil
3. Après résultat, commenter

Exemple de bon comportement :
- content: "Je vais chercher..."
- tool_calls: [{ name: "search", ... }]
`;
```

**🎨 CE QUE TU PEUX MODIFIER ICI :**

```typescript
// ✅ Exemple : Forcer l'ordre séquentiel STRICT
content += `\n\n## Utilisation des Outils

RÈGLE ABSOLUE : UN SEUL TOOL À LA FOIS !

Workflow OBLIGATOIRE :
1. Annonce : "Je vais utiliser [NOM_TOOL] pour..."
2. Appel : UN SEUL tool_call
3. STOP : Attends le résultat, ne continue PAS
4. Commentaire : "J'ai obtenu... [analyse]"
5. SI besoin d'un 2e tool → RECOMMENCE en 1

❌ INTERDIT : Appeler 2+ tools en même temps
❌ INTERDIT : Continuer à parler après avoir appelé un tool
✅ REQUIS : Un tool, puis SILENCE jusqu'au résultat
`;
```

**💡 IDÉES D'AJUSTEMENTS :**

| Problème observé | Modification du prompt |
|------------------|------------------------|
| **Trop de tools simultanés** | Ajouter "RÈGLE : Maximum 1 tool par message" |
| **Hallucine des résultats** | Renforcer "⚠️ ANTI-HALLUCINATION" (voir section suivante) |
| **Oublie d'expliquer** | Ajouter "OBLIGATOIRE : Explique AVANT chaque tool" |
| **Mauvais tool choisi** | Ajouter tableau de décision "Quand utiliser quel tool ?" |
| **Continue sans attendre** | Ajouter "STOP après tool_call, ne génère RIEN d'autre" |

---

#### **🔧 SECTION 2 : Anti-Hallucination (lignes 97-118)**

```typescript
content += `
⚠️ ANTI-HALLUCINATION CRITIQUE ⚠️

RÈGLE ABSOLUE : N'invente JAMAIS de données avant résultat.

Comportement INTERDIT :
❌ "Je cherche... ![image](https://inventé.jpg)"
❌ Afficher URLs, données AVANT tool execution

Comportement REQUIS :
✅ "Je cherche..." [tool_call] → ATTENDRE
✅ Après : "Obtenu : [URL réelle]"
`;
```

**🎨 AJUSTEMENTS SELON TES BUGS :**

```typescript
// Si hallucine souvent des URLs d'images
content += `
⚠️ RÈGLE SPÉCIALE IMAGES ⚠️

Tu ne connais AUCUNE URL d'image par toi-même.
TOUTE URL d'image DOIT provenir d'un tool result.

Workflow STRICT :
1. "Je vais chercher une image de X"
2. [tool_call: get__search]
3. ATTENTE (ne génère RIEN)
4. Résultat reçu
5. "Voici l'image : [URL du résultat]"

❌ JAMAIS : Inventer une URL comme pexels.com/photos/123
✅ TOUJOURS : Copier exactement l'URL du tool result
`;

// Si hallucine des données ClickUp/API
content += `
⚠️ RÈGLE SPÉCIALE DONNÉES API ⚠️

Tu ne connais AUCUN ID, AUCUNE donnée des APIs externes.
TOUTE donnée (task_id, list_id, etc.) DOIT venir d'un tool.

❌ JAMAIS : "La tâche #12345 est..."
✅ TOUJOURS : Appeler getTask d'abord, puis utiliser le résultat
`;
```

---

#### **🔧 SECTION 3 : Multi-Tools Séquentiels (lignes 111-118)**

```typescript
content += `
Si tu as besoin de plusieurs outils séquentiels :
1. Appelle le PREMIER outil UNIQUEMENT
2. ATTENDS le résultat
3. Commente le résultat
4. Puis appelle le SECOND outil
5. ATTENDS à nouveau
`;
```

**🎨 AJUSTEMENTS POUR PEAUFINER :**

```typescript
// Option A : FORCER séquentiel pur (1 tool à la fois)
content += `
RÈGLE MULTI-TOOLS : SÉQUENTIEL UNIQUEMENT

Workflow OBLIGATOIRE :
- 1er message : "Je vais faire X" → tool_call_1
- [Attente résultat_1]
- 2e message : "X OK, maintenant Y" → tool_call_2
- [Attente résultat_2]
- 3e message : "Voici le résultat final"

❌ INTERDIT : tool_call_1 + tool_call_2 dans même message
✅ REQUIS : UN tool par message, TOUJOURS
`;

// Option B : Autoriser parallèle SI indépendants
content += `
RÈGLE MULTI-TOOLS : INDÉPENDANTS = PARALLÈLE, DÉPENDANTS = SÉQUENTIEL

Parallèle OK si :
- Chercher image chat + image chien (indépendants)
- → tool_calls: [search('cat'), search('dog')]

Séquentiel OBLIGATOIRE si :
- Chercher task puis modifier task (dépendants)
- → 1. getTask → Attente → 2. updateTask(résultat.id)

Évalue TOUJOURS les dépendances AVANT d'appeler !
`;

// Option C : Limiter nombre de tools
content += `
LIMITE : MAXIMUM 3 TOOLS PAR MESSAGE

Si besoin de plus :
1. Appelle les 3 premiers
2. Attends résultats
3. Explique ce que tu as obtenu
4. Appelle les 3 suivants si nécessaire

Cela évite surcharge et erreurs.
`;
```

---

### **📍 Fichier : `src/services/llm/toolCallInstructions.ts`**

**Pour instructions TECHNIQUES** (paramètres, types, JSON).

<function_calls>
<invoke name="read_file">
<parameter name="target_file">/Users/k/Documents/Cursor Workspace/abrege/src/services/llm/toolCallInstructions.ts