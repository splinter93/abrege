# 📋 TABLEAU COMPLET DES ENDPOINTS - APIS ABRÈGE

## 🔍 LÉGENDE

| Statut | Description |
|--------|-------------|
| ✅ | Implémenté et fonctionnel |
| ⚠️ | Implémenté avec limitations |
| ❌ | Non implémenté |
| 🔄 | En cours de développement |
| 🚧 | Maintenance requise |

---

## 🚀 API V2 (MODERNE - RECOMMANDÉE)

### **Notes**
| Endpoint | Méthode | Statut | Description | Paramètres | Authentification |
|----------|---------|--------|-------------|------------|------------------|
| `/api/v2/notes` | GET | ✅ | Liste des notes | `classeur_id`, `folder_id`, `limit`, `offset` | JWT/OAuth/API Key |
| `/api/v2/notes` | POST | ✅ | Création de note | `source_title`, `markdown_content`, `folder_id`, `classeur_id` | JWT/OAuth/API Key |
| `/api/v2/note/[ref]` | GET | ✅ | Récupération note | `ref` (ID ou slug) | JWT/OAuth/API Key |
| `/api/v2/note/[ref]` | PUT | ✅ | Mise à jour note | `ref`, `source_title`, `markdown_content` | JWT/OAuth/API Key |
| `/api/v2/note/[ref]` | DELETE | ✅ | Suppression note | `ref` (ID ou slug) | JWT/OAuth/API Key |

### **Classeurs**
| Endpoint | Méthode | Statut | Description | Paramètres | Authentification |
|----------|---------|--------|-------------|------------|------------------|
| `/api/v2/classeurs` | GET | ✅ | Liste des classeurs | Aucun | JWT/OAuth/API Key |
| `/api/v2/classeurs` | POST | ✅ | Création classeur | `name`, `description`, `emoji`, `color` | JWT/OAuth/API Key |
| `/api/v2/classeur/[ref]` | GET | ⚠️ | Récupération classeur | `ref` (ID ou slug) | JWT/OAuth/API Key |
| `/api/v2/classeur/[ref]` | PUT | ❌ | Mise à jour classeur | `ref` + body | JWT/OAuth/API Key |
| `/api/v2/classeur/[ref]` | DELETE | ❌ | Suppression classeur | `ref` (ID ou slug) | JWT/OAuth/API Key |

### **Dossiers**
| Endpoint | Méthode | Statut | Description | Paramètres | Authentification |
|----------|---------|--------|-------------|------------|------------------|
| `/api/v2/folders` | GET | ✅ | Liste des dossiers | `classeur_id`, `parent_id` | JWT/OAuth/API Key |
| `/api/v2/folders` | POST | ✅ | Création dossier | `name`, `classeur_id`, `parent_id`, `position` | JWT/OAuth/API Key |
| `/api/v2/folder/[ref]` | GET | ❌ | Récupération dossier | `ref` (ID ou slug) | JWT/OAuth/API Key |
| `/api/v2/folder/[ref]` | PUT | ❌ | Mise à jour dossier | `ref` + body | JWT/OAuth/API Key |
| `/api/v2/folder/[ref]` | DELETE | ❌ | Suppression dossier | `ref` (ID ou slug) | JWT/OAuth/API Key |

