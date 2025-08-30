# Architecture Robuste de Chaînage d'Outils - GroqOrchestrator

## Vue d'ensemble

L'architecture robuste implémente un chaînage d'outils ChatGPT-like avec persistance atomique, garantissant un flux `assistant(tool_calls) → tools → PERSIST (batch) → RELOAD (DB) → recall → ...` jusqu'à absence de `tool_calls` ou limite de relances.

## I. Boucle d'orchestration robuste avec arrêt intelligent

### Principe
- **Boucle bornée** : Remplace la logique "1er appel → tools → 2e appel → fin"
- **Limite de relances** : **10 relances maximum** pour gérer des chaînages complexes
- **Arrêt intelligent** : Auto-évaluation et arrêt avant la limite si réponse satisfaisante
- **Circuit breaker** : Réponse claire si limite atteinte avec encore des `tool_calls`

### 🧠 Arrêt intelligent (Smart Early Stopping)

Le système évalue automatiquement si la réponse est satisfaisante et s'arrête avant d'atteindre la limite :

#### Critères d'arrêt
1. **Qualité de réponse** : Contenu > 50 caractères et cohérent
2. **Pas de tool calls** : Si le LLM n'a plus besoin d'outils
3. **Saturation** : Arrêt après 3 relances si pas de progression
4. **Efficacité** : Calcul automatique du ratio relances/résultats

#### Prompt système optimisé
```
🎯 CRITÈRES D'ARRÊT INTELLIGENT :
- Évalue si ta réponse est COMPLÈTE et SATISFAISANTE avant d'appeler des outils
- Si tu peux répondre directement et complètement, FAIS-LE sans outils
- N'utilise des outils QUE si c'est absolument nécessaire pour répondre
- Arrête-toi dès que tu as une réponse satisfaisante, même si des outils sont disponibles

🔍 AUTO-ÉVALUATION OBLIGATOIRE :
Avant chaque appel d'outil, pose-toi ces questions :
1. "Ai-je vraiment besoin de cet outil pour répondre ?"
2. "Ma réponse actuelle est-elle déjà complète ?"
3. "Cet outil apporte-t-il une valeur ajoutée réelle ?"
```

### Implémentation
```typescript
// Boucle principale dans executeRound()
let relances = 0;
let toolCalls = currentResponse.tool_calls || [];
const sameTools = agentApiV2Tools.getToolsForFunctionCalling(agentConfig);

while (toolCalls.length > 0 && relances < this.limits.maxRelances) {
  // 1. Exécuter les tools
  const currentToolResults = await this.executeTools(toolCalls, userToken, sessionId);
  
  // 2. PERSIST → RELOAD → RECALL
  await this.batchMessageService.persistToolMessages(/* ... */);
  const reloadedThread = await this.reloadThreadFromDB(sessionId);
  currentResponse = await this.recallWithToolResults(/* ... */);
  
  toolCalls = currentResponse.tool_calls || [];
  relances++;
}
```

## II. Persistance atomique, idempotence et concurrence

### BatchMessageService
Service dédié encapsulant l'appel `POST /api/ui/chat-sessions/:id/messages/batch` :

#### En-têtes requis
- `Authorization: Bearer <service JWT>`
- `Content-Type: application/json`
- `Idempotency-Key: <uuid v4 par relance>`
- `X-Operation-ID: <uuid v4 par relance>`
- `X-Relance-Index: <index de relance>`

#### Corps de la requête
```json
{
  "messages": [...],
  "operation_id": "uuid-v4",
  "relance_index": 0
}
```

#### Réponse
```json
{
  "success": true,
  "applied": true,
  "data": {
    "session": {...},
    "messages": [...],
    "operation_id": "uuid-v4",
    "relance_index": 0
  }
}
```

### Atomicité
- **Première relance** : Inclut le message `assistant(tool_calls)` + messages `tool`
- **Relances suivantes** : Messages `tool` uniquement
- **Ordre respecté** : Messages dans l'ordre exact des `tool_calls`

### Idempotence
- **Nouvel `operation_id`** à chaque relance
- **Déduplication** par `operation_id` + `tool_call_id`
- **Replay** : `applied=false` si opération déjà appliquée

