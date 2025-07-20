# 🧠 Guide LLM-Friendly pour Donna - API Abrège

## 🎯 **Vue d'ensemble**

Salut Donna ! 🎉 Voici ton guide complet pour tester l'API Abrège avec des noms d'endpoints explicites et naturels. Plus besoin de deviner ce que fait `append` vs `add-content` !

## 🔐 **Authentification**

Tous les endpoints nécessitent ton token Supabase :
```bash
Authorization: Bearer YOUR_SUPABASE_TOKEN
```

## 📚 **Endpoints Notebooks (Classeurs)**

### **Lister tous tes notebooks**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/notebooks
```
**Réponse :** `{ notebooks: [{ id, name, emoji, color, slug, ... }] }`

### **Créer un nouveau notebook**
```bash
curl -X POST https://api.abrege.com/api/v1/notebook/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mon Projet de Recherche",
    "emoji": "🔬",
    "color": "#3b82f6"
  }'
```

### **Récupérer un notebook spécifique**
```bash
# Par ID
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/notebook/6ba7b810-9dad-11d1-80b4-00c04fd430c8

# Par slug
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/notebook/mon-projet-de-recherche
```

### **Mettre à jour un notebook**
```bash
curl -X PUT https://api.abrege.com/api/v1/notebook/mon-projet-de-recherche \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Projet de Recherche Avancé",
    "emoji": "🧪",
    "color": "#ef4444"
  }'
```

### **Supprimer un notebook**
```bash
curl -X DELETE https://api.abrege.com/api/v1/notebook/mon-projet-de-recherche \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📁 **Endpoints Dossiers**

### **Créer un dossier**
```bash
curl -X POST https://api.abrege.com/api/v1/folder/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Notes Importantes",
    "classeur_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
  }'
```

### **Récupérer un dossier**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/folder/notes-importantes
```

### **Mettre à jour un dossier**
```bash
curl -X PUT https://api.abrege.com/api/v1/folder/notes-importantes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Notes Très Importantes"
  }'
```

### **Supprimer un dossier**
```bash
curl -X DELETE https://api.abrege.com/api/v1/folder/notes-importantes \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📝 **Endpoints Notes**

### **Créer une note**
```bash
curl -X POST https://api.abrege.com/api/v1/note/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source_title": "Ma Première Note LLM-Friendly",
    "markdown_content": "# Introduction\n\nCeci est ma première note avec l'API LLM-friendly !",
    "folder_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

### **Récupérer une note**
```bash
# Par ID
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/note/123e4567-e89b-12d3-a456-426614174000

# Par slug
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/note/ma-premiere-note-llm-friendly
```

### **Mettre à jour une note**
```bash
curl -X PUT https://api.abrege.com/api/v1/note/ma-premiere-note-llm-friendly \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source_title": "Note Mise à Jour",
    "markdown_content": "# Contenu Modifié\n\nNouveau contenu de la note."
  }'
```

### **Écraser complètement une note**
```bash
curl -X POST https://api.abrege.com/api/v1/note/overwrite \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "note_id": "123e4567-e89b-12d3-a456-426614174000",
    "source_title": "Note Complètement Nouvelle",
    "markdown_content": "# Nouveau Contenu\n\nTout le contenu a été remplacé."
  }'
```

### **Ajouter du contenu à une note**
```bash
curl -X PATCH https://api.abrege.com/api/v1/note/ma-premiere-note-llm-friendly/add-content \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "\n## Nouvelle Section\n\nContenu ajouté via l'endpoint LLM-friendly !"
  }'
```

### **Ajouter du contenu à une section spécifique**
```bash
curl -X PATCH https://api.abrege.com/api/v1/note/ma-premiere-note-llm-friendly/add-to-section \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "section": "introduction",
    "text": "\nNouveau contenu dans la section Introduction."
  }'
```

### **Effacer une section**
```bash
curl -X PATCH https://api.abrege.com/api/v1/note/ma-premiere-note-llm-friendly/clear-section \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "section": "introduction"
  }'
