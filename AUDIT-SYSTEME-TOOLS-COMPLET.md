# 🔍 AUDIT COMPLET : Système de Tools

**Date** : 26 octobre 2025  
**Objectif** : Identifier TOUS les fichiers qui génèrent/passent des tools aux agents  
**Motivation** : Nettoyage et centralisation pour éviter les conflits

---

## 📦 Fichiers Identifiés (10 fichiers tools)

### EXÉCUTEURS (4 fichiers)

1. **`executors/OpenApiToolExecutor.ts`** ✅ ACTIF
   - Exécute les tools OpenAPI externes (Pexels, Unsplash, etc.)
   - Qu'on vient de modifier pour le namespace
   - **Utilisé par** : AgentOrchestrator, SimpleOrchestrator

2. **`openApiToolExecutor.ts`** ⚠️ DOUBLON ?
   - Ancien fichier à la racine de llm/
   - Potentiel doublon de `executors/OpenApiToolExecutor.ts`
   - **À vérifier** : Si obsolète → supprimer

3. **`executors/ApiV2ToolExecutor.ts`** ✅ ACTIF
   - Exécute les tools Scrivia API V2 (hardcodés)
   - Handlers pour createNote, getNote, listClasseurs, etc.
   - **Utilisé par** : SimpleToolExecutor, ToolCallManager

4. **`services/SimpleToolExecutor.ts`** ✅ ACTIF
   - Wrapper autour de ApiV2ToolExecutor
   - Gère les retries et la logique de relance
   - **Utilisé par** : AgentOrchestrator, SimpleOrchestrator

5. **`services/GroqToolExecutor.ts`** ⚠️ À VÉRIFIER
   - Spécifique à Groq ?
   - Potentiellement obsolète avec les nouveaux orchestrateurs

---

### GÉNÉRATEURS (2 fichiers)

6. **`openApiSchemaService.ts`** ✅ ACTIF - CORE
   - Convertit les schémas OpenAPI en tools
   - **QU'ON VIENT DE MODIFIER** pour le namespace
   - Parsing centralisé avec cache
   - **C'est LE générateur principal**

7. **`minimalToolsForXAI.ts`** 🔴 PROBLÉMATIQUE
   - 15 tools Scrivia **hardcodés**
   - Utilisé comme **FALLBACK** si agent xAI n'a pas de schémas
   - **PROBLÈME** : Injection automatique non désirée
   - **Contenu** : createNote, searchContent, listClasseurs, getNote, updateNote, etc.

---

### GESTIONNAIRES (3 fichiers)

8. **`toolCallManager.ts`** ⚠️ À VÉRIFIER
   - Orchestration des tool calls
   - Utilise OpenApiToolExecutor + ApiV2ToolExecutor
   - **Question** : Est-ce encore utilisé ?

9. **`mcpConfigService.ts`** ✅ ACTIF
   - Gère les serveurs MCP (Factoria)
   - Combine OpenAPI tools + MCP servers
   - **Utilisé par** : AgentOrchestrator, SimpleOrchestrator

10. **`validation/toolSchemas.ts`** ✅ ACTIF
    - Schémas Zod pour validation des arguments
    - Pas de génération de tools, juste validation
    - **Utilisé par** : ApiV2ToolExecutor

---

## 🔄 FLUX ACTUEL (AgentOrchestrator)

```typescript
// 1. Charge les schémas OpenAPI liés à l'agent
const agentSchemas = await this.loadAgentOpenApiSchemas(agentConfig?.id);

if (agentSchemas.length > 0) {
  // ✅ PATH 1 : Agent a des schémas OpenAPI liés
  const { tools, endpoints } = await openApiSchemaService.getToolsAndEndpointsFromSchemas(schemaIds);
  
  if (provider === 'xai') {
    tools = openApiTools; // Pexels, Unsplash, Scrivia (si lié)
  } else {
    tools = await mcpConfigService.buildHybridTools(agentId, token, openApiTools);
    // OpenAPI + MCP servers
  }
} else {
  // 🔴 PATH 2 : Agent N'A PAS de schémas
  if (provider === 'xai') {
    tools = getMinimalXAITools(); // ← 15 TOOLS SCRIVIA HARDCODÉS !
  } else {
    tools = await mcpConfigService.buildHybridTools(agentId, token, []);
    // MCP servers seulement
  }
}

// 2. Passe les tools au LLM
const response = await this.callLLM(messages, tools);

// 3. Exécute les tool calls
const isOpenApiTools = this.isOpenApiTools(toolCalls);
const toolResults = isOpenApiTools 
  ? await this.openApiToolExecutor.executeToolCalls()  // Pexels, Unsplash, Scrivia
  : await this.toolExecutor.executeToolCalls();        // ApiV2ToolExecutor (Scrivia hardcodé)
```

