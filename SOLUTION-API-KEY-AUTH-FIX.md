# 🔧 SOLUTION : Correction de l'authentification avec les clés d'API

## 📋 **PROBLÈME IDENTIFIÉ**

Quand ChatGPT (ou tout autre client externe) utilise une clé d'API pour appeler Harvey via l'endpoint d'exécution, les tool calls échouaient avec l'erreur `"Impossible d'extraire l'utilisateur du token"`.

### **Cause racine :**
- Les clés d'API n'ont pas de token JWT associé
- La méthode `AgentApiV2Tools.getUserIdFromToken()` ne pouvait gérer que les tokens JWT
- Le système essayait d'extraire un userId d'un token JWT inexistant

## ✅ **SOLUTION APPLIQUÉE**

### **1. Modification de la route d'exécution (`/api/v2/agents/execute/route.ts`)**

**Avant :**
```typescript
// ❌ PROBLÈME : Toujours essayer d'extraire un token JWT
const authHeader = request.headers.get('authorization');
const userToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

if (!userToken) {
  return NextResponse.json({ error: 'Token JWT requis' }, { status: 401 });
}
```

**Après :**
```typescript
// ✅ CORRECTION : Gérer les différents types d'authentification
const userId = authResult.userId!;
const authType = authResult.authType!;

let userToken: string | null = null;

if (authType === 'jwt') {
  // Pour les tokens JWT, extraire le token
  const authHeader = request.headers.get('authorization');
  userToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
} else if (authType === 'api_key') {
  // Pour les clés d'API, on n'a pas de token JWT
  // On va passer l'userId directement aux tool calls
  logApi.info(`🔑 Authentification par clé d'API détectée - userId: ${userId}`);
}
```

### **2. Modification de `AgentApiV2Tools.executeTool()`**

**Avant :**
```typescript
// ❌ PROBLÈME : Toujours essayer d'extraire l'userId d'un token JWT
async executeTool(toolName: string, parameters: any, jwtToken: string): Promise<any> {
  const userId = await this.getUserIdFromToken(jwtToken);
  // ...
}
```

**Après :**
```typescript
// ✅ CORRECTION : Gérer les tokens JWT et les clés d'API
async executeTool(toolName: string, parameters: any, authToken: string): Promise<any> {
  let userId: string;
  
  // Vérifier si c'est un userId direct (clé d'API) ou un token JWT
  if (this.isUserId(authToken)) {
    // C'est un userId direct (clé d'API)
    userId = authToken;
    console.log(`🔑 Authentification par clé d'API - userId: ${userId}`);
  } else {
    // C'est un token JWT, extraire l'userId
    userId = await this.getUserIdFromToken(authToken);
    console.log(`🔑 Authentification par token JWT - userId: ${userId}`);
  }
  // ...
}
```

### **3. Ajout de la méthode `isUserId()`**

```typescript
/**
 * Vérifier si la chaîne est un userId (UUID) ou un token JWT
 */
private isUserId(token: string): boolean {
  // Un userId est un UUID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(token);
}
```

## 🔄 **FLUX D'AUTHENTIFICATION CORRIGÉ**

### **Avec clé d'API (ChatGPT) :**
1. **ChatGPT** → Envoie clé d'API dans header `X-API-Key`
2. **Route d'exécution** → Authentifie avec la clé d'API et récupère l'`userId`
3. **SpecializedAgentManager** → Passe l'`userId` (pas de token JWT) à `GroqOrchestrator`
4. **GroqOrchestrator** → Passe l'`userId` à `ToolCallManager`
5. **ToolCallManager** → Passe l'`userId` à `AgentApiV2Tools.executeTool()`
6. **AgentApiV2Tools** → ✅ **DÉTECTE** que c'est un userId (UUID) et l'utilise directement
7. **Tool call** → S'exécute avec l'userId correct

### **Avec token JWT (Chat natif) :**
1. **Frontend** → Envoie token JWT dans header `Authorization: Bearer <token>`
2. **Route d'exécution** → Authentifie avec le token JWT et récupère l'`userId`
3. **SpecializedAgentManager** → Passe le token JWT à `GroqOrchestrator`
4. **GroqOrchestrator** → Passe le token JWT à `ToolCallManager`
5. **ToolCallManager** → Passe le token JWT à `AgentApiV2Tools.executeTool()`
6. **AgentApiV2Tools** → ✅ **DÉTECTE** que c'est un token JWT et extrait l'userId
7. **Tool call** → S'exécute avec l'userId correct

## 🧪 **TEST DE VALIDATION**

Un script de test a été créé : `test-api-key-auth-fix.js`

**Utilisation :**
```bash
# Configurer votre clé d'API
export TEST_API_KEY="your-actual-api-key"

# Exécuter le test
node test-api-key-auth-fix.js
```

**Le test vérifie :**
- ✅ Harvey peut exécuter `listClasseurs` avec une clé d'API
- ✅ André peut exécuter ses tool calls avec une clé d'API
- ✅ Plus d'erreur "Impossible d'extraire l'utilisateur du token"
- ✅ Les tool calls fonctionnent correctement avec les clés d'API

## 📊 **IMPACT**

### **Avant la correction :**
- ❌ Erreur "Impossible d'extraire l'utilisateur du token" avec les clés d'API
- ❌ Tool calls échouaient quand appelés via ChatGPT
- ❌ Fonctionnalité limitée des agents spécialisés avec les clés d'API

### **Après la correction :**
- ✅ Tool calls fonctionnent avec les clés d'API
- ✅ ChatGPT peut utiliser Harvey et André via l'endpoint d'exécution
- ✅ Fonctionnalité complète des agents spécialisés avec tous les types d'authentification
- ✅ Rétrocompatibilité avec les tokens JWT

## 🔒 **SÉCURITÉ**

- ✅ Authentification correcte avec les clés d'API
- ✅ Validation des UUIDs pour détecter les userId
- ✅ Pas de régression de sécurité
- ✅ Support des deux types d'authentification (JWT et API Key)

## 📝 **FICHIERS MODIFIÉS**

1. `src/app/api/v2/agents/execute/route.ts` - Gestion des types d'authentification
2. `src/services/agentApiV2Tools.ts` - Support des clés d'API dans `executeTool()`
3. `test-api-key-auth-fix.js` - Script de test (nouveau)
4. `SOLUTION-API-KEY-AUTH-FIX.md` - Documentation (nouveau)

## 🎯 **RÉSULTAT**

**Problème résolu :** ChatGPT (et tout autre client utilisant une clé d'API) peut maintenant appeler Harvey et André via l'endpoint d'exécution, et les agents peuvent exécuter des tool calls sans erreur d'authentification.

## 🔍 **DÉTAILS TECHNIQUES**

### **Détection automatique du type d'authentification :**
- **UUID** (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`) → userId direct (clé d'API)
- **Autre** → token JWT à valider

### **Rétrocompatibilité :**
- ✅ Tokens JWT continuent de fonctionner
- ✅ Clés d'API fonctionnent maintenant
- ✅ OAuth continue de fonctionner
- ✅ Aucune régression
