# 🚀 Configuration LLM - Messages système et personnalisation

Ce document explique comment configurer et personnaliser les messages système des LLM dans Abrège.

## 📋 **Vue d'ensemble**

Le système de templates de messages système permet de :
- ✅ Centraliser tous les messages système
- ✅ Personnaliser les instructions selon le contexte
- ✅ Utiliser des variables dynamiques
- ✅ Configurer via des variables d'environnement
- ✅ Créer des templates personnalisés

## 🔧 **Configuration rapide**

### 1. **Variables d'environnement principales**

Créez un fichier `.env.local` avec :

```bash
# Template par défaut
LLM_SYSTEM_TEMPLATE=assistant-contextual

# Instructions personnalisées
LLM_CUSTOM_INSTRUCTIONS="Toujours être précis et factuel"

# Langue
LLM_LANGUAGE=fr

# Provider par défaut
LLM_DEFAULT_PROVIDER=groq
GROQ_API_KEY=your_api_key_here
```

### 2. **Templates disponibles**

| ID | Nom | Description | Variables |
|----|-----|-------------|-----------|
| `assistant-basic` | Assistant de base | Assistant IA utile et bienveillant | Aucune |
| `assistant-scrivia` | Assistant Scrivia | Spécialisé dans l'aide avec l'API Scrivia | Aucune |
| `assistant-tools` | Assistant avec outils | Capable d'utiliser des function calls | Aucune |
| `assistant-contextual` | Assistant contextuel | Avec contexte utilisateur et personnalisation | `context.type`, `context.name`, `context.id`, `context.content` |
| `assistant-error-handler` | Gestionnaire d'erreurs | Spécialisé dans la gestion d'erreurs avec fallbacks | Aucune |

## 🎨 **Personnalisation avancée**

### 1. **Template personnalisé**

```bash
# Template JSON personnalisé
CUSTOM_SYSTEM_TEMPLATE='[{"id":"assistant-specialized","name":"Assistant Spécialisé","description":"Assistant pour tâches spécialisées","content":"Tu es un assistant spécialisé dans {{specialty}}. {{custom_instructions}}","variables":["specialty","custom_instructions"],"isDefault":false}]'
```

### 2. **Instructions personnalisées**

```bash
# Instructions globales ajoutées à tous les templates
LLM_CUSTOM_INSTRUCTIONS="Toujours être précis et factuel. Utiliser des exemples concrets quand c'est possible."
```

### 3. **Variables dynamiques**

Les templates supportent des variables avec la syntaxe `{{variable}}` :

```typescript
// Exemple d'utilisation
const message = getSystemMessage('assistant-contextual', {
  context: {
    type: 'note',
    name: 'Ma Note',
    id: '123',
    content: 'Contenu de la note'
  }
});
```

## ⚙️ **Configuration complète**

### **Variables d'environnement disponibles**

#### **Messages système**
- `LLM_SYSTEM_TEMPLATE` - Template par défaut
- `LLM_CUSTOM_INSTRUCTIONS` - Instructions personnalisées
- `LLM_LANGUAGE` - Langue (fr/en)
- `CUSTOM_SYSTEM_TEMPLATE` - Templates personnalisés JSON

#### **Configuration générale**
- `LLM_DEFAULT_PROVIDER` - Provider par défaut
- `LLM_DEFAULT_MODEL` - Modèle par défaut
- `LLM_DEFAULT_TEMPERATURE` - Température par défaut
- `LLM_DEFAULT_MAX_TOKENS` - Tokens max par défaut

#### **Outils**
- `LLM_ENABLE_FUNCTION_CALLS` - Activer function calls
- `LLM_ENABLE_STREAMING` - Activer streaming
- `LLM_MAX_TOOL_CALLS` - Nombre max d'appels d'outils

#### **Monitoring**
- `LLM_ENABLE_LOGGING` - Activer logs
- `LLM_ENABLE_METRICS` - Activer métriques
- `LLM_LOG_LEVEL` - Niveau de log

#### **Provider Groq**
- `GROQ_API_KEY` - Clé API
- `GROQ_BASE_URL` - URL de base
- `GROQ_MODEL` - Modèle par défaut
- `GROQ_SERVICE_TIER` - Niveau de service

