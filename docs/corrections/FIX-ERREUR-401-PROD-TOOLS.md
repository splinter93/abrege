# 🔧 FIX - ERREUR 401 SUR LES TOOLS EN PRODUCTION

## 🎯 **PROBLÈME IDENTIFIÉ**

Les tool calls fonctionnent correctement en **local** mais retournent une **erreur 401 (Unauthorized)** en **production**.

---

## 🔍 **ANALYSE CHAIN OF THOUGHT**

### **1. Flow d'authentification**
```
ChatFullscreenV2 
  ↓ supabase.auth.getSession()
  ↓ Token JWT récupéré
useChatResponse.sendMessage(token)
  ↓ Authorization: Bearer ${token}
/api/chat/llm
  ↓ Validation token
ApiV2ToolExecutor
  ↓ Transmission token
ApiV2HttpClient
  ↓ Authorization: Bearer ${token}
Endpoints V2
  ↓ getAuthenticatedUser()
✅ ou ❌ 401
```

### **2. Différences Local vs Production**

| Aspect | Local | Production |
|--------|-------|------------|
| **Token Storage** | localStorage ✅ | localStorage ✅ |
| **Token Refresh** | Manuel | Manuel |
| **URL Base** | `http://localhost:3000` | `https://[vercel].vercel.app` |
| **Environment** | NODE_ENV=development | NODE_ENV=production |
| **Cookies** | Same-origin | Cross-origin possible |
| **Token Expiration** | Rarement un problème | **Problème fréquent** |

### **3. Causes potentielles**

1. ✅ **Token expiré** → Non rafraîchi automatiquement avant les tool calls
2. ✅ **URL de base incorrecte** → VERCEL_URL non configurée ou mauvaise
3. ✅ **Logs insuffisants** → Impossible de diagnostiquer en prod
4. ⚠️ **Cookies non accessibles** → Problème de CORS (moins probable)
5. ⚠️ **Variables d'environnement** → Manquantes ou mal configurées

---

## ✅ **SOLUTIONS IMPLÉMENTÉES**

### **1. 🔐 Token Manager avec Refresh Automatique**

**Fichier** : `src/utils/tokenManager.ts`

**Fonctionnalités** :
- ✅ Validation automatique du token avant utilisation
- ✅ Refresh automatique si le token expire dans moins de 5 minutes
- ✅ Cache intelligent pour éviter les appels redondants
- ✅ Gestion de la concurrence (un seul refresh à la fois)

**Usage** :
```typescript
import { tokenManager } from '@/utils/tokenManager';

// Récupérer un token valide et rafraîchi si nécessaire
const tokenResult = await tokenManager.getValidToken();

if (tokenResult.isValid && tokenResult.token) {
  // Utiliser le token
  console.log('Token valide:', tokenResult.token);
  console.log('Was refreshed:', tokenResult.wasRefreshed);
}
```

---

### **2. 🔍 Logs Détaillés dans ApiV2HttpClient**

**Fichier** : `src/services/llm/clients/ApiV2HttpClient.ts`

**Améliorations** :
- ✅ Logs de l'URL de base utilisée (client-side vs server-side)
- ✅ Logs du token (longueur, début, type)
- ✅ Logs des headers et de la réponse HTTP
- ✅ Logs d'erreur détaillés avec contexte complet
- ✅ Détection automatique de l'environnement (Vercel/Local)

**Exemple de logs** :
```
[ApiV2HttpClient] 🚀 Vercel URL: https://xxx.vercel.app
[ApiV2HttpClient] 🔑 Authentification JWT {
  url: 'https://xxx.vercel.app/api/v2/classeurs',
  method: 'GET',
  tokenLength: 512,
  isServerSide: true,
  environment: 'production',
  platform: 'Vercel'
}
```

---

### **3. 🌐 Configuration Supabase Améliorée**

**Fichier** : `src/supabaseClient.js`

**Améliorations** :
- ✅ Storage explicite vers localStorage
- ✅ Callback `onAuthStateChange` pour diagnostiquer les changements
- ✅ Logs détaillés des sessions et expirations
- ✅ Meilleure gestion des cookies

---

### **4. 🔧 Intégration TokenManager dans ChatFullscreenV2**

**Fichier** : `src/components/chat/ChatFullscreenV2.tsx`

**Changements** :
```typescript
// ❌ AVANT : Token simple sans validation
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
if (!token) throw new Error('Token manquant');

// ✅ APRÈS : Token validé et rafraîchi automatiquement
const tokenResult = await tokenManager.getValidToken();
if (!tokenResult.isValid || !tokenResult.token) {
  throw new Error(tokenResult.error || 'Token invalide');
}
const token = tokenResult.token;

logger.info('[ChatFullscreenV2] 🔐 Token validé:', {
  wasRefreshed: tokenResult.wasRefreshed,
  expiresAt: new Date(tokenResult.expiresAt * 1000).toISOString(),
});
```

---

### **5. 🔍 Endpoint de Diagnostic Token**

**Fichier** : `src/app/api/debug/token/route.ts`

