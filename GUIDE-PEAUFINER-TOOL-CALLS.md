# 🎯 GUIDE : PEAUFINER LES TOOL CALLS

**Pour :** Développeur solo, maîtriser le système multi-tool-calls  
**But :** Réduire hallucinations, optimiser comportement séquentiel/parallèle

---

## 🗺️ **VUE D'ENSEMBLE DU SYSTÈME**

```
USER: "Cherche une image de chat puis de chien"
  ↓
┌─────────────────────────────────────────────────────────────┐
│  ÉTAPE 1 : CONSTRUCTION DU SYSTEM MESSAGE                   │
│  Fichier : SystemMessageBuilder.ts (lignes 79-132)         │
│                                                              │
│  ➕ Instructions base agent (system_instructions)           │
│  ➕ Instructions tool calls (lignes 79-95)                  │
│  ➕ Anti-hallucination (lignes 97-118)                      │
│  ➕ Gestion erreurs (lignes 120-132)                        │
│  ➕ (Optionnel) toolCallInstructions.ts (params techniques) │
│                                                              │
│  Résultat : 1 gros texte injecté en PREMIER message         │
└─────────────────────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────────────────────┐
│  ÉTAPE 2 : APPEL GROK AVEC PARAMÈTRES                       │
│  Fichiers : stream/route.ts (température) + xai.ts (top-p) │
│                                                              │
│  messages = [                                                │
│    { role: 'system', content: [PROMPT CI-DESSUS] },        │
│    { role: 'user', content: "Cherche chat puis chien" }    │
│  ]                                                           │
│                                                              │
│  température = 0.55  (créativité modérée)                   │
│  top_p = 0.85        (filtre tokens peu probables)          │
└─────────────────────────────────────────────────────────────┘
  ↓
GROK génère réponse (peut halluciner)
  ↓
┌─────────────────────────────────────────────────────────────┐
│  ÉTAPE 3 : FILTRAGE POST-GÉNÉRATION                         │
│  Fichier : useChatHandlers.ts (lignes 79-106)              │
│                                                              │
│  SI multiple rounds de texte :                              │
│    → Garde UNIQUEMENT le dernier round (après tools)        │
│  SINON :                                                     │
│    → Garde tout                                              │
│                                                              │
│  Résultat : Hallucinations éliminées automatiquement        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 **TES 3 LEVIERS DE CONTRÔLE**

### **1️⃣ PROMPTING (Impact : ⭐⭐⭐⭐⭐)**

**Fichier :** `src/services/llm/SystemMessageBuilder.ts`  
**Lignes :** 79-132

**C'EST TON LEVIER PRINCIPAL !** Modifie ici pour changer le comportement.

#### **📍 Ligne 79-95 : Instructions Tool Calls**

**CODE ACTUEL :**
```typescript
content += `\n\n## Utilisation des Outils

RÈGLE IMPORTANTE : Avant d'appeler un outil, tu DOIS TOUJOURS :
1. Expliquer brièvement ce que tu vas faire
2. Puis appeler l'outil
3. Après résultat, commenter
`;
```

**🎨 EXEMPLES DE MODIFICATIONS :**

```typescript
// ✅ OPTION A : Forcer séquentiel STRICT (1 tool à la fois)
content += `\n\n## Utilisation des Outils - MODE SÉQUENTIEL STRICT

RÈGLE ABSOLUE : UN SEUL TOOL PAR MESSAGE !

Workflow :
1. Annonce : "Je vais utiliser [TOOL]..."
2. Appel : tool_call unique
3. STOP : N'écris RIEN après le tool_call
4. [Attente résultat...]
5. Commentaire : "J'ai obtenu..."
6. SI besoin autre tool → Retour en 1

❌ INTERDIT : 2+ tool_calls dans même message
❌ INTERDIT : Écrire du texte après un tool_call
✅ REQUIS : 1 tool = 1 message, puis SILENCE
`;