#### **Provider Synesia**
- `SYNESIA_API_KEY` - Clé API
- `SYNESIA_BASE_URL` - URL de base
- `SYNESIA_MODEL` - Modèle par défaut

## 🔄 **Utilisation dans le code**

### 1. **Import des fonctions**

```typescript
import { 
  getSystemMessage, 
  getDefaultSystemMessage,
  buildContextualSystemMessage 
} from '@/services/llm/templates';
```

### 2. **Utilisation basique**

```typescript
// Template simple
const message = getSystemMessage('assistant-basic');

// Template avec variables
const message = getSystemMessage('assistant-contextual', {
  context: { name: 'Utilisateur', type: 'note' }
});
```

### 3. **Template par défaut**

```typescript
// Utilise le template configuré par défaut
const message = getDefaultSystemMessage();

// Avec variables
const message = getDefaultSystemMessage({ user: 'John' });
```

## 🧪 **Tests et validation**

### 1. **Vérifier la configuration**

```typescript
import { LLMConfigManager } from '@/services/llm/config';

const config = LLMConfigManager.getInstance();
console.log('Configuration valide:', config.validateConfig());
console.log('Config actuelle:', config.getConfig());
```

### 2. **Tester un template**

```typescript
import { SystemMessageTemplateManager } from '@/services/llm/templates';

const manager = SystemMessageTemplateManager.getInstance();
const template = manager.getTemplate('assistant-contextual');
console.log('Template:', template);
```

## 🚨 **Dépannage**

### **Problèmes courants**

1. **Template non trouvé**
   - Vérifiez l'ID du template dans `LLM_SYSTEM_TEMPLATE`
   - Consultez la liste des templates disponibles

2. **Variables non remplacées**
   - Vérifiez la syntaxe `{{variable}}`
   - Assurez-vous que les variables sont passées correctement

3. **Configuration non chargée**
   - Vérifiez le fichier `.env.local`
   - Redémarrez l'application après modification

### **Logs de débogage**

```bash
# Activer les logs détaillés
LLM_LOG_LEVEL=debug
LLM_ENABLE_LOGGING=true
```

## 📚 **Exemples complets**

### **Template personnalisé pour assistant spécialisé**

```json
{
  "id": "assistant-coding",
  "name": "Assistant Développement",
  "description": "Assistant spécialisé dans le développement web",
  "content": "Tu es un assistant spécialisé dans le développement web avec {{framework}}. {{custom_instructions}}",
  "variables": ["framework", "custom_instructions"],
  "isDefault": false
}
```

### **Configuration pour environnement de production**

```bash
# Production - Assistant professionnel
LLM_SYSTEM_TEMPLATE=assistant-contextual
LLM_CUSTOM_INSTRUCTIONS="Toujours être professionnel et précis. Éviter l'humour."
LLM_LANGUAGE=fr
LLM_DEFAULT_TEMPERATURE=0.3
LLM_LOG_LEVEL=warn
```

### **Configuration pour développement**

```bash
# Développement - Assistant détaillé
LLM_SYSTEM_TEMPLATE=assistant-tools
LLM_CUSTOM_INSTRUCTIONS="Expliquer chaque étape en détail. Être pédagogue."
LLM_LANGUAGE=fr
LLM_DEFAULT_TEMPERATURE=0.8
LLM_LOG_LEVEL=debug
```

## 🎯 **Bonnes pratiques**

1. **Templates réutilisables** : Créez des templates génériques avec des variables
2. **Instructions claires** : Soyez précis dans vos instructions personnalisées
3. **Variables cohérentes** : Utilisez des noms de variables explicites
4. **Configuration par environnement** : Adaptez selon dev/staging/prod
5. **Tests réguliers** : Validez vos templates avec différents contextes

## 🔗 **Liens utiles**

- [Architecture LLM](./ARCHITECTURE-LLM.md)
- [API Templates](./src/services/llm/templates.ts)
- [Configuration LLM](./src/services/llm/config.ts)
- [Tests LLM](./tests/llm/) 