# 📊 SCHÉMA : INJECTION DU PROMPT TOOL CALLS

**Visualisation complète** de comment le prompt est injecté et influence Grok

---

## 🎬 **FLOW COMPLET (EXEMPLE CONCRET)**

```
┌──────────────────────────────────────────────────────────────────────┐
│  USER ENVOIE : "Cherche une image de chat puis de chien"            │
└────────────────────────────┬─────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────────────┐
│  ÉTAPE 1 : ChatFullscreenV2.handleSendMessage()                     │
│  ├─ Récupère agentId, sessionId, token                              │
│  └─ Appelle useChatResponse.sendMessage()                           │
└────────────────────────────┬─────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────────────┐
│  ÉTAPE 2 : POST /api/chat/llm/stream                                │
│                                                                      │
│  A. Validation JWT                                                  │
│     const userId = await supabase.auth.getUser(token)               │
│                                                                      │
│  B. Récupération agent config (BDD)                                 │
│     const agent = await supabase.from('agents').select(...)         │
│     → { system_instructions, temperature, model, ... }               │
│                                                                      │
│  C. 🎯 CONSTRUCTION SYSTEM MESSAGE (ICI LE MAGIC !)                 │
│     const systemMessageBuilder = SystemMessageBuilder.getInstance() │
│     const result = systemMessageBuilder.buildSystemMessage(         │
│       agent, // ← Config de l'agent                                 │
│       context // ← Contexte UI                                      │
│     );                                                               │
│                                                                      │
│     ┌─────────────────────────────────────────────────────┐        │
│     │  SystemMessageBuilder.buildSystemMessage()          │        │
│     │                                                      │        │
│     │  let content = '';                                  │        │
│     │                                                      │        │
│     │  // 1. Instructions base agent (de la BDD)          │        │
│     │  content = agent.system_instructions ||             │        │
│     │            'Tu es un assistant IA...'               │        │
│     │                                                      │        │
│     │  // 2. ➕ Instructions tool calls (HARDCODÉES)      │        │
│     │  content += `                                       │        │
│     │    ## Utilisation des Outils                       │        │
│     │    RÈGLE : Explique avant, appelle, commente...    │        │
│     │  `;                                                  │        │
│     │                                                      │        │
│     │  // 3. ➕ Anti-hallucination (HARDCODÉE)            │        │
│     │  content += `                                       │        │
│     │    ⚠️ ANTI-HALLUCINATION CRITIQUE ⚠️              │        │
│     │    N'invente JAMAIS de données...                  │        │
│     │  `;                                                  │        │
│     │                                                      │        │
│     │  // 4. ➕ Gestion erreurs (HARDCODÉE)               │        │
│     │  content += `                                       │        │
│     │    ## Gestion des Erreurs                          │        │
│     │    Si outil échoue...                              │        │
│     │  `;                                                  │        │
│     │                                                      │        │
│     │  return { content };                                │        │
│     └─────────────────────────────────────────────────────┘        │
│                                                                      │
│  D. Création du tableau de messages                                 │
│     const messages = [                                               │
│       {                                                              │
│         role: 'system',                                             │
│         content: `                                                  │
│           Tu es un assistant...                                     │
│                                                                      │
│           ## Utilisation des Outils                                │
│           RÈGLE : Explique avant...                                │
│                                                                      │
│           ⚠️ ANTI-HALLUCINATION ⚠️                                 │
│           N'invente JAMAIS...                                       │
│                                                                      │
│           ## Gestion des Erreurs                                   │
│           Si outil échoue...                                        │
│         `                                                            │
│       },                                                             │
│       ...history, // Messages précédents                            │
│       {                                                              │
│         role: 'user',                                               │
│         content: "Cherche chat puis chien"                          │
│       }                                                              │
│     ];                                                               │
│                                                                      │
│  E. Création XAIProvider avec paramètres                            │
│     const provider = new XAIProvider({                              │
│       model: 'grok-4-fast',                                          │
│       temperature: 0.55, // ← Ton contrôle !                        │
│       topP: 0.85         // ← Ton contrôle !                        │
│     });                                                              │
└────────────────────────────┬─────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────────────┐
│  ÉTAPE 3 : APPEL GROK API                                           │
│  Fichier : xai.ts                                                    │
│                                                                      │
│  POST https://api.x.ai/v1/chat/completions                          │
│  {                                                                   │
│    "model": "grok-4-fast",                                           │
│    "temperature": 0.55,                                              │
│    "top_p": 0.85,                                                    │
│    "stream": true,                                                   │
│    "messages": [                                                     │
│      {                                                               │
│        "role": "system",                                            │
│        "content": "Tu es... ## Utilisation... ⚠️ Anti-halluc..."   │
│      },                                                              │
│      { "role": "user", "content": "Cherche chat puis chien" }       │
│    ],                                                                │
│    "tools": [                                                        │
│      { "function": { "name": "get__search", ... } },                │
│      { "function": { "name": "createNote", ... } },                 │
│      ...                                                             │
│    ]                                                                 │
│  }                                                                   │
└────────────────────────────┬─────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────────────┐
│  GROK RAISONNE (avec le system prompt en mémoire)                   │
│                                                                      │
│  Grok lit :                                                          │
│  "## Utilisation des Outils                                         │
│   RÈGLE : Explique avant, appelle, commente                         │
│   ⚠️ ANTI-HALLUCINATION : N'invente JAMAIS..."                     │
│                                                                      │
│  Grok génère (influencé par le prompt) :                            │
│  "Je vais chercher une image de chat avec get__search..."           │
│  [tool_call: get__search('cat')]                                    │
│  === STOP === (grâce au prompt "Silence après tool_call")           │
└────────────────────────────┬─────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────────────┐
│  ÉTAPE 4 : EXÉCUTION TOOL                                           │
│  Fichier : stream/route.ts                                          │
│                                                                      │
│  ApiV2ToolExecutor.executeToolCall(                                 │
│    { name: 'get__search', arguments: '{"query":"cat"}' },          │
│    userToken                                                         │
│  )                                                                   │
│  → Appel API Pexels                                                  │
│  → Résultat : { photos: [{ src: { large: "https://real.jpg" }}] }  │
└────────────────────────────┬─────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────────────┐
│  ÉTAPE 5 : INJECTION RÉSULTAT + RELANCE GROK                        │
│                                                                      │
│  messages = [                                                        │
│    { role: 'system', content: "..." },                              │
│    { role: 'user', content: "Cherche chat puis chien" },            │
│    { role: 'assistant', tool_calls: [...] }, // ← Message de Grok   │
│    {                                                                 │
│      role: 'tool',                                                  │
│      tool_call_id: "call_123",                                       │
│      name: "get__search",                                           │
│      content: '{"photos":[{"src":{"large":"https://real.jpg"}}]}'   │
│    } // ← Résultat injecté                                          │
│  ]                                                                   │
│                                                                      │
│  GROK reçoit le résultat et continue :                              │
│  "J'ai obtenu cette image : ![chat](https://real.jpg)"              │
│  "Maintenant je cherche un chien..."                                │
│  [tool_call: get__search('dog')]                                    │
└────────────────────────────┬─────────────────────────────────────────┘
                             ↓
Boucle jusqu'à finish_reason='stop' (max 5 rounds)
                             ↓
┌──────────────────────────────────────────────────────────────────────┐
│  ÉTAPE 6 : FILTRAGE TIMELINE (Filet de sécurité)                   │
│  Fichier : useChatHandlers.ts                                       │
│                                                                      │
│  streamTimeline = [                                                  │
│    { type: 'text', content: "Je cherche chat...", round: 0 },      │
│    { type: 'tool_execution', round: 0 },                            │
│    { type: 'tool_result', result: "...", round: 0 },                │
│    { type: 'text', content: "J'ai obtenu chat...", round: 1 },     │
│    { type: 'tool_execution', round: 1 },                            │
│    { type: 'tool_result', result: "...", round: 1 },                │
│    { type: 'text', content: "J'ai obtenu chien...", round: 2 }     │
│  ]                                                                   │
│                                                                      │
│  SI hallucination dans round 0/1 :                                  │
│    → Garde UNIQUEMENT le dernier event 'text' (round 2)             │
│  SINON :                                                             │
│    → Garde tout                                                      │
└──────────────────────────────────────────────────────────────────────┘
                             ↓
                    MESSAGE FINAL PROPRE ✅
```

