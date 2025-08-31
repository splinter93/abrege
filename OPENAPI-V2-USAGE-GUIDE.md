# 🚀 **Guide d'utilisation du Schéma OpenAPI V2 d'Abrège**

## 📋 **Vue d'ensemble**

Le fichier `openapi-v2-schema.json` contient la spécification OpenAPI 3.1.0 complète de l'API V2 d'Abrège. Ce schéma peut être utilisé avec des outils de développement, des générateurs de code, et des plateformes de documentation.

---

## 🔧 **Utilisation du schéma**

### **1. Visualisation interactive**
- **Swagger UI** : Ouvrir le fichier dans [Swagger Editor](https://editor.swagger.io/)
- **Redoc** : Utiliser [Redoc](https://redocly.github.io/redoc/) pour une documentation élégante
- **Postman** : Importer le schéma pour générer des collections automatiquement

### **2. Génération de code**
```bash
# Avec OpenAPI Generator (Java)
openapi-generator-cli generate -i openapi-v2-schema.json -g java -o ./generated/java

# Avec OpenAPI Generator (Python)
openapi-generator-cli generate -i openapi-v2-schema.json -g python -o ./generated/python

# Avec OpenAPI Generator (JavaScript)
openapi-generator-cli generate -i openapi-v2-schema.json -g javascript -o ./generated/js

# Avec OpenAPI Generator (TypeScript)
openapi-generator-cli generate -i openapi-v2-schema.json -g typescript-axios -o ./generated/ts
```

### **3. Validation des requêtes**
```bash
# Valider une requête contre le schéma
curl -X POST https://scrivia.app/api/v2/note/create \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "X-Client-Type: llm" \
  -d '{
    "source_title": "Test Note",
    "notebook_id": "uuid-here"
  }'
```

---

## 🏗️ **Structure du schéma**

### **1. Informations générales**
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "API V2 Abrège",
    "version": "2.0.0",
    "description": "API V2 moderne et robuste pour la gestion de notes, classeurs et dossiers avec support LLM. Authentification par clé API uniquement."
  }
}
```

### **2. Serveurs disponibles**
- **Production** : `https://scrivia.app/api/v2`

### **3. Méthodes d'authentification**
- **API Key** : `X-API-Key` (seule méthode supportée)

---

## 📚 **Endpoints documentés**

### **🔹 Gestion des Notes**
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/note/create` | POST | Créer une nouvelle note |
| `/note/{ref}` | GET | Récupérer une note |
| `/note/{ref}/update` | PUT | Mettre à jour une note |
| `/note/{ref}/delete` | DELETE | Supprimer une note |
| `/note/{ref}/move` | PUT | Déplacer une note |
| `/note/{ref}/add-content` | PATCH | Ajouter du contenu |
| `/note/{ref}/table-of-contents` | GET | Table des matières |
| `/note/{ref}/statistics` | GET | Statistiques de la note |
| `/note/recent` | GET | Notes récentes |

### **🔹 Gestion des Classeurs**
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/classeur/create` | POST | Créer un nouveau classeur |
| `/classeurs` | GET | Lister tous les classeurs |
| `/classeur/{ref}/tree` | GET | Arborescence du classeur |

### **🔹 Gestion des Dossiers**
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/folder/create` | POST | Créer un nouveau dossier |
| `/folder/{ref}/tree` | GET | Arborescence du dossier |

### **🔹 Recherche et Utilitaires**
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/search` | GET | Rechercher dans le contenu |
| `/slug/generate` | POST | Générer un slug unique |

### **🔹 Informations Utilisateur**
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/me` | GET | Informations utilisateur actuel |
| `/stats` | GET | Statistiques globales |

### **🔹 Gestion Unifiée**
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/delete/{resource}/{ref}` | DELETE | Supprimer n'importe quelle ressource |

---

## 📊 **Schémas de données**

