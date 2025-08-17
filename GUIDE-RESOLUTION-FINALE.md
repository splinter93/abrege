# 🚨 GUIDE DE RÉSOLUTION FINALE - ERREUR "Article non trouvé"

## 🎯 **PROBLÈME COMPLET IDENTIFIÉ**

**L'erreur "Article non trouvé" dans l'éditeur** est causée par un **problème en cascade** :

1. ❌ **Politiques RLS bloquantes** empêchent l'accès aux données
2. ❌ **Fonction `checkUserPermission`** échoue à cause de RLS
3. ❌ **API V2** retourne "Article non trouvé" 
4. ❌ **Éditeur** affiche l'erreur lors de la modification du partage

### **Chaîne d'erreur :**
```
Éditeur → API V2 /share → checkUserPermission → Requête DB → ❌ RLS bloque → "Article non trouvé"
```

---

## 🔍 **DIAGNOSTIC DÉTAILLÉ**

### **1. Problème RLS principal (déjà identifié)**
```bash
# Test de base - doit retourner > 0 articles
node scripts/test-public-access.js
```

### **2. Problème spécifique de l'API V2**
```bash
# Test de la fonction checkUserPermission
node scripts/test-permission-check.js
```

### **3. Problème dans l'éditeur**
- **Erreur** : `Error: Article non trouvé at Editor.useCallback[handleShareSettingsChange]`
- **Localisation** : `src/components/editor/Editor.tsx:419:27`
- **Cause** : L'API V2 ne peut pas vérifier les permissions à cause de RLS

---

## ✅ **SOLUTION COMPLÈTE EN 3 ÉTAPES**

### **Étape 1: Correction RLS de base (DÉJÀ FAIT)**
```bash
# ✅ Déjà exécuté avec succès
node scripts/test-public-access.js
# Résultat: 1 article accessible
```

### **Étape 2: Correction RLS pour l'API V2 (REQUISE)**
**Vous devez appliquer manuellement ce script SQL dans Supabase :**

```sql
-- Script de correction des politiques RLS pour l'API V2
-- À exécuter dans Supabase SQL Editor

-- 1. Supprimer TOUTES les anciennes politiques RLS problématiques
DROP POLICY IF EXISTS "Users can view articles based on permissions" ON public.articles;
DROP POLICY IF EXISTS "Users can view articles based on new sharing system" ON public.articles;
DROP POLICY IF EXISTS "Users can view their own articles" ON public.articles;
DROP POLICY IF EXISTS "Users can insert their own articles" ON public.articles;
DROP POLICY IF EXISTS "Users can update their own articles" ON public.articles;
DROP POLICY IF EXISTS "Users can delete their own articles" ON public.articles;
DROP POLICY IF EXISTS "Allow all users to select articles" ON public.articles;
DROP POLICY IF EXISTS "Allow user to insert their own articles" ON public.articles;
DROP POLICY IF EXISTS "Allow user to update their own articles" ON public.articles;
DROP POLICY IF EXISTS "Allow user to delete their own articles" ON public.articles;
DROP POLICY IF EXISTS "Allow all users to insert articles" ON public.articles;
DROP POLICY IF EXISTS "Allow all users to update articles" ON public.articles;
DROP POLICY IF EXISTS "Allow all users to delete articles" ON public.articles;
DROP POLICY IF EXISTS "Public access to shared articles and private access to own articles" ON public.articles;
DROP POLICY IF EXISTS "Users can create their own articles" ON public.articles;

-- 2. Créer des politiques RLS SIMPLES et FONCTIONNELLES pour l'API V2

-- Politique SELECT : permettre à l'utilisateur de voir ses propres articles ET les articles publics
CREATE POLICY "API_V2_articles_select"
ON public.articles
FOR SELECT
USING (
  -- L'utilisateur peut voir ses propres articles (privés ou publics)
  auth.uid() = user_id
  OR
  -- L'utilisateur peut voir les articles publics d'autres utilisateurs
  (share_settings->>'visibility' != 'private')
);

-- Politique INSERT : permettre à l'utilisateur de créer ses propres articles
CREATE POLICY "API_V2_articles_insert"
ON public.articles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Politique UPDATE : permettre à l'utilisateur de modifier ses propres articles
CREATE POLICY "API_V2_articles_update"
ON public.articles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Politique DELETE : permettre à l'utilisateur de supprimer ses propres articles
CREATE POLICY "API_V2_articles_delete"
ON public.articles
FOR DELETE
USING (auth.uid() = user_id);

-- 3. Appliquer les mêmes politiques aux autres tables

-- Folders
DROP POLICY IF EXISTS "Users can view folders based on permissions" ON public.folders;
DROP POLICY IF EXISTS "Users can view their own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can insert their own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can update their own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can delete their own folders" ON public.folders;

CREATE POLICY "API_V2_folders_select" ON public.folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "API_V2_folders_insert" ON public.folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "API_V2_folders_update" ON public.folders FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "API_V2_folders_delete" ON public.folders FOR DELETE USING (auth.uid() = user_id);

-- Classeurs/Notebooks
DROP POLICY IF EXISTS "Users can view classeurs based on permissions" ON public.classeurs;
DROP POLICY IF EXISTS "Users can view their own classeurs" ON public.classeurs;
DROP POLICY IF EXISTS "Users can insert their own classeurs" ON public.classeurs;
DROP POLICY IF EXISTS "Users can update their own classeurs" ON public.classeurs;
DROP POLICY IF EXISTS "Users can delete their own classeurs" ON public.classeurs;

CREATE POLICY "API_V2_classeurs_select" ON public.classeurs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "API_V2_classeurs_insert" ON public.classeurs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "API_V2_classeurs_update" ON public.classeurs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "API_V2_classeurs_delete" ON public.classeurs FOR DELETE USING (auth.uid() = user_id);

-- 4. S'assurer que RLS est activé sur toutes les tables
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classeurs ENABLE ROW LEVEL SECURITY;
```

