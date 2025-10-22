# 🎨 PROMPTS TOOL CALLS - PRÊTS À TESTER

**Usage :** Copie-colle ces prompts dans `SystemMessageBuilder.ts` (lignes 79-132)  
**But :** Tester différentes stratégies pour réduire hallucinations/bugs

---

## 🔥 **PROMPT ACTUEL (BASELINE)**

**Fichier :** `src/services/llm/SystemMessageBuilder.ts` lignes 79-132  
**Performance :** ~90-95% succès (hallucinations sporadiques)

```typescript
content += `\n\n## Utilisation des Outils

RÈGLE IMPORTANTE : Avant d'appeler un outil, tu DOIS TOUJOURS :
1. Expliquer brièvement ce que tu vas faire
2. Puis appeler l'outil
3. Après résultat, commenter

⚠️ ANTI-HALLUCINATION CRITIQUE ⚠️

RÈGLE ABSOLUE : N'invente JAMAIS de données avant résultat.

Comportement INTERDIT :
❌ "Je cherche... ![image](https://inventé.jpg)"

Comportement REQUIS :
✅ "Je cherche..." [tool_call] → ATTENDRE
✅ Après : "Obtenu : [URL réelle]"

Si plusieurs outils séquentiels :
1. Appelle le PREMIER UNIQUEMENT
2. ATTENDS résultat
3. Commente
4. Appelle le SECOND
`;
```

---

## 💪 **PROMPT A : ULTRA-STRICT (Zéro tolérance)**

**Quand utiliser :** Beaucoup d'hallucinations, bugs fréquents  
**Trade-off :** Peut être trop verbeux

```typescript
content += `\n\n## 🛠️ UTILISATION DES OUTILS - MODE ULTRA-STRICT

### RÈGLE #1 : UN OUTIL À LA FOIS, TOUJOURS

Workflow OBLIGATOIRE :
1. Annonce : "Je vais utiliser [NOM_TOOL] pour [RAISON]"
2. Tool call : UN SEUL tool_call
3. === ARRÊT IMMÉDIAT === Ne génère AUCUN texte supplémentaire
4. [Attente résultat...]
5. Analyse : "J'ai obtenu : [RÉSULTAT_RÉEL]"
6. Si besoin autre tool : Retour en étape 1

❌ STRICTEMENT INTERDIT :
- Appeler 2+ tools dans même message
- Écrire du texte après un tool_call
- Continuer la conversation sans le résultat
- Inventer, deviner, prédire un résultat

✅ STRICTEMENT REQUIS :
- 1 message = 1 tool maximum
- SILENCE après tool_call
- Attendre le résultat avant TOUT commentaire

### RÈGLE #2 : ANTI-HALLUCINATION ABSOLUE

Tu es UN ROBOT. Tu ne connais RIEN par toi-même.
TOUTE information externe DOIT venir d'un tool.

AUTO-VÉRIFICATION AVANT CHAQUE AFFICHAGE :
- URL d'image ? → Vient d'un tool result ? Si NON → NE PAS AFFICHER
- ID (task, note, etc.) ? → Vient d'un tool result ? Si NON → NE PAS MENTIONNER
- Données API ? → Vient d'un tool result ? Si NON → NE PAS UTILISER

