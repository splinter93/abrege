# 🔐 Système OAuth Scrivia - Production Ready

## Vue d'ensemble

Le système OAuth de Scrivia permet aux applications externes (comme ChatGPT Custom GPT Actions) de s'authentifier et d'accéder à l'API Scrivia de manière sécurisée et production-ready.

## 🏗️ Architecture

### Endpoints OAuth

- **`/api/auth/authorize`** - Point d'entrée pour l'autorisation OAuth
- **`/api/auth/token`** - Échange du code d'autorisation contre un access token
- **`/api/auth/create-code`** - Création de codes d'autorisation pour les applications externes
- **`/auth`** - Page de connexion qui gère le flux OAuth externe

### Services

- **`/src/services/oauthService.ts`** - Service principal OAuth avec gestion complète des tokens
- **`/src/config/authProviders.ts`** - Configuration des providers d'authentification internes

### Base de données

- **Tables OAuth** : `oauth_clients`, `oauth_authorization_codes`, `oauth_access_tokens`, `oauth_refresh_tokens`
- **Sécurité** : RLS (Row Level Security), hashage des tokens, expiration automatique
- **Performance** : Index optimisés, nettoyage automatique des données expirées

## 🚀 Utilisation

### 1. Configuration ChatGPT Custom GPT Action

#### URLs de configuration :
- **Authorization URL** : `https://scrivia.app/api/auth/authorize`
- **Token URL** : `https://scrivia.app/api/auth/token`
- **Redirect URI** : `https://chat.openai.com/auth/callback`

#### Credentials :
- **Client ID** : `scrivia-custom-gpt`
- **Client Secret** : `scrivia-gpt-secret-2024`

#### Scopes disponibles :
```
notes:read notes:write dossiers:read dossiers:write classeurs:read classeurs:write
```

### 2. Flux OAuth

```
1. ChatGPT → /api/auth/authorize
2. Redirection → /auth (connexion utilisateur)
3. Après connexion → /api/auth/create-code (génération du code)
4. Redirection → ChatGPT avec le code
5. ChatGPT → /api/auth/token (échange code → token)
6. ChatGPT utilise le token pour l'API Scrivia
```

### 3. Installation et Configuration

#### Étape 1 : Migration de base de données
```bash
# Exécuter la migration SQL dans votre dashboard Supabase
# Fichier : supabase/migrations/20241220000000_create_oauth_system.sql
```

#### Étape 2 : Configuration automatique
```bash
# Installer les dépendances
npm install

# Exécuter le script de configuration
node scripts/setup-oauth.js
```

#### Étape 3 : Variables d'environnement
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🔧 Configuration

### Ajouter un nouveau client OAuth

```typescript
// src/config/oauthClients.ts
{
  id: 'mon-app',
  name: 'Mon Application',
  secret: 'secret-securise',
  redirectUris: [
    'https://monapp.com/callback'
  ],
  scopes: [
    'notes:read',
    'notes:write'
  ],
  description: 'Description de l\'application'
}
```

### Variables d'environnement

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🛡️ Sécurité

### Validation des clients
- Vérification du `client_id` et `client_secret`
- Validation des URLs de redirection autorisées
- Contrôle des scopes demandés

### Gestion des tokens
- Tokens JWT Supabase sécurisés
- Expiration automatique des sessions
- Validation des permissions par scope

## 📝 API Endpoints

### Authentification requise

Tous les endpoints de l'API Scrivia nécessitent le header :
```
Authorization: Bearer {access_token}
```

### Exemples d'utilisation

```bash
# Lister les notes
curl -H "Authorization: Bearer {token}" \
     https://scrivia.app/api/v2/notes

# Créer une note
curl -X POST \
     -H "Authorization: Bearer {token}" \
     -H "Content-Type: application/json" \
     -d '{"title":"Ma note","content":"Contenu..."}' \
     https://scrivia.app/api/v2/notes
```

## 🧪 Tests

### Tester le flux OAuth

1. **Simuler une demande d'autorisation** :
   ```
   https://scrivia.app/api/auth/authorize?response_type=code&client_id=scrivia-custom-gpt&redirect_uri=https://chat.openai.com/auth/callback
   ```

2. **Vérifier la génération du token** :
   ```bash
   curl -X POST \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "grant_type=authorization_code&code={code}&client_id=scrivia-custom-gpt&client_secret=scrivia-gpt-secret-2024&redirect_uri=https://chat.openai.com/auth/callback" \
        https://scrivia.app/api/auth/token
   ```

## 🔄 Maintenance

### Ajout de nouveaux scopes

1. Mettre à jour `oauthClients.ts`
2. Adapter la logique de validation
3. Mettre à jour la documentation

### Monitoring

- Logs des tentatives d'authentification
- Suivi des tokens générés
- Alertes en cas d'échec d'authentification

## 📚 Ressources

- [Documentation OAuth 2.0](https://oauth.net/2/)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [ChatGPT Custom GPT Actions](https://platform.openai.com/docs/actions)
