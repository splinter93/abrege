# 🚀 Function Calling API v2 - Documentation Complète

## 📋 Vue d'ensemble

Le système **Function Calling** permet aux agents IA de manipuler directement l'API v2 de Scrivia via des fonctions standardisées. Cette approche est **plus fiable et maintenable** que le parsing d'intentions.

## 🎯 Avantages pour la Production

### ✅ **Function Calling (Recommandé)**
- **Standardisé** : Support natif par tous les LLMs (GPT-4, Claude, DeepSeek)
- **Fiable** : Validation automatique des paramètres
- **Maintenable** : Code propre et extensible
- **Performant** : Plus rapide que le parsing regex
- **Sécurisé** : Contrôle des capacités par agent
- **Monitoring** : Traçabilité complète des actions

### ❌ **Parser d'Intentions (Complexe)**
- Fragile : Patterns regex peuvent casser
- Maintenance : Difficile à déboguer
- Limité : Ne gère pas les cas complexes
- Erreurs : Risque de faux positifs/négatifs

## 🏗️ Architecture

### 1. **Service AgentApiV2Tools**
```typescript
// src/services/agentApiV2Tools.ts
export class AgentApiV2Tools {
  private tools: Map<string, ApiV2Tool> = new Map();
  
  // Outils disponibles
  - create_note
  - update_note
  - add_content_to_note
  - move_note
  - delete_note
  - create_folder
  - get_note_content
}
```

### 2. **Configuration d'Agent**
```sql
-- Migration: Ajout des capacités API v2
ALTER TABLE agents ADD COLUMN IF NOT EXISTS api_v2_capabilities TEXT[] DEFAULT '{}';
```

### 3. **Intégration LLM**
```typescript
// Dans l'API LLM
const tools = agentConfig?.api_v2_capabilities?.length > 0 
  ? agentApiV2Tools.getToolsForFunctionCalling()
  : undefined;

const payload = {
  model: config.model,
  messages,
  stream: true,
  tools // ← Function calling automatique
};
```

## 🔧 Outils Disponibles

### **create_note**
```json
{
  "name": "create_note",
  "description": "Créer une nouvelle note dans Scrivia",
  "parameters": {
    "type": "object",
    "properties": {
      "source_title": { "type": "string", "description": "Titre de la note" },
      "markdown_content": { "type": "string", "description": "Contenu markdown (optionnel)" },
      "notebook_id": { "type": "string", "description": "ID du classeur" },
      "folder_id": { "type": "string", "description": "ID du dossier (optionnel)" }
    },
    "required": ["source_title", "notebook_id"]
  }
}
```

### **update_note**
```json
{
  "name": "update_note",
  "description": "Mettre à jour une note existante",
  "parameters": {
    "type": "object",
    "properties": {
      "ref": { "type": "string", "description": "ID ou slug de la note" },
      "source_title": { "type": "string", "description": "Nouveau titre" },
      "markdown_content": { "type": "string", "description": "Nouveau contenu" }
    },
    "required": ["ref"]
  }
}
```

### **add_content_to_note**
```json
{
  "name": "add_content_to_note",
  "description": "Ajouter du contenu à une note existante",
  "parameters": {
    "type": "object",
    "properties": {
      "ref": { "type": "string", "description": "ID ou slug de la note" },
      "content": { "type": "string", "description": "Contenu à ajouter" }
    },
    "required": ["ref", "content"]
  }
}
```

### **move_note**
```json
{
  "name": "move_note",
  "description": "Déplacer une note vers un autre dossier",
  "parameters": {
    "type": "object",
    "properties": {
      "ref": { "type": "string", "description": "ID ou slug de la note" },
      "folder_id": { "type": "string", "description": "ID du dossier de destination" }
    },
    "required": ["ref", "folder_id"]
  }
}
```

### **delete_note**
```json
{
  "name": "delete_note",
  "description": "Supprimer une note",
  "parameters": {
    "type": "object",
    "properties": {
      "ref": { "type": "string", "description": "ID ou slug de la note" }
    },
    "required": ["ref"]
  }
}
```

### **create_folder**
```json
{
  "name": "create_folder",
  "description": "Créer un nouveau dossier",
  "parameters": {
    "type": "object",
    "properties": {
      "name": { "type": "string", "description": "Nom du dossier" },
      "notebook_id": { "type": "string", "description": "ID du classeur" },
      "parent_id": { "type": "string", "description": "ID du dossier parent (optionnel)" }
    },
    "required": ["name", "notebook_id"]
  }
}
```

### **get_note_content**
```json
{
  "name": "get_note_content",
  "description": "Récupérer le contenu d'une note",
  "parameters": {
    "type": "object",
    "properties": {
      "ref": { "type": "string", "description": "ID ou slug de la note" }
    },
    "required": ["ref"]
  }
}
```

## 🚀 Utilisation

### 1. **Créer un Agent avec Capacités API v2**
```javascript
const agentData = {
  name: 'Assistant Scrivia API v2',
  provider: 'deepseek',
  api_v2_capabilities: [
    'create_note',
    'update_note',
    'add_content_to_note',
    'move_note',
    'delete_note',
    'create_folder'
  ]
};
```

