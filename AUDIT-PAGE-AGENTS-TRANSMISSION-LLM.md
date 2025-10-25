# 🔍 Audit : Page Agents & Transmission des Paramètres au LLM

**Date** : 25 Octobre 2025  
**Objectif** : Vérifier que tous les paramètres configurés dans la page agents sont bien transmis au LLM lors des conversations dans le chat.

---

## 📋 Paramètres Configurables dans la Page Agents

La page `/private/agents` permet de configurer :

### 1. **Informations Générales**
- ✅ `display_name` - Nom d'affichage de l'agent
- ✅ `slug` - Identifiant unique (lecture seule)
- ✅ `description` - Description de l'agent
- ✅ `profile_picture` - Avatar de l'agent

### 2. **Instructions Système**
- ✅ `system_instructions` - Instructions complètes (textarea, 10 lignes)

### 3. **Expertise**
- ✅ `expertise` - Domaines d'expertise (séparés par virgules)
- ✅ `api_v2_capabilities` - Capacités API V2 (affichage tags)
- ✅ `personality` - Personnalité de l'agent

### 4. **Modèle LLM**
- ✅ `model` - Sélection du modèle (dropdown groupé par catégorie)
- ✅ `provider` - Provider (Groq ou xAI)

### 5. **Paramètres LLM** (Section collapsible)
- ✅ `temperature` - Slider (0-2, step 0.1)
- ✅ `top_p` - Slider (0-1, step 0.05)
- ✅ `max_tokens` - Input number (1-100000)

### 6. **Tools**
- ✅ OpenAPI Tools - Gestion des schémas OpenAPI
- ✅ MCP Tools - Gestion des serveurs MCP

### 7. **État**
- ✅ `is_active` - Checkbox actif/inactif
- ✅ `priority` - Input number pour priorité
- ✅ `version` - Lecture seule

---

## 🔄 Flux de Transmission au LLM

```
┌─────────────────────────────────────────┐
│  1. PAGE AGENTS (/private/agents)       │
│     - Configuration UI                  │
│     - Modification des paramètres       │
└──────────────────┬──────────────────────┘
                   │ patchAgent()
                   ▼
┌─────────────────────────────────────────┐
│  2. SAUVEGARDE EN BASE DE DONNÉES       │
│     - Table 'agents'                    │
│     - Tous les champs stockés           │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  3. CHAT UI (ChatFullscreenV2)          │
│     - useChatStore.selectedAgent        │
│     - selectedAgentId stocké            │
└──────────────────┬──────────────────────┘
                   │ handleSendMessage()
                   ▼
┌─────────────────────────────────────────┐
│  4. API ROUTE (/api/chat/llm)           │
│     - Récupère agentConfig depuis DB    │
│     - SELECT * FROM agents WHERE id =   │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  5. ORCHESTRATEUR (AgentOrchestrator)   │
│     - selectProvider(agentConfig)       │
│     - buildSystemMessage(agentConfig)   │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  6. PROVIDER (GroqProvider/XAIProvider) │
│     - new Provider({ config })          │
│     - Appel API avec paramètres         │
└─────────────────────────────────────────┘
```

---

## ✅ Paramètres BIEN Transmis au LLM

### 1. **system_instructions** ✅
- ✅ Stocké en DB
- ✅ Récupéré dans `/api/chat/llm/route.ts` (ligne 169-193)
- ✅ Passé à `SystemMessageBuilder.buildSystemMessage()`
- ✅ Utilisé comme message système dans le chat

**Preuve** :
```typescript
// SystemMessageBuilder.ts (ligne 66)
const primaryInstructions = agentConfig.system_instructions?.trim();
if (primaryInstructions) {
  content = primaryInstructions;
  hasCustomInstructions = true;
}
```

### 2. **temperature** ✅
- ✅ Stocké en DB
- ✅ Récupéré dans `/api/chat/llm/route.ts`
- ✅ Passé à `AgentOrchestrator.selectProvider()`
- ✅ Transmis au provider

