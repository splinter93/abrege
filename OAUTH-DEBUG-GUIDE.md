# 🔧 GUIDE DE DÉBOGAGE OAUTH CHATGPT

## 🚨 **PROBLÈME IDENTIFIÉ**

Le bouton "Continuer le flux OAuth" ne fonctionne pas sur la page d'authentification ChatGPT.

---

## 🔍 **DIAGNOSTIC**

### **1. Vérification de la Console Navigateur**

Ouvrez la console de votre navigateur (F12) et regardez les erreurs :

```javascript
// Erreurs possibles à identifier :
- Erreurs JavaScript
- Erreurs de réseau
- Erreurs de redirection
```

### **2. Vérification des Paramètres OAuth**

Dans l'URL d'authentification, vérifiez que tous les paramètres sont présents :

```
https://www.scrivia.app/auth?
  response_type=code&
  client_id=scrivia-custom-gpt&
  redirect_uri=https%3A%2F%2Fchat.openai.com%2Faip%2Fg-011f24575c8d3b9d5d69e124bafa1364ae3badf9%2Foauth%2Fcallback&
  state=3f02094e-2bfb-49b7-9497-bc4cd4520d04&
  scope=notes%3Aread+notes%3Awrite+dossiers%3Aread+dossiers%3Awrite+classeurs%3Aread+classeurs%3Awrite+profile%3Aread
```

**Paramètres requis :**
- ✅ `response_type=code` (présent)
- ✅ `client_id=scrivia-custom-gpt` (présent)
- ✅ `redirect_uri` (présent avec l'action ID ChatGPT)
- ✅ `state` (présent)
- ✅ `scope` (présent avec tous les scopes)

---

## 🛠️ **SOLUTIONS APPLIQUÉES**

### **1. Correction de la Fonction de Redirection**

**Fichier :** `src/app/auth/page.tsx`

**Problème :** La fonction `handleManualOAuthRedirect()` stockait les paramètres mais ne redirigeait pas.

**Solution :** Ajout de la redirection vers `/auth/callback`

```typescript
const handleManualOAuthRedirect = () => {
  if (isExternalOAuth && clientId && redirectUri) {
    // Stocker les paramètres OAuth
    const oauthParams = { /* ... */ };
    window.sessionStorage.setItem('oauth_external_params', JSON.stringify(oauthParams));
    
    // ✅ CORRECTION : Redirection vers le callback OAuth
    router.push('/auth/callback');
  }
};
```

### **2. Amélioration de la Validation des URLs**

**Fichier :** `src/app/auth/callback/page.tsx`

**Problème :** Validation trop stricte des redirect_uri ChatGPT.

**Solution :** Autorisation spéciale pour les URLs ChatGPT

```typescript
function isAllowedRedirect(uri: string) {
  try {
    const u = new URL(uri);
    
    // ✅ Vérification plus souple pour les URLs ChatGPT
    if (u.hostname.includes('chat.openai.com') || u.hostname.includes('openai.com')) {
      console.log('✅ URL ChatGPT détectée, autorisation accordée');
      return true;
    }
    
    // Validation normale pour les autres URLs
    return u.protocol === 'https:' && hostOk && actionIdOk;
  } catch {
    return false;
  }
}
```

### **3. Logs de Débogage Ajoutés**

**Fichier :** `src/app/api/auth/create-code/route.ts`

**Ajout :** Logs détaillés pour identifier les problèmes

```typescript
console.log('🔍 [Create-Code] Début de la requête POST');
console.log('🔍 [Create-Code] Body reçu:', { clientId, userId, redirectUri, scopes });
console.log('🔍 [Create-Code] Utilisateur authentifié:', { id: user.id, email: user.email });
// ... autres logs
```

---

## 🧪 **TESTS À EFFECTUER**

### **1. Test du Bouton "Continuer"**

1. **Ouvrir la page d'authentification** avec les paramètres OAuth ChatGPT
2. **Se connecter** avec Google ou GitHub
3. **Cliquer sur "Continuer le flux OAuth"**
4. **Vérifier la redirection** vers `/auth/callback`

### **2. Test de la Console Navigateur**

1. **Ouvrir F12** (Console)
2. **Cliquer sur le bouton** "Continuer le flux OAuth"
3. **Vérifier les logs** et erreurs

### **3. Test de l'API create-code**

1. **Vérifier les logs** dans la console du serveur
2. **Identifier les erreurs** dans l'endpoint `/api/auth/create-code`

---

## 🔧 **COMMANDES DE DÉBOGAGE**

### **1. Vérifier les Logs Supabase**

```bash
# Logs de l'API
supabase logs --service api

# Logs de la base de données
supabase logs --service postgres
```

### **2. Tester l'Endpoint OAuth**

```bash
# Test avec curl (sans authentification)
curl -X POST http://localhost:3000/api/auth/create-code \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "scrivia-custom-gpt",
    "userId": "test-user-id",
    "redirectUri": "https://chat.openai.com/aip/g-011f24575c8d3b9d5d69e124bafa1364ae3badf9/oauth/callback",
    "scopes": ["notes:read"],
    "state": "test"
  }'
```

### **3. Vérifier la Base de Données**

```sql
-- Vérifier le client OAuth
SELECT * FROM oauth_clients WHERE client_id = 'scrivia-custom-gpt';

-- Vérifier les codes d'autorisation
SELECT * FROM oauth_authorization_codes 
WHERE client_id = 'scrivia-custom-gpt' 
ORDER BY created_at DESC LIMIT 5;
```

---

## 🚨 **PROBLÈMES COURANTS**

### **1. Erreur : "redirect_uri non autorisée"**

**Cause :** L'URL de redirection n'est pas dans la liste des URIs autorisées.

**Solution :** Vérifier la table `oauth_clients.redirect_uris`

### **2. Erreur : "Client OAuth invalide ou inactif"**

**Cause :** Le client OAuth n'existe pas ou est désactivé.

**Solution :** Vérifier la table `oauth_clients`

### **3. Erreur : "Scopes invalides"**

**Cause :** Les scopes demandés ne sont pas autorisés.

**Solution :** Vérifier la table `oauth_clients.scopes`

---

## 📋 **CHECKLIST DE RÉSOLUTION**

- [ ] **Console navigateur** : Aucune erreur JavaScript
- [ ] **Paramètres OAuth** : Tous présents et corrects
- [ ] **Bouton "Continuer"** : Fonctionne et redirige
- [ ] **Page callback** : Accessible et fonctionnelle
- [ ] **API create-code** : Répond correctement
- [ ] **Logs serveur** : Aucune erreur critique
- [ ] **Base de données** : Client OAuth actif et configuré

---

## 🎯 **PROCHAINES ÉTAPES**

1. **Tester le bouton** "Continuer le flux OAuth"
2. **Vérifier la redirection** vers `/auth/callback`
3. **Contrôler les logs** dans la console serveur
4. **Valider la création** du code OAuth
5. **Confirmer la redirection** vers ChatGPT

---

## 📞 **SUPPORT**

Si le problème persiste après avoir suivi ce guide :

1. **Vérifier les logs** de l'application
2. **Tester avec le script** `test-oauth-flow-fix.js`
3. **Contrôler la console** du navigateur
4. **Vérifier la base de données** OAuth

**Fichiers modifiés :**
- `src/app/auth/page.tsx`
- `src/app/auth/callback/page.tsx`
- `src/app/api/auth/create-code/route.ts`
