# 🧠 Intégration du paramètre reasoning_effort

## 🎯 **Qu'est-ce que reasoning_effort ?**

Le paramètre `reasoning_effort` est un paramètre spécifique à l'API Groq qui contrôle le niveau de raisonnement du modèle LLM. Il permet d'activer le **chain-of-thought reasoning** pour améliorer la qualité des réponses sur des tâches complexes.

### 📊 **Niveaux disponibles :**

| Niveau | Description | Utilisation recommandée |
|--------|-------------|------------------------|
| `low` | Raisonnement minimal | Réponses rapides, tâches simples |
| `medium` | Raisonnement équilibré | Tâches moyennement complexes |
| `high` | Raisonnement intensif | Tâches très complexes, analyse approfondie |

---

## ✅ **Intégration complète**

### 1. **Dans la table `agents`**

Le paramètre est stocké dans la colonne `reasoning_effort` :
```sql
ALTER TABLE agents ADD COLUMN IF NOT EXISTS reasoning_effort VARCHAR(20) DEFAULT 'low';
```

### 2. **Dans l'interface TypeScript**

```typescript
export interface Agent {
  // ... autres propriétés
  reasoning_effort?: 'low' | 'medium' | 'high';
}
```

### 3. **Dans GroqOrchestrator**

Le paramètre est maintenant utilisé pour configurer le provider :

```typescript
private getConfiguredProvider(agentConfig?: any): GroqProvider {
  const customConfig = {
    // ... autres paramètres
    reasoningEffort: agentConfig.reasoning_effort || this.groqProvider.config.reasoningEffort,
  };
  
  return new GroqProvider(customConfig);
}
```

### 4. **Dans le provider Groq**

Le paramètre est envoyé à l'API Groq :

```typescript
if (this.config.reasoningEffort) {
  payload.reasoning_effort = this.config.reasoningEffort;
}
```

---

## 🔧 **Configuration des agents**

### **Instructions par défaut avec reasoning_effort :**

```javascript
const updateData = {
  system_instructions: defaultInstructions,
  reasoning_effort: agent.reasoning_effort || 'medium', // 🧠 Niveau par défaut
  // ... autres paramètres
};
```

### **Niveaux recommandés par provider :**

| Provider | Niveau recommandé | Raison |
|----------|-------------------|--------|
| Groq | `medium` | Bon équilibre performance/qualité |
| Synesia | `low` | Réponses rapides |
| DeepSeek | `high` | Analyse approfondie |

---

## 🧪 **Tests et validation**

### 1. **Test de configuration**
```bash
node scripts/test-reasoning-effort.js
```

### 2. **Test de configuration générale**
```bash
node scripts/test-agent-configuration.js
```

### 3. **Correction automatique**
```bash
node scripts/fix-agent-instructions.js
```

---

## 📊 **Exemple d'utilisation**

### **Agent avec reasoning_effort = 'medium' :**

```json
{
  "id": "agent-123",
  "name": "Assistant Groq Expert",
  "provider": "groq",
  "model": "openai/gpt-oss-120b",
  "reasoning_effort": "medium",
  "system_instructions": "Tu es un assistant expert...",
  "api_v2_capabilities": ["create_note", "update_note", ...]
}
```

### **Payload envoyé à l'API Groq :**

```json
{
  "model": "openai/gpt-oss-120b",
  "messages": [...],
  "temperature": 0.7,
  "max_completion_tokens": 8000,
  "top_p": 0.9,
  "reasoning_effort": "medium",  // ✅ Utilisé !
  "service_tier": "on_demand",
  "parallel_tool_calls": true
}
```

---

## 🎯 **Impact sur les performances**

### **Avantages :**

1. **Meilleure qualité** - Le modèle réfléchit plus avant de répondre
2. **Réponses plus structurées** - Chain-of-thought pour les tâches complexes
3. **Moins d'erreurs** - Raisonnement plus approfondi

### **Inconvénients :**

1. **Latence accrue** - Plus de temps de traitement
2. **Coût plus élevé** - Plus de tokens consommés
3. **Ressources** - Utilisation plus intensive du modèle

### **Recommandations :**

- **`low`** : Pour les interactions rapides, questions simples
- **`medium`** : Pour la plupart des cas d'usage, bon équilibre
- **`high`** : Pour l'analyse complexe, la résolution de problèmes

---

## 🔍 **Monitoring et logs**

### **Logs de configuration :**

```
[GroqOrchestrator] 🎯 Configuration agent: {
  model: "openai/gpt-oss-120b",
  temperature: 0.7,
  maxTokens: 8000,
  reasoningEffort: "medium"  // ✅ Loggé !
}
```

### **Vérification dans les scripts :**

```javascript
console.log(`🧠 Niveau: ${agent.reasoning_effort}`);
console.log(`✅ Le reasoning_effort "${testAgent.reasoning_effort}" sera bien envoyé à l'API Groq`);
```

---

## 🚀 **Résultat final**

Maintenant, **le paramètre `reasoning_effort` est complètement intégré** :

1. ✅ **Stocké** dans la base de données
2. ✅ **Récupéré** depuis l'agent
3. ✅ **Configuré** dans le provider
4. ✅ **Envoyé** à l'API Groq
5. ✅ **Utilisé** par le modèle LLM

Chaque agent peut avoir son propre niveau de raisonnement, permettant une personnalisation fine des capacités cognitives selon les besoins ! 