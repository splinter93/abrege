# 🌍 Variables d'Environnement - Logging LLM

Ce fichier documente toutes les variables d'environnement disponibles pour configurer le système de logging détaillé des appels LLM.

## 🚀 Variables Principales

### `ENABLE_DETAILED_LLM_LOGGING`
- **Type**: `boolean`
- **Défaut**: `true` (développement), `false` (production)
- **Description**: Active/désactive le logging détaillé complet des payloads LLM
- **Exemple**: `ENABLE_DETAILED_LLM_LOGGING=true`

### `ENABLE_MESSAGE_LOGGING`
- **Type**: `boolean`
- **Défaut**: `true` (développement), `false` (production)
- **Description**: Active le logging des messages individuels envoyés au LLM
- **Exemple**: `ENABLE_MESSAGE_LOGGING=true`

### `ENABLE_AGENT_CONTEXT_LOGGING`
- **Type**: `boolean`
- **Défaut**: `true` (développement), `false` (production)
- **Description**: Active le logging du contexte de l'agent (instructions système, capacités)
- **Exemple**: `ENABLE_AGENT_CONTEXT_LOGGING=true`

### `ENABLE_APP_CONTEXT_LOGGING`
- **Type**: `boolean`
- **Défaut**: `true` (développement), `false` (production)
- **Description**: Active le logging du contexte de l'application
- **Exemple**: `ENABLE_APP_CONTEXT_LOGGING=true`

### `ENABLE_SESSION_HISTORY_LOGGING`
- **Type**: `boolean`
- **Défaut**: `true` (développement), `false` (production)
- **Description**: Active le logging de l'historique des sessions de chat
- **Exemple**: `ENABLE_SESSION_HISTORY_LOGGING=true`

### `ENABLE_CONFIG_LOGGING`
- **Type**: `boolean`
- **Défaut**: `true` (développement), `false` (production)
- **Description**: Active le logging des paramètres de configuration
- **Exemple**: `ENABLE_CONFIG_LOGGING=true`

### `ENABLE_TOOLS_LOGGING`
- **Type**: `boolean`
- **Défaut**: `true` (développement), `false` (production)
- **Description**: Active le logging des outils API v2 disponibles
- **Exemple**: `ENABLE_TOOLS_LOGGING=true`

### `ENABLE_RESPONSE_LOGGING`
- **Type**: `boolean`
- **Défaut**: `true` (développement), `false` (production)
- **Description**: Active le logging des réponses de l'API Groq
- **Exemple**: `ENABLE_RESPONSE_LOGGING=true`

### `ENABLE_EXECUTION_END_LOGGING`
- **Type**: `boolean`
- **Défaut**: `true` (développement), `false` (production)
- **Description**: Active le logging de fin d'exécution avec résumé
- **Exemple**: `ENABLE_EXECUTION_END_LOGGING=true`

## 📏 Variables de Formatage

### `MAX_CONTENT_LENGTH`
- **Type**: `number`
- **Défaut**: `200` (développement), `50` (production)
- **Description**: Longueur maximale des contenus affichés dans les logs
- **Exemple**: `MAX_CONTENT_LENGTH=200`

### `MAX_PREVIEW_LENGTH`
- **Type**: `number`
- **Défaut**: `100` (développement), `25` (production)
- **Description**: Longueur maximale des aperçus de contenu
- **Exemple**: `MAX_PREVIEW_LENGTH=100`

## 🔧 Configuration par Environnement

### Développement (par défaut)
```bash
# Logging complet activé
ENABLE_DETAILED_LLM_LOGGING=true
ENABLE_MESSAGE_LOGGING=true
ENABLE_AGENT_CONTEXT_LOGGING=true
ENABLE_APP_CONTEXT_LOGGING=true
ENABLE_SESSION_HISTORY_LOGGING=true
ENABLE_CONFIG_LOGGING=true
ENABLE_TOOLS_LOGGING=true
ENABLE_RESPONSE_LOGGING=true
ENABLE_EXECUTION_END_LOGGING=true
MAX_CONTENT_LENGTH=500
MAX_PREVIEW_LENGTH=200
```

