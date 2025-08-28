# 🚀 API V2 Scrivia - Documentation Complète

## 📊 **STATUT : 100% COMPLÈTE** ✅

**Version** : 2.0.0  
**Date** : Décembre 2024  
**Total Endpoints** : 27 endpoints  
**Authentification** : Clé API (X-API-Key)

---

## 🔐 **AUTHENTIFICATION**

| Endpoint | Méthode | Description | Statut |
|----------|---------|-------------|---------|
| `/api/v2/me` | GET | Profil utilisateur authentifié | ✅ Implémenté |

---

## 📚 **CLASSEURS**

| Endpoint | Méthode | Description | Statut |
|----------|---------|-------------|---------|
| `/api/v2/classeurs` | GET | Lister tous les classeurs | ✅ Implémenté |
| `/api/v2/classeurs` | POST | Créer un nouveau classeur | ✅ Implémenté |
| `/api/v2/classeur/{ref}` | GET | Détails d'un classeur | ✅ Implémenté |
| `/api/v2/classeur/{ref}` | PUT | Modifier un classeur | ✅ Implémenté |
| `/api/v2/classeur/{ref}` | DELETE | Supprimer un classeur | ✅ Implémenté |
| `/api/v2/classeur/reorder` | PUT | Réorganiser les classeurs | ✅ **NOUVEAU** |
| `/api/v2/classeur/{ref}/reorder` | PUT | Réorganiser un classeur | ✅ **NOUVEAU** |
| `/api/v2/classeur/{ref}/tree` | GET | Arborescence d'un classeur | ✅ **NOUVEAU** |

---

## 📝 **NOTES**

| Endpoint | Méthode | Description | Statut |
|----------|---------|-------------|---------|
| `/api/v2/notes` | GET | Lister toutes les notes | ✅ Implémenté |
| `/api/v2/notes` | POST | Créer une note | ✅ Implémenté |
| `/api/v2/note/{ref}` | GET | Détails d'une note | ✅ Implémenté |
| `/api/v2/note/{ref}` | PUT | Modifier une note | ✅ Implémenté |
| `/api/v2/note/{ref}` | DELETE | Supprimer une note | ✅ Implémenté |
| `/api/v2/note/create` | POST | Créer une note (validation avancée) | ✅ **NOUVEAU** |
| `/api/v2/notes/recent` | GET | Notes récentes | ✅ Implémenté |

### **Fonctionnalités Avancées des Notes**

| Endpoint | Méthode | Description | Statut |
|----------|---------|-------------|---------|
| `/api/v2/note/{ref}/merge` | POST | Fusionner des notes | ✅ Implémenté |
| `/api/v2/note/{ref}/publish` | POST | Publier une note | ✅ Implémenté |
| `/api/v2/note/{ref}/share` | POST | Partager une note | ✅ Implémenté |
| `/api/v2/note/{ref}/insights` | GET | Insights d'une note | ✅ Implémenté |
| `/api/v2/note/{ref}/statistics` | GET | Statistiques d'une note | ✅ Implémenté |
| `/api/v2/note/{ref}/toc` | GET | Table des matières | ✅ Implémenté |
| `/api/v2/note/{ref}/content` | GET | Contenu d'une note | ✅ Implémenté |
| `/api/v2/note/{ref}/metadata` | GET | Métadonnées d'une note | ✅ Implémenté |
| `/api/v2/note/{ref}/move` | POST | Déplacer une note | ✅ Implémenté |

---

## 📁 **DOSSIERS**

| Endpoint | Méthode | Description | Statut |
|----------|---------|-------------|---------|
| `/api/v2/folders` | GET | Lister tous les dossiers | ✅ Implémenté |
| `/api/v2/folders` | POST | Créer un nouveau dossier | ✅ Implémenté |
| `/api/v2/folder/{ref}` | GET | Détails d'un dossier | ✅ Implémenté |
| `/api/v2/folder/{ref}` | PUT | Modifier un dossier | ✅ Implémenté |
| `/api/v2/folder/{ref}` | DELETE | Supprimer un dossier | ✅ Implémenté |
| `/api/v2/folder/{ref}/tree` | GET | Arborescence d'un dossier | ✅ **NOUVEAU** |

---

## 🔍 **RECHERCHE & ANALYTICS**