---

## 🚨 PROBLÈMES IDENTIFIÉS

### 1. Double Exécuteur Scrivia

**OpenApiToolExecutor** ET **ApiV2ToolExecutor** peuvent TOUS LES DEUX exécuter des tools Scrivia :

- **Via OpenApiToolExecutor** : Si Scrivia est lié comme schéma OpenAPI → `scrivia__createNote`
- **Via ApiV2ToolExecutor** : Handlers hardcodés → `createNote`

**Conflit potentiel** : Si le LLM appelle `createNote` (sans préfixe), c'est lequel qui s'exécute ?

### 2. Injection Automatique des Tools Minimaux

**Ligne 276-289** de `AgentOrchestrator.ts` :

```typescript
if (agentSchemas.length === 0 && provider === 'xai') {
  tools = getMinimalXAITools(); // ← 15 TOOLS SCRIVIA HARDCODÉS
}
```

**Conséquence** : 
- Franklin (xAI + Pexels) → a Pexels ✅
- Un nouvel agent xAI vide → a 15 tools Scrivia automatiquement ❌

**Non désiré** : L'utilisateur pense que l'agent n'a pas de tools, mais il en a 15.

### 3. Doublons Potentiels

- **`executors/OpenApiToolExecutor.ts`** (nouveau, qu'on vient de modifier)
- **`openApiToolExecutor.ts`** (ancien, à la racine)

**À vérifier** : Sont-ils identiques ou différents ?

### 4. Fichiers Potentiellement Obsolètes

- **`services/GroqToolExecutor.ts`** : Utilisé quelque part ?
- **`toolCallManager.ts`** : Encore nécessaire avec les nouveaux orchestrateurs ?

---

## 🎯 RECOMMANDATIONS DE NETTOYAGE

### Priorité 1 : Retirer l'Injection Automatique

**Fichier** : `AgentOrchestrator.ts` + `SimpleOrchestrator.ts`

**Avant** :
```typescript
if (agentSchemas.length === 0 && provider === 'xai') {
  tools = getMinimalXAITools(); // ← RETIRER ÇA
}
```

**Après** :
```typescript
if (agentSchemas.length === 0) {
  tools = []; // Pas de schémas = pas de tools (logique claire)
  logger.warn(`[AgentOrchestrator] ⚠️ Agent sans schémas OpenAPI`);
}
```

**Avantages** :
- ✅ Comportement prévisible
- ✅ Pas de "magic" cachée
- ✅ L'utilisateur contrôle explicitement les tools

---

### Priorité 2 : Vérifier les Doublons

**Comparer** :
- `executors/OpenApiToolExecutor.ts` (nouveau)
- `openApiToolExecutor.ts` (ancien)

**Action** : 
- Si identiques → supprimer l'ancien
- Si différents → identifier lequel est utilisé

---

### Priorité 3 : Documenter le Rôle de Chaque Exécuteur

**OpenApiToolExecutor** :
- Pour : APIs externes (Pexels, Unsplash, Exa, etc.)
- Basé sur : Schémas OpenAPI dynamiques
- Identification : `this.endpoints.has(toolCall.function.name)`

**ApiV2ToolExecutor** :
- Pour : API Scrivia uniquement
- Basé sur : Handlers hardcodés
- Identification : Si pas dans OpenApiToolExecutor

**SimpleToolExecutor** :
- Wrapper autour de ApiV2ToolExecutor
- Ajoute : Retry logic, analyse des erreurs

---

### Priorité 4 : Clarifier quand Scrivia est utilisé

**2 façons d'utiliser Scrivia** :

**A) Via OpenAPI Schema** (recommandé) :
```typescript
// Agent a le schéma "scrivia-api-v2" lié
tools = [
  { name: "scrivia__createNote", ... },
  { name: "scrivia__getNote", ... }
]
// Exécution : OpenApiToolExecutor
```