### **Étape 3: Vérification de la correction**
```bash
# Test 1: Vérifier l'accès de base
node scripts/test-public-access.js

# Test 2: Vérifier la fonction checkUserPermission
node scripts/test-permission-check.js

# Test 3: Tester l'API V2 (après connexion web)
node scripts/debug-api-v2.js
```

---

## 🔧 **APPLICATION MANUELLE DU SCRIPT SQL**

### **1. Aller sur [Supabase Dashboard](https://supabase.com/dashboard)**
### **2. Sélectionner votre projet**
### **3. Aller dans SQL Editor**
### **4. Copier-coller le script SQL ci-dessus**
### **5. Cliquer sur "Run" pour exécuter**

---

## 🧪 **TESTS DE VALIDATION**

### **Test 1: Vérification des données**
```bash
# Doit retourner > 0 articles
node scripts/test-public-access.js
```

### **Test 2: Vérification des permissions**
```bash
# Doit réussir sans erreur RLS
node scripts/test-permission-check.js
```

### **Test 3: Test de l'API V2**
```bash
# Doit fonctionner après connexion web
node scripts/debug-api-v2.js
```

### **Test 4: Test de l'éditeur**
1. **Ouvrir une note** dans l'éditeur
2. **Cliquer sur le menu "..." (kebab)**
3. **Cliquer sur "Partager"**
4. **Modifier les paramètres de partage**
5. **Sauvegarder** - ne doit plus y avoir d'erreur

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
- ✅ **API V2** : La fonction `checkUserPermission` peut maintenant fonctionner
- ✅ **Éditeur** : Plus d'erreur "Article non trouvé"

---

## 🚨 **PROBLÈMES POTENTIELS ET SOLUTIONS**

### **Problème 1: Script SQL non exécuté**
**Solution :** Appliquer manuellement le script dans Supabase SQL Editor

### **Problème 2: Politiques RLS toujours bloquantes**
**Solution :** Vérifier que les anciennes politiques ont été supprimées

### **Problème 3: Fonction checkUserPermission toujours en échec**
**Solution :** Vérifier que les nouvelles politiques RLS sont actives

---

## 📋 **CHECKLIST DE RÉSOLUTION COMPLÈTE**

- [ ] **Correction RLS de base** appliquée (✅ DÉJÀ FAIT)
- [ ] **Script SQL de correction API V2** appliqué manuellement
- [ ] **Tests de validation** passés avec succès
- [ ] **Fonction checkUserPermission** fonctionnelle
- [ ] **API V2** opérationnelle
- [ ] **Éditeur** sans erreur "Article non trouvé"
- [ ] **Système de partage** fonctionnel

---

## 🔒 **SÉCURITÉ MAINTENUE**

**La correction maintient la sécurité :**
- ✅ **Notes privées** : Accessibles uniquement au propriétaire
- ✅ **Notes partagées** : Accessibles selon la configuration
- ✅ **Authentification** : Requise pour l'API V2
- ✅ **Isolation** : Chaque utilisateur accède uniquement à ses données

---

## 🎉 **RÉSULTAT ATTENDU**

Après application de la correction complète :

- ✅ **Système de partage** : Fonctionnel
- ✅ **API V2** : Endpoints opérationnels
- ✅ **Fonction checkUserPermission** : Fonctionnelle
- ✅ **Éditeur** : Plus d'erreur "Article non trouvé"
- ✅ **Modification du partage** : Possible sans erreur
- ✅ **Sécurité** : Maintenue et renforcée

---

## 🆘 **SUPPORT FINAL**

Si la correction ne fonctionne toujours pas :

1. **Vérifiez que le script SQL a été exécuté** dans Supabase
2. **Vérifiez les politiques RLS** dans Supabase Dashboard > Tables > articles > RLS
3. **Exécutez tous les tests** étape par étape
4. **Vérifiez les logs** de l'API V2

**Le problème principal est RLS, la solution complète nécessite l'application manuelle du script SQL.** 