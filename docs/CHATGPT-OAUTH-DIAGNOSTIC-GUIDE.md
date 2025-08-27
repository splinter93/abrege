# Guide de Diagnostic OAuth ChatGPT - Abrège

## 🚨 Problème Principal

**Symptôme** : "Le process ne se termine pas, je ne suis jamais connecté"

**Cause probable** : La page `/auth` ne pose pas les flags en sessionStorage et/ou ne lance pas le sign-in Google. Résultat : quand tu reviens sur `/auth/callback`, ta page AuthCallback ne voit pas `chatgpt_oauth_flow` → elle ne génère pas le code → pas de redirection vers ChatGPT.

## ✅ Solution Implémentée

### 1. Page `/auth` corrigée

La page `/auth` fait maintenant :
1. **Capture** les paramètres venant de ChatGPT
2. **Stocke** en sessionStorage (`chatgpt_oauth_flow` + `chatgpt_oauth_params`)
3. **Déclenche** le login Google (Supabase) vers `/auth/callback` sur le même host

### 2. Page d'erreur `/auth/error`

Page de diagnostic complète avec :
- Messages d'erreur explicites
- État du sessionStorage
- Solutions recommandées
- Boutons de retry

### 3. Logging de santé côté serveur

Endpoints OAuth avec logs détaillés pour tracer en prod en 2 minutes.

## 🔍 Diagnostic Express

### Étape 1 : Vérifier le flux complet

1. **Va sur** `/auth?...` (avec les paramètres ChatGPT)
2. **Ouvre la console** du navigateur
3. **Tu dois voir** :
   ```
   ✅ [Auth Entry] Paramètres stockés en sessionStorage: {
     chatgpt_oauth_flow: "true",
     chatgpt_oauth_params: {...}
   }
   🚀 [Auth Entry] Déclenchement sign-in Google vers: https://www.scrivia.app/auth/callback
   ```

### Étape 2 : Vérifier la callback

1. **Sur** `/auth/callback`, log dans AuthCallback juste après `getSession()`
2. **Si** `data.session` est `null` → problème cookie/domaine/callback Supabase
3. **Si** `data.session` est non-null mais pas de redirection vers ChatGPT → `chatgpt_oauth_flow` n'était pas posé → problème de la page `/auth`

## 🛠️ 5 Checks Critiques

### 1. **Domaine unique partout**
- ✅ Utilise **toujours** `https://www.scrivia.app`
- ❌ Pas de mix `scrivia.app` vs `www.scrivia.app`
- ✅ Toutes les routes d'auth sur `www.scrivia.app`
- ✅ API base déclarée à ChatGPT : `https://www.scrivia.app/api/v2`

### 2. **Supabase Auth settings**
- ✅ Dashboard Supabase → Auth → URL de redirection : `https://www.scrivia.app/auth/callback`
- ✅ Site URL : `https://www.scrivia.app`
- ❌ Pas de slash en trop

### 3. **Ordre des étapes**
- ✅ **OBLIGATOIRE** : Passer par `/auth?...` avant Google
- ❌ **INTERDIT** : Aller direct sur Google
- ✅ `/auth` met `chatgpt_oauth_flow`, puis Google

### 4. **Scope séparateur**
- ✅ Côté ChatGPT : scope avec espaces encodés (`%20`)
- ✅ Côté serveur : tolérance `[,\\s]+`

### 5. **Cookies Supabase**
- ✅ Cookies Secure, SameSite=Lax (par défaut OK)
- ❌ Pas de changement de domaine en plein milieu
- ✅ Reverse proxy/vercel rewrites ne cassent pas les cookies

## 🔧 Mini-Diagnostic Express

### Si ça ne marche toujours pas :

1. **Va sur** `/auth?...` et ouvre la console
2. **Vérifie** que `sessionStorage.chatgpt_oauth_flow = "true"`
3. **Vérifie** que `chatgpt_oauth_params` n'est pas vide
4. **Sur** `/auth/callback`, log après `getSession()`
5. **Vérifie** les logs serveur dans `/api/auth/create-code`

### Logs attendus côté serveur :

```
🚀 [Create-Code] Début création code OAuth: { clientType: "llm", ... }
🤖 [Create-Code] Type de client: { isChatGPT: true, clientId: "scrivia-custom-gpt" }
✅ [Create-Code] Code OAuth créé avec succès en 150ms: { code: "abc123...", ... }
```

## 🚀 Test du Flux Complet

### 1. URL de test ChatGPT
```
https://www.scrivia.app/auth?client_id=scrivia-custom-gpt&redirect_uri=https://chat.openai.com/oauth/callback&response_type=code&state=test123&scope=read%20write
```

### 2. Étapes attendues
1. **Page** `/auth` → capture params + stocke en sessionStorage
2. **Redirection** → Google OAuth
3. **Callback** → `/auth/callback` → génère code → redirige vers ChatGPT

### 3. Vérifications
- ✅ Console navigateur : logs Auth Entry
- ✅ SessionStorage : `chatgpt_oauth_flow = "true"`
- ✅ Logs serveur : création code réussie
- ✅ Redirection finale vers ChatGPT

## 🆘 En Cas de Problème Persistant

### 1. Vérifier la console navigateur
- Erreurs JavaScript
- Logs Auth Entry
- État du sessionStorage

### 2. Vérifier les logs serveur
- Endpoint `/api/auth/create-code`
- Erreurs de validation
- Problèmes de base de données

### 3. Vérifier la configuration
- URLs Supabase
- Domaine unique
- Cookies activés

### 4. Utiliser la page d'erreur
- `/auth/error?reason=...`
- Diagnostic automatique
- Solutions recommandées

## 📋 Checklist de Vérification

- [ ] Page `/auth` accessible avec paramètres ChatGPT
- [ ] SessionStorage fonctionne (pas de navigation privée)
- [ ] Paramètres stockés : `chatgpt_oauth_flow` + `chatgpt_oauth_params`
- [ ] Redirection Google OAuth déclenchée
- [ ] Callback `/auth/callback` reçoit la session
- [ ] Flags sessionStorage présents dans la callback
- [ ] Code OAuth généré côté serveur
- [ ] Redirection finale vers ChatGPT réussie

## 🔗 Liens Utiles

- **Page d'erreur** : `/auth/error`
- **Logs serveur** : Console du serveur Next.js
- **Configuration Supabase** : Dashboard Supabase → Auth
- **Test OAuth** : URL de test ChatGPT ci-dessus

---

*Dernière mise à jour : Janvier 2025*
*Version : 2.0 - Flux OAuth ChatGPT corrigé*
