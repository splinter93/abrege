# 📋 LISTE COMPLÈTE DES ENDPOINTS API V2

## 🎯 **ENDPOINTS PRINCIPAUX**

### 🔍 **Recherche et Découverte**
```
GET  /api/v2/search                    │ Recherche de contenu
GET  /api/v2/me                        │ Profil utilisateur
GET  /api/v2/stats                     │ Statistiques utilisateur
GET  /api/v2/tools                     │ Outils disponibles
```

### 📝 **Gestion des Notes**
```
GET    /api/v2/note/{ref}              │ Récupérer une note
POST   /api/v2/note/create             │ Créer une note
PUT    /api/v2/note/{ref}/update       │ Mettre à jour une note
DELETE /api/v2/note/{ref}              │ Supprimer une note
GET    /api/v2/note/recent             │ Notes récentes
POST   /api/v2/note/{ref}/insert-content │ Insérer du contenu
POST   /api/v2/note/{ref}/content:apply │ 🆕 Appliquer des opérations de contenu
GET    /api/v2/note/{ref}/table-of-contents │ Table des matières
POST   /api/v2/note/{ref}/share        │ Partager une note
PUT    /api/v2/note/{ref}/move         │ Déplacer une note
```

### 📁 **Gestion des Dossiers**
```
GET    /api/v2/folder/{ref}            │ Récupérer un dossier
POST   /api/v2/folder/create           │ Créer un dossier
PUT    /api/v2/folder/{ref}/update     │ Mettre à jour un dossier
GET    /api/v2/folder/{ref}/tree       │ Arbre du dossier
POST   /api/v2/folder/{ref}/move       │ Déplacer un dossier
```

### 📚 **Gestion des Classeurs**
```
GET    /api/v2/classeurs               │ Liste des classeurs
GET    /api/v2/classeurs/with-content  │ Classeurs avec contenu
POST   /api/v2/classeur/create         │ Créer un classeur
GET    /api/v2/classeur/{ref}          │ Récupérer un classeur
PUT    /api/v2/classeur/{ref}/update   │ Mettre à jour un classeur
GET    /api/v2/classeur/{ref}/tree     │ Arbre du classeur
POST   /api/v2/classeur/reorder        │ Réorganiser les classeurs
```

### 🗑️ **Système de Corbeille**
```
GET    /api/v2/trash                   │ Contenu de la corbeille
POST   /api/v2/trash/restore           │ Restaurer un élément
POST   /api/v2/trash/purge             │ Vider la corbeille
```

### 📄 **Gestion des Fichiers**
```
GET    /api/v2/files/search            │ Recherche de fichiers
```

### 🤖 **Agents Spécialisés**
```
GET    /api/v2/agents/{agentId}        │ Récupérer un agent
POST   /api/v2/agents/{agentId}        │ Exécuter un agent
PUT    /api/v2/agents/{agentId}        │ Mettre à jour un agent
PATCH  /api/v2/agents/{agentId}        │ Mise à jour partielle
DELETE /api/v2/agents/{agentId}        │ Supprimer un agent
HEAD   /api/v2/agents/{agentId}        │ Vérifier l'existence
POST   /api/v2/agents/execute          │ 🆕 Exécuter un agent universel
```

### 🔧 **Utilitaires**
```
GET    /api/v2/openapi-schema          │ Documentation OpenAPI
DELETE /api/v2/delete/{resource}/{ref} │ Suppression unifiée
```

---

## 🆕 **NOUVEL ENDPOINT : AGENTS EXECUTE UNIVERSEL**

### 🤖 **POST /api/v2/agents/execute**
**Endpoint universel pour exécuter n'importe quel agent spécialisé avec une interface simple**

#### **Paramètres :**
- `ref` - Référence de l'agent (ID ou slug)
- `input` - Message d'entrée pour l'agent
- `options` - Paramètres optionnels (temperature, max_tokens, stream)

#### **Exemple d'utilisation :**
```bash
curl -X POST "https://api.abrege.com/api/v2/agents/execute" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "ref": "johnny",
    "input": "Analyse cette note et donne-moi un résumé",
    "options": {
      "temperature": 0.7,
      "max_tokens": 500
    }
  }'
```

#### **Réponse :**
```json
{
  "success": true,
  "data": {
    "ref": "johnny",
    "agent_name": "Johnny Query",
    "agent_id": "uuid",
    "response": "Réponse de l'agent...",
    "execution_time": 150,
    "model_used": "meta-llama/llama-4-scout-17b-16e-instruct",
    "provider": "groq"
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "agent_slug": "johnny",
    "agent_type": "chat",
    "input_length": 45,
    "response_length": 200
  }
}
```

