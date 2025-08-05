# 🤖 Instructions d'Agent - API v2 Scrivia

## 🎯 Vue d'ensemble

Le système d'instructions d'agent garantit que **toutes les instructions définies dans l'agent sont bien envoyées au LLM**, avec une hiérarchie claire des priorités et un formatage approprié.

---

## ✅ **FONCTIONNEMENT COMPLET**

### **🔄 Flux d'exécution :**

1. **Récupération de l'agent** ✅
2. **Fusion des configurations** ✅
3. **Formatage du contexte** ✅
4. **Envoi au LLM** ✅

---

## 🎯 **HIÉRARCHIE DES PRIORITÉS**

### **🏆 PRIORITÉ 1: Agent sélectionné (priorité absolue)**
```typescript
if (agentConfig && agentConfig.provider) {
  targetProvider = agentConfig.provider;
  logger.dev("[LLM API] 🎯 Agent sélectionné - Forcer provider:", agentConfig.provider);
}
```

### **🔧 PRIORITÉ 2: Provider manuel (menu kebab)**
```typescript
else if (provider) {
  targetProvider = provider;
  logger.dev("[LLM API] 🔧 Provider manuel sélectionné:", provider);
}
```

### **⚙️ PRIORITÉ 3: Provider par défaut**
```typescript
else {
  targetProvider = 'synesia';
  logger.dev("[LLM API] ⚙️ Utilisation du provider par défaut:", targetProvider);
}
```

---

## 🔧 **FUSION DES CONFIGURATIONS**

### **📝 Méthode mergeConfigWithAgent :**

```typescript
protected mergeConfigWithAgent(agentConfig?: Agent) {
  const defaultConfig = {
    model: 'deepseek-chat',
    temperature: 0.7,
    max_tokens: 4000,
    top_p: 1.0,
    system_instructions: 'Tu es un assistant IA utile et bienveillant.',
    context_template: '## Contexte utilisateur\n- Type: {{type}}\n- Nom: {{name}}\n- ID: {{id}}\n{{#if content}}- Contenu: {{content}}{{/if}}',
    api_config: {}
  };

  if (!agentConfig) {
    return defaultConfig;
  }

  const mergedConfig = {
    model: agentConfig.model || defaultConfig.model,
    temperature: agentConfig.temperature || defaultConfig.temperature,
    max_tokens: agentConfig.max_tokens || defaultConfig.max_tokens,
    top_p: agentConfig.top_p || defaultConfig.top_p,
    system_instructions: agentConfig.system_instructions || defaultConfig.system_instructions,
    context_template: agentConfig.context_template || defaultConfig.context_template,
    api_config: { ...defaultConfig.api_config, ...agentConfig.api_config }
  };

  return mergedConfig;
}
```

### **✅ Priorité des configurations :**
- **Model :** Agent > Défaut
- **Temperature :** Agent > Défaut
- **Max tokens :** Agent > Défaut
- **Top p :** Agent > Défaut
- **Instructions système :** Agent > Défaut
- **Template de contexte :** Agent > Défaut

---

## 📝 **FORMATAGE DU CONTEXTE**

### **🔧 Méthode formatContext :**

```typescript
protected formatContext(context: AppContext, config: Record<string, unknown>): string {
  const template = config.context_template as string;
  if (!template) {
    return config.system_instructions as string;
  }

  // Remplacement simple des variables du template
  let formatted = template
    .replace(/\{\{type\}\}/g, context.type || '')
    .replace(/\{\{name\}\}/g, context.name || '')
    .replace(/\{\{id\}\}/g, context.id || '')
    .replace(/\{\{content\}\}/g, context.content || '');

  // Gestion conditionnelle simple
  if (!context.content) {
    formatted = formatted.replace(/\{\{#if content\}\}(.*?)\{\{\/if\}\}/g, '');
  } else {
    formatted = formatted.replace(/\{\{#if content\}\}(.*?)\{\{\/if\}\}/g, '$1');
  }

  return `${config.system_instructions}\n\n${formatted}`;
}
```

### **📋 Variables de template disponibles :**
- `{{type}}` - Type de contexte (chat_session, note, etc.)
- `{{name}}` - Nom du contexte
- `{{id}}` - ID du contexte
- `{{content}}` - Contenu du contexte (optionnel)

---

## 📤 **ENVOI AU LLM**

### **🔧 Préparation des messages :**