### 2. **Exemples d'Utilisation**

#### **Créer une note**
```
Message: "Créer une note 'Mon analyse' avec le contenu 'Voici mon analyse...'"

LLM Response:
{
  "type": "function",
  "function": {
    "name": "create_note",
    "arguments": {
      "source_title": "Mon analyse",
      "markdown_content": "Voici mon analyse...",
      "notebook_id": "notebook-id"
    }
  }
}

API Call:
POST /api/v2/note/create
{
  "source_title": "Mon analyse",
  "markdown_content": "Voici mon analyse...",
  "notebook_id": "notebook-id"
}
```

#### **Ajouter du contenu**
```
Message: "Ajouter 'nouveau contenu' à la note 'Mon analyse'"

LLM Response:
{
  "type": "function",
  "function": {
    "name": "add_content_to_note",
    "arguments": {
      "ref": "Mon analyse",
      "content": "nouveau contenu"
    }
  }
}

API Call:
POST /api/v2/note/Mon analyse/add-content
{
  "content": "nouveau contenu"
}
```

#### **Déplacer une note**
```
Message: "Déplacer la note 'Mon analyse' vers le dossier 'Projets'"

LLM Response:
{
  "type": "function",
  "function": {
    "name": "move_note",
    "arguments": {
      "ref": "Mon analyse",
      "folder_id": "Projets"
    }
  }
}

API Call:
PUT /api/v2/note/Mon analyse/move
{
  "folder_id": "Projets"
}
```

## 🔄 Flux de Fonctionnement

### 1. **Réception du Message**
```
Utilisateur → "Créer une note 'Mon analyse'"
```

### 2. **Configuration des Outils**
```typescript
const tools = agentConfig?.api_v2_capabilities?.length > 0 
  ? agentApiV2Tools.getToolsForFunctionCalling()
  : undefined;
```

### 3. **Appel LLM avec Function Calling**
```typescript
const payload = {
  model: 'deepseek-chat',
  messages: [...],
  tools: [
    {
      "type": "function",
      "function": {
        "name": "create_note",
        "description": "Créer une nouvelle note dans Scrivia",
        "parameters": { ... }
      }
    }
  ]
};
```

### 4. **Réponse du LLM**
```json
{
  "type": "function",
  "function": {
    "name": "create_note",
    "arguments": {
      "source_title": "Mon analyse",
      "markdown_content": "Voici mon analyse...",
      "notebook_id": "notebook-id"
    }
  }
}
```

### 5. **Exécution de la Fonction**
```typescript
const result = await agentApiV2Tools.executeTool(
  'create_note',
  { source_title: 'Mon analyse', ... },
  userId
);
```

### 6. **Appel API v2**
```
POST /api/v2/note/create
{
  "source_title": "Mon analyse",
  "markdown_content": "Voici mon analyse...",
  "notebook_id": "notebook-id"
}
```

### 7. **Réponse à l'Utilisateur**
```
"J'ai créé la note 'Mon analyse' avec succès."
```

## 🛠️ Déploiement

### 1. **Migration de Base de Données**
```bash
# Appliquer la migration
npx supabase db push
```

### 2. **Créer un Agent de Test**
```bash
# Exécuter le script de création d'agent
node scripts/create-api-v2-agent.js
```

### 3. **Tester le Système**
```bash
# Lancer la démonstration
npx tsx src/services/agentApiV2Tools.demo.ts
```

## 📊 Monitoring et Debugging

### **Logs de Debug**
```typescript
logger.dev("[LLM API] 🔧 Function call détectée:", functionCallData);
logger.dev("[LLM API] ✅ Résultat de la fonction:", result);
logger.dev("[AgentApiV2Tools] 🌐 Appel API:", method, url);
```

### **Traçabilité**
- Chaque action est loggée avec l'agent responsable
- Les paramètres sont validés automatiquement
- Les erreurs sont capturées et reportées
- Les performances sont mesurées

## 🔒 Sécurité

### **Contrôle d'Accès**
- Seuls les agents avec les bonnes capacités peuvent utiliser l'API
- Validation des paramètres côté serveur
- Authentification requise pour toutes les actions

### **Validation**
```typescript
// Validation automatique des paramètres
const tool = this.tools.get(toolName);
if (!tool) {
  throw new Error(`Tool not found: ${toolName}`);
}

// Validation des capacités
if (!this.hasCapability(capabilities, action)) {
  throw new Error(`Capability not available: ${action}`);
}
```

## 🚀 Avantages pour la Production

1. **⚡ Implémentation Simple** : Quelques lignes de code
2. **🛡️ Fiabilité** : Standard éprouvé
3. **🔧 Maintenance** : Facile à déboguer
4. **📈 Scalabilité** : Facile d'ajouter de nouveaux outils
5. **🎯 Précision** : Le LLM choisit la bonne fonction
6. **📊 Monitoring** : Traçabilité complète

## 🎉 Conclusion

Le système **Function Calling** est la solution idéale pour permettre aux agents de manipuler l'API v2 de Scrivia de manière **fiable, maintenable et extensible**.

**Prêt pour la production ! 🚀** 