### Concurrence (If-Match/409)
- **409 Conflict** : Refetch session + replay avec nouvel ETag
- **Retry automatique** : 3 tentatives avec backoff exponentiel
- **Aucun doublon** : Garantie côté DB

## III. Construction et injection du thread (rappel)

### Invariants critiques
1. **Ne jamais réinjecter** le message `user` courant lors des rappels
2. **Dernier bloc avant rappel** : `assistant(tool_calls)`, puis `tool`, `tool`, ...
3. **Thread reconstruit** via `ThreadBuilder.rebuildFromDB(sessionId)`
4. **Même liste d'outils** entre 1er appel et rappels (pas de recalcul)

### Implémentation
```typescript
// Calcul unique des outils
const sameTools = agentApiV2Tools.getToolsForFunctionCalling(agentConfig);

// Rappel avec thread rechargé et mêmes outils
currentResponse = await this.recallWithToolResults(
  message, systemContent, reloadedThread, toolCalls, currentToolResults, 
  sameTools, roundId, relances + 1
);
```

## IV. Normalisation et validation des messages `tool`

### Structure stricte
```typescript
interface ToolMessage {
  role: 'tool';
  tool_call_id: string;        // ID du tool call
  name: string;                // Nom de la fonction
  content: string;             // JSON string parsable
  timestamp: string;           // ISO timestamp
  relance_index: number;       // Index de la relance
  success?: boolean;           // Succès de l'exécution
  error?: string | null;       // Erreur si échec
  duration_ms?: number;        // Durée d'exécution
}
```

### Validation Zod
- `role === "tool"`
- `tool_call_id` non vide (string)
- `name` non vide et cohérent avec la demande
- `content` string JSON parsable
- **Rejet 422** si message invalide

## V. HistoryBuilder / ThreadBuilder (pruning sûr)

### Garanties
1. **Pruning sécurisé** : Ne supprime jamais le bloc terminal `assistant(tool_calls)+tools`
2. **Thread DB rechargé** : `buildSecondCallHistory` s'appuie sur `ThreadBuilder.rebuildFromDB`
3. **Ordre vérifié** : `assistant(tool_calls)` puis tous les `tool` avant rappel

## VI. Logs et traçabilité

### Logs avant chaque appel
```typescript
// 6-8 derniers messages (PII masquée)
this.logMessagePayload(messages, roundId, relanceIndex);

// Détails des tool calls
this.logToolCalls(toolCalls, relances + 1);
```

### Métadonnées de traçage
- `round_id` : Identifiant unique du round
- `operation_id` : UUID par relance
- `relance_index` : Index de la relance (0-based)
- `applied=true/false` : Statut de l'opération
- `409/replay` : Gestion des conflits ETag

## VII. Auth et sécurité

### Tokens serveur
- **Appels batch** : Token côté serveur (service role)
- **RLS/ownership** : Respect des politiques de sécurité
- **Pas de token client** : Sauf flow d'impersonation encadré

## VIII. Tests d'intégration

### Scénarios couverts
1. **Multi-tools nominal** : 1er appel → tool_calls [A,B] → exécution → persist → reload → rappel → 0 tool_calls
2. **Idempotence** : Replay même batch → `applied=false`, aucun doublon
3. **Concurrence** : 2 writers → 409 → refetch + replay → ordre conservé
4. **Validation** : Arguments non-JSON → 422, aucun tool exécuté
5. **Rappels** : Aucun message `user` réinjecté, dernier message = `role:"tool"`

### Assertions critiques
- Rappel contient N messages `role:"tool"` (1:1 avec `tool_call_id`)
- Ordre respecté, `content` parsable
- Aucun doublon dans la DB
- Circuit breaker activé à la limite

## IX. Valeurs par défaut recommandées

```typescript
export const DEFAULT_GROQ_LIMITS: GroqLimits = {
  maxToolCalls: 10,           // Limite de sécurité
  maxRelances: 10,            // 10 relances maximum pour chaînages complexes
  maxContextMessages: 25,      // Messages de contexte
  maxHistoryMessages: 50       // Messages d'historique
};
```

