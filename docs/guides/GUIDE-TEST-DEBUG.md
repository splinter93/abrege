# 🚨 GUIDE COMPLET DE TEST ET DEBUG - ERREUR "Article non trouvé"

## 🎯 **OBJECTIF**
Identifier exactement où l'erreur "Article non trouvé" se produit dans la chaîne d'appels de l'éditeur.

---

## 🔧 **PRÉPARATION**

### **1. Logs ajoutés dans le code**
- ✅ **API V2** : Logs détaillés dans `/api/v2/note/[ref]/share`
- ✅ **checkUserPermission** : Logs détaillés dans la fonction de permissions
- ✅ **Éditeur** : Logs détaillés dans `handleShareSettingsChange`

### **2. Scripts de test créés**
- ✅ `scripts/test-share-error.js` - Instructions de test
- ✅ `scripts/test-editor-share-api.js` - Test de l'API de l'éditeur

---

## 🧪 **ÉTAPES DE TEST**

### **Étape 1: Préparer l'environnement**
```bash
# 1. Démarrer Next.js
npm run dev

# 2. Ouvrir le navigateur sur http://localhost:3000
# 3. Se connecter avec un compte valide
```

### **Étape 2: Ouvrir la console du navigateur**
1. **Appuyer sur F12** (ou clic droit → Inspecter)
2. **Aller dans l'onglet Console**
3. **Vider la console** (icône 🗑️)
4. **S'assurer que les logs sont visibles**

### **Étape 3: Reproduire l'erreur**
1. **Ouvrir une note** dans l'éditeur
2. **Cliquer sur le menu "..." (kebab)** en haut à droite
3. **Cliquer sur "Partager"**
4. **Modifier les paramètres de partage** (ex: changer la visibilité)
5. **Cliquer sur "Sauvegarder"**

### **Étape 4: Observer les logs**
**Dans la console du navigateur, chercher :**
```
🚨 [EDITOR] ===== DÉBUT HANDLESHARESETTINGSCHANGE =====
🚨 [EDITOR] noteId: [UUID]
🚨 [EDITOR] newSettings: [OBJET]
🚨 [EDITOR] URL API: /api/v2/note/[noteId]/share
🚨 [EDITOR] Réponse reçue: [OBJET]
```

**Dans le terminal Next.js, chercher :**
```
🚨 [DEBUG] ===== DÉBUT API V2 SHARE =====
🚨 [DEBUG] Ref reçue: [noteId]
🚨 [DEBUG] ===== DÉBUT CHECKUSERPERMISSION =====
🚨 [DEBUG] Paramètres reçus: [OBJET]
```

---

## 🔍 **ANALYSE DES LOGS**

### **Logs de l'éditeur (navigateur)**
- ✅ **noteId** : Doit être un UUID valide
- ✅ **newSettings** : Doit contenir les bonnes propriétés
- ✅ **URL API** : Doit être correcte
- ✅ **Réponse** : Doit montrer le statut HTTP

### **Logs de l'API V2 (terminal Next.js)**
- ✅ **Ref reçue** : Doit correspondre au noteId
- ✅ **Authentification** : Doit réussir
- ✅ **Résolution référence** : Doit fonctionner
- ✅ **checkUserPermission** : Doit être appelé

### **Logs de checkUserPermission (terminal Next.js)**
- ✅ **Paramètres reçus** : Doit contenir les bonnes valeurs
- ✅ **Requête propriétaire** : Doit réussir
- ✅ **Résultat** : Doit montrer les permissions

---

## 🚨 **POINTS DE DÉFAILLANCE POTENTIELS**

### **1. Dans l'éditeur**
- ❌ **Session expirée** : Pas de token d'authentification
- ❌ **noteId invalide** : UUID malformé ou inexistant
- ❌ **URL API incorrecte** : Route mal configurée

### **2. Dans l'API V2**
- ❌ **Authentification échouée** : Token invalide ou expiré
- ❌ **Résolution référence échouée** : Slug/ID non trouvé
- ❌ **checkUserPermission échoué** : Erreur de base de données

### **3. Dans checkUserPermission**
- ❌ **Requête propriétaire échouée** : Article non trouvé
- ❌ **Permissions insuffisantes** : Utilisateur non propriétaire
- ❌ **Exception non gérée** : Erreur de code

---

## 📊 **INTERPRÉTATION DES RÉSULTATS**

### **Scénario 1: Logs de l'éditeur manquants**
**Problème :** L'erreur se produit avant l'appel à l'API
**Solution :** Vérifier la logique de l'éditeur

### **Scénario 2: Logs de l'API V2 manquants**
**Problème :** L'erreur se produit dans le routing Next.js
**Solution :** Vérifier la configuration des routes

### **Scénario 3: Logs de checkUserPermission manquants**
**Problème :** L'erreur se produit dans l'API V2 avant checkUserPermission
**Solution :** Vérifier la résolution de référence

### **Scénario 4: Tous les logs présents mais erreur finale**
**Problème :** L'erreur se produit dans checkUserPermission
**Solution :** Analyser les logs de la fonction

---

## 🔧 **ACTIONS DE CORRECTION**

### **Si l'erreur est dans l'éditeur :**
1. Vérifier l'authentification
2. Vérifier le noteId
3. Vérifier la construction de l'URL

### **Si l'erreur est dans l'API V2 :**
1. Vérifier l'authentification
2. Vérifier la résolution de référence
3. Vérifier les politiques RLS

### **Si l'erreur est dans checkUserPermission :**
1. Vérifier la requête à la base de données
2. Vérifier les politiques RLS
3. Vérifier la logique de permissions

---

## 📋 **CHECKLIST DE TEST**

- [ ] **Navigateur ouvert** sur http://localhost:3000
- [ ] **Console ouverte** (F12 → Console)
- [ ] **Utilisateur connecté** avec un compte valide
- [ ] **Note ouverte** dans l'éditeur
- [ ] **Menu partage ouvert** (kebab → Partager)
- [ ] **Paramètres modifiés** et sauvegardés
- [ ] **Logs observés** dans la console et le terminal
- [ ] **Erreur reproduite** avec logs détaillés

---

## 🎯 **RÉSULTAT ATTENDU**

**Après ce test, nous devons avoir :**
1. ✅ **Logs complets** de toute la chaîne d'appels
2. ✅ **Identification précise** du point de défaillance
3. ✅ **Données de debug** pour corriger le problème
4. ✅ **Solution ciblée** au lieu de corrections générales

---

## 🆘 **EN CAS DE PROBLÈME**

### **Si les logs n'apparaissent pas :**
1. Vérifier que le code a été sauvegardé
2. Redémarrer Next.js
3. Vider le cache du navigateur

### **Si l'erreur ne se reproduit pas :**
1. Vérifier que vous êtes sur la bonne note
2. Essayer avec une autre note
3. Vérifier les paramètres de partage

### **Si les logs sont incomplets :**
1. Vérifier que tous les fichiers ont été modifiés
2. Redémarrer Next.js
3. Vérifier la console pour les erreurs JavaScript

---

## 💡 **CONCLUSION**

**Ce guide va nous permettre d'identifier exactement où l'erreur "Article non trouvé" se produit.**

**Une fois le point de défaillance identifié, nous pourrons :**
- 🔧 **Corriger le problème spécifique**
- ✅ **Valider la correction**
- 🚀 **Rendre le système de partage fonctionnel**

**Suivez les étapes et partagez les logs pour que je puisse vous aider à résoudre le problème !** 🎯 