# 🔧 SOLUTION : Authentification des Agents pour les Tool Calls

## 📋 **PROBLÈME IDENTIFIÉ**

Les agents spécialisés ne pouvaient pas exécuter de tool calls via les routes d'exécution (`/api/v2/agents/execute` et `/api/v2/agents/{agentId}`) car ils n'étaient pas correctement authentifiés.

### **Cause racine :**
- Les routes d'exécution passaient l'`userId` (string) au lieu du `userToken` (JWT) à la méthode `executeSpecializedAgent`
- Les tool calls nécessitent le token JWT pour s'authentifier auprès des APIs internes
- Sans token JWT, les tool calls échouaient avec des erreurs 401

## ✅ **SOLUTION APPLIQUÉE**

### **1. Correction de `/api/v2/agents/execute/route.ts`**

**Avant :**
```typescript
const executionResult = await agentManager.executeSpecializedAgent(
  agent.id,
  executionParams.input,
  executionParams.userId, // ❌ PROBLÈME : userId au lieu de userToken
  `api-v2-execute-${agent.id}-${Date.now()}`
);
```

**Après :**
```typescript
// 🔑 Extraire le token JWT pour les tool calls
const authHeader = request.headers.get('authorization');
const userToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

if (!userToken) {
  return NextResponse.json(
    { error: 'Token JWT requis pour l\'exécution des agents avec tool calls' },
    { status: 401 }
  );
}

const executionResult = await agentManager.executeSpecializedAgent(
  agent.id,
  executionParams.input,
  userToken, // ✅ CORRECTION : Token JWT pour l'authentification
  `api-v2-execute-${agent.id}-${Date.now()}`
);
```

### **2. Correction de `/api/v2/agents/[agentId]/route.ts`**

**Avant :**
```typescript
const result = await agentManager.executeSpecializedAgent(
  agentId,
  input,
  userId, // ❌ PROBLÈME : userId au lieu de userToken
  `api-v2-${agentId}-${Date.now()}`
);
```

**Après :**
```typescript
// 🔑 Extraire le token JWT pour les tool calls
const authHeader = request.headers.get('authorization');
const userToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

if (!userToken) {
  return NextResponse.json(
    { 
      success: false,
      error: 'Token JWT requis pour l\'exécution des agents avec tool calls',
      code: SpecializedAgentError.AUTHENTICATION_ERROR
    },
    { status: 401 }
  );
}

const result = await agentManager.executeSpecializedAgent(
  agentId,
  input,
  userToken, // ✅ CORRECTION : Token JWT pour l'authentification
  `api-v2-${agentId}-${Date.now()}`
);
```

## 🔄 **FLUX D'AUTHENTIFICATION CORRIGÉ**

### **Route Chat (fonctionnait déjà) :**
1. Frontend envoie token JWT dans header `Authorization: Bearer <token>`
2. Route `/api/chat/llm` extrait le token
3. Token passé à `GroqOrchestrator.executeRound()`
4. Token passé à `ToolCallManager.executeToolCall()`
5. Token utilisé pour authentifier les appels API internes
6. ✅ **Tool calls fonctionnent**

### **Route Agent Execution (corrigée) :**
1. Frontend envoie token JWT dans header `Authorization: Bearer <token>`
2. Route `/api/v2/agents/execute` extrait le token
3. Token passé à `SpecializedAgentManager.executeSpecializedAgent()`
4. Token passé à `GroqOrchestrator.executeRound()`
5. Token passé à `ToolCallManager.executeToolCall()`
6. Token utilisé pour authentifier les appels API internes
7. ✅ **Tool calls fonctionnent maintenant**

## 🧪 **TEST DE VALIDATION**

Un script de test a été créé : `test-agent-auth-fix.js`

**Utilisation :**
```bash
# Configurer le token JWT
export TEST_JWT_TOKEN="your-actual-jwt-token"

# Exécuter le test
node test-agent-auth-fix.js
```

**Le test vérifie :**
- ✅ Route d'exécution universelle (`/api/v2/agents/execute`)
- ✅ Route d'exécution par ID (`/api/v2/agents/{agentId}`)
- ✅ Vérification HEAD pour l'existence des agents
- ✅ Authentification correcte avec token JWT

## 📊 **IMPACT**

### **Avant la correction :**
- ❌ Agents ne pouvaient pas faire de tool calls via routes d'exécution
- ❌ Erreurs 401 lors des appels d'outils
- ❌ Fonctionnalité limitée des agents spécialisés

### **Après la correction :**
- ✅ Agents peuvent faire des tool calls via toutes les routes
- ✅ Authentification cohérente entre chat et exécution
- ✅ Fonctionnalité complète des agents spécialisés
- ✅ Expérience utilisateur unifiée

## 🔒 **SÉCURITÉ**

- ✅ Token JWT requis pour toutes les exécutions d'agents
- ✅ Validation stricte de l'authentification
- ✅ Pas de régression de sécurité
- ✅ Cohérence avec le système d'authentification existant

## 📝 **FICHIERS MODIFIÉS**

1. `src/app/api/v2/agents/execute/route.ts` - Route d'exécution universelle
2. `src/app/api/v2/agents/[agentId]/route.ts` - Route d'exécution par ID
3. `test-agent-auth-fix.js` - Script de test (nouveau)
4. `SOLUTION-AUTHENTIFICATION-AGENTS-TOOL-CALLS.md` - Documentation (nouveau)

## 🎯 **RÉSULTAT**

**Problème résolu :** Les agents spécialisés peuvent maintenant exécuter des tool calls via les routes d'exécution avec une authentification correcte et sécurisée.