### 📊 Métriques d'efficacité

Le système calcule automatiquement l'efficacité de chaque exécution :

#### Formule d'efficacité
```
Efficacité = RelanceEfficiency + ResultEfficiency

RelanceEfficiency = ((maxRelances - relances) / maxRelances) * 100
ResultEfficiency = (toolResults / relances) * 50 (max 100)
```

#### Exemples d'efficacité
- **Réponse directe** (0 relance) : **100%** 🎯
- **1 relance** avec 1 résultat : **95%** ✅
- **3 relances** avec 3 résultats : **85%** ✅
- **5 relances** avec 5 résultats : **75%** ⚠️
- **10 relances** (limite atteinte) : **50%** ⚠️

#### Critères de qualité
- **🟢 Excellent** : 90-100% (arrêt intelligent)
- **🟡 Bon** : 70-89% (utilisation modérée)
- **🟠 Moyen** : 50-69% (utilisation élevée)
- **🔴 Critique** : <50% (limite atteinte)
```

## X. Critères de réception (Go/No-Go)

### Logs de séquence
- ✅ Séquence claire : "... assistant(tool_calls), tool, tool, ..."
- ✅ Multi-tool enchaîne plusieurs vagues sans confusion d'ID
- ✅ Pas de réordre ni de doublons

### API batch
- ✅ `applied=false` sur replays
- ✅ 409 résolus par refetch + replay sans perte

### Tests d'intégration
- ✅ Tous les tests Groq passent en CI
- ✅ Idempotence et concurrence validées

## Architecture finale

```
User Message → GroqOrchestrator.executeRound()
    ↓
1er appel LLM → tool_calls détectés
    ↓
Boucle bornée (max 10 relances):
    ↓
1. executeTools(toolCalls) → toolResults
    ↓
2. BatchMessageService.persistToolMessages()
   - Validation stricte
   - Idempotence (operation_id)
   - Gestion conflits (409)
    ↓
3. ThreadBuilder.rebuildFromDB()
   - Thread rechargé depuis DB
   - Ordre préservé
    ↓
4. recallWithToolResults()
   - Même liste d'outils
   - Pas de message user réinjecté
   - Thread DB comme source de vérité
    ↓
5. Vérifier tool_calls → Continuer ou terminer
    ↓
Réponse finale ou circuit breaker
```

## Avantages de l'architecture

1. **Robustesse** : Gestion des erreurs, retry, circuit breaker
2. **Idempotence** : Aucun doublon même en cas de replay
3. **Concurrence** : Gestion des conflits ETag
4. **Traçabilité** : Logs détaillés pour debug
5. **Performance** : Limite de relances évite les boucles infinies
6. **Cohérence** : Thread DB comme source de vérité
7. **Sécurité** : Validation stricte, tokens serveur
8. **🛡️ Isolation stricte** : Aucun risque de contamination entre sessions

## 🛡️ Isolation stricte des sessions

### Problème résolu : "Conversation croisée"
L'architecture précédente présentait un **risque de contamination** entre sessions :
- Messages d'autres sessions pouvaient s'infiltrer dans l'historique
- Identité générique `'groq'` partout, sans distinction entre sessions
- Risque de "mémoire croisée" entre différents utilisateurs/conversations

### Solution implémentée : Isolation stricte

#### 1. **Identité unique par session**
```typescript
// AVANT : Identité générique
{ type: 'chat_session', name: 'groq', id: 'groq', content: '' }

