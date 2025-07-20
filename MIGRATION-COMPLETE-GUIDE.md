# 🚀 GUIDE COMPLET DE MIGRATION - API LLM-Friendly

## 🎯 **OBJECTIF**

Rendre l'API LLM-friendly 100% fonctionnelle avec support des slugs et IDs pour tous les endpoints.

## 📋 **ÉTAPES DE MIGRATION**

### **ÉTAPE 1 : Vérifier l'état actuel**
```bash
npm run verify-database
```

**Résultat attendu :**
- ❌ Colonnes slug manquantes
- 📊 Statistiques des données existantes
- 🔍 Vérification des index

### **ÉTAPE 2 : Migration SQL dans Supabase**

**Aller dans :** https://supabase.com/dashboard → Projet Abrège → SQL Editor

**Exécuter ce code SQL :**
```sql
-- Migration: Ajout des colonnes slug aux tables
-- Date: 2024-12-05

-- Ajouter la colonne slug à la table articles
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Créer un index unique sur slug et user_id pour les notes
CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_slug_user_id 
ON articles(slug, user_id) 
WHERE slug IS NOT NULL;

-- Ajouter la colonne slug à la table folders
ALTER TABLE folders 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Créer un index unique sur slug et user_id pour les dossiers
CREATE UNIQUE INDEX IF NOT EXISTS idx_folders_slug_user_id 
ON folders(slug, user_id) 
WHERE slug IS NOT NULL;

-- Ajouter la colonne slug à la table classeurs
ALTER TABLE classeurs 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Créer un index unique sur slug et user_id pour les classeurs
CREATE UNIQUE INDEX IF NOT EXISTS idx_classeurs_slug_user_id 
ON classeurs(slug, user_id) 
WHERE slug IS NOT NULL;
```

### **ÉTAPE 3 : Vérifier la migration**
```bash
npm run add-slug-columns
```

**Résultat attendu :**
```
✅ La colonne slug existe déjà dans la table articles
✅ La colonne slug existe déjà dans la table folders
✅ La colonne slug existe déjà dans la table classeurs
```

### **ÉTAPE 4 : Migrer les données existantes**
```bash
npm run migrate-slugs
```

**Résultat attendu :**
```
🔄 Migration des slugs pour les notes...
✅ Note migrée: "Titre de la note" -> "titre-de-la-note"
🔄 Migration des slugs pour les dossiers...
✅ Dossier migré: "Nom du dossier" -> "nom-du-dossier"
🔄 Migration des slugs pour les classeurs...
✅ Classeur migré: "Nom du classeur" -> "nom-du-classeur"
✅ Migration terminée !
```

### **ÉTAPE 5 : Vérifier la base de données**
```bash
npm run verify-database
```

**Résultat attendu :**
```
✅ La colonne slug existe dans la table articles
✅ La colonne slug existe dans la table folders
✅ La colonne slug existe dans la table classeurs
📊 Articles: X avec slug, 0 sans slug
📊 Folders: X avec slug, 0 sans slug
📊 Classeurs: X avec slug, 0 sans slug
🎉 Base de données prête pour l'API LLM-friendly !
```

### **ÉTAPE 6 : Tester l'API complète**
```bash
npm run test-endpoints
```

**Résultat attendu :**
```
🧪 Test complet de l'API LLM-Friendly
=====================================
🔍 Test: POST /note/create
✅ Succès (200): {"note": {...}}
🔍 Test: GET /notebooks
✅ Succès (200): {"notebooks": [...]}
🔍 Test: GET /note/[slug]/information
✅ Succès (200): {"note": {...}}
🎉 Tests terminés !
```

## 🎯 **ENDPOINTS LLM-FRIENDLY DISPONIBLES**

### **Création**
- `POST /api/v1/note/create` - Créer une note
- `POST /api/v1/folder/create` - Créer un dossier
- `POST /api/v1/notebook/create` - Créer un notebook

### **Liste**
- `GET /api/v1/notebooks` - Lister tous les notebooks

### **Récupération (par slug ou ID)**
- `GET /api/v1/note/[ref]/information` - Informations d'une note
- `GET /api/v1/note/[ref]/statistics` - Statistiques d'une note
- `GET /api/v1/note/[ref]/table-of-contents` - Table des matières
- `GET /api/v1/folder/[ref]` - Informations d'un dossier
- `GET /api/v1/notebook/[ref]` - Informations d'un notebook

### **Contenu**
- `POST /api/v1/note/[ref]/add-content` - Ajouter du contenu
- `POST /api/v1/note/[ref]/add-to-section` - Ajouter à une section
- `POST /api/v1/note/[ref]/clear-section` - Effacer une section

### **Gestion**
- `PUT /api/v1/note/[ref]` - Mettre à jour une note
- `DELETE /api/v1/note/[ref]` - Supprimer une note
- `PATCH /api/v1/note/[ref]/move` - Déplacer une note
- `POST /api/v1/folder/[ref]/move` - Déplacer un dossier

## 🧪 **TESTS MANUELS**

### **Test avec curl**
```bash
# Lister les notebooks
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/notebooks

# Créer une note
curl -X POST http://localhost:3000/api/v1/note/create \
  -H "Content-Type: application/json" \
  -d '{
    "source_title": "Test LLM-Friendly",
    "markdown_content": "# Test\n\nContenu de test."
  }'

# Récupérer une note par slug
curl http://localhost:3000/api/v1/note/test-llm-friendly/information
```

### **Test avec le guide Donna**
Utiliser le fichier `DONNA-LLM-FRIENDLY-GUIDE.md` pour des exemples complets.

## 🚨 **DÉPANNAGE**

### **Problème : Colonnes slug manquantes**
```bash
# Solution : Exécuter la migration SQL dans Supabase
# Puis relancer :
npm run verify-database
```

### **Problème : Données sans slug**
```bash
# Solution : Migrer les données existantes
npm run migrate-slugs
```

### **Problème : Erreurs 500 sur les endpoints**
```bash
# Solution : Vérifier que la migration est complète
npm run verify-database
npm run test-endpoints
```

### **Problème : Conflits de slugs**
```bash
# Solution : Les index uniques empêchent les doublons
# Le script de migration gère automatiquement les conflits
npm run migrate-slugs
```

## ✅ **VALIDATION FINALE**

Après toutes les étapes, tu devrais avoir :

1. **✅ Colonnes slug** dans toutes les tables
2. **✅ Index uniques** pour éviter les doublons
3. **✅ Données migrées** avec des slugs uniques
4. **✅ API fonctionnelle** avec tous les endpoints
5. **✅ Tests réussis** pour tous les endpoints
6. **✅ Guide Donna** prêt pour les tests manuels

## 🎉 **RÉSULTAT FINAL**

**L'API LLM-friendly est 100% opérationnelle avec :**
- Support des slugs et IDs pour tous les endpoints
- Génération automatique de slugs uniques
- URLs partageables et SEO-friendly
- Documentation complète et exemples
- Tests automatisés et manuels

**Prêt pour Donna et tous les LLMs !** 🚀

---

**Abrège** - Migration complète pour l'API LLM-friendly. 