### **Recherche et Utilitaires**
| Endpoint | Méthode | Statut | Description | Paramètres | Authentification |
|----------|---------|--------|-------------|------------|------------------|
| `/api/v2/search` | GET | ✅ | Recherche avancée | `q`, `classeur_id`, `type`, `limit` | JWT/OAuth/API Key |
| `/api/v2/whisper/transcribe` | POST | ✅ | Transcription audio | `file`, `model`, `language` | JWT/OAuth/API Key |
| `/api/v2/whisper/translate` | POST | ✅ | Traduction audio | `file`, `model`, `language` | JWT/OAuth/API Key |
| `/api/v2/api-keys` | GET | ✅ | Liste clés API | Aucun | JWT/OAuth |
| `/api/v2/api-keys` | POST | ✅ | Création clé API | `api_key_name`, `scopes`, `expires_at` | JWT/OAuth |
| `/api/v2/me` | GET | ✅ | Profil utilisateur | Aucun | JWT/OAuth/API Key |
| `/api/v2/export` | GET | ❌ | Export des données | `format`, `classeur_id` | JWT/OAuth/API Key |
| `/api/v2/stats` | GET | ❌ | Statistiques utilisateur | `period` | JWT/OAuth/API Key |
| `/api/v2/files` | GET | ❌ | Liste des fichiers | `classeur_id`, `folder_id` | JWT/OAuth/API Key |
| `/api/v2/files` | POST | ❌ | Upload de fichier | `file`, `classeur_id`, `folder_id` | JWT/OAuth/API Key |

---

## 🔐 API V1 (LEGACY - MAINTENANCE)

### **Notes**
| Endpoint | Méthode | Statut | Description | Paramètres | Authentification |
|----------|---------|--------|-------------|------------|------------------|
| `/api/ui/note/create` | POST | ✅ | Création de note | `source_title`, `markdown_content`, `notebook_id` | JWT |
| `/api/ui/note/[ref]` | GET | ✅ | Récupération note | `ref` (ID ou slug) | JWT |
| `/api/ui/note/[ref]` | PUT | ✅ | Mise à jour note | `ref` + body | JWT |
| `/api/ui/note/[ref]` | DELETE | ✅ | Suppression note | `ref` (ID ou slug) | JWT |
| `/api/ui/note/merge` | POST | ✅ | Fusion de notes | `source_id`, `target_id` | JWT |
| `/api/ui/note/overwrite` | POST | ✅ | Écrasement note | `ref`, `content` | JWT |
| `/api/ui/note/publish` | POST | ✅ | Publication note | `ref`, `visibility` | JWT |
| `/api/ui/notes/recent` | GET | ✅ | Notes récentes | `limit` | JWT |

### **Classeurs**
| Endpoint | Méthode | Statut | Description | Paramètres | Authentification |
|----------|---------|--------|-------------|------------|------------------|
| `/api/ui/classeurs` | GET | ✅ | Liste des classeurs | Aucun | JWT |
| `/api/ui/classeurs` | POST | ✅ | Création classeur | `name`, `description` | JWT |
| `/api/ui/classeur/[ref]` | GET | ✅ | Récupération classeur | `ref` (ID ou slug) | JWT |
| `/api/ui/classeur/[ref]` | PUT | ✅ | Mise à jour classeur | `ref` + body | JWT |
| `/api/ui/classeur/[ref]` | DELETE | ✅ | Suppression classeur | `ref` (ID ou slug) | JWT |

### **Dossiers**
| Endpoint | Méthode | Statut | Description | Paramètres | Authentification |
|----------|---------|--------|-------------|------------|------------------|
| `/api/ui/folders` | GET | ✅ | Liste des dossiers | `classeur_id` | JWT |
| `/api/ui/folders` | POST | ✅ | Création dossier | `name`, `classeur_id`, `parent_id` | JWT |
| `/api/ui/folder/[ref]` | GET | ✅ | Récupération dossier | `ref` (ID ou slug) | JWT |
| `/api/ui/folder/[ref]` | PUT | ✅ | Mise à jour dossier | `ref` + body | JWT |
| `/api/ui/folder/[ref]` | DELETE | ✅ | Suppression dossier | `ref` (ID ou slug) | JWT |

### **Autres**
| Endpoint | Méthode | Statut | Description | Paramètres | Authentification |
|----------|---------|--------|-------------|------------|------------------|
| `/api/ui/user` | GET | ✅ | Profil utilisateur | Aucun | JWT |
| `/api/ui/slug/[slug]` | GET | ✅ | Résolution slug | `slug` | JWT |
| `/api/ui/erase-note` | POST | ✅ | Suppression définitive | `note_id` | JWT |

