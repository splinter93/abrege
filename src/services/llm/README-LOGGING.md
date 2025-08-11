# 🎯 Logging Détaillé des Appels LLM

Ce système permet d'avoir une visibilité complète sur tous les payloads envoyés aux modèles LLM via l'API Groq.

## 🚀 Fonctionnalités

- **Logging complet du payload** : Tous les paramètres envoyés à l'API
- **Messages détaillés** : Contenu de chaque message avec rôle et longueur
- **Contexte de l'agent** : Instructions système, capacités, configuration
- **Contexte de l'application** : Type, nom, ID, contenu
- **Historique des sessions** : Tous les messages précédents
- **Paramètres de configuration** : Temperature, max_tokens, top_p, etc.
- **Outils disponibles** : Liste des outils API v2 configurés
- **Réponses API** : Status, headers, streaming
- **Fin d'exécution** : Résumé complet de l'exécution

## ⚙️ Configuration

### Variables d'environnement

```bash
# Activer/désactiver le logging détaillé
ENABLE_DETAILED_LLM_LOGGING=true

# Logging des messages individuels
ENABLE_MESSAGE_LOGGING=true

# Logging du contexte de l'agent
ENABLE_AGENT_CONTEXT_LOGGING=true

# Logging du contexte de l'application
ENABLE_APP_CONTEXT_LOGGING=true

# Logging de l'historique des sessions
ENABLE_SESSION_HISTORY_LOGGING=true

# Logging des paramètres de configuration
ENABLE_CONFIG_LOGGING=true

# Logging des outils disponibles
ENABLE_TOOLS_LOGGING=true

# Logging des réponses API
ENABLE_RESPONSE_LOGGING=true

# Logging de fin d'exécution
ENABLE_EXECUTION_END_LOGGING=true

# Longueur maximale des contenus dans les logs
MAX_CONTENT_LENGTH=200

# Longueur maximale des aperçus
MAX_PREVIEW_LENGTH=100
```

### Configuration par environnement

- **Développement** : Logging complet activé par défaut
- **Production** : Logging minimal pour les performances
- **Personnalisé** : Surcharge via variables d'environnement

## 📊 Exemple de Logs

### Début d'exécution
```
[Groq OSS] 🚀 PAYLOAD COMPLET ENVOYÉ À L'API GROQ:
[Groq OSS] 📍 URL: https://api.groq.com/openai/v1/chat/completions
[Groq OSS] 🔑 API Key: sk-1234...abcd
[Groq OSS] 📦 PAYLOAD STRUCTURÉ: {...}
```

### Messages envoyés
```
[Groq OSS] 💬 MESSAGES ENVOYÉS AU LLM:
[Groq OSS] 📝 Message 1 (system):
[Groq OSS]    Contenu: Tu es un assistant IA spécialisé dans...
[Groq OSS]    Longueur: 245 caractères
[Groq OSS]    🎯 INSTRUCTIONS SYSTÈME COMPLÈTES:
[Groq OSS]    Tu es un assistant IA spécialisé dans...
```

### Contexte de l'agent
```
[Groq OSS] 🤖 CONTEXTE DE L'AGENT:
[Groq OSS]    Nom: Assistant Abrège
[Groq OSS]    Provider: groq
[Groq OSS]    Modèle: gpt-oss-120b
[Groq OSS]    Instructions système: ✅ Présentes
[Groq OSS]    Template contexte: ✅ Présent
[Groq OSS]    Capacités API v2: 15
```

### Paramètres de configuration
```
[Groq OSS] ⚙️ PARAMÈTRES DE CONFIGURATION:
[Groq OSS]    Modèle: openai/gpt-oss-120b
[Groq OSS]    Temperature: 0.7
[Groq OSS]    Max Tokens: 4000
[Groq OSS]    Top P: 0.9
[Groq OSS]    Streaming: true
[Groq OSS]    Reasoning Effort: medium
```

### Outils disponibles
```
[Groq OSS] 🔧 OUTILS DISPONIBLES (15):
[Groq OSS]    1. list_classeurs
[Groq OSS]    2. list_dossiers
[Groq OSS]    3. list_notes
[Groq OSS]    4. read_note
[Groq OSS]    5. append_to_note
...
```

### Réponse API
```
[Groq OSS] ✅ RÉPONSE API RÉUSSIE:
[Groq OSS]    Status: 200 OK
[Groq OSS]    Headers: {...}
[Groq OSS]    Streaming activé: ✅ Oui
```

### Fin d'exécution
```
[Groq OSS] ✅ EXÉCUTION TERMINÉE AVEC SUCCÈS:
[Groq OSS]    Réponse finale: 1250 caractères
[Groq OSS]    Contenu: Voici la réponse à votre question...
[Groq OSS]    Session ID: sess_123456
[Groq OSS]    Streaming: Activé
[Groq OSS]    🔚 FIN DE L'EXÉCUTION GROQ OSS
```

## 🔧 Utilisation

### Import de la configuration
```typescript
import { getEnvironmentLoggingConfig } from './loggingConfig';

const loggingConfig = getEnvironmentLoggingConfig();

if (loggingConfig.enableDetailedLLMLogging) {
  // Logging détaillé activé
}
```

### Vérification des options
```typescript
if (loggingConfig.enableMessageLogging) {
  // Logger les messages individuels
}

if (loggingConfig.enableAgentContextLogging) {
  // Logger le contexte de l'agent
}
```

## 🎯 Cas d'usage

### Développement et Debug
- Vérifier que les instructions système sont bien injectées
- Analyser le contexte envoyé au LLM
- Déboguer les problèmes de configuration
- Optimiser les prompts et paramètres

### Production
- Monitoring des appels API
- Audit des instructions système
- Analyse des performances
- Détection d'anomalies

### Support utilisateur
- Reproduction des problèmes
- Analyse des comportements
- Optimisation des réponses

## ⚠️ Notes importantes

- **Performance** : Le logging détaillé peut impacter les performances
- **Stockage** : Les logs peuvent être volumineux
- **Sécurité** : Attention aux informations sensibles dans les logs
- **Environnement** : Adapter la configuration selon l'environnement

## 🚀 Activation rapide

Pour activer le logging complet immédiatement :

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
```

Puis redémarrer votre application. 