**Preuve** :
```typescript
// AgentOrchestrator.ts (ligne 145)
return new XAIProvider({
  model: model || 'grok-4-fast',
  temperature: typeof agentConfig?.temperature === 'number' ? agentConfig.temperature : 0.7,
  maxTokens: agentConfig?.max_tokens || 8000
});
```

### 3. **max_tokens** ✅
- ✅ Stocké en DB
- ✅ Récupéré et passé au provider

### 4. **model** ✅
- ✅ Stocké en DB
- ✅ Récupéré et passé au provider

### 5. **provider** ✅
- ✅ Stocké en DB
- ✅ Utilisé pour sélectionner le bon provider (Groq vs xAI)

### 6. **personality, expertise, capabilities** ✅
- ✅ Stocké en DB
- ✅ Récupéré dans agentConfig
- ✅ Ajouté au message système par `SystemMessageBuilder`

**Preuve** :
```typescript
// SystemMessageBuilder.ts (lignes 192-215)
if (agentConfig.personality?.trim()) {
  content += `\n\n## Personnalité\n${agentConfig.personality.trim()}`;
}

if (agentConfig.expertise && agentConfig.expertise.length > 0) {
  content += `\n\n## Domaines d'expertise\n${expertiseList}`;
}

if (agentConfig.capabilities && agentConfig.capabilities.length > 0) {
  content += `\n\n## Capacités\n${capabilitiesList}`;
}
```

### 7. **api_v2_capabilities** (Tools) ✅
- ✅ Stocké en DB
- ✅ Récupéré et vérifié dans `/api/chat/llm/route.ts`
- ✅ Utilisé pour générer les tools OpenAPI
- ✅ Passé à l'orchestrateur

---

## ❌ Paramètres MAL Transmis au LLM

### 🚨 **PROBLÈME CRITIQUE #1 : top_p** ❌

**Où** : `AgentOrchestrator.selectProvider()` et `SimpleOrchestrator.selectProvider()`

**Symptôme** : Le paramètre `top_p` configuré dans la page agents n'est **PAS** transmis au provider.

**Code actuel** :
```typescript
// AgentOrchestrator.ts (lignes 143-147)
return new XAIProvider({
  model: model || 'grok-4-fast',
  temperature: typeof agentConfig?.temperature === 'number' ? agentConfig.temperature : 0.7,
  maxTokens: agentConfig?.max_tokens || 8000
  // ❌ top_p manquant !
});

