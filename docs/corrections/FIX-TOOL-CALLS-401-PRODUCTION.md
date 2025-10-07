# Fix: Tool Calls 401 en Production (Vercel)

**Date:** 7 octobre 2025  
**Statut:** 🔍 **EN COURS**  
**Priorité:** 🔴 **CRITIQUE**

---

## 🚨 Problème

### Symptôme
- ✅ **Local:** Tool calls fonctionnent parfaitement
- ❌ **Production (Vercel):** Tool calls reçoivent **401 Unauthorized**

### Logs
```
Error: HTTP 401: Unauthorized
Tool call failed: createNote
```

---

## 🔍 Diagnostic

### Code Problématique
```typescript
// src/services/llm/clients/ApiV2HttpClient.ts:82
headers['Authorization'] = `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`;
```

### Analyse
1. **Local (fonctionne):**
   - `.env` chargé automatiquement par Next.js
   - `process.env.SUPABASE_SERVICE_ROLE_KEY` existe ✅

2. **Production Vercel (échoue):**
   - Variables d'environnement **NON configurées** dans le dashboard Vercel
   - `process.env.SUPABASE_SERVICE_ROLE_KEY` → `undefined` ❌
   - Header devient `Bearer undefined` → 401

---

## ✅ Solutions (2 Options)

### Option 1: Configurer Vercel (RECOMMANDÉ)
**Dashboard Vercel → Settings → Environment Variables**

Ajouter:
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Scopes:** Production, Preview, Development

### Option 2: Améliorer le Code (FAIT)
Ajouter une vérification de sécurité qui throw une erreur claire:

```typescript
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  logger.error(`[ApiV2HttpClient] ❌ SUPABASE_SERVICE_ROLE_KEY manquante!`);
  throw new Error('Configuration serveur manquante: SUPABASE_SERVICE_ROLE_KEY');
}

headers['Authorization'] = `Bearer ${serviceRoleKey}`;
```

---

## 🎯 Action Required

**Tu dois configurer la variable dans Vercel:**

1. Aller sur https://vercel.com/[ton-projet]/settings/environment-variables
2. Ajouter `SUPABASE_SERVICE_ROLE_KEY` avec la valeur depuis `.env`
3. Sélectionner **Production + Preview + Development**
4. Redéployer le projet

**Alternative rapide:**
```bash
vercel env add SUPABASE_SERVICE_ROLE_KEY
# Coller la valeur depuis .env
```

---

## ✅ Checklist

- [x] Code amélioré avec vérification de sécurité
- [ ] Variable configurée dans Vercel
- [ ] Projet redéployé
- [ ] Tool calls testés en production

---

**Status:** ⏳ **ATTENTE CONFIG VERCEL**

