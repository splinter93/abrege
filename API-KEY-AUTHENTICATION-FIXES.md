# 🔑 Corrections pour l'Authentification par Clé API

## 📋 **Problème identifié**

L'API V2 retournait l'erreur `401 "Token d'authentification manquant"` même avec une clé API valide dans l'en-tête `X-API-Key`.

## 🔍 **Cause racine**

**Double vérification d'authentification** dans les endpoints de l'API V2 :

1. ✅ **Première vérification** : `getAuthenticatedUser(request)` - Gère correctement les clés API
2. ❌ **Deuxième vérification** : Vérification redondante du header `Authorization` qui échouait

## 🛠️ **Corrections apportées**

### **1. Middleware d'authentification unifié (`src/middleware/auth.ts`)**
- ✅ Remplacé l'ancienne logique JWT-only par l'utilisation de `getAuthenticatedUser`
- ✅ Supporte maintenant API Keys, OAuth et JWT de manière unifiée
- ✅ Supprimé la logique de vérification manuelle des tokens

### **2. Endpoints API V2 corrigés**
- ✅ **`/classeurs`** : Supprimé la vérification redondante du header `Authorization`
- ✅ **`/notes`** : Supprimé la vérification redondante du header `Authorization`  
- ✅ **`/folders`** : Supprimé la vérification redondante du header `Authorization`
- ✅ **`/me`** : Créé l'endpoint manquant pour récupérer le profil utilisateur

### **3. Schéma OpenAPI mis à jour**
- ✅ **`openapi-scrivia-v2-api-key-only.json`** : Schéma propre pour clé API uniquement
- ✅ Supprimé toutes les références OAuth
- ✅ Ajouté l'endpoint `/me` avec schéma `User` complet
- ✅ Authentification uniquement via `X-API-Key`

## 🚀 **Architecture finale**

```
Client Request (X-API-Key: scrivia-api-key-2024)
         ↓
   getAuthenticatedUser()
         ↓
   validateApiKey() via ApiKeyService
         ↓
   ✅ Authentification réussie
         ↓
   Endpoint API V2 (classeurs, notes, folders, me)
```

## 📝 **Endpoints supportés**

| Endpoint | Méthode | Description | Authentification |
|----------|---------|-------------|------------------|
| `/me` | GET | Profil utilisateur | `X-API-Key` |
| `/classeurs` | GET | Liste des classeurs | `X-API-Key` |
| `/notes` | GET | Liste des notes | `X-API-Key` |
| `/folders` | GET | Liste des dossiers | `X-API-Key` |

## 🔧 **Configuration requise côté serveur**

### **1. Table `api_keys` dans la base de données**
```sql
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  api_key_hash TEXT NOT NULL UNIQUE,
  api_key_name TEXT NOT NULL,
  scopes TEXT[] DEFAULT ARRAY['notes:read', 'classeurs:read', 'dossiers:read'],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);
```

### **2. API Key de test**
```sql
INSERT INTO api_keys (user_id, api_key_hash, api_key_name, scopes) 
VALUES (
  'USER_ID_ICI', 
  'HASH_DE_scrivia-api-key-2024', 
  'Test API Key', 
  ARRAY['notes:read', 'classeurs:read', 'dossiers:read']
);
```

## 🧪 **Test de validation**

### **Script de test**
```bash
curl -H "X-API-Key: scrivia-api-key-2024" \
     https://scrivia.app/api/v2/me
```

### **Résultat attendu**
```json
{
  "success": true,
  "user": {
    "id": "uuid-utilisateur",
    "email": "user@example.com",
    "username": "username",
    "first_name": "Prénom",
    "last_name": "Nom",
    "created_at": "2024-08-28T..."
  }
}
```

## 🚨 **Prochaines étapes**

1. **Déployer les corrections** sur le serveur de production
2. **Créer la table `api_keys`** si elle n'existe pas
3. **Insérer l'API Key de test** dans la base de données
4. **Tester l'authentification** avec l'endpoint `/me`
5. **Valider tous les endpoints** de l'API V2

## ✅ **Statut**

- **Code local** : ✅ Corrigé et testé
- **Déploiement** : ⏳ En attente
- **Base de données** : ⏳ À configurer
- **Tests production** : ⏳ En attente

## 🔗 **Fichiers modifiés**

- `src/middleware/auth.ts` - Middleware unifié
- `src/app/api/v2/classeurs/route.ts` - Suppression vérification redondante
- `src/app/api/v2/notes/route.ts` - Suppression vérification redondante  
- `src/app/api/v2/folders/route.ts` - Suppression vérification redondante
- `src/app/api/v2/me/route.ts` - Nouvel endpoint profil utilisateur
- `src/utils/authUtils.ts` - Logging amélioré pour debug
- `openapi-scrivia-v2-api-key-only.json` - Schéma OpenAPI mis à jour
