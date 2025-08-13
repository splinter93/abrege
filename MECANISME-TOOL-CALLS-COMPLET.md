# 🔧 Mécanisme Complet des Tool Calls - Projet Abrège

## 🎯 Vue d'ensemble

Le système de tool calls dans Abrège permet au LLM d'exécuter des actions concrètes (créer des notes, dossiers, etc.) en interagissant avec l'API v2. Ce document explique le fonctionnement complet du mécanisme d'injection et de gestion des tool calls.

---

## 🔄 **ARCHITECTURE GÉNÉRALE**

### **📊 Flux complet :**
```
1. User Input → 2. LLM avec Tools → 3. Tool Calls détectés → 4. Exécution des Tools → 5. Injection dans l'historique → 6. Relance du LLM → 7. Réponse finale
```

---

## 🔧 **COMPOSANTS PRINCIPAUX**

### **1. ToolCallManager (`src/services/llm/toolCallManager.ts`)**
- **Rôle** : Gestion centralisée de l'exécution des tool calls
- **Fonctionnalités** :
  - Anti-boucle infinie (TTL 30s + IDs uniques)
  - Gestion des timeouts (15s max)
  - Normalisation des résultats
  - Historique d'exécution pour supervision

```typescript
export class ToolCallManager {
  // 🔧 Anti-boucle 1: IDs de tool_call déjà exécutés
  private executedCallIds: Set<string> = new Set();
  
  // 🔧 Anti-boucle 2: Signatures récentes (nom+arguments)
  private recentSignatureTimestamps: Map<string, { ts: number; batchId?: string }> = new Map();
  
  async executeToolCall(toolCall: any, userToken: string): Promise<ToolCallResult> {
    // Vérifications anti-boucle
    // Exécution avec timeout
    // Normalisation du résultat
  }
}
```

### **2. AgentApiV2Tools (`src/services/agentApiV2Tools.ts`)**
- **Rôle** : Exécution concrète des outils (créer note, dossier, etc.)
- **Fonctionnalités** :
  - Mapping des noms d'outils vers les fonctions
  - Gestion des paramètres et validation
  - Extraction du userId depuis le JWT
  - Gestion des erreurs et timeouts

### **3. GroqGptOss120b Handler (`src/services/llm/groqGptOss120b.ts`)**
- **Rôle** : Orchestration complète du processus de tool calls
- **Fonctionnalités** :
  - Détection des tool calls dans la réponse LLM
  - Exécution séquentielle des tools
  - Construction de l'historique enrichi
  - Relance automatique du LLM

---

## 📋 **FORMAT DES MESSAGES INJECTÉS**

### **📝 Message Assistant avec Tool Call :**
```json
{
  "role": "assistant",
  "content": null,
  "tool_calls": [{
    "id": "call_1234567890",
    "type": "function",
    "function": {
      "name": "create_note",
      "arguments": "{\"source_title\":\"Ma note\",\"notebook_id\":\"classeur-123\"}"
    }
  }],
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### **🔧 Message Tool avec Résultat :**
```json
{
  "role": "tool",
  "tool_call_id": "call_1234567890",
  "name": "create_note",
  "content": "{\"success\":true,\"note\":{\"id\":\"note-456\",\"title\":\"Ma note\"}}",
  "timestamp": "2024-01-01T12:00:01.000Z"
}
```

---

## 🔄 **PROCESSUS D'EXÉCUTION DÉTAILLÉ**

### **Étape 1 : Détection des Tool Calls**
```typescript
// Dans groqGptOss120b.ts
if (toolCalls.length > 0) {
  // 🔧 LIMITE DE SÉCURITÉ: Maximum 10 tool calls par appel
  if (toolCalls.length > 10) {
    toolCalls.splice(10); // Garder seulement les 10 premiers
  }
  
  logger.info(`[Groq OSS] 🔧 EXÉCUTION DES TOOL CALLS (${toolCalls.length} tools)...`);
}
```

### **Étape 2 : Dédouplification et Exécution**
```typescript
// 🔧 DÉDOUPLICATION DANS LE BATCH: éviter d'exécuter deux fois le même tool
const seenBatchSignatures = new Set<string>();
const makeSignature = (tc: any) => {
  const argsObj = typeof tc.function?.arguments === 'string' ? 
    JSON.parse(tc.function?.arguments) : (tc.function?.arguments || {});
  const sorted = Object.keys(argsObj).sort().reduce((acc: any, k: string) => { 
    acc[k] = argsObj[k]; return acc; 
  }, {});
  return `${tc.function?.name || 'unknown'}::${JSON.stringify(sorted)}`;
};