```

### **Récupérer la table des matières**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/note/ma-premiere-note-llm-friendly/table-of-contents
```
**Réponse :** `{ toc: [{ level, title, slug, line, start }] }`

### **Récupérer les informations de base**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/note/ma-premiere-note-llm-friendly/information
```
**Réponse :** `{ note: { id, source_title, header_image, created_at, updated_at, ... } }`

### **Récupérer les statistiques détaillées**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/note/ma-premiere-note-llm-friendly/statistics
```
**Réponse :** `{ id, title, word_count, char_count, section_count, toc, ... }`

### **Supprimer une note**
```bash
curl -X DELETE https://api.abrege.com/api/v1/note/ma-premiere-note-llm-friendly \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔧 **Endpoints Utilitaires**

### **Générer un slug**
```bash
curl -X POST https://api.abrege.com/api/v1/slug/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Mon Titre avec Caractères Spéciaux: éàç!",
    "type": "note",
    "userId": "3223651c-5580-4471-affb-b3f4456bd729"
  }'
```

## 🎯 **Workflow Complet pour Tester**

### **1. Créer un notebook**
```bash
curl -X POST https://api.abrege.com/api/v1/notebook/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test LLM-Friendly",
    "emoji": "🧪",
    "color": "#10b981"
  }'
```

### **2. Lister tes notebooks**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/notebooks
```

### **3. Créer un dossier dans le notebook**
```bash
curl -X POST https://api.abrege.com/api/v1/folder/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dossier de Test",
    "classeur_id": "ID_DU_NOTEBOOK_CREE"
  }'
```

### **4. Créer une note dans le dossier**
```bash
curl -X POST https://api.abrege.com/api/v1/note/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source_title": "Note de Test LLM-Friendly",
    "markdown_content": "# Test\n\nCeci est un test de l'API LLM-friendly.\n\n## Section 1\nContenu de la section 1.\n\n## Section 2\nContenu de la section 2.",
    "folder_id": "ID_DU_DOSSIER_CREE"
  }'
```

### **5. Tester tous les endpoints de la note**
```bash
# Récupérer la note
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/note/note-de-test-llm-friendly

# Récupérer la table des matières
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/note/note-de-test-llm-friendly/table-of-contents

# Récupérer les statistiques
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/note/note-de-test-llm-friendly/statistics

# Ajouter du contenu
curl -X PATCH https://api.abrege.com/api/v1/note/note-de-test-llm-friendly/add-content \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "\n## Section 3\nNouveau contenu ajouté !"
  }'

# Ajouter à une section spécifique
curl -X PATCH https://api.abrege.com/api/v1/note/note-de-test-llm-friendly/add-to-section \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "section": "section-1",
    "text": "\nContenu ajouté dans la section 1."
  }'
```

## 🧠 **Avantages LLM-Friendly**

### **Noms explicites vs anciens noms cryptiques :**
- ✅ `add-content` au lieu de `append`
- ✅ `add-to-section` au lieu de `append-to-section`
- ✅ `clear-section` au lieu de `erase-section`
- ✅ `overwrite` au lieu de `erase-note`
- ✅ `table-of-contents` au lieu de `toc`
- ✅ `information` au lieu de `meta`
- ✅ `statistics` au lieu de `metadata`
- ✅ `notebooks` au lieu de `classeurs`

### **Structure cohérente :**
- ✅ `/note/create` (pas `/create-note`)
- ✅ `/folder/create` (pas `/create-folder`)
- ✅ `/notebook/create` (pas `/create-classeur`)
- ✅ `/notebooks` pour lister tous les notebooks

## 🎉 **Résultat**

Maintenant tu peux :
- 🧠 **Comprendre immédiatement** ce que fait chaque endpoint
- 📚 **Deviner les noms** d'endpoints sans documentation
- 🎯 **Éviter les confusions** entre endpoints similaires
- 🚀 **Intégrer facilement** avec les LLMs

**Plus besoin de deviner ce que fait `append` vs `add-content` !** 🎉

---

**Abrège** - API conçue pour les LLMs avec des noms explicites et naturels. 