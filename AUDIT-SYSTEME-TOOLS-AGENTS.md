# 🔍 AUDIT SYSTÈME TOOLS POUR AGENTS - DONNA

## 🎯 **PROBLÈME IDENTIFIÉ**

**Donna ne voit pas ses tools** car le système de function calling n'est pas correctement configuré dans l'API LLM. Voici l'analyse complète :

---

## 📊 **ANALYSE DU SYSTÈME ACTUEL**

### **1. 🔧 Structure des Tools (✅ CORRECTE)**

```typescript
// src/services/agentApiV2Tools.ts
export class AgentApiV2Tools {
  private tools: Map<string, ApiV2Tool> = new Map();
  
  getToolsForFunctionCalling(): any[] {
    // ✅ Retourne tous les tools disponibles (28 tools)
    return Array.from(this.tools.values()).map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }
}
```

**✅ RÉSULTAT :** 28 tools disponibles et correctement configurés

### **2. 🗄️ Base de Données (✅ CORRECTE)**

```sql
-- Migration appliquée avec succès
ALTER TABLE agents ADD COLUMN IF NOT EXISTS api_v2_capabilities TEXT[] DEFAULT '{}';

-- Agents mis à jour
UPDATE agents SET api_v2_capabilities = ARRAY['create_note', 'update_note', ...]
```

**✅ RÉSULTAT :** Donna a maintenant les capacités API v2

### **3. 🚨 PROBLÈME CRITIQUE : API LLM**

```typescript
// src/app/api/chat/llm/route.ts - LIGNE 296-297
const tools = agentApiV2Tools.getToolsForFunctionCalling();

logger.dev("[LLM API] 🔧 Capacités agent:", agentConfig?.api_v2_capabilities);
logger.dev("[LLM API] 🔧 Tools disponibles:", tools?.length || 0);
```

**❌ PROBLÈME :** Les tools sont TOUJOURS envoyés, même si l'agent n'a pas de capacités API v2 !

---

## 🔍 **DIAGNOSTIC DÉTAILLÉ**

### **🚨 PROBLÈME PRINCIPAL**

Le code actuel dans `route.ts` ne vérifie PAS les capacités de l'agent :

```typescript
// ❌ CODE ACTUEL (PROBLÉMATIQUE)
const tools = agentApiV2Tools.getToolsForFunctionCalling();

// ✅ CODE CORRECT (À IMPLÉMENTER)
const tools = agentConfig?.api_v2_capabilities?.length > 0 
  ? agentApiV2Tools.getToolsForFunctionCalling()
  : undefined;
```

### **🔧 PROBLÈME SECONDAIRE**

Le système ne filtre pas les tools selon les capacités de l'agent :

```typescript
// ❌ PROBLÈME : Tous les tools sont envoyés
const tools = agentApiV2Tools.getToolsForFunctionCalling();

// ✅ SOLUTION : Filtrer selon les capacités
const availableTools = agentApiV2Tools.getToolsForFunctionCalling();
const agentCapabilities = agentConfig?.api_v2_capabilities || [];
const filteredTools = availableTools.filter(tool => 
  agentCapabilities.includes(tool.function.name)
);
```

---

## 🛠️ **SOLUTIONS À IMPLÉMENTER**

### **1. 🔧 CORRECTION IMMÉDIATE**

```typescript
// src/app/api/chat/llm/route.ts - LIGNE 296
// Remplacer par :
const tools = agentConfig?.api_v2_capabilities?.length > 0 
  ? agentApiV2Tools.getToolsForFunctionCalling()
  : undefined;

logger.dev("[LLM API] 🔧 Capacités agent:", agentConfig?.api_v2_capabilities);
logger.dev("[LLM API] 🔧 Tools disponibles:", tools?.length || 0);
```

### **2. 🔧 FILTRAGE PAR CAPACITÉS**

```typescript
// Ajouter dans AgentApiV2Tools
getToolsForFunctionCalling(capabilities?: string[]): any[] {
  const allTools = Array.from(this.tools.values()).map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }));
  
  // Si des capacités spécifiques sont demandées, filtrer
  if (capabilities && capabilities.length > 0) {
    return allTools.filter(tool => capabilities.includes(tool.function.name));
  }
  
  return allTools;
}
```

### **3. 🔧 UTILISATION CORRECTE**

```typescript
// Dans route.ts
const tools = agentConfig?.api_v2_capabilities?.length > 0 
  ? agentApiV2Tools.getToolsForFunctionCalling(agentConfig.api_v2_capabilities)
  : undefined;
```

---

## 🎯 **DIFFÉRENCES ENTRE MODÈLES**

### **🤖 DeepSeek (✅ SUPPORTÉ)**
- Support natif du function calling
- Format standard OpenAI
- Tools envoyés dans le payload

### **🤖 OpenAI OSS (⚠️ À VÉRIFIER)**
- Modèle open-source
- Support du function calling à confirmer
- Format potentiellement différent

### **🤖 Together AI (⚠️ À VÉRIFIER)**
- Modèle GPT-OSS-120B
- Support du function calling à tester
- Format OpenAI standard

---

## 🚀 **PLAN DE CORRECTION**

### **1. 🔧 CORRECTION IMMÉDIATE (5 min)**

```typescript
// Modifier src/app/api/chat/llm/route.ts ligne 296
const tools = agentConfig?.api_v2_capabilities?.length > 0 
  ? agentApiV2Tools.getToolsForFunctionCalling()
  : undefined;
```

### **2. 🔧 AMÉLIORATION (10 min)**

```typescript
// Ajouter le filtrage par capacités
const tools = agentConfig?.api_v2_capabilities?.length > 0 
  ? agentApiV2Tools.getToolsForFunctionCalling(agentConfig.api_v2_capabilities)
  : undefined;
```

### **3. 🔧 TESTS (15 min)**

- Tester avec Donna (DeepSeek)
- Tester avec Together AI
- Vérifier les logs de function calling

---

## 📊 **STATUT ACTUEL**

### **✅ FONCTIONNEL**
- [x] 28 tools disponibles
- [x] Base de données mise à jour
- [x] Donna a les capacités API v2
- [x] Système de tools configuré

### **❌ PROBLÉMATIQUE**
- [ ] API LLM n'utilise pas les capacités de l'agent
- [ ] Tools envoyés même sans capacités
- [ ] Pas de filtrage par agent

### **⚠️ À VÉRIFIER**
- [ ] Support function calling OpenAI OSS
- [ ] Support function calling Together AI
- [ ] Format des tools pour chaque provider

---

## 🎯 **CONCLUSION**

**Donna ne voit pas ses tools** car le système envoie TOUJOURS tous les tools au LLM, sans vérifier si l'agent a les capacités API v2. 

**La solution** est de modifier l'API LLM pour :
1. Vérifier les capacités de l'agent
2. Envoyer les tools seulement si l'agent les supporte
3. Filtrer les tools selon les capacités spécifiques

**Temps de correction estimé : 20 minutes** 