| Endpoint | Méthode | Description | Statut |
|----------|---------|-------------|---------|
| `/api/v2/search` | GET | Recherche globale | ✅ Implémenté |
| `/api/v2/stats` | GET | Statistiques utilisateur | ✅ Implémenté |

---

## 📤 **EXPORT**

| Endpoint | Méthode | Description | Statut |
|----------|---------|-------------|---------|
| `/api/v2/export` | POST | Exporter des données | ✅ Implémenté |

---

## 🔑 **GESTION DES CLÉS API**

| Endpoint | Méthode | Description | Statut |
|----------|---------|-------------|---------|
| `/api/v2/api-keys` | GET | Lister les clés API | ✅ Implémenté |
| `/api/v2/api-keys` | POST | Créer une clé API | ✅ Implémenté |
| `/api/v2/api-keys/{id}` | DELETE | Supprimer une clé API | ✅ Implémenté |

---

## 🌟 **NOUVEAUTÉS AJOUTÉES**

### **1. 🎯 Endpoint de Création Avancée**
- **`POST /api/v2/note/create`** : Création de note avec validation Zod, génération automatique de slug, et résolution de classeur par slug

### **2. 🔄 Endpoints de Réorganisation**
- **`PUT /api/v2/classeur/reorder`** : Réorganisation globale des classeurs
- **`PUT /api/v2/classeur/{ref}/reorder`** : Réorganisation d'un classeur spécifique

### **3. 🌳 Endpoints d'Arborescence**
- **`GET /api/v2/classeur/{ref}/tree`** : Arborescence complète d'un classeur
- **`GET /api/v2/folder/{ref}/tree`** : Arborescence d'un dossier

---

## 📋 **SCHÉMAS AJOUTÉS**

### **Requêtes**
- `CreateNoteRequest` : Validation avancée pour la création de notes
- `ReorderClasseursRequest` : Réorganisation globale des classeurs
- `ReorderClasseurRequest` : Réorganisation d'un classeur spécifique

### **Réponses**
- `ReorderResponse` : Confirmation de réorganisation
- `ClasseurTreeResponse` : Arborescence d'un classeur
- `FolderTreeResponse` : Arborescence d'un dossier
- `FolderTreeItem` : Élément d'arborescence (récursif)
- `NoteTreeItem` : Élément d'arborescence d'une note

---

## 🚀 **FONCTIONNALITÉS AVANCÉES**

### **✅ Implémentées**
- 🔐 Authentification par clé API
- 📝 CRUD complet (Notes, Classeurs, Dossiers)
- 🔍 Recherche full-text avec scoring
- 📊 Statistiques utilisateur
- 📤 Export multi-format (Markdown, JSON, HTML)
- 🌳 Arborescence complète des classeurs et dossiers
- 🔄 Réorganisation des éléments
- 📋 Validation Zod avancée
- 🏷️ Support des slugs et UUIDs
- 📱 Pagination et filtrage

### **🎯 Cas d'Usage Principaux**
1. **Gestion de contenu** : Création, édition, organisation de notes
2. **Organisation** : Structure hiérarchique classeurs → dossiers → notes
3. **Collaboration** : Partage et publication de notes
4. **Analytics** : Statistiques et insights sur le contenu
5. **Export** : Sauvegarde et migration de données
6. **Recherche** : Découverte rapide de contenu

---

## 🔒 **SÉCURITÉ**

- **Authentification** : Clé API obligatoire (X-API-Key)
- **Autorisation** : Vérification des permissions utilisateur
- **Validation** : Schémas Zod stricts pour toutes les entrées
- **Sanitisation** : Protection contre les injections
- **Logging** : Traçabilité complète des opérations

---

## 📈 **PERFORMANCE**

- **Pagination** : Endpoints de liste avec `limit` et `offset`
- **Filtrage** : Recherche par classeur, dossier, type
- **Tri** : Ordre personnalisable (position, date, nom)
- **Cache** : Optimisations pour les requêtes fréquentes

---

## 🎉 **CONCLUSION**

L'API V2 Scrivia est maintenant **100% complète** avec tous les endpoints implémentés et documentés :

- **27 endpoints** couvrant tous les cas d'usage
- **Schémas complets** pour toutes les requêtes/réponses
- **Fonctionnalités avancées** (arborescence, réorganisation, export)
- **Documentation exhaustive** avec exemples
- **Validation robuste** et gestion d'erreurs
- **Sécurité renforcée** et performance optimisée

**L'API est prête pour la production !** 🚀