// ✅ OPTION B : Autoriser parallèle si indépendants
content += `\n\n## Utilisation des Outils - MODE INTELLIGENT

RÈGLE : Évalue les dépendances avant d'appeler !

PARALLÈLE autorisé si INDÉPENDANTS :
- Chercher image chat + image chien → OK simultané
- tool_calls: [search('cat'), search('dog')]

SÉQUENTIEL obligatoire si DÉPENDANTS :
- Chercher task puis modifier task → NON simultané
- 1. getTask → Attente → 2. updateTask(id_du_résultat)

TOUJOURS te demander :
"Le 2e tool a-t-il besoin du résultat du 1er ?"
→ OUI : Séquentiel
→ NON : Parallèle OK
`;

// ✅ OPTION C : Limiter nombre de tools
content += `\n\n## Utilisation des Outils - LIMITE 2 TOOLS MAX

RÈGLE : Maximum 2 tool_calls par message.

Si besoin de plus :
1. Appelle 2 premiers tools
2. Attends résultats
3. Explique ce que tu as obtenu
4. Appelle 2 suivants

Exemple :
Message 1 : search('cat'), search('dog')
[Résultats...]
Message 2 : "OK pour les animaux. Maintenant..."
Message 3 : search('lion'), search('tiger')
`;
```

---

#### **📍 Ligne 97-118 : Anti-Hallucination**

**CODE ACTUEL :**
```typescript
content += `
⚠️ ANTI-HALLUCINATION CRITIQUE ⚠️

RÈGLE ABSOLUE : N'invente JAMAIS de données avant résultat.

Comportement INTERDIT :
❌ "Je cherche... ![image](https://inventé.jpg)"

Comportement REQUIS :
✅ "Je cherche..." [tool_call] → ATTENDRE
✅ Après : "Obtenu : [URL réelle]"
`;
```

**🎨 RENFORCEMENTS POSSIBLES :**

```typescript
// Si hallucine SOUVENT des URLs
content += `
⚠️ ANTI-HALLUCINATION RENFORCÉE ⚠️

Tu ne connais AUCUNE URL par toi-même. ZÉRO.
TOUTE URL DOIT venir d'un tool result.

Workflow image STRICT :
1. "Je cherche une image de X"
2. [tool_call: get__search('X')]
3. === SILENCE COMPLET ===
4. [Résultat reçu: https://real.com/abc.jpg]
5. "Voici l'image : https://real.com/abc.jpg"

❌ JAMAIS inventer : https://pexels.com/photos/123
❌ JAMAIS deviner : "Voici probablement..."
✅ TOUJOURS copier exactement l'URL du résultat

AUTO-VÉRIFICATION :
Avant d'afficher une URL, demande-toi :
"Est-ce que cette URL vient d'un tool result ?"
→ NON : NE L'AFFICHE PAS
→ OUI : OK
`;

// Si hallucine des IDs/données API
content += `
⚠️ RÈGLE DONNÉES API ⚠️

Tu ne connais AUCUN ID, AUCUNE donnée externe.
TOUT doit venir des tools.

Exemples :
❌ "La tâche #12345 est terminée"
  → Tu ne connais pas #12345 !
✅ getTasks → Résultat contient task_id → "La tâche [task_id] est..."

❌ "Le classeur 'Projets' contient..."
  → Tu ne sais pas si ce classeur existe !
✅ listClasseurs → Résultat contient classeurs → "Le classeur X contient..."

PRINCIPE : Données externes = Toujours via tool AVANT d'en parler.
`;
```

---

### **2️⃣ PARAMÈTRES LLM (Impact : ⭐⭐⭐)**

#### **🌡️ Température**

**Fichier :** `src/app/api/chat/llm/stream/route.ts`  
**Ligne :** 155

```typescript
temperature: finalAgentConfig?.temperature || 0.55,
```

**AJUSTEMENTS SELON COMPORTEMENT :**

| Problème | Température actuelle | Nouveau essai |
|----------|----------------------|---------------|
| Trop d'hallucinations | 0.55 | **0.45** (plus strict) |
| Trop robotique | 0.55 | **0.65** (plus naturel) |
| Multi-tools chaotiques | 0.55 | **0.40** (très prévisible) |
| Parfait | 0.55 | Ne touche pas ! |

**Comment modifier :**
```typescript
// Test temporaire : Changer juste cette ligne
temperature: finalAgentConfig?.temperature || 0.45, // ← Plus strict