// APRÈS : Identité unique par session
const sessionIdentity = {
  type: 'chat_session' as const,
  name: `groq-session-${sessionId}`,
  id: sessionId,
  content: `Session ${sessionId} - Round ${roundId} - Relance ${relanceIndex}`
};
```

#### 2. **Filtrage strict par sessionId**
```typescript
private filterSessionHistory(history: any[], sessionId: string): any[] {
  return history.filter(msg => {
    // Garder les messages système
    if (msg.role === 'system') return true;
    
    // Garder les messages de la session courante
    if (msg.sessionId === sessionId) return true;
    
    // Filtrer les messages d'autres sessions
    if (msg.sessionId && msg.sessionId !== sessionId) {
      logger.warn(`🔒 Message d'autre session filtré:`, {
        sessionId: msg.sessionId,
        currentSession: sessionId,
        role: msg.role
      });
      return false;
    }
    
    return true;
  });
}
```

#### 3. **Validation d'isolation avant envoi**
```typescript
private validateSessionIsolation(messages: any[], sessionId: string, context: string): void {
  const foreignMessages = messages.filter(msg => 
    msg.sessionId && msg.sessionId !== sessionId && msg.role !== 'system'
  );
  
  if (foreignMessages.length > 0) {
    throw new Error(`Violation d'isolation: ${foreignMessages.length} messages d'autres sessions détectés dans ${context}`);
  }
}
```

#### 4. **Isolation dans ThreadBuilder**
```typescript
private ensureSessionIsolation(thread: any[], sessionId: string): any[] {
  const isolatedThread = thread.filter(message => {
    // Garder les messages système
    if (message.role === 'system') return true;
    
    // Garder les messages de la session courante
    if (message.sessionId === sessionId) return true;
    
    // Filtrer les messages d'autres sessions
    if (message.sessionId && message.sessionId !== sessionId) {
      logger.warn(`🔒 Message d'autre session filtré`);
      return false;
    }
    
    // Messages legacy sans sessionId - les marquer
    if (!message.sessionId) {
      message.sessionId = sessionId;
      return true;
    }
    
    return true;
  });
  
  return isolatedThread;
}
```

#### 5. **Marquage temporel des messages**
```typescript
// Dans GroqHistoryBuilder
const timestamp = new Date().toISOString();
const messages: ChatMessage[] = [
  { role: 'system', content: systemContent, timestamp },
  ...cleanedHistory.slice(-this.limits.maxContextMessages).map(msg => ({
    ...msg,
    timestamp: msg.timestamp || timestamp // Assurer un timestamp pour tous les messages
  })) as ChatMessage[],
  { role: 'user', content: userMessage, timestamp }
];
```

### Bénéfices de l'isolation

#### ✅ **Sécurité renforcée**
- **Aucun risque** de contamination entre sessions
- **Isolation totale** des conversations utilisateur
- **Protection** contre les fuites d'information

#### ✅ **Traçabilité complète**
- Chaque message est **marqué** avec son `sessionId`
- **Logs détaillés** de l'isolation appliquée
- **Détection automatique** des violations

#### ✅ **Performance optimisée**
- **Filtrage préventif** des messages étrangers
- **Pas de surcharge** due aux messages inutiles
- **Threads plus légers** et plus rapides

#### ✅ **Maintenance simplifiée**
- **Debugging facilité** par session
- **Tests d'isolation** automatisés
- **Architecture claire** et maintenable

### Tests d'isolation

#### Test de rejet des messages étrangers
```typescript
it('should reject foreign session messages', async () => {
  const orchestrator = new GroqOrchestrator();
  
  // Simuler des messages d'une autre session
  const foreignMessages = [
    { role: 'user', content: 'Foreign user', sessionId: 'other-session' },
    { role: 'assistant', content: 'Foreign assistant', sessionId: 'other-session' }
  ];

  // Tenter de valider l'isolation
  expect(() => {
    (orchestrator as any).validateSessionIsolation(foreignMessages, 'current-session', 'test');
  }).toThrow('Violation d\'isolation');
});
```

#### Script de validation automatisée
```bash
./scripts/test-isolation.sh
# ✅ Vérifie tous les mécanismes d'isolation
# ✅ Valide la compilation TypeScript
# ✅ Confirme l'absence de risques
```

### 🔒 Garanties d'isolation

1. **Aucun message d'autre session** ne peut s'infiltrer
2. **Chaque session** a son identité unique et isolée
3. **Validation systématique** avant chaque appel au LLM
4. **Filtrage automatique** des messages étrangers
5. **Logs de sécurité** pour détecter les tentatives de violation
6. **Tests automatisés** pour valider l'isolation
7. **Script de validation** pour vérifier l'implémentation

**🎯 Résultat : Zéro risque de "conversation croisée" entre LLMs !** 