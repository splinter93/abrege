# 🚨 GUIDE DE RÉSOLUTION RAPIDE - Notes Invisibles dans les Classeurs

## 🎯 Problème Identifié

**Les notes ne s'affichent plus dans les classeurs** à cause d'une **incohérence entre les colonnes de base de données** :
- `classeur_id` : Utilisée par l'API V2 et le store Zustand
- `notebook_id` : Créée par les migrations mais pas synchronisée

## ✅ Solution Immédiate

### **Étape 1: Appliquer le Script SQL**

Copier-coller ce script dans **Supabase SQL Editor** :

```sql
-- Script de correction de l'incohérence notebook_id vs classeur_id
-- À exécuter dans Supabase SQL Editor

-- 1. Ajouter notebook_id à la table articles si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'articles' AND column_name = 'notebook_id'
    ) THEN
        ALTER TABLE articles ADD COLUMN notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE;
        RAISE NOTICE 'Colonne notebook_id ajoutée à articles';
    ELSE
        RAISE NOTICE 'Colonne notebook_id existe déjà dans articles';
    END IF;
END $$;

-- 2. Ajouter notebook_id à la table folders si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'folders' AND column_name = 'notebook_id'
    ) THEN
        ALTER TABLE folders ADD COLUMN notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE;
        RAISE NOTICE 'Colonne notebook_id ajoutée à folders';
    ELSE
        RAISE NOTICE 'Colonne notebook_id existe déjà dans folders';
    END IF;
END $$;

-- 3. Synchroniser les données existantes
UPDATE articles 
SET notebook_id = classeur_id 
WHERE classeur_id IS NOT NULL AND notebook_id IS NULL;

UPDATE folders 
SET notebook_id = classeur_id 
WHERE classeur_id IS NOT NULL AND notebook_id IS NULL;

-- 4. Créer des index pour les performances
CREATE INDEX IF NOT EXISTS idx_articles_notebook_id ON articles(notebook_id) WHERE notebook_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_folders_notebook_id ON folders(notebook_id) WHERE notebook_id IS NOT NULL;

-- 5. Vérifier le résultat
SELECT 
    'articles' as table_name,
    COUNT(*) as total_rows,
    COUNT(notebook_id) as rows_with_notebook_id,
    COUNT(classeur_id) as rows_with_classeur_id
FROM articles
UNION ALL
SELECT 
    'folders' as table_name,
    COUNT(*) as total_rows,
    COUNT(notebook_id) as rows_with_notebook_id,
    COUNT(classeur_id) as rows_with_classeur_id
FROM folders;
```

### **Étape 2: Redémarrer l'Application**

1. **Arrêter** le serveur de développement (`Ctrl+C`)
2. **Redémarrer** avec `npm run dev`
3. **Aller sur** `/private/dossiers`

### **Étape 3: Vérifier la Résolution**

✅ **Les classeurs s'affichent**  
✅ **Les dossiers sont visibles**  
✅ **Les notes sont visibles**  
✅ **La création fonctionne**

## 🔧 Corrections Déjà Appliquées

### **API Tree Corrigée** (`/api/v2/classeur/[ref]/tree/route.ts`)

- ✅ Support `classeur_id` ET `notebook_id`
- ✅ Requêtes avec `OR` pour compatibilité
- ✅ Retour des deux colonnes

### **V2UnifiedApi Corrigé**

- ✅ Chargement des classeurs avec contenu
- ✅ Mise à jour du store Zustand
- ✅ Polling intelligent

## 🚨 Points d'Attention

- **Le script SQL doit être appliqué manuellement** dans Supabase
- **Redémarrer l'application** après application du script
- **Vérifier les logs** pour confirmer la synchronisation

## 📊 Vérification

Après application du script, vous devriez voir :

```
table_name | total_rows | rows_with_notebook_id | rows_with_classeur_id
-----------|------------|----------------------|----------------------
articles   | X          | X                    | X
folders    | Y          | Y                    | Y
```

**Tous les compteurs doivent être identiques** pour confirmer la synchronisation.

## 🎯 Résultat Attendu

- ✅ **Notes visibles** dans tous les classeurs
- ✅ **Dossiers fonctionnels** avec navigation
- ✅ **Création d'éléments** opérationnelle
- ✅ **Système stable** et cohérent

---

**💡 Conseil** : Si le problème persiste après le script SQL, vérifiez les logs de l'API dans la console du navigateur. 