#### **Avantages :**
✅ **Simplicité** : Un seul endpoint pour tous les agents  
✅ **Flexibilité** : Fonctionne avec ID ou slug  
✅ **Test facile** : Parfait pour le développement  
✅ **Cohérence** : Même pattern que les autres endpoints v2  
✅ **Documentation** : Plus simple à documenter  

---

## 🆕 **NOUVEL ENDPOINT : CONTENT APPLY**

### 📝 **POST /api/v2/note/{ref}/content:apply**
**Endpoint LLM-friendly pour appliquer des opérations de contenu avec précision chirurgicale**

#### **Opérations supportées :**
- `insert` - Insérer du contenu
- `replace` - Remplacer du contenu
- `delete` - Supprimer du contenu
- `upsert_section` - Créer/mettre à jour une section

#### **Types de cibles :**
- **Heading** : Par titre (chemin, niveau, ID)
- **Regex** : Par expression régulière
- **Position** : Par position (début, fin, offset)
- **Anchor** : Par ancre sémantique

#### **Exemple d'utilisation :**
```bash
curl -X POST "/api/v2/note/my-note/content:apply" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{
    "ops": [{
      "id": "op-1",
      "action": "insert",
      "target": {
        "type": "heading",
        "heading": {
          "path": ["API", "Endpoints"],
          "level": 3
        }
      },
      "where": "after",
      "content": "### Nouveau bloc\nContenu..."
    }],
    "dry_run": true,
    "return": "diff"
  }'
```

---

## 🔗 **ENDPOINTS UI (Interface Utilisateur)**

### 🤖 **Gestion des Agents UI**
```
GET  /api/ui/agents?specialized=true   │ Liste agents spécialisés
POST /api/ui/agents                    │ Créer un agent
GET  /api/ui/agents/specialized        │ Liste agents spécialisés
POST /api/ui/agents/specialized        │ Créer agent spécialisé
```

---

## 🤖 **AGENTS PRÉ-CONFIGURÉS**

| Agent | Description | Modèle |
|-------|-------------|--------|
| `johnny` | Johnny Query - Analyse de notes et d'images | Llama 4 Scout |
| `formatter` | Formateur - Mise en forme de documents | Llama 4 Maverick |
| `vision` | Vision - Analyse d'images complexes | Llama 4 Scout |

---

## 🔧 **MODÈLES SUPPORTÉS**

| Modèle | Type | Capacités |
|--------|------|-----------|
| `meta-llama/llama-4-scout-17b-16e-instruct` | Multimodal | 16 images |
| `meta-llama/llama-4-maverick-17b-128e-instruct` | Multimodal | 128 images |
| `groq-llama3-8b-8192` | Texte | Texte uniquement |
| `groq-llama3-70b-8192` | Texte | Texte uniquement |

---

## 🔐 **AUTHENTIFICATION**

Tous les endpoints nécessitent une authentification via :
- **Header** : `Authorization: Bearer <token>`
- **Ou** : Cookie de session valide
- **Ou** : `X-API-Key: <key>` (pour certains endpoints)

---

## 📊 **CODES DE RÉPONSE**

| Code | Description |
|------|-------------|
| `200` | Succès |
| `201` | Créé avec succès |
| `207` | Application partielle |
| `400` | Données invalides |
| `401` | Authentification requise |
| `404` | Ressource non trouvée |
| `408` | Timeout |
| `409` | Conflit |
| `412` | Précondition échouée |
| `413` | Contenu trop volumineux |
| `422` | Erreur de validation |
| `500` | Erreur interne du serveur |

---

## 🎯 **FONCTIONNALITÉS CLÉS**

### ✅ **Fonctionnalités Générales**
- Support multimodale (texte + images)
- Validation stricte des schémas JSON
- Cache intelligent avec invalidation
- Logs détaillés et traçabilité
- Documentation OpenAPI dynamique
- Types TypeScript stricts
- Gestion d'erreurs robuste
- Soft delete pour la sécurité

### ✅ **Fonctionnalités Content Apply**
- **Dry-run par défaut** : Sécurité maximale
- **ETag validation** : Évite les conflits
- **Opérations atomiques** : Contrôle précis
- **Résultats détaillés** : Feedback complet
- **Gestion d'erreurs** : Codes spécifiques
- **Sécurité regex** : Timeout et limites
- **Transactions** : All-or-nothing ou best-effort

---

## 🚀 **PRÊT POUR LA PRODUCTION !**

L'API v2 est complète avec **32 endpoints** couvrant tous les cas d'usage :
- ✅ Gestion complète des notes, dossiers, classeurs
- ✅ Agents spécialisés avec support multimodale
- ✅ Système de corbeille et restauration
- ✅ Recherche avancée et statistiques
- ✅ **Nouveau** : Content Apply pour opérations précises
- ✅ Documentation OpenAPI complète
- ✅ Tests automatisés

**Total : 30 endpoints API v2 + 4 endpoints UI = 34 endpoints disponibles**