Exemple CORRECT :
1. User : "Cherche un chat"
2. Assistant : "Je vais utiliser get__search avec query='cat'"
3. [tool_call: get__search]
4. === SILENCE ===
5. [Résultat : https://pexels.com/photos/12345.jpg]
6. Assistant : "Voici l'image : https://pexels.com/photos/12345.jpg"

Exemple INTERDIT :
1. User : "Cherche un chat"
2. Assistant : "Je cherche... ![chat](https://example.com/123.jpg) ← INVENTÉ !
   Maintenant un chien..."

### RÈGLE #3 : GESTION D'ERREURS

Si un tool échoue :
1. Explique calmement : "L'outil X a échoué : [raison]"
2. Propose alternative : "Je vais essayer Y à la place"
3. OU demande aide : "Peux-tu préciser... ?"

NE JAMAIS abandonner silencieusement.
`;
```

---

## ⚖️ **PROMPT B : ÉQUILIBRÉ (Intelligent)**

**Quand utiliser :** Hallucinations occasionnelles, veut performance  
**Trade-off :** Permet parallèle si safe

```typescript
content += `\n\n## 🛠️ UTILISATION DES OUTILS - MODE INTELLIGENT

### RÈGLE : ÉVALUE LES DÉPENDANCES AVANT D'AGIR

**PARALLÈLE autorisé si INDÉPENDANTS :**
- Chercher chat + chien : Résultats indépendants → OK simultané
- tool_calls: [search('cat'), search('dog')]

**SÉQUENTIEL obligatoire si DÉPENDANTS :**
- Chercher task puis modifier : Le 2e dépend du 1er → Séquentiel
- 1. getTask → Attente → 2. updateTask(result.id)

**AUTO-ÉVALUATION (AVANT CHAQUE TOOL) :**
"Le tool #2 a-t-il besoin du résultat du tool #1 ?"
→ OUI : Appelle #1 seul, attends, puis #2
→ NON : Appelle #1 et #2 simultanément (OK)

### ANTI-HALLUCINATION RENFORCÉE

Tu ne connais AUCUNE URL, AUCUN ID, AUCUNE donnée externe.

**Workflow image :**
1. "Je cherche [SUJET]"
2. [tool_call: search]
3. === ATTENTE ===
4. Résultat reçu
5. "Voici : [URL_DU_RÉSULTAT]"

**Vérification automatique :**
Avant d'afficher une URL/ID/donnée :
→ "Est-ce dans un tool result ?"
→ NON : Ne l'affiche PAS, appelle un tool d'abord
→ OUI : OK, utilise-la

### LIMITE : MAX 3 TOOLS PAR MESSAGE

Si besoin de plus :
- Appelle 3 premiers
- Explique résultats
- Appelle 3 suivants dans nouveau message
`;
```

---

## 🎈 **PROMPT C : PERMISSIF (Performance max)**

**Quand utiliser :** Peu d'hallucinations, veut vitesse  
**Trade-off :** Autorise plus de liberté (risque +)

```typescript
content += `\n\n## 🛠️ UTILISATION DES OUTILS - MODE PERFORMANCE

### RÈGLE : OPTIMISE LE NOMBRE DE MESSAGES

**PARALLÈLE encouragé si safe :**
- Plusieurs recherches indépendantes → Appelle en parallèle
- Plusieurs créations sans dépendance → OK simultané

**SÉQUENTIEL si dépendances :**
- Résultat du tool #1 requis pour #2 → Séquentiel

**LIBERTÉ :**
- Jusqu'à 5 tools par message si indépendants
- Explique ton plan AVANT les tools
- Commente les résultats APRÈS

### ANTI-HALLUCINATION

N'invente PAS de données externes.

URLs, IDs, données API → TOUJOURS depuis tool results.

Si tenté d'afficher une donnée :
→ "Ai-je cette donnée via un tool result ?"
→ NON : Appelle tool d'abord
→ OUI : Utilise-la
`;
```

---

## 🧪 **PROMPTS SPÉCIALISÉS (PROBLÈMES SPÉCIFIQUES)**

### **🖼️ PROMPT SPÉCIAL IMAGES** (Si hallucine URLs)

```typescript
content += `\n\n## 🖼️ RÈGLES SPÉCIALES IMAGES

Tu ne connais AUCUNE URL d'image. ZÉRO.

Workflow STRICT :
1. User demande image de X
2. Assistant : "Je cherche une image de X sur Pexels"
3. [tool_call: get__search('X')]
4. === SILENCE TOTAL === (N'écris RIEN après le tool_call)
5. [Résultat: {"photos": [{"src": {"large": "https://real.com/abc.jpg"}}]}]
6. Assistant : "Voici l'image de X : ![X](https://real.com/abc.jpg)"

VÉRIFICATION AUTOMATIQUE :
Avant d'écrire ![...](URL) :
→ "Cette URL vient-elle du tool result ?"
→ OUI : OK
→ NON : STOP, n'affiche PAS, appelle tool d'abord

❌ JAMAIS inventer : https://pexels.com/photos/123456
❌ JAMAIS deviner : "Voici probablement une image..."
✅ TOUJOURS copier l'URL exacte du résultat
`;
```

---

### **📋 PROMPT SPÉCIAL DONNÉES API** (Si invente IDs)

```typescript
content += `\n\n## 📋 RÈGLES SPÉCIALES DONNÉES API

Tu ne connais AUCUN ID, AUCUNE donnée externe.

Exemples INTERDITS :
❌ "La tâche #12345 est terminée" → Tu ne connais pas #12345 !
❌ "Le classeur 'Projets' contient..." → Tu ne sais pas s'il existe !
❌ "L'utilisateur a 5 notes" → Tu ne connais pas le nombre !

Exemples REQUIS :
✅ User : "Modifie la tâche #12345"
    Assistant : [getTask(12345)] → Résultat → "La tâche '[nom]' modifiée"

✅ User : "Combien de notes ?"
    Assistant : [listNotes] → Résultat → "Tu as [count] notes"

PRINCIPE : Données externes = Tool AVANT de parler.
`;
```

---

### **🔄 PROMPT SPÉCIAL MULTI-ROUNDS** (Si bug séquentiel)

```typescript
content += `\n\n## 🔄 RÈGLES MULTI-ROUNDS SÉQUENTIELS

Si User demande plusieurs actions séquentielles :

Workflow :
1. Identifie les étapes : "Je vais faire A, puis B, puis C"
2. Exécute A : [tool_call_A]
3. === STOP ===
4. Résultat A reçu
5. Commente A : "A terminé, résultat : ..."
6. Exécute B : [tool_call_B]
7. === STOP ===
8. Résultat B reçu
9. Commente B : "B terminé..."
10. Continue jusqu'à C

❌ JAMAIS : [tool_A, tool_B, tool_C] simultané si dépendants
✅ TOUJOURS : tool_A → attente → tool_B → attente → tool_C

EXCEPTION : Si A, B, C totalement indépendants → Parallèle OK
`;
```

---

## 🎚️ **AJUSTEMENTS TEMPÉRATURE & TOP-P**

### **Température (stream/route.ts ligne 155)**

```typescript
// ACTUEL
temperature: finalAgentConfig?.temperature || 0.55,

// TEST 1 : Plus strict (moins hallucinations, moins naturel)
temperature: finalAgentConfig?.temperature || 0.45,

// TEST 2 : Plus créatif (plus naturel, plus hallucinations)
temperature: finalAgentConfig?.temperature || 0.65,

// TEST 3 : Très strict (mode robot)
temperature: finalAgentConfig?.temperature || 0.35,
```

**🎯 RECOMMANDATIONS :**

| Taux hallucination actuel | Nouvelle temp |
|---------------------------|---------------|
| >20% (fréquent) | **0.40** |
| 10-20% (occasionnel) | **0.50** |
| 5-10% (rare) | **0.55** ← Actuel |
| <5% (très rare) | **0.60** (+ naturel) |

---

### **Top-P (xai.ts ligne 106)**

```typescript
// ACTUEL
topP: 0.85,

// TEST 1 : Plus restrictif (moins hallucinations)
topP: 0.80,

// TEST 2 : Très restrictif (mode déterministe)
topP: 0.75,

// TEST 3 : Plus permissif (plus varié)
topP: 0.90,
```

**🎯 RECOMMANDATIONS :**

| Symptôme | Action |
|----------|--------|
| Invente URLs/IDs bizarres | `topP: 0.75` (très restrictif) |
| Répétitions mot pour mot | `topP: 0.90` (plus varié) |
| Tokens improbables ("licorne" au lieu de "chat") | `topP: 0.80` |

---

## 🧪 **PROTOCOLE DE TEST**

### **1. Baseline (état actuel)**

Fais **10 tests** avec le même prompt :  
"Cherche une image de chien, puis une image de chat"

**Note :**
- Combien d'hallucinations ? ___/10
- Combien de bugs ordre ? ___/10
- Combien parfaits ? ___/10

---

### **2. Test Prompt Ultra-Strict**

**Modification :**
```typescript
// Dans SystemMessageBuilder.ts ligne 79
// Remplace le bloc complet par PROMPT A (ci-dessus)
```

**Teste 10 fois :**
- Hallucinations ? ___/10
- Trop verbeux ? ___/10
- Parfaits ? ___/10

---

### **3. Test Température 0.45**

**Modification :**
```typescript
// Dans stream/route.ts ligne 155
temperature: finalAgentConfig?.temperature || 0.45,
```

**Teste 10 fois :**
- Hallucinations ? ___/10
- Trop robotique ? ___/10
- Parfaits ? ___/10

---

### **4. Combinaison optimale**

**Teste :**
- Meilleur prompt (A, B ou C)
- Meilleure température (0.45, 0.55 ou 0.65)
- Meilleur top-p (0.75, 0.85 ou 0.90)

**Objectif :** >95% succès sur 20 tests

---

## 🎯 **EXEMPLES CONCRETS DE MODIFICATIONS**

### **Problème : "Hallucine souvent des URLs d'images avant tool execution"**

**Solution 1 : Renforce prompt**
```typescript
content += `
⚠️ RÈGLE ABSOLUE IMAGES ⚠️

Tu ne connais AUCUNE URL d'image.
TOUTE URL DOIT venir d'un tool.

AVANT d'afficher ![...](URL) :
→ "Cette URL est dans un tool result ?"
→ NON : NE PAS AFFICHER
→ OUI : Affiche

WORKFLOW :
1. "Je cherche X"
2. [tool_call]
3. === SILENCE ===
4. Résultat
5. "Voici X : ![...](URL_DU_RÉSULTAT)"

PAS DE PRÉDICTION. PAS DE DEVINETTE. PAS D'INVENTION.
`;
```

**Solution 2 : Baisse température**
```typescript
temperature: 0.40, // Plus déterministe
```

**Solution 3 : Combinaison**
- Prompt renforcé + température 0.45 + top-p 0.80

---

### **Problème : "Appelle 5 tools en même temps au lieu de séquentiel"**

**Solution 1 : Limite dans prompt**
```typescript
content += `
LIMITE STRICTE : MAXIMUM 2 TOOLS PAR MESSAGE

Si besoin de plus :
1. Appelle 2 premiers
2. Explique résultats
3. Appelle 2 suivants dans nouveau message

❌ INTERDIT : [tool1, tool2, tool3, tool4, tool5]
✅ REQUIS : Message 1: [tool1, tool2] → Message 2: [tool3, tool4]
`;
```

**Solution 2 : Force séquentiel**
```typescript
content += `
RÈGLE : UN SEUL TOOL PAR MESSAGE

Jamais de parallèle. Toujours séquentiel.

Multi-actions = Multi-messages.
`;
```

---

### **Problème : "Oublie d'expliquer ce qu'il fait"**

**Solution : Rends obligatoire**
```typescript
content += `
OBLIGATOIRE : EXPLIQUE AVANT CHAQUE TOOL

Format REQUIS :
"Je vais [ACTION] en utilisant [TOOL] parce que [RAISON]."
[tool_call]

❌ INTERDIT : Tool call sans explication
✅ EXEMPLE : "Je vais chercher une image de chat avec get__search car..."
`;
```

---

## 📊 **MATRICE DE DÉCISION RAPIDE**

| Bug observé | Levier #1 (Prompt) | Levier #2 (Temp) | Levier #3 (Top-P) |
|-------------|-------------------|------------------|-------------------|
| **Hallucine URLs/IDs** | Prompt Ultra-Strict | **0.45** | **0.80** |
| **Trop de tools simultanés** | Limite "MAX 2" | 0.55 | 0.85 |
| **Ordre aléatoire** | Force "SÉQUENTIEL STRICT" | **0.40** | **0.75** |
| **Oublie expliquer** | "OBLIGATOIRE : Explique" | 0.55 | 0.85 |
| **Continue après tool** | "STOP après tool_call" | **0.45** | 0.85 |

---

## 🔥 **MON PROMPT RECOMMANDÉ (OPTIMAL)**

**Basé sur tes bugs actuels (hallucinations sporadiques) :**

```typescript
content += `\n\n## 🛠️ UTILISATION DES OUTILS

### WORKFLOW STANDARD

1. **Annonce** : "Je vais utiliser [TOOL] pour [RAISON]"
2. **Appel** : tool_call (max 2 si indépendants, 1 sinon)
3. **Silence** : N'écris RIEN après le tool_call
4. **Résultat reçu** (automatique)
5. **Analyse** : "J'ai obtenu : [RÉSULTAT_RÉEL]"

### ⚠️ ANTI-HALLUCINATION

Tu ne connais AUCUNE donnée externe.
URLs, IDs, infos API → TOUJOURS via tool results.

**AUTO-CHECK avant CHAQUE affichage :**
- "Cette info vient d'un tool result ?"
- NON → Ne l'affiche PAS
- OUI → OK

**Séquentiel si dépendants :**
Tool #2 utilise résultat #1 ? → Appelle #1 seul, attends, puis #2

### LIMITE : MAX 3 TOOLS/MESSAGE

Au-delà → Découpe en plusieurs messages.
`;
```

**Avec paramètres :**
```typescript
// stream/route.ts ligne 155
temperature: 0.50, // Légèrement plus strict

// xai.ts ligne 106
topP: 0.82, // Entre 0.80 et 0.85
```

**Résultat attendu :** 95-98% succès

---

## 🎯 **COMMENT APPLIQUER**

### **1. Modifier le prompt**

**Fichier :** `src/services/llm/SystemMessageBuilder.ts`  
**Lignes :** 79-132

```typescript
// Trouve cette section :
content += `\n\n## Utilisation des Outils
...
`;

// Remplace TOUT le bloc par un des prompts ci-dessus (A, B, C ou Recommandé)
```

### **2. Modifier température**

**Fichier :** `src/app/api/chat/llm/stream/route.ts`  
**Ligne :** 155

```typescript
temperature: finalAgentConfig?.temperature || 0.50, // ← Change cette valeur
```

### **3. Modifier top-p**

**Fichier :** `src/services/llm/providers/implementations/xai.ts`  
**Ligne :** 106

```typescript
topP: 0.82, // ← Change cette valeur
```

### **4. Relance serveur**

```bash
# Kill le serveur actuel
lsof -ti:3001 | xargs kill -9

# Relance
npm run dev
```

### **5. Teste 10 fois**

Même prompt : "Cherche une image de chien, puis une image de chat"

**Note les résultats** pour comparer !

---

## 📈 **MONITORING DES AMÉLIORATIONS**

Crée un fichier `TESTS-TOOL-CALLS.md` :

```markdown
# Tests Tool Calls

## Baseline (Temp 0.55, Top-P 0.85, Prompt actuel)
- Test 1 : ✅ Parfait
- Test 2 : ❌ Hallucination URL chien
- Test 3 : ✅ Parfait
- Test 4 : ✅ Parfait
- Test 5 : ❌ Ordre inversé
- Test 6-10 : ✅✅✅✅✅
**Succès : 8/10 (80%)**

## Test A (Temp 0.45, Top-P 0.80, Prompt Ultra-Strict)
- Test 1-10 : ✅✅✅✅✅✅✅✅✅❌
**Succès : 9/10 (90%)** ← Amélioration !

## Test B (Temp 0.50, Top-P 0.82, Prompt Recommandé)
- Test 1-10 : ✅✅✅✅✅✅✅✅✅✅
**Succès : 10/10 (100%)** ← PARFAIT ! 🎯
```

---

## 🎊 **TL;DR : PAR OÙ COMMENCER ?**

### **Si tu veux un impact IMMÉDIAT :**

1. **Ouvre** : `src/services/llm/SystemMessageBuilder.ts`
2. **Va à** : Ligne 79
3. **Remplace** : Le bloc "## Utilisation des Outils" par **PROMPT RECOMMANDÉ** (ci-dessus)
4. **Teste** : 10 fois avec "chien puis chat"
5. **Compare** : Avant vs Après

### **Si tu veux être scientifique :**

1. Note le taux actuel (baseline)
2. Teste Prompt A (Ultra-Strict)
3. Teste Température 0.45
4. Teste Top-P 0.80
5. Combine les meilleurs
6. Valide sur 20 tests

---

**C'est tout ! Tu as maintenant les clés pour MAÎTRISER le système.** 🔥

**Commence par le prompt (SystemMessageBuilder.ts), c'est le + efficace !** ⭐