**B) Via Hardcodé** (legacy ?) :
```typescript
// Agent n'a PAS de schémas → fallback
tools = getMinimalXAITools(); // 15 tools Scrivia hardcodés
// Exécution : ApiV2ToolExecutor
```

**Problème** : Les deux peuvent coexister, causant confusion et doublons.

**Solution** : 
- Supprimer l'option B (fallback)
- OU clairement logger qu'on utilise un fallback

---

## 📋 PLAN D'ACTION

### Étape 1 : Retirer les Tools Minimaux Automatiques
```typescript
// AgentOrchestrator.ts + SimpleOrchestrator.ts (lignes 276-289)
// SUPPRIMER :
if (provider === 'xai') {
  tools = getMinimalXAITools(); // ← RETIRER
}

// REMPLACER PAR :
tools = []; // Agent sans schémas = pas de tools
logger.warn(`[AgentOrchestrator] ⚠️ Agent ${agentConfig?.name} sans schémas OpenAPI`);
```

### Étape 2 : Vérifier et Supprimer les Doublons
```bash
# Comparer
diff executors/OpenApiToolExecutor.ts openApiToolExecutor.ts

# Si identiques ou ancien obsolète
rm openApiToolExecutor.ts
```

### Étape 3 : Documenter le Système Final

**Architecture cible** :

```
┌─────────────────────────────────────────────┐
│ GÉNÉRATION DES TOOLS                         │
├─────────────────────────────────────────────┤
│ openApiSchemaService.ts                     │
│ - Convertit schémas OpenAPI → tools         │
│ - Namespace automatique (baseUrl)           │
│ - Tri alphabétique                          │
│ - Cache intelligent                         │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ ORCHESTRATEURS                               │
├─────────────────────────────────────────────┤
│ AgentOrchestrator.ts / SimpleOrchestrator.ts│
│ - Charge les schémas liés à l'agent         │
│ - Sélectionne les tools selon provider       │
│ - Passe au LLM                               │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ EXÉCUTION DES TOOLS                          │
├─────────────────────────────────────────────┤
│ OpenApiToolExecutor.ts                      │
│ - Pour : Pexels, Unsplash, Exa, Scrivia (si │
│   lié comme schéma OpenAPI)                  │
│ - Détection namespace automatique           │
│                                              │
│ ApiV2ToolExecutor.ts                        │
│ - Pour : Scrivia API V2 (legacy/fallback)   │
│ - Handlers hardcodés                         │
│ - ⚠️ À supprimer ? Ou garder comme backup ?  │
└─────────────────────────────────────────────┘
```

---

## ❓ QUESTIONS POUR L'UTILISATEUR

1. **Veux-tu SUPPRIMER** l'injection automatique des 15 tools Scrivia pour xAI ?
2. **`ApiV2ToolExecutor`** : Le garder comme backup ou tout passer par OpenAPI ?
3. **`openApiToolExecutor.ts`** (racine) : Obsolète ? À supprimer ?
4. **`GroqToolExecutor.ts`** : Encore utilisé ou obsolète ?
5. **`toolCallManager.ts`** : Encore nécessaire ?

---

## 🎯 NETTOYAGE RECOMMANDÉ (Quick Wins)

### 1. Retirer Injection Automatique (5 min)
```typescript
// Supprimer lignes 276-289 dans AgentOrchestrator.ts et SimpleOrchestrator.ts
```

### 2. Supprimer Doublons (10 min)
```bash
# Si openApiToolExecutor.ts est obsolète
rm src/services/llm/openApiToolExecutor.ts
```

### 3. Supprimer minimalToolsForXAI.ts (2 min)
```bash
# Si on retire l'injection automatique
rm src/services/llm/minimalToolsForXAI.ts
```

### 4. Documenter Architecture Finale (15 min)
- Créer un schéma clair des responsabilités
- Documenter quand utiliser quel exécuteur

---

**Total estimé** : 30-40 min pour un système propre et sans ambiguïté

**Prochaine étape** : Décider quoi garder/supprimer ?