### **1. Note**
```json
{
  "id": "uuid",
  "source_title": "Titre de la note",
  "slug": "titre-de-la-note",
  "notebook_id": "uuid-classeur",
  "markdown_content": "Contenu markdown",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### **2. Classeur**
```json
{
  "id": "uuid",
  "name": "Nom du classeur",
  "slug": "nom-du-classeur",
  "description": "Description optionnelle",
  "note_count": 5,
  "created_at": "2024-01-01T00:00:00Z"
}
```

### **3. Dossier**
```json
{
  "id": "uuid",
  "name": "Nom du dossier",
  "notebook_id": "uuid-classeur",
  "parent_folder_id": "uuid-parent",
  "note_count": 3,
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

## 🔐 **Authentification**

### **1. API Key (Seule méthode supportée)**
```http
X-API-Key: votre-clé-api-ici
X-Client-Type: llm
```

---

## 📝 **Exemples d'utilisation**

### **1. Créer une note**
```bash
curl -X POST https://scrivia.app/api/v2/note/create \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "X-Client-Type: llm" \
  -d '{
    "source_title": "Ma Première Note",
    "notebook_id": "uuid-du-classeur",
    "markdown_content": "# Introduction\n\nContenu de la note..."
  }'
```

### **2. Créer un classeur**
```bash
curl -X POST https://scrivia.app/api/v2/classeur/create \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "X-Client-Type: llm" \
  -d '{
    "name": "Mon Premier Classeur",
    "description": "Pour organiser mes notes"
  }'
```

### **3. Rechercher des notes**
```bash
curl -H "X-API-Key: YOUR_API_KEY" \
     -H "X-Client-Type: llm" \
     "https://scrivia.app/api/v2/search?q=tutoriel&limit=10"
```

### **4. Rechercher des fichiers**
```bash
# Recherche simple
curl -H "X-API-Key: YOUR_API_KEY" \
     -H "X-Client-Type: llm" \
     "https://scrivia.app/api/v2/files/search?q=rapport&type=pdf"

# Recherche avancée avec filtres
curl -H "X-API-Key: YOUR_API_KEY" \
     -H "X-Client-Type: llm" \
     "https://scrivia.app/api/v2/files/search?q=rapport&type=pdf&min_size=1000000&sort_by=size&sort_order=desc"
```

---

## 🛠️ **Outils recommandés**

### **1. Développement et test**
- **Postman** : Collection automatique depuis le schéma
- **Insomnia** : Import du schéma OpenAPI
- **cURL** : Commandes de test rapides

### **2. Documentation**
- **Swagger UI** : Interface interactive
- **Redoc** : Documentation élégante
- **Stoplight** : Éditeur de schémas

### **3. Génération de code**
- **OpenAPI Generator** : Multi-langages
- **Swagger Codegen** : Alternative populaire
- **NSwag** : Pour .NET

---

## 🔍 **Validation et tests**

### **1. Valider le schéma**
```bash
# Installer OpenAPI CLI
npm install -g @redocly/openapi-cli

# Valider le schéma
openapi lint openapi-v2-schema.json
```

### **2. Tester les endpoints**
```bash
# Tester l'authentification
curl -H "X-API-Key: YOUR_API_KEY" \
     -H "X-Client-Type: llm" \
     https://scrivia.app/api/v2/me

# Tester la création
curl -X POST https://scrivia.app/api/v2/note/create \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "X-Client-Type: llm" \
  -d '{"source_title": "Test", "notebook_id": "uuid"}'
```

---

## 📚 **Ressources supplémentaires**

### **1. Documentation**
- **[API V2 Documentation Complète](API-V2-DOCUMENTATION-COMPLETE.md)**
- **[API V2 Guide de Démarrage Rapide](API-V2-QUICKSTART.md)**

### **2. Outils OpenAPI**
- [OpenAPI Specification](https://swagger.io/specification/)
- [OpenAPI Generator](https://openapi-generator.tech/)
- [Swagger Editor](https://editor.swagger.io/)

### **3. Support**
- **Email** : support@scrivia.app
- **Documentation** : https://docs.scrivia.app
- **GitHub** : Issues et discussions

---

## 🎯 **Prochaines étapes**

1. **Importer le schéma** dans votre outil de développement préféré
2. **Générer le code client** pour votre langage de programmation
3. **Tester les endpoints** avec des requêtes simples
4. **Intégrer l'API** dans votre application
5. **Consulter la documentation** pour des cas d'usage avancés

---

**🚀 Votre API V2 est maintenant parfaitement documentée et prête pour l'intégration !**

*Schéma OpenAPI généré le : 2024-01-01*
*Version : 2.0.0*
*Statut : ✅ COMPLET ET VALIDÉ*