// 🔧 EXÉCUTION SÉQUENTIELLE DES TOOLS
const batchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
for (let i = 0; i < toolCalls.length; i++) {
  const toolCall = toolCalls[i];
  const sig = makeSignature(toolCall);
  
  if (seenBatchSignatures.has(sig)) {
    // Ignorer les doublons
    continue;
  }
  seenBatchSignatures.add(sig);
  
  // Exécuter le tool
  const result = await toolCallManager.executeToolCall(toolCall, userToken, 3, { batchId });
  toolResults.push(result);
}
```

### **Étape 3 : Construction de l'Historique Enrichi**
```typescript
// 🔧 CORRECTION: Construire l'historique dans le bon ordre
const relanceMessages = [
  { role: 'system' as const, content: systemContent },
  // Style de réponse post-tools
  { role: 'system' as const, content: postToolsStyleSystem },
  ...mappedHistoryForRelance,
  // Message utilisateur qui a déclenché les tool calls
  { role: 'user' as const, content: message },
  // Message assistant contenant les tool_calls retournés par le modèle
  { role: 'assistant' as const, content: '', tool_calls: toolCalls },
  // Messages tool correspondant aux résultats exécutés
  ...toolResults.map(result => ({
    role: 'tool' as const,
    tool_call_id: result.tool_call_id,
    name: result.name,
    content: JSON.stringify(result.result),
    timestamp: new Date().toISOString()
  }))
];
```

### **Étape 4 : Relance du LLM (SANS Tools)**
```typescript
const relancePayload = {
  model: config.model,
  messages: relanceMessages,
  stream: false,
  temperature: 0.2, // Plus déterministe pour la relance
  max_completion_tokens: config.max_tokens,
  top_p: config.top_p,
  // 🔧 ANTI-BOUCLE: Pas de tools pour la relance
  tools: [],
  tool_choice: 'none' as const
};
```

---

## 🛡️ **MÉCANISMES DE SÉCURITÉ**

### **1. Anti-Boucle Infinie**
```typescript
// 🔧 ANTI-BOUCLE: Empêcher la ré-exécution du même tool_call_id
if (this.executedCallIds.has(id)) {
  return {
    success: false,
    error: 'Tool call déjà exécuté - anti-boucle',
    code: 'ANTI_LOOP_ID'
  };
}

// 🔧 ANTI-BOUCLE (TTL 30s): Empêcher la ré-exécution immédiate
const signature = this.buildSignature(func.name, func.arguments);
const now = Date.now();
const last = this.recentSignatureTimestamps.get(signature);
const TTL_MS = 30_000;