---

## 🎯 **OÙ MODIFIER QUOI**

### **Problème : Hallucine des URLs avant tool execution**

```
1. SystemMessageBuilder.ts (ligne 97-118)
   ➕ Renforce "⚠️ ANTI-HALLUCINATION"
   ➕ Ajoute "AUTO-CHECK avant affichage"
   
2. stream/route.ts (ligne 155)
   Baisse température : 0.55 → 0.45
   
3. xai.ts (ligne 106)
   Baisse top-p : 0.85 → 0.80
```

### **Problème : Appelle trop de tools en même temps**

```
1. SystemMessageBuilder.ts (ligne 79-95)
   ➕ Ajoute "LIMITE : MAX 2 TOOLS/MESSAGE"
   ➕ Force "Évalue dépendances AVANT"
   
2. Température : OK à 0.55 (pas le problème)
```

### **Problème : Oublie d'expliquer ses actions**

```
1. SystemMessageBuilder.ts (ligne 79-95)
   ➕ Change "tu DOIS" → "OBLIGATOIRE"
   ➕ Ajoute format requis : "Je vais [ACTION] avec [TOOL]..."
   
2. Température : Peut monter à 0.60 (plus bavard)
```

---

## 💡 **EXEMPLE PRATIQUE : MODIFICATION EN 3 MIN**

**Scénario :** Tu veux réduire les hallucinations d'URLs

