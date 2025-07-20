# 🚨 MIGRATION SUPABASE URGENTE - Colonnes Slug

## ⚠️ **PROBLÈME IDENTIFIÉ**

L'API LLM-friendly ne peut pas fonctionner sans les colonnes `slug` dans la base de données. Les endpoints `/notebooks`, `/note/create`, etc. vont échouer car ils essaient d'accéder à des colonnes qui n'existent pas.

## 🔧 **SOLUTION IMMÉDIATE**

### **1. Aller dans le Dashboard Supabase**
- Ouvrir https://supabase.com/dashboard
- Sélectionner le projet Abrège
- Aller dans **SQL Editor**

### **2. Exécuter la migration SQL**
Copier-coller et exécuter ce code SQL :

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

### **3. Vérifier la migration**
Après avoir exécuté le SQL, lancer :
```bash
npm run add-slug-columns
```

Tu devrais voir :
```
✅ La colonne slug existe déjà dans la table articles
✅ La colonne slug existe déjà dans la table folders
✅ La colonne slug existe déjà dans la table classeurs
```

### **4. Migrer les données existantes**
```bash
npm run migrate-slugs
```

## 🎯 **POURQUOI C'EST URGENT**

**Sans les colonnes slug :**
- ❌ `GET /api/v1/notebooks` → Erreur 500
- ❌ `POST /api/v1/note/create` → Erreur 500
- ❌ `POST /api/v1/folder/create` → Erreur 500
- ❌ `POST /api/v1/notebook/create` → Erreur 500
- ❌ Tous les endpoints avec résolution de slug → Erreur 500

**Avec les colonnes slug :**
- ✅ Tous les endpoints LLM-friendly fonctionnent
- ✅ Support des slugs et IDs
- ✅ Génération automatique de slugs uniques
- ✅ URLs partageables

## 🚀 **APRÈS LA MIGRATION**

Une fois les colonnes ajoutées, tu pourras :

### **Tester l'API complète**
```bash
# Lister les notebooks
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/notebooks

# Créer une note
curl -X POST https://api.abrege.com/api/v1/note/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source_title": "Test LLM-Friendly",
    "markdown_content": "# Test\n\nContenu de test."
  }'
```

### **Utiliser le guide Donna**
Le fichier `DONNA-LLM-FRIENDLY-GUIDE.md` contient tous les exemples prêts à l'emploi.

## ⚡ **RÉSUMÉ DES ÉTAPES**

1. **Dashboard Supabase** → SQL Editor
2. **Exécuter** le code SQL ci-dessus
3. **Vérifier** avec `npm run add-slug-columns`
4. **Migrer** les données avec `npm run migrate-slugs`
5. **Tester** l'API avec le guide Donna

**Une fois fait, l'API LLM-friendly sera 100% opérationnelle !** 🎉

---

**Abrège** - Migration urgente pour activer l'API LLM-friendly. 