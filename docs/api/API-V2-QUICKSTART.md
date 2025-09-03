# 🚀 **API V2 Abrège - Guide de Démarrage Rapide**

## ⚡ **Démarrer en 5 minutes**

Ce guide vous permet de commencer à utiliser l'API V2 d'Abrège en quelques minutes. Suivez les étapes ci-dessous pour votre première intégration.

---

## 🔑 **1. Authentification**

L'API V2 d'Abrège supporte **3 méthodes d'authentification** dans l'ordre de priorité suivant :

### **🔑 Méthode 1 : API Key (Recommandée)**
```bash
# Utilisez votre clé API directement
API_KEY="votre-clé-api-ici"

# Exemple d'utilisation
curl -H "X-API-Key: $API_KEY" \
     -H "X-Client-Type: llm" \
     https://scrivia.app/api/v2/me
```

**Headers requis :**
| Header | Valeur | Description |
|--------|---------|-------------|
| `X-API-Key` | string | Votre clé API d'Abrège |
| `X-Client-Type` | llm | Type de client (toujours "llm") |

### **🔐 Méthode 2 : Token OAuth**
```bash
# Obtenir un token OAuth
curl -X POST https://scrivia.app/api/auth/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "votre-client-id",
    "client_secret": "votre-client-secret"
  }'
```

**Réponse :**
```json
{
  "access_token": "token-oauth-ici",
  "token_type": "bearer",
  "expires_in": 3600
}
```

**Utilisation :**
```bash
TOKEN="token-oauth-ici"
curl -H "Authorization: Bearer $TOKEN" \
     -H "X-Client-Type: llm" \
     https://scrivia.app/api/v2/me
```

### **🔑 Méthode 3 : JWT Supabase (Fallback)**
```bash
# Authentification Supabase standard
curl -X POST https://scrivia.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "votre@email.com",
    "password": "votre-mot-de-passe"
  }'
```

**Réponse :**
```json
{
  "access_token": "jwt-supabase-ici",
  "token_type": "bearer"
}
```

**Utilisation :**
```bash
TOKEN="jwt-supabase-ici"
curl -H "Authorization: Bearer $TOKEN" \
     -H "X-Client-Type: llm" \
     https://scrivia.app/api/v2/me
```

### **📋 Comparaison des méthodes**

| Méthode | Priorité | Facilité | Sécurité | Recommandée |
|---------|----------|----------|----------|-------------|
| **API Key** | 1 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ **OUI** |
| **OAuth** | 2 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ **OUI** |
| **JWT Supabase** | 3 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⚠️ **Fallback** |

### **🚀 Recommandation pour le démarrage rapide**
**Utilisez l'API Key** - c'est la méthode la plus simple et la plus sécurisée :
```bash
# Configurez votre clé API
export API_KEY="votre-clé-api-ici"

# Testez l'authentification
curl -H "X-API-Key: $API_KEY" \
     -H "X-Client-Type: llm" \
     https://scrivia.app/api/v2/me
```

---

## 📝 **2. Créer votre première note**

### **Créer un classeur**
```bash
curl -X POST https://scrivia.app/api/v2/classeur/create \
  -H "Content-Type: application/json" \
  -H "X-Client-Type: llm" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "name": "Mon Premier Classeur",
    "description": "Pour organiser mes notes"
  }'
```

**Paramètres :**
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `name` | string | ✅ | Nom du classeur (max 255 caractères) |
| `description` | string | ❌ | Description optionnelle du classeur |
| `is_public` | boolean | ❌ | Rendre le classeur public (défaut: false) |

**Codes de réponse :**
- `201 Created` - Classeur créé avec succès
- `400 Bad Request` - Données invalides
- `401 Unauthorized` - Token invalide ou expiré
- `422 Unprocessable Entity` - Erreur de validation

**Réponse de succès (201) :**
```json
{
  "success": true,
  "data": {
    "id": "uuid-classeur",
    "name": "Mon Premier Classeur",
    "slug": "mon-premier-classeur",
    "description": "Pour organiser mes notes",
    "is_public": false,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### **Créer une note**
```bash
curl -X POST https://scrivia.app/api/v2/note/create \
  -H "Content-Type: application/json" \
  -H "X-Client-Type: llm" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "source_title": "Ma Première Note",
    "notebook_id": "uuid-du-classeur",
    "markdown_content": "# Ma Première Note\n\nBienvenue dans Abrège !\n\n## Fonctionnalités\n- Création de notes\n- Organisation en classeurs\n- API puissante"
  }'
