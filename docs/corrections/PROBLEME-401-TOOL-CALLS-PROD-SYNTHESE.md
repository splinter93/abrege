# 🔴 PROBLÈME NON RÉSOLU - 401 Tool Calls en Production

**Date**: 2025-01-09  
**Status**: 🔴 EN COURS  
**Criticité**: 🔴 BLOQUANT

---

## 🚨 Symptômes

- ✅ **Local** : Tool calls fonctionnent parfaitement
- ❌ **Production** : Erreur 401 Unauthorized sur tous les tool calls
- ✅ **Auth initiale** : L'utilisateur est bien authentifié (le chat fonctionne)
- ❌ **Auth tool calls** : Les endpoints API v2 retournent 401

---

## 🔍 Ce Qui a Été Testé

### ✅ Correctif 1 : Extraction du userId au lieu du JWT
**Commit**: `0c8fd304`  
**Fichiers**: `src/app/api/chat/llm/route.ts`

**Logique** :
```typescript
// Au lieu de passer le JWT qui expire
const userId = user.id; // UUID qui n'expire jamais
await handleGroqGptOss120b({ userToken: userId, ... });
```

**Résultat** : ❌ Toujours 401

---

### ✅ Correctif 2 : Impersonation avec SERVICE_ROLE
**Commit**: `2a48286d`  
**Fichiers**: `src/services/llm/clients/ApiV2HttpClient.ts`, `src/utils/authUtils.ts`

**Logique** :
```typescript
// Si userToken est un UUID
headers = {
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'X-User-Id': userId,
  'X-Service-Role': 'true'
};
```

**Résultat** : ❌ Toujours 401

---

### ✅ Correctif 3 : Force Node.js Runtime sur API v2
**Commit**: `d8fedac8`  
**Fichiers**: 42 endpoints API v2

**Logique** :
```typescript
// Sur chaque endpoint
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```

**Raison** : Edge Runtime ne supporte pas `SUPABASE_SERVICE_ROLE_KEY`

**Résultat** : ❌ Toujours 401

---

## 📊 Logs de Production

```
🔍 [ApiV2HttpClient] REQUEST:
  url: https://abrege-7jjnekeer-splinter93s-projects.vercel.app/api/v2/classeurs
  tokenType: 'UUID' ✅
  tokenLength: 36 ✅

❌ [ApiV2HttpClient] ERROR HTTP:
  status: 401
  headers: {
    Authorization: 'Bearer ***' ✅
    X-User-Id: '3223651c-5580-4471-affb-b3f4456bd729' ✅
    X-Service-Role: 'true' ✅
  }
```

**Observation** : Les headers sont **BIEN ENVOYÉS** mais l'endpoint retourne quand même 401.

---

## ❓ Hypothèses Restantes

### 1. La `SERVICE_ROLE_KEY` sur Vercel est incorrecte

**Test à faire** :
```bash
# Vérifier que la clé sur Vercel est la bonne
# Aller sur Vercel → Settings → Environment Variables
# Comparer avec .env.local
```

**Clé locale** (ne PAS commit) :
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkZGhqd2xhYW1wc3BvcW5jdWJzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDg2MjU3NSwiZXhwIjoyMDY2NDM4NTc1fQ.nyW2vm8u_HnPbNdkBNmMWawG8tzHBoY_g9UlxNN61-A
```

⚠️ **ATTENTION** : Vérifier que c'est bien la **service_role** de `rdrqosvqikrpuwwcdana.supabase.co` (la prod) et PAS celle de `hddhj...` (la locale).

---

### 2. Les logs de `authUtils` ne s'affichent pas

**Problème** : On ne voit aucun log de :
```
🔍 [AuthUtils] Check impersonation:
🔍 [AuthUtils] Validation impersonation:
```

**Raison possible** : Les `console.log` dans `authUtils.ts` ne s'affichent peut-être pas dans les logs Vercel.

**Test à faire** : Ajouter des `throw new Error()` pour forcer l'affichage :
```typescript
// Dans authUtils.ts ligne 63
console.log('🔍 TEST FORCE:', { test: 'visible?' });
throw new Error('TEST FORCE - Si tu vois ça, les logs marchent');
```

---

### 3. Le middleware intercepte les requêtes

**Problème possible** : Le `middleware.ts` pourrait intercepter et modifier les headers.

**Test à faire** :
```typescript
// Vérifier dans src/middleware.ts si les headers sont modifiés
```

---

### 4. Vercel modifie les headers

**Problème possible** : Vercel pourrait striper les headers `X-User-Id` et `X-Service-Role`.

**Test à faire** : Logger côté endpoint :
```typescript
// Dans /api/v2/classeurs/route.ts ligne 25
console.log('🔍 TOUS LES HEADERS:', Object.fromEntries(request.headers.entries()));
```

---

## 🎯 Prochaine Action Recommandée

### Option A : Logs Vercel Détaillés

1. Aller sur **Vercel Dashboard** → Projet → **Logs**
2. Chercher les logs de la dernière requête
3. Copier **TOUS** les logs (pas juste ceux du navigateur)
4. Chercher spécifiquement :
   - `🔍 [AuthUtils]`
   - `❌ [AuthUtils]`
   - `SUPABASE_SERVICE_ROLE_KEY`

### Option B : Simplifier (Fallback temporaire)

**Désactiver temporairement l'impersonation** et utiliser le JWT tel quel :

```typescript
// Dans ApiV2HttpClient.ts
const headers = {
  'Content-Type': 'application/json',
  'X-Client-Type': 'agent',
  'Authorization': `Bearer ${userToken}` // JWT direct, pas d'impersonation
};
```

**Inconvénient** : Le JWT peut expirer, mais au moins on saura si le problème vient de l'impersonation ou du JWT.

---

## 📋 Checklist de Debug

- [x] JWT extrait et userId passé ✅
- [x] Impersonation avec SERVICE_ROLE codée ✅
- [x] Runtime nodejs forcé sur API v2 ✅
- [ ] SERVICE_ROLE_KEY correcte sur Vercel ?
- [ ] Headers bien reçus par les endpoints ?
- [ ] authUtils logs visibles dans Vercel ?
- [ ] Middleware n'interfère pas ?

---

## 💡 Notes

Le fait que **ça marche en local** prouve que le code est bon. Le problème est **spécifique à la production Vercel**.

Les suspects principaux :
1. SERVICE_ROLE_KEY incorrecte ou de la mauvaise instance Supabase
2. Vercel qui modifie/strip les headers
3. Un middleware qui interfère
4. Les console.log ne s'affichent pas dans les bons logs

---

**À reprendre plus tard avec les logs complets de Vercel.**

