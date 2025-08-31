# 🔍 **ENDPOINTS DE RECHERCHE COMPLETS - API V2**

## 📋 **Vérification effectuée**

J'ai vérifié et confirmé que **DEUX endpoints de recherche** existent bien dans l'API V2 d'Abrège !

---

## ✅ **Endpoints confirmés**

### **1. 🗂️ Recherche de contenu (notes et dossiers)**
- **Chemin** : `src/app/api/v2/search/route.ts`
- **Méthode** : `GET`
- **URL** : `/api/v2/search`
- **Statut** : ✅ **IMPLÉMENTÉ ET FONCTIONNEL**

### **2. 📁 Recherche de fichiers**
- **Chemin** : `src/app/api/v2/files/search/route.ts`
- **Méthode** : `GET`
- **URL** : `/api/v2/files/search`
- **Statut** : ✅ **IMPLÉMENTÉ ET FONCTIONNEL**

---

## 🔍 **1. Endpoint de recherche de contenu**

### **📝 Paramètres**
| Paramètre | Type | Requis | Description | Valeurs |
|-----------|------|--------|-------------|---------|
| `q` | string | ✅ | Terme de recherche | Texte libre |
| `classeur_id` | UUID | ❌ | Limiter à un classeur | UUID valide |
| `type` | string | ❌ | Type de contenu | `all`, `notes`, `folders` |
| `limit` | integer | ❌ | Nombre max de résultats | 1-100 (défaut: 20) |

### **🚀 Exemples d'utilisation**
```bash
# Recherche simple
curl "https://scrivia.app/api/v2/search?q=tutoriel"

# Recherche limitée
curl "https://scrivia.app/api/v2/search?q=tutoriel&limit=10"

# Recherche dans un classeur
curl "https://scrivia.app/api/v2/search?q=tutoriel&classeur_id=uuid-here"

# Recherche par type
curl "https://scrivia.app/api/v2/search?q=tutoriel&type=notes"
```

### **📊 Réponse**
```json
{
  "success": true,
  "query": "tutoriel",
  "results": [
    {
      "type": "note",
      "id": "uuid-note",
      "title": "Guide tutoriel React",
      "slug": "guide-tutoriel-react",
      "classeur_id": "uuid-classeur",
      "score": 180,
      "excerpt": "Guide complet pour apprendre React..."
    }
  ],
  "total": 1
}
```

---

## 📁 **2. Endpoint de recherche de fichiers**

### **📝 Paramètres**
| Paramètre | Type | Requis | Description | Valeurs |
|-----------|------|--------|-------------|---------|
| `q` | string | ❌ | Mot-clé (nom + description) | Texte libre |
| `type` | string | ❌ | Type de fichier | `pdf`, `image`, `csv`, etc. |
| `limit` | integer | ❌ | Nombre max de résultats | 1-100 (défaut: 50) |
| `offset` | integer | ❌ | Résultats à ignorer | 0+ (défaut: 0) |
| `created_from` | date-time | ❌ | Date de création début | ISO string |
| `created_to` | date-time | ❌ | Date de création fin | ISO string |
| `min_size` | integer | ❌ | Taille minimale | Bytes |
| `max_size` | integer | ❌ | Taille maximale | Bytes |
| `sort_by` | string | ❌ | Critère de tri | `filename`, `size`, `created_at` |
| `sort_order` | string | ❌ | Ordre de tri | `asc`, `desc` |

### **🚀 Exemples d'utilisation**
```bash
# Recherche simple par nom
curl "https://scrivia.app/api/v2/files/search?q=rapport"

# Recherche par type
curl "https://scrivia.app/api/v2/files/search?type=pdf"

# Recherche avancée avec filtres
curl "https://scrivia.app/api/v2/files/search?q=rapport&type=pdf&min_size=1000000&sort_by=size&sort_order=desc"

# Recherche par période
curl "https://scrivia.app/api/v2/files/search?created_from=2024-01-01T00:00:00Z&created_to=2024-12-31T23:59:59Z"
```

### **📊 Réponse**
```json
{
  "success": true,
  "files": [
    {
      "filename": "rapport-2024.pdf",
      "type": "application/pdf",
      "size": 2048576,
      "url": "https://scrivia.app/api/v2/files/download/slug-here",
      "slug": "rapport-2024-pdf",
      "description": "Rapport annuel 2024",
      "created_at": "2024-01-01T10:00:00Z",
      "updated_at": "2024-01-01T10:00:00Z"
    }
  ],
  "total": 1,
  "metadata": {
    "limit": 50,
    "offset": 0,
    "has_more": false,
    "filters_applied": ["type=pdf", "min_size=1000000"],
    "search_query": "rapport"
  }
}
```

---

## 🎯 **Fonctionnalités communes**

### **✅ Authentification**
- **Méthode** : `X-API-Key` (recommandée)
- **Header requis** : `X-Client-Type: llm`
- **Sécurité** : RLS (Row Level Security) activé

### **✅ Gestion des erreurs**
- **400** : Paramètres invalides
- **401** : Non autorisé
- **500** : Erreur serveur

### **✅ Pagination et limites**
- **Recherche contenu** : `limit` 1-100 (défaut: 20)
- **Recherche fichiers** : `limit` 1-100 (défaut: 50) + `offset`

---

## 🔧 **Différences clés**

| Aspect | Recherche contenu | Recherche fichiers |
|--------|------------------|-------------------|
| **Cible** | Notes et dossiers | Fichiers uniquement |
| **Paramètre principal** | `q` (requis) | `q` (optionnel) |
| **Filtres** | Classeur, type | Type, taille, dates, tri |
| **Scoring** | Algorithme intelligent | Pas de scoring |
| **Pagination** | Simple (limit) | Avancée (limit + offset) |

---

## 📚 **Fichiers mis à jour**

### **1. Schéma OpenAPI**
- **[`openapi-v2-schema.json`](openapi-v2-schema.json)** - Les deux endpoints ajoutés

### **2. Documentation**
- **[`OPENAPI-V2-USAGE-GUIDE.md`](OPENAPI-V2-USAGE-GUIDE.md)** - Exemples pour les deux endpoints
- **[`API-V2-QUICKSTART.md`](API-V2-QUICKSTART.md)** - Exemples pour les deux endpoints

---

## 🎉 **Résultat final**

**Les deux endpoints de recherche sont maintenant parfaitement documentés !**

### **✅ Ce qui est disponible**
1. **`/api/v2/search`** - Recherche intelligente dans notes et dossiers
2. **`/api/v2/files/search`** - Recherche avancée de fichiers avec filtres

### **✅ Fonctionnalités confirmées**
- **Recherche textuelle** intelligente avec scoring
- **Filtrage avancé** par type, taille, dates
- **Pagination** et limitation des résultats
- **Authentification** sécurisée par API Key
- **Documentation** complète et cohérente

---

**🚀 Vos endpoints de recherche sont maintenant parfaitement documentés et prêts à être utilisés !**

*Corrections effectuées le : 2024-01-01*
*Statut : ✅ DEUX ENDPOINTS CONFIRMÉS ET DOCUMENTÉS*
*Fonctionnalité : ✅ RECHERCHE COMPLÈTE ET AVANCÉE*