### Production (par défaut)
```bash
# Logging minimal pour les performances
ENABLE_DETAILED_LLM_LOGGING=false
ENABLE_MESSAGE_LOGGING=false
ENABLE_AGENT_CONTEXT_LOGGING=false
ENABLE_APP_CONTEXT_LOGGING=false
ENABLE_SESSION_HISTORY_LOGGING=false
ENABLE_CONFIG_LOGGING=false
ENABLE_TOOLS_LOGGING=false
ENABLE_RESPONSE_LOGGING=false
ENABLE_EXECUTION_END_LOGGING=false
MAX_CONTENT_LENGTH=50
MAX_PREVIEW_LENGTH=25
```

## 🚀 Activation Rapide

### Pour activer le logging complet immédiatement :
```bash
export ENABLE_DETAILED_LLM_LOGGING=true
export ENABLE_MESSAGE_LOGGING=true
export ENABLE_AGENT_CONTEXT_LOGGING=true
export ENABLE_APP_CONTEXT_LOGGING=true
export ENABLE_SESSION_HISTORY_LOGGING=true
export ENABLE_CONFIG_LOGGING=true
export ENABLE_TOOLS_LOGGING=true
export ENABLE_RESPONSE_LOGGING=true
export ENABLE_EXECUTION_END_LOGGING=true
export MAX_CONTENT_LENGTH=500
export MAX_PREVIEW_LENGTH=200
```

### Pour désactiver le logging complet :
```bash
export ENABLE_DETAILED_LLM_LOGGING=false
export ENABLE_MESSAGE_LOGGING=false
export ENABLE_AGENT_CONTEXT_LOGGING=false
export ENABLE_APP_CONTEXT_LOGGING=false
export ENABLE_SESSION_HISTORY_LOGGING=false
export ENABLE_CONFIG_LOGGING=false
export ENABLE_TOOLS_LOGGING=false
export ENABLE_RESPONSE_LOGGING=false
export ENABLE_EXECUTION_END_LOGGING=false
```

## 📁 Fichier .env

Créez un fichier `.env` à la racine de votre projet avec les variables souhaitées :

```bash
# .env
ENABLE_DETAILED_LLM_LOGGING=true
ENABLE_MESSAGE_LOGGING=true
ENABLE_AGENT_CONTEXT_LOGGING=true
ENABLE_APP_CONTEXT_LOGGING=true
ENABLE_SESSION_HISTORY_LOGGING=true
ENABLE_CONFIG_LOGGING=true
ENABLE_TOOLS_LOGGING=true
ENABLE_RESPONSE_LOGGING=true
ENABLE_EXECUTION_END_LOGGING=true
MAX_CONTENT_LENGTH=300
MAX_PREVIEW_LENGTH=150
```

## ⚠️ Notes Importantes

1. **Redémarrage requis** : Redémarrez votre application après modification des variables d'environnement
2. **Performance** : Le logging détaillé peut impacter les performances
3. **Stockage** : Les logs peuvent être volumineux, surveillez l'espace disque
4. **Sécurité** : Attention aux informations sensibles dans les logs
5. **Environnement** : Adaptez la configuration selon votre environnement

## 🔍 Vérification

Pour vérifier que vos variables d'environnement sont bien prises en compte, regardez les logs de votre application. Vous devriez voir des messages comme :

```
[Groq OSS] 🚀 PAYLOAD COMPLET ENVOYÉ À L'API GROQ:
[Groq OSS] 💬 MESSAGES ENVOYÉS AU LLM:
[Groq OSS] 🤖 CONTEXTE DE L'AGENT:
```

Si vous ne voyez pas ces messages, vérifiez que :
1. Les variables d'environnement sont bien définies
2. L'application a été redémarrée
3. Le logging est activé dans votre configuration 