// AgentOrchestrator.ts (lignes 151-155)
return new GroqProvider({
  model: model || 'openai/gpt-oss-20b',
  temperature: typeof agentConfig?.temperature === 'number' ? agentConfig.temperature : 0.7,
  maxTokens: agentConfig?.max_tokens || 8000
  // ❌ top_p manquant !
});
```

**Impact** :
- ❌ Le `top_p` configuré par l'utilisateur est **ignoré**
- ❌ La valeur par défaut du provider est utilisée (0.9 pour Groq, 0.85 pour xAI)
- ❌ L'utilisateur pense avoir configuré `top_p` mais ça n'a aucun effet
- ❌ Le comportement du LLM ne correspond pas aux attentes

**Valeurs par défaut utilisées** :
- Groq : `topP: 0.9` (ligne 85 de `groq.ts`)
- xAI : `topP: 0.85` (ligne 106 de `xai.ts`)

**Ce qui devrait être** :
```typescript
return new GroqProvider({
  model: model || 'openai/gpt-oss-20b',
  temperature: typeof agentConfig?.temperature === 'number' ? agentConfig.temperature : 0.7,
  maxTokens: agentConfig?.max_tokens || 8000,
  topP: typeof agentConfig?.top_p === 'number' ? agentConfig.top_p : 0.9  // ✅
});
```

---

### 🚨 **PROBLÈME #2 : Autres paramètres LLM non transmis** ❌

**Paramètres potentiellement configurables mais non transmis** :

1. **reasoning_effort** ❌
   - Présent dans `AgentTemplateConfig` (ligne 26 de `agentTemplateService.ts`)
   - Présent dans `GroqConfig` (ligne 29 de `groq.ts`)
   - **Pas transmis** au provider dans `selectProvider()`

2. **parallel_tool_calls** ❌
   - Présent dans `AgentConfig` (ligne 16 de `agentTypes.ts`)
   - Présent dans `GroqConfig` (ligne 28 de `groq.ts`)
   - **Pas transmis** au provider dans `selectProvider()`

3. **service_tier** ❌
   - Présent dans `AgentConfig` (ligne 15 de `agentTypes.ts`)
   - Présent dans `GroqConfig` (ligne 27 de `groq.ts`)
   - **Pas transmis** au provider dans `selectProvider()`

**Note** : Ces paramètres ne sont pas affichés dans la page agents UI, donc moins critique, mais devraient quand même être transmis s'ils sont définis en DB.

---

## 🔍 Autres Faiblesses Identifiées

### 1. **Duplication de Code** ⚠️

**Fichiers concernés** :
- `src/services/llm/services/AgentOrchestrator.ts` (lignes 135-157)
- `src/services/llm/services/SimpleOrchestrator.ts` (lignes 135-157)

**Problème** :
- Le code de `selectProvider()` est **identique** dans les deux orchestrateurs
- Duplication complète (22 lignes)
- Risque de désynchronisation lors des mises à jour

**Impact** :
- ⚠️ Maintenance difficile
- ⚠️ Si on corrige dans l'un, il faut corriger dans l'autre
- ⚠️ Risque d'oubli et d'incohérence

**Solution recommandée** :
- Extraire `selectProvider()` dans une classe utilitaire partagée
- Ou créer une factory de providers

### 2. **Pas de Validation des Paramètres LLM** ⚠️

**Où** : `selectProvider()` dans les deux orchestrateurs

**Problème** :
- Aucune validation des valeurs de `temperature`, `top_p`, `max_tokens`
- Pas de vérification de plage (0-2 pour temperature, 0-1 pour top_p)
- Risque de passer des valeurs invalides au provider

**Ce qui devrait être** :
```typescript
const temperature = Math.max(0, Math.min(2, agentConfig?.temperature ?? 0.7));
const topP = Math.max(0, Math.min(1, agentConfig?.top_p ?? 0.9));
const maxTokens = Math.max(1, Math.min(100000, agentConfig?.max_tokens ?? 8000));
```

### 3. **Incohérence des Valeurs par Défaut** ⚠️

**Où** : Plusieurs endroits

**Problème** :
- Page agents : `max="100000"` (ligne 592)
- Provider Groq : `maxTokens: 8000` (ligne 84)
- Orchestrateur : `maxTokens: agentConfig?.max_tokens || 8000` (ligne 154)
- Fallback route : `max_tokens: 4000` (ligne 302)

**Impact** :
- ⚠️ Confusion sur la limite réelle
- ⚠️ Comportement imprévisible selon le chemin

**Solution recommandée** :
- Définir des constantes globales dans un fichier dédié
- Ex: `DEFAULT_MAX_TOKENS = 8000`, `MAX_TOKENS_LIMIT = 100000`

### 4. **Pas de Logging de top_p dans les Logs d'Agent** ⚠️

**Où** : `/api/chat/llm/route.ts` (lignes 183-192, 215-224, 248-257)

**Problème** :
- Les logs affichent `model`, `temperature`, `max_tokens`
- **Mais pas `top_p`**
- Difficile de debugger si le paramètre est bien récupéré

**Extrait actuel** :
```typescript
logger.dev(`[LLM Route] 🎯 Configuration agent:`, {
  model: agentById.model,
  temperature: agentById.temperature,
  max_tokens: agentById.max_tokens,
  // ❌ top_p manquant dans les logs
  instructions: hasInstructions ? '✅ Présentes' : '❌ Manquantes',
  // ...
});
```

---

## 📊 Tableau Récapitulatif

| Paramètre | Page Agents UI | Stocké DB | Récupéré API | Passé Provider | Utilisé LLM | Status |
|-----------|----------------|-----------|--------------|----------------|-------------|--------|
| **display_name** | ✅ Input | ✅ Oui | ✅ Oui | N/A | N/A | ✅ OK |
| **description** | ✅ Textarea | ✅ Oui | ✅ Oui | N/A | N/A | ✅ OK |
| **profile_picture** | ✅ Input | ✅ Oui | ✅ Oui | N/A | N/A | ✅ OK |
| **system_instructions** | ✅ Textarea | ✅ Oui | ✅ Oui | ✅ Oui | ✅ Oui | ✅ OK |
| **personality** | ✅ Textarea | ✅ Oui | ✅ Oui | ✅ Oui | ✅ Oui (msg system) | ✅ OK |
| **expertise** | ✅ Input | ✅ Oui | ✅ Oui | ✅ Oui | ✅ Oui (msg system) | ✅ OK |
| **model** | ✅ Select | ✅ Oui | ✅ Oui | ✅ Oui | ✅ Oui | ✅ OK |
| **provider** | ✅ Select | ✅ Oui | ✅ Oui | ✅ Oui | ✅ Oui | ✅ OK |
| **temperature** | ✅ Range | ✅ Oui | ✅ Oui | ✅ Oui | ✅ Oui | ✅ OK |
| **max_tokens** | ✅ Number | ✅ Oui | ✅ Oui | ✅ Oui | ✅ Oui | ✅ OK |
| **top_p** | ✅ Range | ✅ Oui | ✅ Oui | ❌ **NON** | ❌ **NON** | ❌ **CRITIQUE** |
| **is_active** | ✅ Checkbox | ✅ Oui | ✅ Oui | N/A | N/A (filtrage) | ✅ OK |
| **priority** | ✅ Number | ✅ Oui | ✅ Oui | N/A | N/A (tri) | ✅ OK |
| **api_v2_capabilities** | ✅ Display | ✅ Oui | ✅ Oui | ✅ Oui | ✅ Oui (tools) | ✅ OK |
| **MCP Tools** | ✅ UI | ✅ Oui (table liée) | ✅ Oui | ✅ Oui | ✅ Oui | ✅ OK |
| **OpenAPI Tools** | ✅ UI | ✅ Oui (table liée) | ✅ Oui | ✅ Oui | ✅ Oui | ✅ OK |

---

## 🎯 Analyse Détaillée du Problème top_p

### Où le problème se produit

**Fichier 1** : `src/services/llm/services/AgentOrchestrator.ts`

```typescript
// ❌ AVANT (lignes 143-155)
private selectProvider(agentConfig?: AgentTemplateConfig): GroqProvider | XAIProvider {
  const provider = agentConfig?.provider || 'groq';
  const model = agentConfig?.model;

  switch (provider.toLowerCase()) {
    case 'xai':
      return new XAIProvider({
        model: model || 'grok-4-fast',
        temperature: typeof agentConfig?.temperature === 'number' ? agentConfig.temperature : 0.7,
        maxTokens: agentConfig?.max_tokens || 8000
        // ❌ top_p manquant !
      });
    
    case 'groq':
    default:
      return new GroqProvider({
        model: model || 'openai/gpt-oss-20b',
        temperature: typeof agentConfig?.temperature === 'number' ? agentConfig.temperature : 0.7,
        maxTokens: agentConfig?.max_tokens || 8000
        // ❌ top_p manquant !
      });
  }
}
```

**Fichier 2** : `src/services/llm/services/SimpleOrchestrator.ts`

**Même problème** : Code identique dupliqué.

---

### Pourquoi c'est un problème

1. **Incohérence UX** :
   - L'utilisateur modifie `top_p` dans la page agents
   - Il pense que ça va affecter le comportement du LLM
   - En réalité, ça n'a **aucun effet**

2. **Comportement imprévisible** :
   - Le LLM utilise toujours les valeurs par défaut du provider
   - L'utilisateur ne peut pas affiner le `top_p` selon ses besoins

3. **Debug difficile** :
   - Les logs n'affichent pas `top_p`
   - Difficile de comprendre pourquoi le comportement ne change pas

---

## 🔧 Solutions à Appliquer

### Solution 1 : Corriger selectProvider() (PRIORITAIRE)

**Fichiers à modifier** :
- `src/services/llm/services/AgentOrchestrator.ts`
- `src/services/llm/services/SimpleOrchestrator.ts`

**Correction** :
```typescript
private selectProvider(agentConfig?: AgentTemplateConfig): GroqProvider | XAIProvider {
  const provider = agentConfig?.provider || 'groq';
  const model = agentConfig?.model;

  // ✅ Validation des paramètres
  const temperature = typeof agentConfig?.temperature === 'number' 
    ? Math.max(0, Math.min(2, agentConfig.temperature))
    : 0.7;
  const topP = typeof agentConfig?.top_p === 'number'
    ? Math.max(0, Math.min(1, agentConfig.top_p))
    : 0.9;
  const maxTokens = typeof agentConfig?.max_tokens === 'number'
    ? Math.max(1, Math.min(100000, agentConfig.max_tokens))
    : 8000;

  logger.dev(`[AgentOrchestrator] Sélection du provider: ${provider}`, {
    model,
    temperature,
    topP,
    maxTokens
  });

  switch (provider.toLowerCase()) {
    case 'xai':
      return new XAIProvider({
        model: model || 'grok-4-fast',
        temperature,
        topP,     // ✅ Ajouté
        maxTokens
      });
    
    case 'groq':
    default:
      return new GroqProvider({
        model: model || 'openai/gpt-oss-20b',
        temperature,
        topP,     // ✅ Ajouté
        maxTokens
      });
  }
}
```

### Solution 2 : Améliorer les Logs

**Fichier** : `src/app/api/chat/llm/route.ts`

**Ajouter `top_p` dans tous les logs d'agent** :
```typescript
logger.dev(`[LLM Route] 🎯 Configuration agent:`, {
  model: agent.model,
  temperature: agent.temperature,
  top_p: agent.top_p,           // ✅ Ajouté
  max_tokens: agent.max_tokens,
  instructions: hasInstructions ? '✅ Présentes' : '❌ Manquantes',
  // ...
});
```

### Solution 3 : Extraire selectProvider() (Refacto)

**Créer** : `src/services/llm/utils/providerFactory.ts`

```typescript
export class ProviderFactory {
  static createProvider(agentConfig?: AgentTemplateConfig): GroqProvider | XAIProvider {
    // Code centralisé ici
    // Utilisé par AgentOrchestrator ET SimpleOrchestrator
  }
}
```

**Bénéfices** :
- ✅ Code centralisé
- ✅ Pas de duplication
- ✅ Maintenance facilitée

---

## 🧪 Tests Recommandés

### Test 1 : Vérifier top_p dans les logs

```bash
# 1. Configurer un agent avec top_p = 0.3
# 2. Utiliser cet agent dans le chat
# 3. Vérifier les logs du provider
# 4. Vérifier que top_p: 0.3 apparaît dans le payload
```

### Test 2 : Comparer comportement avant/après

```bash
# Avant correction :
- Agent A : top_p = 0.2 (configuré) → LLM utilise 0.9 (défaut)
- Comportement : Diversité élevée