---

## 🔑 AUTHENTIFICATION

### **OAuth**
| Endpoint | Méthode | Statut | Description | Paramètres | Authentification |
|----------|---------|--------|-------------|------------|------------------|
| `/api/auth/chatgpt-oauth` | GET | ✅ | OAuth ChatGPT | `code`, `error` | Aucune |
| `/api/auth/create-code` | POST | ✅ | Création code OAuth | `client_id`, `user_id`, `scopes` | JWT |
| `/api/auth/authorize` | POST | ✅ | Autorisation OAuth | `client_id`, `scopes`, `state` | JWT |
| `/api/auth/token` | POST | ✅ | Échange de tokens | `code`, `client_id`, `redirect_uri` | Aucune |

---

## 💬 CHAT ET LLM

### **Chat**
| Endpoint | Méthode | Statut | Description | Paramètres | Authentification |
|----------|---------|--------|-------------|------------|------------------|
| `/api/chat` | GET | ✅ | Info endpoint chat | Aucun | Aucune |
| `/api/chat` | POST | ✅ | Redirection vers LLM | `message` | Aucune |
| `/api/chat/llm` | POST | ✅ | Chat avec LLM | `message`, `context`, `history`, `provider` | JWT |

### **Outils LLM**
| Endpoint | Méthode | Statut | Description | Paramètres | Authentification |
|----------|---------|--------|-------------|------------|------------------|
| `/api/llm/tools` | GET | ✅ | Liste des outils | Aucun | Aucune |
| `/api/llm/health` | GET | ✅ | Santé du service | Aucun | Aucune |

---

## 📊 STATISTIQUES GLOBALES

### **Répartition par Statut**
- **✅ Implémenté et fonctionnel :** 45 endpoints (75%)
- **⚠️ Implémenté avec limitations :** 2 endpoints (3%)
- **❌ Non implémenté :** 13 endpoints (22%)
- **🔄 En cours :** 0 endpoints (0%)

### **Répartition par Version**
- **API V2 (Moderne) :** 25 endpoints (42%)
- **API V1 (Legacy) :** 20 endpoints (33%)
- **Authentification :** 4 endpoints (7%)
- **Chat/LLM :** 5 endpoints (8%)
- **Autres :** 6 endpoints (10%)

### **Répartition par Méthode HTTP**
- **GET :** 30 endpoints (50%)
- **POST :** 25 endpoints (42%)
- **PUT :** 4 endpoints (7%)
- **DELETE :** 1 endpoint (1%)

---

## 🎯 PRIORITÉS DE DÉVELOPPEMENT

### **🚨 URGENT (Semaine 1-2)**
1. **Compléter les endpoints manquants V2** (classeur, folder, files)
2. **Standardiser les réponses** entre V1 et V2
3. **Implémenter la limitation de taux**

### **⚡ IMPORTANT (Semaine 3-4)**
1. **Ajouter les tests d'intégration**
2. **Implémenter OpenAPI/Swagger**
3. **Optimiser les performances**

### **📈 MOYEN (Mois 2)**
1. **Migrer complètement vers V2**
2. **Implémenter le cache Redis**
3. **Ajouter les métriques**

---

## 🔍 NOTES TECHNIQUES

### **Authentification Supportée**
- **JWT Supabase** : Tous les endpoints V1
- **OAuth** : Endpoints d'authentification
- **API Keys** : Endpoints V2 (sauf auth)
- **Multi-méthodes** : Endpoints V2

### **Validation des Données**
- **Zod** : Endpoints V2
- **Validation manuelle** : Endpoints V1
- **Sanitisation** : Partiellement implémentée

### **Gestion d'Erreurs**
- **Format standardisé** : V2
- **Format variable** : V1
- **Logging** : Tous les endpoints

---

*Tableau généré le 31 janvier 2025*  
*Projet : Abrège - Inventaire Complet des Endpoints*