// OU si l'agent a une config en BDD :
// Va dans ta table 'agents' → Colonne 'temperature' → Modifie la valeur
```

---

#### **🎚️ Top-P (Nucleus Sampling)**

**Fichier :** `src/services/llm/providers/implementations/xai.ts`  
**Ligne :** 106

```typescript
topP: 0.85, // ✅ Réduit légèrement pour éviter hallucinations sporadiques
```

**AJUSTEMENTS :**

| Problème | Top-P actuel | Nouveau essai |
|----------|--------------|---------------|
| Hallucinations fréquentes | 0.85 | **0.80** (plus restrictif) |
| Réponses trop similaires | 0.85 | **0.90** (plus varié) |
| Sortrecords bizarres | 0.85 | **0.75** (très restrictif) |

**⚠️ ATTENTION :** Top-P + Température interagissent ! Modifie UN à la fois.

---

### **3️⃣ FILTRAGE POST-GÉNÉRATION (Impact : ⭐⭐⭐⭐)**

**Fichier :** `src/hooks/useChatHandlers.ts`  
**Lignes :** 79-106

**CODE ACTUEL :**
```typescript
if (streamTimeline && streamTimeline.items.length > 0) {
  const textEvents = streamTimeline.items.filter(item => item.type === 'text');
  const hasToolExecution = streamTimeline.items.some(item => item.type === 'tool_execution');
  
  if (hasToolExecution && textEvents.length > 1) {
    // Garde UNIQUEMENT le dernier round
    finalContent = textEvents[textEvents.length - 1].content;
  } else {
    // Garde tout
    finalContent = textEvents.map(event => event.content).join('');
  }
}
```

**C'EST LE FILET DE SÉCURITÉ FINAL !**

**MODIFICATIONS POSSIBLES :**

```typescript
// OPTION A : Filtrage plus agressif (garde que post-tools)
if (hasToolExecution) {
  // Trouve le dernier tool_execution
  const lastToolIndex = streamTimeline.items
    .map((item, idx) => item.type === 'tool_execution' ? idx : -1)
    .filter(idx => idx !== -1)
    .pop();
  
  // Garde UNIQUEMENT le texte APRÈS le dernier tool
  const textAfterTools = streamTimeline.items
    .filter((item, idx) => item.type === 'text' && idx > lastToolIndex!)
    .map(item => item.content)
    .join('');
  
  finalContent = textAfterTools;
  logger.info('[useChatHandlers] 🎯 Filtrage agressif : texte post-tools uniquement');
}

// OPTION B : Logging pour debugging
if (hasToolExecution && textEvents.length > 1) {
  logger.info('[useChatHandlers] ⚠️ HALLUCINATION DÉTECTÉE !', {
    roundsTotal: textEvents.length,
    round0Length: textEvents[0].content.length,
    round1Length: textEvents[textEvents.length - 1].content.length,
    hallucinatedContent: textEvents[0].content.substring(0, 200) + '...'
  });
  
  finalContent = textEvents[textEvents.length - 1].content;
}

