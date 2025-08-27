# 🤖 GUIDE DE CONFIGURATION OAUTH CHATGPT

## 🎯 **OBJECTIF**

Configurer l'authentification OAuth entre ChatGPT et votre application Scrivia pour permettre à ChatGPT d'accéder à votre API.

---

## 📋 **PRÉREQUIS**

- ✅ **Google Cloud Console** configuré avec OAuth 2.0
- ✅ **URL de callback ChatGPT** ajoutée dans Google Cloud
- ✅ **Base de données Supabase** avec les tables OAuth
- ✅ **Variables d'environnement** configurées

---

## 🚀 **ÉTAPES DE CONFIGURATION**

### **Étape 1 : Appliquer la Migration OAuth**

```bash
# Exécuter la migration pour créer les tables OAuth
supabase db push
```

### **Étape 2 : Configurer le Client OAuth ChatGPT**

```bash
# Installer les dépendances si nécessaire
npm install bcryptjs

# Exécuter le script de configuration
node scripts/setup-chatgpt-oauth.js
```

**Résultat attendu :**
```
🤖 CONFIGURATION OAUTH CHATGPT
================================

1️⃣ Vérification de la table oauth_clients...
✅ Table oauth_clients trouvée

2️⃣ Configuration du client OAuth ChatGPT...
✅ Client OAuth ChatGPT existe déjà
   ID: [UUID]
   Nom: Scrivia ChatGPT Action
   Actif: Oui

🔄 Mise à jour des redirect_uris...
✅ Redirect URIs et scopes mis à jour

3️⃣ Vérification de la configuration finale...
✅ Configuration finale:
   Client ID: scrivia-custom-gpt
   Nom: Scrivia ChatGPT Action
   Actif: Oui
   Redirect URIs: https://chat.openai.com/aip/g-011f24575c8d3b9d5d69e124bafa1364ae3badf9/oauth/callback, https://scrivia.app/auth/callback
   Scopes: notes:read, notes:write, dossiers:read, dossiers:write, classeurs:read, classeurs:write, profile:read

🎯 INSTRUCTIONS POUR CHATGPT:
================================
1. Dans ChatGPT, utilisez ces paramètres OAuth:
   - Client ID: scrivia-custom-gpt
   - Client Secret: scrivia-gpt-secret-2024
   - Redirect URI: https://chat.openai.com/aip/g-011f24575c8d3b9d5d69e124bafa1364ae3badf9/oauth/callback
2. Assurez-vous que l'URL de callback est bien configurée dans Google Cloud Console
3. Testez la connexion OAuth depuis ChatGPT

✅ Configuration OAuth ChatGPT terminée avec succès !
```

---

## 🔧 **CONFIGURATION CHATGPT**

### **Dans ChatGPT, utilisez ces paramètres :**

```json
{
  "client_id": "scrivia-custom-gpt",
  "client_secret": "scrivia-gpt-secret-2024",
  "redirect_uri": "https://chat.openai.com/aip/g-011f24575c8d3b9d5d69e124bafa1364ae3badf9/oauth/callback",
  "scopes": "notes:read notes:write dossiers:read dossiers:write classeurs:read classeurs:write profile:read"
}
```

---

## 🔍 **TEST DE LA CONFIGURATION**

### **1. Test depuis ChatGPT**

1. **Lancer la demande OAuth** depuis ChatGPT
2. **Vérifier la redirection** vers Google OAuth
3. **Confirmer l'authentification** avec votre compte Google
4. **Vérifier la redirection** vers votre callback
5. **Confirmer la redirection** vers ChatGPT

### **2. Vérification des Logs**

```bash
# Vérifier les logs de l'application
tail -f logs/app.log

# Vérifier les logs Supabase
supabase logs
```

---

## 🚨 **DÉPANNAGE**

### **Erreur : `redirect_uri_mismatch`**

**Cause :** L'URL de callback n'est pas configurée dans Google Cloud Console

**Solution :**
1. Aller sur [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** > **Credentials**
3. Modifier votre **OAuth 2.0 Client ID**
4. Ajouter dans **Authorized redirect URIs :**
   ```
   https://chat.openai.com/aip/g-011f24575c8d3b9d5d69e124bafa1364ae3badf9/oauth/callback
   https://scrivia.app/auth/callback
   http://localhost:3000/auth/callback
   ```

### **Erreur : `invalid_client`**

**Cause :** Le client OAuth n'existe pas dans la base de données

**Solution :**
```bash
# Réexécuter le script de configuration
node scripts/setup-chatgpt-oauth.js
```

### **Erreur : `invalid_redirect_uri`**

**Cause :** L'URL de redirection n'est pas autorisée

**Solution :**
1. Vérifier que l'URL est dans la liste des `redirect_uris` du client
2. Vérifier que le client est actif (`is_active = true`)

---

## 📚 **RESSOURCES**

- [Documentation OAuth 2.0](https://oauth.net/2/)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Auth](https://supabase.com/docs/guides/auth)

---

## ✅ **CHECKLIST FINALE**

- [ ] Migration OAuth appliquée
- [ ] Client OAuth ChatGPT créé
- [ ] Google Cloud Console configuré
- [ ] URL de callback ChatGPT ajoutée
- [ ] Test de connexion réussi
- [ ] Redirection vers ChatGPT fonctionnelle

---

## 🎉 **FÉLICITATIONS !**

Votre intégration OAuth ChatGPT est maintenant configurée et prête à être utilisée !

**Prochaines étapes :**
1. **Tester l'authentification** depuis ChatGPT
2. **Configurer les permissions** selon vos besoins
3. **Développer les endpoints API** pour ChatGPT
4. **Documenter l'utilisation** pour vos utilisateurs
