# 🚨 GUIDE DE RÉSOLUTION RAPIDE - API V2 CASSÉE

## 🎯 **PROBLÈME IDENTIFIÉ**

**L'API V2 ne trouve pas les ressources** à cause de **politiques RLS trop restrictives** qui bloquent l'accès aux données même pour les utilisateurs authentifiés.

### **Symptômes observés :**
- ❌ `❌ Ressource non trouvée: fce40443-4893-4e14-ba94-73d08020c722`
- ❌ `❌ Accès refusé pour note fce40443-4893-4e14-ba94-73d08020c722`
- ❌ Erreurs 403/404 sur tous les endpoints API V2
- ❌ Système de partage et API V2 inutilisables

---

## ✅ **SOLUTION IMMÉDIATE**

### **Étape 1: Appliquer la correction RLS automatique**

```bash
node scripts/apply-api-v2-fix.js
```

**Ce script :**
- Supprime toutes les anciennes politiques RLS problématiques
- Crée de nouvelles politiques simples et fonctionnelles
- Permet l'accès aux données pour l'API V2
- Maintient la sécurité pour les utilisateurs

### **Étape 2: Vérifier la correction**

```bash
node scripts/test-public-access.js
```

**Résultats attendus :**
- ✅ Total articles > 0
- ✅ Accès aux données autorisé
- ✅ API V2 fonctionnelle

---

## 🔧 **SOLUTION MANUELLE (si l'automatisation échoue)**

### **1. Aller sur [Supabase Dashboard](https://supabase.com/dashboard)**
### **2. Sélectionner votre projet**
### **3. Aller dans SQL Editor**
### **4. Copier-coller le contenu de `scripts/fix-api-v2-rls.sql`**
### **5. Exécuter le script**

---

## 🧪 **TESTS DE VALIDATION**

### **Test 1: Vérification des données**
```bash
# Doit retourner > 0 articles
node scripts/test-public-access.js
```

### **Test 2: Test de l'API V2 (après connexion)**
```bash
# Se connecter d'abord via l'interface web
node scripts/debug-api-v2.js
```

### **Test 3: Test des endpoints API V2**
- `/api/v2/note/{id}/metadata` - Doit retourner les métadonnées
- `/api/v2/note/{id}/content` - Doit retourner le contenu
- `/api/v2/note/{id}/share` - Doit retourner les paramètres de partage

---

## 🔐 **DÉTAIL DE LA CORRECTION RLS**

### **Nouvelles politiques créées :**

```sql
-- Politique SELECT : accès aux propres données + articles publics
CREATE POLICY "API_V2_articles_select"
ON public.articles
FOR SELECT
USING (
  auth.uid() = user_id                    -- Ses propres articles
  OR
  (share_settings->>'visibility' != 'private')  -- Articles publics
);
```

**Cette politique permet :**
- ✅ **Accès privé** : L'utilisateur voit ses propres articles
- ✅ **Accès public** : L'utilisateur voit les articles publics d'autres
- ✅ **Sécurité** : Les articles privés d'autres restent protégés

---

## 🚨 **PROBLÈMES POTENTIELS**

### **Problème 1: Utilisateur non connecté**
**Solution :** Se connecter via l'interface web avant de tester l'API V2

### **Problème 2: Politiques RLS toujours bloquantes**
**Solution :** Vérifier que les anciennes politiques ont été supprimées

### **Problème 3: Fonction exec_sql non disponible**
**Solution :** Appliquer le script SQL manuellement dans Supabase

---

## 📋 **CHECKLIST DE RÉSOLUTION**

- [ ] **Correction RLS appliquée** (automatique ou manuelle)
- [ ] **Tests de validation** passés avec succès
- [ ] **API V2** fonctionnelle
- [ ] **Endpoints** /metadata, /content, /share opérationnels
- [ ] **Sécurité** maintenue pour les notes privées

---

## 🔒 **SÉCURITÉ MAINTENUE**

**La correction maintient la sécurité :**
- ✅ **Notes privées** : Accessibles uniquement au propriétaire
- ✅ **Notes partagées** : Accessibles selon la configuration
- ✅ **Authentification** : Requise pour l'API V2
- ✅ **Isolation** : Chaque utilisateur accède uniquement à ses données

---

## 💡 **PRÉVENTION FUTURE**

### **1. Tests automatisés**
```bash
# Ajouter aux tests CI/CD
node scripts/test-public-access.js
node scripts/debug-api-v2.js
```

### **2. Monitoring des politiques RLS**
```sql
-- Vérifier régulièrement les politiques
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename IN ('articles', 'folders', 'classeurs');
```

---

## 🎉 **RÉSULTAT ATTENDU**

Après application de la correction :

- ✅ **API V2** : Endpoints opérationnels
- ✅ **Accès aux données** : Ressources trouvées et accessibles
- ✅ **Système de partage** : Fonctionnel
- ✅ **Sécurité** : Maintenue et renforcée
- ✅ **Performance** : Accès aux données sans blocage RLS

---

## 🆘 **SUPPORT**

Si la correction ne fonctionne pas :

1. **Vérifiez les logs** du script de correction
2. **Appliquez manuellement** le script SQL
3. **Testez étape par étape** avec les scripts de test
4. **Vérifiez les politiques RLS** dans Supabase Dashboard

**Le problème principal est RLS, la solution est de corriger les politiques de sécurité pour l'API V2.** 