**Usage** :
```bash
# En local
curl -X POST http://localhost:3000/api/debug/token \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# En production
curl -X POST https://YOUR_APP.vercel.app/api/debug/token \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Informations retournées** :
- ✅ Validité du token
- ✅ Type de token (JWT/UUID)
- ✅ Variables d'environnement présentes
- ✅ Validation Supabase
- ✅ URL de base détectée
- ✅ Environnement et plateforme

---

## 🧪 **TESTS À EFFECTUER**

### **Test 1 : Diagnostic Token en Local**

```bash
cd /Users/k/Documents/Cursor\ Workspace/abrege

# Récupérer un token depuis la console du navigateur
# Dans la console : supabase.auth.getSession()
# Copier le access_token

# Tester l'endpoint de diagnostic
curl -X POST http://localhost:3000/api/debug/token \
  -H "Authorization: Bearer VOTRE_TOKEN_ICI" \
  -H "Content-Type: application/json" | jq
```

**Résultat attendu** :
```json
{
  "success": true,
  "diagnostics": {
    "authHeader": { "present": true, "startsWithBearer": true },
    "supabaseValidation": { "success": true, "userId": "..." },
    "executionTime": "150ms"
  }
}
```

---

### **Test 2 : Tool Calls en Local**

1. Ouvrir l'application en local : `http://localhost:3000`
2. Se connecter et aller sur le chat
3. Envoyer un message qui déclenche un tool call, par exemple :
   ```
   Crée-moi un classeur appelé "Test Production"
   ```
4. Vérifier dans la console du navigateur et dans les logs serveur :
   - ✅ `[TokenManager] Token valide`
   - ✅ `[ApiV2HttpClient] 🔑 Authentification JWT`
   - ✅ `[ApiV2HttpClient] ✅ POST /api/v2/classeur/create success`

---

### **Test 3 : Déployer et Tester en Production**

```bash
# Déployer sur Vercel
git add .
git commit -m "fix: Correction erreur 401 sur tool calls en production"
git push origin main

# Attendre le déploiement Vercel (1-2 minutes)

# Tester en production
# 1. Se connecter sur l'app en prod
# 2. Envoyer un message qui déclenche un tool call
# 3. Vérifier les logs Vercel
```

**Vérifier les logs Vercel** :
1. Aller sur https://vercel.com/dashboard
2. Sélectionner le projet
3. Aller dans "Functions" > "Logs"
4. Chercher les logs `[TokenManager]` et `[ApiV2HttpClient]`

---

## 🔧 **VARIABLES D'ENVIRONNEMENT À VÉRIFIER**

Sur Vercel, vérifier que ces variables sont bien configurées :

```bash
# Obligatoires
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Optionnelles (pour diagnostiquer)
NEXT_PUBLIC_API_BASE_URL=https://YOUR_APP.vercel.app
VERCEL_URL=YOUR_APP.vercel.app
```

---

## 📊 **DIAGNOSTIC RAPIDE**

Si le problème persiste en production, suivre ces étapes :

### **Étape 1 : Vérifier le token**
```typescript
// Dans la console du navigateur en production
supabase.auth.getSession().then(({ data }) => {
  console.log('Token:', data.session?.access_token?.substring(0, 30) + '...');
  console.log('Expires at:', new Date((data.session?.expires_at || 0) * 1000).toISOString());
});
```

### **Étape 2 : Tester l'endpoint de diagnostic**
```bash
# Avec le token récupéré à l'étape 1
curl -X POST https://YOUR_APP.vercel.app/api/debug/token \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### **Étape 3 : Vérifier les logs Vercel**
1. Logs du serveur pour voir les erreurs
2. Chercher `[ApiV2HttpClient]` pour voir les détails de l'erreur 401
3. Chercher `[TokenManager]` pour voir si le refresh a été tenté

---

## 🎯 **POINTS CLÉS DE LA SOLUTION**

1. **Token Refresh Proactif** → Refresh automatique 5 min avant expiration
2. **Logs Exhaustifs** → Diagnostic précis des problèmes en prod
3. **URL Detection Smart** → Détection automatique de l'URL de base (Vercel/Local)
4. **Endpoint de Diagnostic** → Test rapide du token et de l'auth
5. **Configuration Supabase Robuste** → Meilleure gestion des sessions

---

## 📝 **CHECKLIST DE DÉPLOIEMENT**

- [ ] Variables d'environnement configurées sur Vercel
- [ ] Code déployé en production
- [ ] Test de l'endpoint `/api/debug/token` en prod
- [ ] Test d'un tool call simple en prod (ex: créer un classeur)
- [ ] Vérification des logs Vercel
- [ ] Validation que les tool calls fonctionnent sans erreur 401

---

## 🆘 **EN CAS DE PROBLÈME**

Si l'erreur 401 persiste après ces corrections :

1. **Vérifier les logs détaillés** dans Vercel
2. **Comparer les logs local vs prod** pour identifier la différence
3. **Utiliser l'endpoint `/api/debug/token`** pour diagnostiquer
4. **Vérifier que le token n'est pas bloqué** par un middleware ou un firewall
5. **Contacter le support Vercel** si problème d'infrastructure

---

## 📚 **RÉFÉRENCES**

- [TokenManager Implementation](../../src/utils/tokenManager.ts)
- [ApiV2HttpClient avec logs](../../src/services/llm/clients/ApiV2HttpClient.ts)
- [Endpoint de diagnostic](../../src/app/api/debug/token/route.ts)
- [ChatFullscreenV2 intégration](../../src/components/chat/ChatFullscreenV2.tsx)

