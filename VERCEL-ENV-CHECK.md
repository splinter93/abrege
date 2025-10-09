# 🔍 VÉRIFICATION VARIABLES D'ENVIRONNEMENT VERCEL

## 🚨 Problème : Tool Calls 401 en Prod

**Marche en local ✅**  
**401 en prod ❌**

## ✅ Variables REQUISES sur Vercel

### 1. Supabase (CRITIQUES)
```
NEXT_PUBLIC_SUPABASE_URL=https://rdrqosvqikrpuwwcdana.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI... (anon key)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJI... (service_role key) ⚠️ CRITIQUE
```

### 2. Groq API
```
GROQ_API_KEY=gsk_...
```

### 3. Autres (optionnels)
```
NEXT_PUBLIC_API_BASE_URL=https://ton-domaine.vercel.app
NEXT_PUBLIC_SITE_URL=https://ton-domaine.vercel.app
```

---

## 🔍 Comment Vérifier sur Vercel

1. Va sur **Vercel Dashboard**
2. Sélectionne ton projet
3. **Settings** → **Environment Variables**
4. Vérifie que **SUPABASE_SERVICE_ROLE_KEY** existe
5. Vérifie que toutes les clés Supabase sont correctes

---

## ⚠️ SUPABASE_SERVICE_ROLE_KEY

Cette clé est **CRITIQUE** pour l'impersonation des tool calls.

### Où la trouver ?

1. Va sur **Supabase Dashboard**
2. Sélectionne ton projet
3. **Settings** → **API**
4. Section **Project API keys**
5. Copie **service_role key** (commence par `eyJhbGci...`)
6. ⚠️ **NE LA PARTAGE JAMAIS** (c'est une clé admin)

### L'ajouter sur Vercel

1. **Vercel** → Projet → **Settings** → **Environment Variables**
2. **Add New**
3. Name: `SUPABASE_SERVICE_ROLE_KEY`
4. Value: `eyJhbGci...` (ta service_role key)
5. Environment: **Production** + **Preview** + **Development**
6. **Save**
7. **Redéployer** le projet

---

## 🧪 Test Rapide

Après avoir ajouté la variable :

1. Attendre 2-3 min que Vercel redéploie
2. Tester un tool call simple : "Crée une note test"
3. Vérifier les logs Vercel pour voir :
   ```
   🤖 Impersonation: userId=abc-123...
   ✅ Service role utilisé
   ```

---

## 🎯 Si ça marche toujours pas

Regarde les logs Vercel et cherche :
- `❌ SUPABASE_SERVICE_ROLE_KEY manquante`
- `❌ [ApiV2HttpClient] ERROR HTTP: 401`

Et copie-moi le message d'erreur exact.