if (last && (now - last.ts < TTL_MS)) {
  return {
    success: false,
    error: 'Signature exécutée très récemment (<30s)',
    code: 'ANTI_LOOP_SIGNATURE'
  };
}
```

### **2. Limites de Sécurité**
- **Maximum 10 tool calls** par appel LLM
- **Timeout de 15 secondes** par tool call
- **Historique limité à 200 entrées** dans le ToolCallManager
- **TTL de 5 minutes** pour les IDs exécutés

### **3. Désactivation des Tools lors de la Relance**
```typescript
// 🔧 ANTI-BOUCLE: Pas de tools lors de la relance
tools: [],
tool_choice: 'none' as const
```

---

## 💾 **PERSISTANCE DANS L'HISTORIQUE**

### **1. Store Zustand (`useChatStore`)**
```typescript
addMessage: async (message: Omit<ChatMessage, 'id'>, options?: { persist?: boolean; updateExisting?: boolean }) => {
  // 🔧 ANTI-DUPLICATION: Vérifier si le message existe déjà
  if (options?.updateExisting) {
    const existingIndex = findExistingMessage(message);
    if (existingIndex >= 0) {
      updateExistingMessage(existingIndex, message);
      return;
    }
  }
  
  // Créer un nouveau message avec gestion de l'historique
  const messageWithId = createMessageWithId(message);
  const updatedThread = applyHistoryLimit([...currentSession.thread, messageWithId]);
  
  // Sauvegarder en DB directement
  if (options?.persist !== false) {
    await saveMessageToDB(currentSession.id, message);
  }
}
```

### **2. Service de Synchronisation (`SessionSyncService`)**
- **Rôle** : Synchronisation bidirectionnelle entre le store et la base de données
- **Fonctionnalités** :
  - Conversion des formats de messages
  - Support des tool_calls et tool_call_id
  - Gestion des sessions et de l'historique

### **3. Base de Données**
- **Table** : `chat_messages`
- **Champs** : `role`, `content`, `tool_calls`, `tool_call_id`, `name`, `timestamp`
- **Index** : Sur `session_id`, `timestamp`, `role`

---

## 🔍 **DÉBOGAGE ET SUPERVISION**

### **1. Logs Détaillés**
```typescript
logger.info(`[Groq OSS] 🔄 STRUCTURE DE LA RELANCE:`);
logger.info(`[Groq OSS]    1. System: ${systemContent.substring(0, 100)}...`);
logger.info(`[Groq OSS]    2. Historique: ${sanitizedHistory.length} messages`);
logger.info(`[Groq OSS]    3. Message utilisateur: ${message.substring(0, 100)}...`);
logger.info(`[Groq OSS]    4. Assistant tool_calls: ${toolCalls.length}`);
logger.info(`[Groq Oss]    5. Résultats tools: ${toolResults.length} résultats`);
```

### **2. Métriques de Performance**
- **Temps d'exécution** de chaque tool
- **Taux de succès** des tool calls
- **Taille de l'historique** d'exécution
- **Détection des boucles** et anomalies

### **3. Gestion des Erreurs**
```typescript
try {
  const result = await toolCallManager.executeToolCall(toolCall, userToken, 3, { batchId });
  toolResults.push(result);
} catch (err) {
  const fallbackResult = {
    tool_call_id: toolCall.id,
    name: toolCall.function?.name || 'unknown',
    result: { 
      success: false, 
      error: 'Erreur ToolCallManager',
      code: 'TOOL_MANAGER_ERROR'
    },
    success: false
  };
  toolResults.push(fallbackResult);
}
```

---

## 🚀 **OPTIMISATIONS ET AMÉLIORATIONS**

### **1. Gestion des Batching**
- **Batch ID unique** pour chaque session de tool calls
- **Dédouplification intelligente** dans le même batch
- **Exécution séquentielle** pour éviter les conflits

### **2. Gestion de l'Historique**
- **Limite configurable** par session (défaut: 10 messages)
- **Tri chronologique** automatique
- **Nettoyage automatique** des anciens messages

### **3. Performance**
- **Optimistic updates** dans le store
- **Sauvegarde asynchrone** en base de données
- **Cache intelligent** des sessions

---

## 🔧 **POINTS D'ATTENTION**

### **1. Format des Messages**
- **Toujours utiliser** le format DeepSeek standard
- **Vérifier** la présence des champs obligatoires (`tool_call_id`, `name`)
- **Normaliser** le contenu des tool calls (JSON string)

### **2. Gestion des Sessions**
- **Vérifier** l'authentification avant chaque tool call
- **Valider** les permissions utilisateur
- **Gérer** les erreurs de session

### **3. Sécurité**
- **Ne jamais** réactiver les tools lors de la relance
- **Valider** tous les paramètres des tools
- **Limiter** le nombre de tool calls par session

---

## 📚 **RESSOURCES COMPLÉMENTAIRES**

- **Tests** : `src/tests/tool-call-system.test.ts`
- **Types** : `src/types/chat.ts`
- **Configuration** : `src/services/llm/config.ts`
- **Documentation API** : `ADAPTATION-TOOLS-API-V2.md`

---

## 🎯 **CONCLUSION**

Le système de tool calls d'Abrège est conçu pour être :
- **Robuste** : Anti-boucle, timeouts, gestion d'erreurs
- **Performant** : Batching, dédouplification, cache intelligent
- **Sécurisé** : Validation, permissions, limites strictes
- **Maintenable** : Logs détaillés, métriques, architecture claire

Ce mécanisme garantit une expérience utilisateur fluide tout en maintenant la sécurité et la performance du système. 