```

**Paramètres :**
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `source_title` | string | ✅ | Titre de la note (max 255 caractères) |
| `notebook_id` | string (UUID/Slug) | ✅ | ID ou slug du classeur parent |
| `markdown_content` | string | ❌ | Contenu markdown de la note |
| `header_image` | string (URL) | ❌ | URL de l'image d'en-tête |
| `folder_id` | string (UUID) | ❌ | ID du dossier parent |

**Codes de réponse :**
- `201 Created` - Note créée avec succès
- `400 Bad Request` - Données invalides
- `401 Unauthorized` - Token invalide ou expiré
- `404 Not Found` - Classeur non trouvé
- `422 Unprocessable Entity` - Erreur de validation

**Réponse de succès (201) :**
```json
{
  "success": true,
  "data": {
    "id": "uuid-note",
    "source_title": "Ma Première Note",
    "slug": "ma-premiere-note",
    "public_url": "https://scrivia.app/note/ma-premiere-note",
    "notebook_id": "uuid-du-classeur",
    "folder_id": null,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

---

## 🔍 **3. Récupérer et modifier**

### **Lister vos classeurs**
```bash
curl -H "X-API-Key: $API_KEY" \
     -H "X-Client-Type: llm" \
     https://scrivia.app/api/v2/classeurs
```

**Paramètres de requête :**
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `limit` | number | ❌ | Nombre maximum de classeurs (défaut: 50) |
| `offset` | number | ❌ | Nombre de classeurs à ignorer (défaut: 0) |

**Codes de réponse :**
- `200 OK` - Liste récupérée avec succès
- `401 Unauthorized` - Token invalide ou expiré

**Réponse de succès (200) :**
```json
{
  "success": true,
  "data": {
    "classeurs": [
      {
        "id": "uuid-classeur",
        "name": "Mon Premier Classeur",
        "slug": "mon-premier-classeur",
        "description": "Pour organiser mes notes",
        "note_count": 5,
        "folder_count": 2,
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "total_count": 1
  }
}
```

### **Récupérer une note**
```bash
curl -H "X-API-Key: $API_KEY" \
     -H "Client-Type: llm" \
     https://scrivia.app/api/v2/note/ma-premiere-note
```

### **Mettre à jour une note**
```bash
curl -X PUT https://scrivia.app/api/v2/note/ma-premiere-note/update \
  -H "Content-Type: application/json" \
  -H "X-Client-Type: llm" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "markdown_content": "# Ma Première Note - Mise à jour\n\nContenu modifié avec succès !"
  }'
```

---

## 📁 **4. Organiser avec des dossiers**

### **Créer un dossier**
```bash
curl -X POST https://scrivia.app/api/v2/folder/create \
  -H "Content-Type: application/json" \
  -H "X-Client-Type: llm" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "name": "Tutoriels",
    "notebook_id": "uuid-du-classeur"
  }'
```

### **Déplacer une note dans le dossier**
```bash
curl -X PUT https://scrivia.app/api/v2/note/ma-premiere-note/move \
  -H "Content-Type: application/json" \
  -H "X-Client-Type: llm" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "target_folder_id": "uuid-du-dossier"
  }'
```

---

## 🔍 **5. Rechercher et explorer**

### **Rechercher dans vos notes**
```bash
curl -H "X-API-Key: $API_KEY" \
     -H "X-Client-Type: llm" \
     "https://scrivia.app/api/v2/search?q=tutoriel&limit=10"
```

### **Rechercher des fichiers**
```bash
# Recherche simple par nom
curl -H "X-API-Key: $API_KEY" \
     -H "X-Client-Type: llm" \
     "https://scrivia.app/api/v2/files/search?q=rapport"

# Recherche par type et taille
curl -H "X-API-Key: $API_KEY" \
     -H "X-Client-Type: llm" \
     "https://scrivia.app/api/v2/files/search?type=pdf&min_size=1000000"
```

### **Voir l'arborescence d'un classeur**
```bash
curl -H "X-API-Key: $API_KEY" \
     -H "X-Client-Type: llm" \
     https://scrivia.app/api/v2/classeur/uuid-du-classeur/tree
```

---

## 💻 **6. Exemples de code**

### **JavaScript/Node.js**
```javascript
const API_BASE = 'https://scrivia.app/api/v2';
const API_KEY = 'votre-clé-api-ici';

// Créer une note
async function createNote(title, content, notebookId) {
  const response = await fetch(`${API_BASE}/note/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Type': 'llm',
      'X-API-Key': API_KEY
    },
    body: JSON.stringify({
      source_title: title,
      notebook_id: notebookId,
      markdown_content: content
    })
  });
  
  return response.json();
}

// Utilisation
createNote('Ma Note', '# Contenu\n\nHello World!', 'uuid-classeur')
  .then(result => console.log('Note créée:', result))
  .catch(error => console.error('Erreur:', error));