```typescript
// Récupérer la configuration de l'agent
const config = deepseekProvider['mergeConfigWithAgent'](agentConfig || undefined);

// Préparer les messages avec la configuration dynamique
const systemContent = deepseekProvider['formatContext'](appContext, config);

const messages = [
  {
    role: 'system' as const,
    content: systemContent
  },
  ...history.map((msg: ChatMessage) => ({
    role: msg.role as 'user' | 'assistant' | 'system',
    content: msg.content
  })),
  {
    role: 'user' as const,
    content: message
  }
];

// Appeler DeepSeek avec streaming et configuration dynamique
const payload = {
  model: config.model,
  messages,
  stream: true,
  temperature: config.temperature,
  max_tokens: config.max_tokens,
  top_p: config.top_p,
  ...(tools && { tools })
};
```

---

## 📋 **EXEMPLE COMPLET**

### **🤖 Agent configuré :**
```json
{
  "id": "agent-123",
  "name": "Assistant Notes",
  "provider": "deepseek",
  "model": "deepseek-chat",
  "temperature": 0.7,
  "system_instructions": "Tu es un assistant spécialisé dans la gestion de notes et de documents. Tu peux créer, modifier et organiser des notes dans des classeurs et dossiers.",
  "context_template": "## Contexte utilisateur\n- Type: {{type}}\n- Nom: {{name}}\n- ID: {{id}}\n{{#if content}}- Contenu: {{content}}{{/if}}"
}
```

### **📤 Message système envoyé :**
```
Tu es un assistant spécialisé dans la gestion de notes et de documents. Tu peux créer, modifier et organiser des notes dans des classeurs et dossiers.

## Contexte utilisateur
- Type: chat_session
- Nom: Session de chat
- ID: session-456
```

### **📦 Payload complet :**
```json
{
  "model": "deepseek-chat",
  "messages": [
    {
      "role": "system",
      "content": "Tu es un assistant spécialisé dans la gestion de notes et de documents. Tu peux créer, modifier et organiser des notes dans des classeurs et dossiers.\n\n## Contexte utilisateur\n- Type: chat_session\n- Nom: Session de chat\n- ID: session-456"
    },
    {
      "role": "user",
      "content": "Crée une note sur les meilleures pratiques de développement"
    }
  ],
  "stream": true,
  "temperature": 0.7,
  "max_tokens": 4000,
  "top_p": 1.0,
  "tools": [...]
}
```

---

## 🧪 **TEST DES INSTRUCTIONS**

### **📋 Script de test :**
```bash
node scripts/test-agent-instructions.js
```

### **✅ Résultats attendus :**
```
🤖 Test des instructions d'agent - API v2 Scrivia

🔍 Test de récupération d'agent:
  - Agent ID: test-agent-123
  - Instructions système: "Tu es un assistant spécialisé dans la gestion de notes..."
  - Provider: deepseek
  - Model: deepseek-chat
  - Temperature: 0.7

🔧 Test de fusion des configurations:
  ✅ Configuration par défaut chargée
  ✅ Instructions de l'agent récupérées
  ✅ Configuration fusionnée avec priorité agent
  ✅ Provider forcé selon l'agent

📝 Test de formatage du contexte:
  ✅ Instructions système appliquées
  ✅ Template de contexte formaté
  ✅ Variables remplacées (type, name, id, content)
  ✅ Contenu système final généré

📤 Test d'envoi au LLM:
  ✅ Payload préparé avec instructions agent
  ✅ Messages système avec instructions
  ✅ Historique inclus
  ✅ Message utilisateur ajouté
  ✅ Tools LLM inclus (si activés)

🎯 Mécanismes de priorité:
  ✅ PRIORITÉ 1: Agent sélectionné (priorité absolue)
  ✅ PRIORITÉ 2: Provider manuel (menu kebab)
  ✅ PRIORITÉ 3: Provider par défaut (synesia)

🎉 PARFAIT ! Les instructions d'agent sont bien envoyées au LLM !
```

---

## 🎉 **RÉSULTAT FINAL**

### **✅ INSTRUCTIONS BIEN ENVOYÉES :**
- **Récupération agent** fonctionnelle ✅
- **Fusion configurations** avec priorité ✅
- **Formatage contexte** avec template ✅
- **Envoi LLM** avec instructions ✅
- **Hiérarchie priorités** respectée ✅

### **✅ BÉNÉFICES :**
- **Personnalisation complète** des agents
- **Instructions système** appliquées
- **Contexte dynamique** formaté
- **Provider forcé** selon l'agent
- **Configuration flexible** et extensible

---

## 🚀 **PRÊT POUR LA PRODUCTION**

**✅ Les instructions d'agent sont parfaitement envoyées au LLM !**

- **Hiérarchie des priorités** respectée ✅
- **Fusion des configurations** fonctionnelle ✅
- **Formatage du contexte** dynamique ✅
- **Envoi au LLM** optimisé ✅
- **Personnalisation complète** des agents ✅

---

*Documentation générée le 2024-01-01 - Version 1.0* 