// OPTION C : Whitelist (garde certains mots du round 0)
if (hasToolExecution && textEvents.length > 1) {
  const round0 = textEvents[0].content;
  const roundFinal = textEvents[textEvents.length - 1].content;
  
  // Garde début du round 0 (annonce) mais pas les hallucinations
  const announcement = round0.split('\n')[0]; // Première ligne seulement
  finalContent = announcement + '\n\n' + roundFinal;
}
```

---

## 🧪 **MÉTHODOLOGIE DE PEAUFINAGE**

### **1. Identifie le problème précis**

**Exemples :**
- ❌ "Ça marche pas bien" → Trop vague
- ✅ "Multi-tools : 2/10 hallucine des URLs avant tool execution"
- ✅ "Séquentiel : 3/10 appelle tools en parallèle au lieu de séquentiel"
- ✅ "Données API : 1/10 invente des task_id inexistants"

### **2. Choisis le levier adapté**

| Type de problème | Levier à utiliser |
|------------------|-------------------|
| **Hallucine des résultats** | 1. Renforce prompt anti-hallucination<br>2. Baisse température à 0.45 |
| **Trop de tools simultanés** | 1. Prompt : Force séquentiel strict<br>2. Limite "MAX 2 tools" |
| **Tools dans mauvais ordre** | 1. Prompt : Explique dépendances<br>2. Exemples concrets |
| **Oublie d'expliquer** | 1. Prompt : "OBLIGATOIRE : Explique avant" |
| **Continue après tool_call** | 1. Prompt : "STOP après tool_call" |

### **3. Modifie UN levier à la fois**

```
Test 1 : Prompt modifié, temp 0.55, top-p 0.85
  → Observe 10 essais
  → Note le taux de succès

Test 2 : Prompt original, temp 0.45, top-p 0.85
  → Observe 10 essais
  → Compare avec Test 1

Test 3 : Meilleur des 2 précédents + top-p 0.80
  → Observe 10 essais
  → Valide amélioration
```

### **4. Itère**

**Ne pas viser la perfection immédiate !**

- Objectif réaliste : **95% de succès** (vs 100% impossible avec LLMs)
- Acceptable : **1/20 échecs** sporadiques
- Le filtrage Timeline rattrape les échecs

---

## 📊 **CHECKLIST DE TESTS**

Teste ces scénarios après chaque modif :

```
☐ Tool call simple : "Cherche une image de chat"
  → 1 tool, 0 hallucination

☐ Multi-tools indépendants : "Cherche chat puis chien"
  → 2 tools, ordre OK, 0 hallucination

☐ Multi-tools dépendants : "Cherche task #123 puis modifie-la"
  → 2 tools séquentiels, utilise résultat du 1er

☐ Erreur tool : Appel API cassé
  → Gère erreur proprement, ne panique pas

☐ Pas de tool nécessaire : "Explique la gravité"
  → Répond sans tool

☐ Ambiguïté : "Trouve mes notes"
  → Appelle getNote OU demande clarification

☐ Multi-rounds : "Fais X, puis Y, puis Z"
  → Gère séquence complète sans halluciner
```

---

## 🎯 **RÉSUMÉ : TES 3 FICHIERS CLÉS**

```typescript
// 1️⃣ PROMPTING (ton contrôle principal)
src/services/llm/SystemMessageBuilder.ts
  → Lignes 79-132 : Modifie ici pour changer comportement

// 2️⃣ TEMPÉRATURE (ajustement fin)
src/app/api/chat/llm/stream/route.ts
  → Ligne 155 : temperature: 0.55 → Teste 0.45 ou 0.65

// 3️⃣ TOP-P (filtre probabilités)
src/services/llm/providers/implementations/xai.ts
  → Ligne 106 : topP: 0.85 → Teste 0.80 ou 0.90

// BONUS : Filtrage post-génération (filet de sécurité)
src/hooks/useChatHandlers.ts
  → Lignes 79-106 : Timeline filtering automatique
```

---

**Voilà chef ! Tu as maintenant TOUT pour prendre la main.** 🎯

**Commence par modifier le prompt (SystemMessageBuilder.ts lignes 79-132), c'est le plus efficace !**

