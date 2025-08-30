# 🔐 GUIDE DE CONFIGURATION OAUTH CHATGPT OFFICIEL

## 📚 **DOCUMENTATION OFFICIELLE CHATGPT**

D'après la documentation ChatGPT, voici **exactement** comment configurer l'OAuth :

---

## 🎯 **CONFIGURATION REQUISE DANS CHATGPT**

### **1. Dans l'éditeur GPT, sélectionnez :**
- **Authentication** → **OAuth**

### **2. Paramètres à configurer :**

```json
{
  "OAuth Client ID": "scrivia-custom-gpt",
  "OAuth Client Secret": "scrivia-gpt-secret-2024",
  "Authorization URL": "https://scrivia.app/auth",
  "Token URL": "https://scrivia.app/api/auth/token",
  "Scope": "notes:read notes:write dossiers:read dossiers:write classeurs:read classeurs:write profile:read"
}
```

**⚠️ IMPORTANT :** Le **Token URL** est **CRUCIAL** - c'est là que ChatGPT échange le code contre le token !

---

## 🔄 **FLUX OAUTH COMPLET CHATGPT**

### **Étape 1 : Demande d'Autorisation**
```
ChatGPT → https://scrivia.app/auth?response_type=code&client_id=scrivia-custom-gpt&...
```

### **Étape 2 : Authentification Utilisateur**
```
Utilisateur se connecte → Redirection vers /auth/callback
```

### **Étape 3 : Échange Code → Token**
```
ChatGPT → POST https://scrivia.app/api/auth/token
Body: grant_type=authorization_code&code=abc123&client_id=scrivia-custom-gpt&client_secret=scrivia-gpt-secret-2024&redirect_uri=https://chat.openai.com/aip/g-011f24575c8d3b9d5d69e124bafa1364ae3badf9/oauth/callback
```

### **Étape 4 : Utilisation du Token**
```
ChatGPT → GET https://scrivia.app/api/ui/classeurs
Headers: Authorization: Bearer [user's token]
```

---

## 🚨 **POINTS CRITIQUES À VÉRIFIER**

### **1. Token URL Doit Fonctionner**

L'endpoint `/api/auth/token` **DOIT** :
- ✅ Accepter `POST` avec `Content-Type: application/x-www-form-urlencoded`
- ✅ Valider les credentials client (`client_id` + `client_secret`)
- ✅ Échanger le code contre un token
- ✅ Retourner le format exact :

```json
{
  "access_token": "example_token",
  "token_type": "bearer",
  "refresh_token": "example_token",
  "expires_in": 3600
}
```

### **2. Headers d'Authentification**

ChatGPT envoie **TOUJOURS** :
```
Authorization: Bearer [user's token]
```

**Si ce header n'est pas reçu, le problème est :**
- ❌ **Token non généré** lors de l'échange OAuth
- ❌ **Token invalide** ou expiré
- ❌ **Problème de transmission** des headers

---

## 🧪 **TESTS DE VALIDATION**

### **1. Test de l'Endpoint Token**

```bash
# Test de l'échange code → token
curl -X POST https://scrivia.app/api/auth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=test_code&client_id=scrivia-custom-gpt&client_secret=scrivia-gpt-secret-2024&redirect_uri=https://chat.openai.com/aip/g-011f24575c8d3b9d5d69e124bafa1364ae3badf9/oauth/callback"
```

**Résultat attendu :**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "refresh_token": "eyJ...",
  "expires_in": 3600
}
```

### **2. Test avec le Token**

```bash
# Test de l'utilisation du token
curl -H "Authorization: Bearer [TOKEN_RECU]" \
     https://scrivia.app/api/ui/classeurs
```

**Résultat attendu :** Liste des classeurs (200 OK)

---

## 🔍 **DIAGNOSTIC DU PROBLÈME**

### **1. Vérifier les Logs du Serveur**

Regardez les logs qui commencent par `🔍 [TOKEN]` :

```
🔍 [TOKEN] Début traitement requête token OAuth
🔍 [TOKEN] Content-Type reçu: application/x-www-form-urlencoded
🔍 [TOKEN] Body reçu: grant_type=authorization_code&code=...
🔍 [TOKEN] Paramètres parsés: { grant_type: 'authorization_code', ... }
```

### **2. Vérifier l'Échange Code → Token**

```
🔍 [TOKEN] Début échange code contre token...
✅ [TOKEN] Échange code→token réussi
✅ [TOKEN] Réponse validée, envoi du token...
```

### **3. Vérifier l'Utilisation du Token**

```
🚨 [AUTH] ===== DÉBUT GETAUTHENTICATEDUSER =====
🚨 [AUTH] Header Authorization reçu: Bearer eyJ...
🚨 [AUTH] ✅ Token validé pour utilisateur: [user_id]
```

---

## 🛠️ **SOLUTIONS AUX PROBLÈMES COURANTS**

### **Problème 1 : "Token URL not found"**
**Solution :** Vérifier que `/api/auth/token` est accessible et fonctionnel

### **Problème 2 : "Invalid client credentials"**
**Solution :** Vérifier `client_id` et `client_secret` dans la base de données

### **Problème 3 : "Invalid authorization code"**
**Solution :** Vérifier que le code est valide et non expiré

### **Problème 4 : "Header Authorization missing"**
**Solution :** Vérifier que le token est bien généré et que ChatGPT l'utilise

---

## 📋 **CHECKLIST DE CONFIGURATION**

- [ ] **OAuth Client ID** configuré dans ChatGPT : `scrivia-custom-gpt`
- [ ] **OAuth Client Secret** configuré dans ChatGPT : `scrivia-gpt-secret-2024`
- [ ] **Authorization URL** configurée : `https://scrivia.app/auth`
- [ ] **Token URL** configurée : `https://scrivia.app/api/auth/token`
- [ ] **Scope** configuré : `notes:read notes:write dossiers:read dossiers:write classeurs:read classeurs:write profile:read`
- [ ] **Endpoint token** accessible et fonctionnel
- [ ] **Échange code → token** fonctionne
- [ ] **Token généré** et valide
- [ ] **Headers Authorization** reçus correctement

---

## 🎯 **PROCHAINES ÉTAPES**

1. **Vérifier la configuration** OAuth dans ChatGPT
2. **Tester l'endpoint token** avec curl
3. **Exécuter le script de test** `test-oauth-complete-flow.js`
4. **Analyser les logs** pour identifier le problème exact
5. **Corriger le problème** identifié
6. **Tester l'authentification** complète

---

## 📞 **SUPPORT**

Si le problème persiste :

1. **Partagez la configuration** OAuth de ChatGPT
2. **Partagez les logs** de l'endpoint token
3. **Partagez les logs** de l'authentification
4. **Testez avec le script** `test-oauth-complete-flow.js`

**Fichiers de test créés :**
- ✅ `test-oauth-complete-flow.js` - Test complet du flux OAuth
- ✅ `CHATGPT-OAUTH-CONFIG-GUIDE.md` - Ce guide de configuration

---

## 🔍 **COMMANDES DE TEST RAPIDE**

```bash
# 1. Test de l'endpoint token
curl -X POST http://localhost:3000/api/auth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=test&client_id=scrivia-custom-gpt&client_secret=scrivia-gpt-secret-2024&redirect_uri=https://chat.openai.com/aip/g-011f24575c8d3b9d5d69e124bafa1364ae3badf9/oauth/callback"

# 2. Test complet du flux
node test-oauth-complete-flow.js

# 3. Vérifier les logs dans la console du serveur
```

Maintenant, suivez ce guide étape par étape pour configurer correctement l'OAuth ChatGPT ! 🚀