# Après correction :
- Agent A : top_p = 0.2 (configuré) → LLM utilise 0.2 (configuré)
- Comportement : Diversité faible, réponses plus déterministes
```

---

## 📈 Impact sur l'Utilisateur

### Avant Correction

```
Utilisateur configure Agent "Johnny" :
  temperature: 0.5
  top_p: 0.3         ← Configuration ignorée !
  max_tokens: 4000

LLM reçoit :
  temperature: 0.5   ✅
  top_p: 0.9         ❌ Défaut au lieu de 0.3
  max_tokens: 4000   ✅

Résultat :
  → Réponses plus diverses que prévu
  → Comportement incohérent avec la config
```

### Après Correction

```
Utilisateur configure Agent "Johnny" :
  temperature: 0.5
  top_p: 0.3
  max_tokens: 4000

LLM reçoit :
  temperature: 0.5   ✅
  top_p: 0.3         ✅ Conforme à la config
  max_tokens: 4000   ✅

Résultat :
  → Réponses conformes aux attentes
  → Contrôle total sur le comportement
```

---

## 🎯 Priorités de Correction

### 🔥 **Priorité 1 : top_p** (CRITIQUE)
- ❌ Paramètre non transmis
- ❌ Impact direct sur le comportement du LLM
- ❌ Incohérence UX majeure

**Effort** : Faible (2 lignes par fichier)  
**Impact** : Élevé

### ⚠️ **Priorité 2 : Améliorer les logs**
- ⚠️ Difficile de debugger sans voir top_p
- ⚠️ Manque de visibilité

**Effort** : Faible (3 lignes)  
**Impact** : Moyen

### 🔄 **Priorité 3 : Refacto duplication** (Optionnel)
- ⚠️ Maintenance difficile
- ⚠️ Risque d'incohérence future

**Effort** : Moyen (création classe factory)  
**Impact** : Moyen (qualité code)

### 📋 **Priorité 4 : Validation paramètres** (Optionnel)
- ⚠️ Risque de valeurs invalides
- ⚠️ Pas critique car les providers valident déjà

**Effort** : Faible  
**Impact** : Faible

---

## ✅ Points Forts du Code Actuel

### 1. **Architecture Robuste**
- ✅ Séparation claire des responsabilités
- ✅ Orchestrateurs dédiés
- ✅ System message builder centralisé

### 2. **Support Multi-Provider**
- ✅ Groq et xAI supportés
- ✅ Sélection automatique selon agent config
- ✅ Fallback intelligent

### 3. **Tools Bien Intégrés**
- ✅ MCP Tools fonctionnels
- ✅ OpenAPI Tools fonctionnels
- ✅ Mode hybride disponible

### 4. **UI Intuitive**
- ✅ Page agents claire et complète
- ✅ Feedback visuel (changes indicator)
- ✅ Validation des champs

### 5. **Gestion d'Erreur**
- ✅ Fallback si agent non trouvé
- ✅ Logs détaillés
- ✅ Gestion des erreurs API

---

## 🎯 Conclusion

### Résumé

- ✅ **10/11 paramètres** configurables sont correctement transmis
- ❌ **1 paramètre critique** (`top_p`) n'est PAS transmis au LLM
- ⚠️ **Code de qualité** mais avec quelques faiblesses de maintenance

### Impact du Bug top_p

**Gravité** : 🔥 **Critique**
- L'utilisateur ne peut pas contrôler la diversité des réponses
- Configuration ignorée = mauvaise UX
- Incohérence entre l'UI et le comportement réel

### Recommandation

1. **Corriger immédiatement** le problème `top_p` (priorité 1)
2. **Améliorer les logs** pour inclure `top_p` (priorité 2)
3. **Refacto optionnelle** pour réduire la duplication (priorité 3)

---

**Prêt pour correction** ✅

**Fichiers à modifier** :
1. `src/services/llm/services/AgentOrchestrator.ts` (lignes 143-155)
2. `src/services/llm/services/SimpleOrchestrator.ts` (lignes 143-155)
3. `src/app/api/chat/llm/route.ts` (lignes 183, 215, 248)

**Temps estimé** : ~10 minutes  
**Risque** : Faible (changement simple et isolé)

