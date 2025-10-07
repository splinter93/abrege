# 🧪 GUIDE DE TEST - FIX ERREUR 401 PROD

## 🎯 Objectif

Tester la correction de l'erreur 401 sur les tool calls en production.

---

## ⚡ TEST RAPIDE (5 minutes)

### **Étape 1 : Test en Local**

```bash
# Terminal 1 : Lancer l'app en local
cd /Users/k/Documents/Cursor\ Workspace/abrege
npm run dev

# Attendre que le serveur soit prêt sur http://localhost:3000
```

1. **Ouvrir** : http://localhost:3000
2. **Se connecter** (si pas déjà connecté)
3. **Aller sur le chat** : http://localhost:3000/chat
4. **Envoyer un message** qui déclenche un tool call :
   ```
   Crée-moi un classeur appelé "Test Token Fix"
   ```

5. **Vérifier dans la console du navigateur** (F12) :
   ```
   ✅ [TokenManager] Token valide
   ✅ [ChatFullscreenV2] 🔐 Token validé
   ✅ Tool call exécuté avec succès
   ```

6. **Vérifier dans les logs du serveur** (Terminal 1) :
   ```
   ✅ [TokenManager] ✅ Token valide depuis le cache
   ✅ [ApiV2HttpClient] 🔑 Authentification JWT
   ✅ [ApiV2HttpClient] ✅ POST /api/v2/classeur/create success
   ```

### **Résultat Attendu**
- ✅ Le classeur est créé sans erreur
- ✅ Aucune erreur 401 dans les logs
- ✅ Les logs montrent que le token est valide

---

### **Étape 2 : Test du Diagnostic**

```bash
# Terminal 2 : Ouvrir la console du navigateur (F12)
# Exécuter cette commande pour récupérer le token :

supabase.auth.getSession().then(d => {
  const token = d.data.session?.access_token;
  console.log('Token:', token?.substring(0, 30) + '...');
  console.log('Expires:', new Date((d.data.session?.expires_at || 0) * 1000).toISOString());
  
  // Copier le token complet dans le presse-papier
  navigator.clipboard.writeText(token || '');
  console.log('✅ Token copié dans le presse-papier');
});
```

```bash
# Terminal 3 : Tester l'endpoint de diagnostic avec le token
export TEST_TOKEN="<COLLER_LE_TOKEN_ICI>"

curl -X POST http://localhost:3000/api/debug/token \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json" | jq
```

### **Résultat Attendu**
```json
{
  "success": true,
  "diagnostics": {
    "authHeader": {
      "present": true,
      "startsWithBearer": true,
      "tokenLength": 512
    },
    "supabaseValidation": {
      "success": true,
      "userId": "xxx-xxx-xxx",
      "userEmail": "votre@email.com"
    },
    "executionTime": "150ms"
  }
}
```

---

### **Étape 3 : Déploiement en Production**

```bash
# Commiter et pousser les changements
git add .
git commit -m "fix: Correction erreur 401 sur tool calls en production avec TokenManager et logs"
git push origin main

# Vercel va déployer automatiquement (1-2 minutes)
```

### **Vérifier le déploiement Vercel**
1. Aller sur https://vercel.com/dashboard
2. Sélectionner le projet
3. Vérifier que le déploiement est "Ready" (vert)

---

### **Étape 4 : Test en Production**

1. **Ouvrir** : https://votre-app.vercel.app
2. **Se connecter**
3. **Aller sur le chat**
4. **Envoyer le même message** :
   ```
   Crée-moi un classeur appelé "Test Token Fix Production"
   ```

5. **Vérifier dans la console du navigateur** (F12) :
   ```
   ✅ [TokenManager] Token valide
   ✅ [ChatFullscreenV2] 🔐 Token validé
   ✅ Tool call exécuté avec succès
   ```

6. **Vérifier les logs Vercel** :
   - Aller sur Vercel Dashboard > Functions > Logs
   - Chercher les logs récents
   - Vérifier qu'il n'y a pas d'erreur 401

### **Résultat Attendu**
- ✅ Le classeur est créé en production
- ✅ Aucune erreur 401 dans les logs Vercel
- ✅ Les logs montrent le refresh du token si nécessaire