```

### **Python**
```python
import requests

API_BASE = 'https://scrivia.app/api/v2'
API_KEY = 'votre-clé-api-ici'

headers = {
    'Content-Type': 'application/json',
    'X-Client-Type': 'llm',
    'X-API-Key': API_KEY
}

# Créer une note
def create_note(title, content, notebook_id):
    data = {
        'source_title': title,
        'notebook_id': notebook_id,
        'markdown_content': content
    }
    
    response = requests.post(
        f'{API_BASE}/note/create',
        json=data,
        headers=headers
    )
    
    return response.json()

# Utilisation
result = create_note('Ma Note', '# Contenu\n\nHello World!', 'uuid-classeur')
print('Note créée:', result)
```

### **cURL (Bash)**
```bash
#!/bin/bash

API_BASE="https://scrivia.app/api/v2"
API_KEY="votre-clé-api-ici"

# Fonction pour créer une note
create_note() {
    local title="$1"
    local content="$2"
    local notebook_id="$3"
    
    curl -X POST "$API_BASE/note/create" \
        -H "Content-Type: application/json" \
        -H "X-Client-Type: llm" \
        -H "X-API-Key: $API_KEY" \
        -d "{
            \"source_title\": \"$title\",
            \"notebook_id\": \"$notebook_id\",
            \"markdown_content\": \"$content\"
        }"
}

# Utilisation
create_note "Ma Note" "# Contenu\n\nHello World!" "uuid-classeur"
```

---

## 🚨 **7. Gestion des erreurs**

### **Vérifier les codes de statut**
```bash
# Exemple avec cURL pour voir le code de statut
curl -w "HTTP Status: %{http_code}\n" \
     -H "X-API-Key: $API_KEY" \
     -H "X-Client-Type: llm" \
     https://scrivia.app/api/v2/note/note-inexistante
```

### **Traiter les erreurs en JavaScript**
```javascript
async function safeApiCall(apiFunction) {
  try {
    const result = await apiFunction();
    return { success: true, data: result };
  } catch (error) {
    if (error.response) {
      // Erreur de l'API
      const errorData = await error.response.json();
      return {
        success: false,
        error: errorData.error,
        details: errorData.details,
        status: error.response.status
      };
    } else {
      // Erreur réseau
      return {
        success: false,
        error: 'NETWORK_ERROR',
        details: [error.message]
      };
    }
  }
}

// Utilisation
const result = await safeApiCall(() => 
  createNote('Titre', 'Contenu', 'uuid-classeur')
);

if (!result.success) {
  console.error('Erreur API:', result.error);
  console.error('Détails:', result.details);
}
```

---

## 📊 **8. Monitoring et debugging**

### **Vérifier vos statistiques**
```bash
# Statistiques utilisateur
curl -H "X-API-Key: $API_KEY" \
     -H "X-Client-Type: llm" \
     https://scrivia.app/api/v2/me

# Statistiques globales
curl -H "X-API-Key: $API_KEY" \
     -H "X-Client-Type: llm" \
     https://scrivia.app/api/v2/stats
```

### **Logs et debugging**
L'API V2 inclut un logging détaillé. Chaque requête génère des logs avec :
- ID de requête unique
- Temps d'exécution
- Détails des opérations
- Erreurs et warnings

---

## 🔗 **9. Ressources additionnelles**

### **Documentation complète**
- **[API V2 Documentation Complète](API-V2-DOCUMENTATION-COMPLETE.md)** - Tous les endpoints détaillés
- **[Guide de Migration](MIGRATION-GUIDE.md)** - Migrer depuis l'API V1

### **Exemples avancés**
- Gestion des fichiers
- Recherche avancée
- Pagination des résultats
- Gestion des permissions

### **Support**
- **Email** : support@scrivia.app
- **Documentation** : https://docs.scrivia.app
- **GitHub** : https://github.com/scrivia/abrege

---

## ✅ **10. Checklist de démarrage**

- [ ] **Authentification** : API Key configurée et testée
- [ ] **Premier classeur** : Classeur créé avec succès (201)
- [ ] **Première note** : Note créée et accessible (201)
- [ ] **Organisation** : Dossier créé et note déplacée
- [ ] **Recherche** : Recherche fonctionnelle (200)
- [ ] **Gestion d'erreurs** : Erreurs traitées correctement
- [ ] **Monitoring** : Statistiques consultées (200)

**🎉 Félicitations ! Vous maîtrisez maintenant l'API V2 d'Abrège !**

---

*Dernière mise à jour : 2024-01-01*
*Version de l'API : 2.0.0*
