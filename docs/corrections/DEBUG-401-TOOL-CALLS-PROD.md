# 🐛 DEBUG - Erreur 401 sur les Tool Calls en Production

**Date**: 2025-01-09  
**Status**: 🔍 EN COURS D'INVESTIGATION  
**Criticité**: 🔴 HAUTE (Bloque l'utilisation des tools en production)

---

## 🚨 Symptômes

- ✅ **Local** : Les tool calls fonctionnent parfaitement
- ❌ **Production** : Erreur 401 Unauthorized lors de l'exécution des tools
- ✅ **Auth initiale** : L'utilisateur est bien authentifié (le chat fonctionne)
- ❌ **Auth tool calls** : Le token n'est pas accepté par les endpoints API v2

---

## 🔍 Flux d'Authentification

### 1. Token Initial (Frontend → LLM Route)

```typescript
// src/components/chat/ChatFullscreenV2.tsx:562-577
const tokenResult = await tokenManager.getValidToken();

if (!tokenResult.isValid || !tokenResult.token) {
  throw new Error('Token d\'authentification manquant ou invalide');
}

const token = tokenResult.token; // ✅ JWT Supabase valide

// Envoi au LLM
await sendMessage(message, sessionId, context, history, token);
```

**✅ En local** : Le JWT est valide et frais  
**❓ En prod** : Le JWT peut être expiré ou invalide ?

---

### 2. Token Transmis aux Tool Calls

```typescript
// src/services/llm/services/SimpleChatOrchestrator.ts:101
const toolResults = await this.toolExecutor.executeSimple(
  newToolCalls, 
  context.userToken, // ✅ JWT transmis
  context.sessionId
);
```

```typescript
// src/services/llm/services/SimpleToolExecutor.ts:149
const result = await this.toolExecutor.executeToolCall(toolCall, userToken);
```

```typescript
// src/services/llm/executors/ApiV2ToolExecutor.ts:37
const result = await this.executeToolFunction(func.name, args, userToken);
```

```typescript
// src/services/llm/clients/ApiV2HttpClient.ts:102
const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  'X-Client-Type': 'agent',
  'Authorization': `Bearer ${userToken}` // ✅ JWT dans le header
};
```

**Flux** : Frontend → LLM Route → Orchestrator → ToolExecutor → ApiV2HttpClient → API v2 Endpoints

---

### 3. Validation du Token côté API v2

```typescript
// src/utils/authUtils.ts:141-158
try {
  const supabaseWithToken = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  );
  
  const { data: { user }, error } = await supabaseWithToken.auth.getUser();
  
  if (error || !user) {
    throw new Error('JWT invalide');
  }
  
  // ✅ JWT validé
  return { success: true, userId: user.id, scopes, authType: 'jwt' };
}
```

**❓ Question** : Pourquoi `getUser()` échoue en prod mais pas en local ?

---

## 🔍 Hypothèses

### Hypothèse 1 : JWT Expiré en Production

**Problème** : 
- Le JWT a une durée de vie limitée (généralement 1h)
- En production, le délai entre l'obtention du token et l'exécution du tool peut dépasser cette durée
- Les tool calls arrivent après l'expiration du JWT

**Test** :
```typescript
// Ajouter un log avant l'exécution du tool
console.log('🔍 Token info:', {
  tokenLength: userToken.length,
  tokenAge: Date.now() - tokenCreationTime,
  tokenExpiry: parseJWT(userToken).exp
});
```

**Solution** :
- Refresh le token avant chaque tool call
- Ou utiliser un token avec une durée de vie plus longue

---

### Hypothèse 2 : Variables d'Environnement Manquantes en Production

**Problème** :
```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
```

**❓ Questions** :
- Ces variables sont-elles correctement définies en production sur Vercel ?
- Le `!` force TypeScript à considérer qu'elles existent, mais sont-elles vraiment définies ?

**Test** :
```typescript
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Variables d\'environnement Supabase manquantes !');
}
```

---

### Hypothèse 3 : CORS ou Cookies en Production

**Problème** :
- En local, les cookies sont automatiquement inclus dans les requêtes
- En production (Vercel), les cookies peuvent ne pas être transmis correctement
- Les appels Server-Side (tool calls) n'ont pas accès aux cookies du client

**Impact** :
```typescript
// Frontend (client-side) → JWT dans cookie
const token = await supabase.auth.getSession();

// Backend (server-side tool calls) → Pas d'accès aux cookies
// Le JWT doit être transmis explicitement dans le header Authorization
```

**✅ Notre code transmet bien le JWT dans le header**, donc ce n'est probablement pas ça.

---

### Hypothèse 4 : Problème de Validation JWT en Production

**Problème** :
```typescript
// En local
const { data: { user }, error } = await supabaseWithToken.auth.getUser();
// ✅ Fonctionne

// En production (Vercel)
const { data: { user }, error } = await supabaseWithToken.auth.getUser();
// ❌ error = 'Invalid JWT' ou 'JWT expired'
```

**Causes possibles** :
1. **Clock skew** : Différence d'horloge entre Vercel et Supabase
2. **JWT format** : Le JWT est corrompu lors de la transmission
3. **Supabase URL** : Mauvaise URL en production
4. **ANON_KEY** : Mauvaise clé en production

---

## 🔧 Solutions à Tester

### Solution 1 : Ajouter des Logs de Diagnostic

```typescript
// src/utils/authUtils.ts:141
try {
  // 🔍 LOG DIAGNOSTIC PROD
  logApi.info(`[AuthUtils] 🔍 Validation JWT en cours:`, {
    tokenLength: token.length,
    tokenStart: token.substring(0, 20) + '...',
    tokenEnd: '...' + token.substring(token.length - 20),
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  });
  
  const { data: { user }, error } = await supabaseWithToken.auth.getUser();
  
  // 🔍 LOG RÉSULTAT
  logApi.info(`[AuthUtils] 🔍 Résultat validation JWT:`, {
    success: !error && !!user,
    hasUser: !!user,
    userId: user?.id || 'N/A',
    error: error?.message || 'N/A',
    errorCode: error?.code || 'N/A'
  });
  
  if (error || !user) {
    throw new Error(`JWT invalide: ${error?.message || 'Unknown error'}`);
  }
}
```

---

### Solution 2 : Refresh Token Automatique

```typescript
// src/utils/tokenManager.ts
async getValidToken(): Promise<TokenResult> {
  const session = await supabase.auth.getSession();
  
  if (!session.data.session) {
    return { isValid: false, error: 'No session' };
  }
  
  // Vérifier si le token expire bientôt
  const expiresAt = session.data.session.expires_at || 0;
  const timeUntilExpiry = expiresAt - Date.now() / 1000;
  
  // Refresh si expire dans moins de 5 minutes
  if (timeUntilExpiry < 300) {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error || !data.session) {
      return { isValid: false, error: 'Token refresh failed' };
    }
    
    return { 
      isValid: true, 
      token: data.session.access_token,
      wasRefreshed: true 
    };
  }
  
  return { 
    isValid: true, 
    token: session.data.session.access_token,
    wasRefreshed: false 
  };
}
```

---

### Solution 3 : Utiliser Service Role pour les Tool Calls (Backend Only)

**Problème actuel** :
- Les tool calls utilisent le JWT de l'utilisateur
- Ce JWT peut expirer pendant l'exécution
- En production, l'expiration est plus rapide

**Solution** :
- Utiliser le SERVICE_ROLE_KEY pour les tool calls backend
- Passer le `userId` dans un header custom au lieu du JWT

```typescript
// src/services/llm/clients/ApiV2HttpClient.ts
const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  'X-Client-Type': 'agent',
  'X-User-Id': userId, // ✅ Passer le userId
  'X-Service-Role': 'true', // ✅ Marquer comme service
  'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` // ✅ Service role
};
```

**Avantage** :
- Pas de problème d'expiration de token
- Authentification backend-to-backend fiable
- Le userId est validé côté serveur via le SERVICE_ROLE_KEY

---

## 🎯 Action Immédiate

**TESTER D'ABORD** : Ajouter les logs de diagnostic pour voir exactement où le token échoue en production.

```typescript
// Ajouter dans ApiV2HttpClient.ts ligne 100
console.error('🔍 DEBUG PROD - Token Info:', {
  env: process.env.NODE_ENV,
  url,
  method,
  tokenLength: userToken.length,
  tokenType: this.detectTokenType(userToken),
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
});
```

**Ensuite** : Regarder les logs Vercel pour voir l'erreur exacte.

---

**Status** : EN ATTENTE DES LOGS DE PRODUCTION  
**Prochaine étape** : Ajouter les logs et redéployer