---

## 🔍 DIAGNOSTIC AVANCÉ

### **Si l'erreur 401 persiste en production :**

#### **1. Vérifier le token en production**
```javascript
// Console du navigateur en production
supabase.auth.getSession().then(({ data }) => {
  const token = data.session?.access_token;
  const expiresAt = data.session?.expires_at;
  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = (expiresAt || 0) - now;
  
  console.log('Token:', token?.substring(0, 30) + '...');
  console.log('Expires in:', timeUntilExpiry, 'seconds');
  console.log('Expires at:', new Date((expiresAt || 0) * 1000).toISOString());
  
  if (timeUntilExpiry < 300) {
    console.warn('⚠️ Token expire bientôt, refresh recommandé');
  }
});
```

#### **2. Tester l'endpoint de diagnostic en prod**
```bash
# Avec le token récupéré à l'étape 1
export TEST_TOKEN="<TOKEN_PROD>"
export PROD_URL="https://votre-app.vercel.app"

curl -X POST $PROD_URL/api/debug/token \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json" | jq
```

#### **3. Utiliser le script automatique**
```bash
# Le script pose des questions et teste automatiquement
cd /Users/k/Documents/Cursor\ Workspace/abrege
export PROD_URL="https://votre-app.vercel.app"
./scripts/test-token-diagnostic.sh
```

#### **4. Vérifier les variables d'environnement Vercel**
1. Aller sur Vercel Dashboard > Settings > Environment Variables
2. Vérifier que ces variables sont présentes et correctes :
   - ✅ `NEXT_PUBLIC_SUPABASE_URL`
   - ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - ✅ `SUPABASE_SERVICE_ROLE_KEY`

#### **5. Examiner les logs Vercel en détail**
```bash
# Ou utiliser la CLI Vercel
vercel logs --follow

# Chercher les logs spécifiques
vercel logs | grep "TokenManager"
vercel logs | grep "ApiV2HttpClient"
vercel logs | grep "401"
```

---

## 📊 COMPARAISON LOCAL vs PROD

| Aspect | Local | Production | Status |
|--------|-------|------------|--------|
| **Token Storage** | localStorage | localStorage | ✅ |
| **Token Refresh** | Auto (TokenManager) | Auto (TokenManager) | ✅ |
| **Logs détaillés** | ✅ | ✅ | ✅ |
| **URL Base** | localhost:3000 | vercel.app | ✅ |
| **Diagnostic Endpoint** | ✅ | ✅ | ✅ |

---

## ✅ CHECKLIST DE VALIDATION

### **En Local**
- [ ] Serveur lancé (`npm run dev`)
- [ ] Test d'un tool call réussi
- [ ] Logs `[TokenManager]` présents
- [ ] Logs `[ApiV2HttpClient]` présents
- [ ] Aucune erreur 401 dans les logs

### **En Production**
- [ ] Déploiement Vercel terminé
- [ ] Variables d'environnement configurées
- [ ] Test d'un tool call réussi
- [ ] Logs Vercel vérifiés
- [ ] Aucune erreur 401 dans les logs Vercel

### **Diagnostic**
- [ ] Endpoint `/api/debug/token` fonctionne en local
- [ ] Endpoint `/api/debug/token` fonctionne en prod
- [ ] Script `test-token-diagnostic.sh` exécuté avec succès

---

## 🎉 SUCCÈS

Si tous les tests passent :
- ✅ Les tool calls fonctionnent en local
- ✅ Les tool calls fonctionnent en production
- ✅ Le TokenManager refresh automatiquement les tokens expirés
- ✅ Les logs permettent de diagnostiquer facilement les problèmes

**La correction est opérationnelle !** 🚀

---

## 🆘 SUPPORT

En cas de problème persistant, fournir ces informations :

1. **Logs du navigateur** (Console F12)
2. **Logs Vercel** (Functions > Logs)
3. **Résultat de l'endpoint de diagnostic** (en local et prod)
4. **Variables d'environnement** (masquer les valeurs sensibles)
5. **Version de Node.js** et **Version de Next.js**

Documentation complète : `docs/corrections/FIX-ERREUR-401-PROD-TOOLS.md`