### **1. Ouvre le fichier**

```bash
code src/services/llm/SystemMessageBuilder.ts
```

### **2. Va ligne 97**

Trouve cette section :
```typescript
content += `
⚠️ ANTI-HALLUCINATION CRITIQUE ⚠️

RÈGLE ABSOLUE : N'invente JAMAIS de données avant résultat.
...
`;
```

### **3. Remplace par ça (plus strict) :**

```typescript
content += `
⚠️⚠️⚠️ ANTI-HALLUCINATION ULTRA-CRITIQUE ⚠️⚠️⚠️

TU NE CONNAIS AUCUNE URL. ZÉRO. JAMAIS.

WORKFLOW IMAGE OBLIGATOIRE :
1. User demande image
2. Tu dis : "Je cherche [SUJET]"
3. Tu appelles : [tool_call: get__search]
4. === TU NE GÉNÈRES RIEN D'AUTRE ===
5. Résultat arrive
6. Tu dis : "Voici : [URL_EXACTE_DU_RÉSULTAT]"

AUTO-VÉRIFICATION AVANT CHAQUE ![...](URL) :
→ "Cette URL est dans un tool result ?"
→ OUI : OK, affiche-la
→ NON : STOP, appelle un tool d'abord

EXEMPLES INTERDITS :
❌ "Je cherche... ![chat](https://pexels.com/123)" ← INVENTÉ !
❌ "Voici probablement..." ← PAS DE DEVINETTE
❌ Continuer à écrire après un tool_call ← SILENCE !

EXEMPLES REQUIS :
✅ "Je cherche un chat" [tool_call] === FIN ===
✅ [Résultat: https://real.jpg] "Voici : ![chat](https://real.jpg)"

SI TU AFFICHES UNE URL QUI N'EST PAS DANS UN TOOL RESULT :
→ C'EST UNE HALLUCINATION
→ L'UTILISATEUR SERA DÉÇU
→ NE LE FAIS JAMAIS
`;
```

### **4. Sauvegarde et teste**

```bash
# Relance serveur
npm run dev

# Teste 10 fois : "Cherche un chat puis un chien"
# Note le taux d'hallucinations
```

---

## 📊 **MATRICE : QUEL LEVIER POUR QUEL PROBLÈME ?**

| Symptôme précis | Fichier | Ligne | Modification |
|-----------------|---------|-------|--------------|
| **Invente URLs avant tool** | SystemMessageBuilder.ts | 97-118 | Renforce anti-hallucination + AUTO-CHECK |
| **Appelle 5 tools simultanés** | SystemMessageBuilder.ts | 79-95 | Ajoute "MAX 2 TOOLS/MESSAGE" |
| **Ordre séquentiel pas respecté** | SystemMessageBuilder.ts | 111-118 | Force "SÉQUENTIEL STRICT" |
| **Trop créatif/bizarre** | stream/route.ts | 155 | `temperature: 0.45` |
| **Tokens improbables** | xai.ts | 106 | `topP: 0.80` |
| **Oublie d'expliquer** | SystemMessageBuilder.ts | 81-84 | Change "DOIS" → "OBLIGATOIRE" |
| **Continue après tool_call** | SystemMessageBuilder.ts | 79-95 | Ajoute "STOP après tool_call" |

---

## 🎯 **TON WORKFLOW DE PEAUFINAGE**

```
1. 📊 Identifie le bug précis
   "Hallucine URLs dans 20% des cas multi-tools"
   
2. 🎯 Choisis le levier
   → SystemMessageBuilder.ts (prompt anti-hallucination)
   
3. ✏️ Modifie UNE chose
   → Renforce le prompt ligne 97-118
   
4. 🧪 Teste 10 fois
   → Note succès : ___/10
   
5. 📈 Compare baseline
   → Avant : 8/10 → Après : 9/10 → Amélioration !
   
6. 🔄 Itère si besoin
   → Teste température 0.50 en plus
   → Note : ___/10
   
7. ✅ Valide meilleure config
   → Prompt renforcé + temp 0.50 = 10/10 → PERFECT !
   
8. 💾 Commit
   → "feat: Optimize tool call prompting (98% success rate)"
```

---

## 🔥 **RECAP ULTRA-RAPIDE**

### **Tu veux modifier le comportement ?**

**→ Ouvre `SystemMessageBuilder.ts` ligne 79**

**Exemples rapides :**

```typescript
// Plus strict
content += `RÈGLE : 1 TOOL MAX par message. STOP après tool_call.`;

// Plus bavard
content += `OBLIGATOIRE : Explique en détail avant chaque tool.`;

// Plus safe
content += `AUTO-CHECK : Avant afficher URL → Vient d'un tool ? OUI=OK, NON=STOP`;
```

**Sauve, relance, teste !**

---

**Voilà chef, tu as TOUT pour prendre la main !** 🎯

**Ton point d'entrée principal : `SystemMessageBuilder.ts` lignes 79-132** ⭐



