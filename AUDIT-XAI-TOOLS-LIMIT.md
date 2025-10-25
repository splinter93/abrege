# 🚨 AUDIT CRITIQUE : Limitation des Tools xAI

**Date** : 25 octobre 2025  
**Status** : 🔴 **PROBLÈME CRITIQUE DÉTECTÉ**

---

## 🎯 Contexte

L'utilisateur (Donna avec Unsplash + Scrivia API V2) rapporte que :
- ✅ Avec **Unsplash seul** → ça marche
- ❌ Avec **Unsplash + Scrivia** → le LLM part en vrille, rate ses tool calls, ne les voit pas

---

## 🔍 Investigation

### 1. Limite de Tools xAI

```typescript:212:218:src/services/llm/services/AgentOrchestrator.ts
if (selectedProvider.toLowerCase() === 'xai') {
  // xAI : Utiliser uniquement les tools OpenAPI avec limite
  const XAI_MAX_TOOLS = 15;
  
  if (openApiTools.length > XAI_MAX_TOOLS) {
    logger.warn(`[AgentOrchestrator] ⚠️ Trop de tools pour xAI (${openApiTools.length}/${XAI_MAX_TOOLS}). Limitation appliquée.`);
    tools = openApiTools.slice(0, XAI_MAX_TOOLS);
```

**❌ PROBLÈME CRITIQUE** :
- `XAI_MAX_TOOLS = 15` → **limite arbitraire**
- `.slice(0, 15)` → **coupe les 15 premiers tools** (ordre non contrôlé)

---

### 2. Nombre de Tools par Schéma

D'après la base de données :

**Agent "Donna"** (`d0726cf9-9f78-443a-b01c-0edbd601f589`) a 2 schémas :
1. **Clickup Tasks** (`25f72c8d-b3d5-4788-8487-e9cbf5bbde7f`) → ~10-15 tools
2. **Unsplash Images** (`1d5ba597-6ef2-4397-b779-416952db29ce`) → ~3-5 tools

**Agent "Editor Assistant"** (`d8f3e8d9-3de9-48ae-a36c-4ebb8fd4594c`) a 3 schémas :
1. **Clickup Tasks** → ~10-15 tools
2. **Scrivia API V2** (`f316e108-1b88-4453-8110-2a1c3488ec32`) → **~70+ tools** ⚠️
3. **Unsplash Images** → ~3-5 tools

**Total estimé pour Editor Assistant** : **~85-95 tools**

---

### 3. Schémas OpenAPI Actifs

```json
[
  {"id": "25f72c8d-b3d5-4788-8487-e9cbf5bbde7f", "name": "Clickup Tasks", "version": "1.0"},
  {"id": "6d24b01b-f3cf-44d4-9701-231501e83a58", "name": "Exa Web Search", "version": "1.0"},
  {"id": "6dc09226-2e61-43af-bfb0-6d72a4470b13", "name": "Pexels Images", "version": "1.0"},
  {"id": "f3382d41-7b1c-42a6-bf44-0f454a6a7f61", "name": "Scrivia light", "version": "1"},
  {"id": "f316e108-1b88-4453-8110-2a1c3488ec32", "name": "scrivia-api-v2", "version": "2.0.0"},
  {"id": "1d5ba597-6ef2-4397-b779-416952db29ce", "name": "Unsplash Images", "version": "1"}
]
```

---

## 🐛 Le Bug

### Scénario Problématique

1. **Agent Donna** active **Scrivia API V2** (70+ tools) + **Unsplash** (3-5 tools)
2. **Total** : ~75 tools
3. **xAI** : limite à 15 tools avec `.slice(0, 15)`
4. **Résultat** :
   - Les 15 premiers tools sont pris (probablement les outils Scrivia alphabétiques)
   - **Unsplash disparaît complètement** 🔴
   - **Les tools Scrivia essentiels ne sont pas disponibles** 🔴
   - Le LLM ne voit pas les tools dont il a besoin et **hallucine** ou **rate ses appels**

### Ordre des Tools

Le problème **CRITIQUE** est que `.slice(0, 15)` :
- ❌ Ne priorise pas les tools par importance
- ❌ Ne garantit pas la diversité (peut couper un schéma entier)
- ❌ Coupe arbitrairement selon l'ordre de parsing (alphabétique ?)

---

## 💡 Solutions Proposées

### Option 1 : Sélection Intelligente (Recommandé)

**Stratégie** : Sélectionner les tools les plus importants de chaque schéma.

```typescript
// ✅ Exemple de sélection intelligente
if (selectedProvider.toLowerCase() === 'xai') {
  const XAI_MAX_TOOLS = 15;
  
  if (openApiTools.length > XAI_MAX_TOOLS) {
    // Grouper par schéma
    const toolsBySchema = groupToolsBySchema(openApiTools, agentSchemas);
    
    // Calculer la répartition équitable
    const toolsPerSchema = Math.floor(XAI_MAX_TOOLS / agentSchemas.length);
    const selectedTools = [];
    
    for (const [schemaId, schemaTools] of Object.entries(toolsBySchema)) {
      // Prioriser les tools les plus importants de chaque schéma
      const prioritizedTools = prioritizeTools(schemaTools);
      selectedTools.push(...prioritizedTools.slice(0, toolsPerSchema));
    }
    
    tools = selectedTools.slice(0, XAI_MAX_TOOLS);
    
    logger.warn(`[AgentOrchestrator] ⚠️ Limitation xAI appliquée: ${openApiTools.length} → ${tools.length} tools`);
  }
}
```

**Avantages** :
- ✅ Garantit la diversité (chaque schéma a des tools)
- ✅ Priorise les tools essentiels
- ✅ Transparent pour l'utilisateur

**Inconvénients** :
- ⚠️ Complexe à implémenter
- ⚠️ Nécessite de définir les critères de priorité

---

### Option 2 : Avertir l'Utilisateur + Limite Intelligente

**Stratégie** : Informer l'utilisateur que xAI ne supporte pas autant de tools.

```typescript
if (selectedProvider.toLowerCase() === 'xai') {
  const XAI_MAX_TOOLS = 15;
  
  if (openApiTools.length > XAI_MAX_TOOLS) {
    // ⚠️ Avertir l'utilisateur dans le chat
    onProgress?.(`⚠️ xAI ne supporte que ${XAI_MAX_TOOLS} tools max. ${openApiTools.length} tools disponibles, limitation appliquée.\n\n`);
    
    // Sélection intelligente
    tools = selectBestTools(openApiTools, XAI_MAX_TOOLS, agentSchemas);
    
    logger.warn(`[AgentOrchestrator] ⚠️ xAI tools limités: ${openApiTools.length} → ${tools.length}`);
  }
}
```

---

### Option 3 : Recommander Groq pour Multi-Tools (Rapide)

**Stratégie** : Forcer Groq quand il y a trop de tools pour xAI.

```typescript
// ✅ Détection automatique
if (openApiTools.length > 15 && selectedProvider.toLowerCase() === 'xai') {
  logger.warn(`[AgentOrchestrator] ⚠️ Trop de tools pour xAI (${openApiTools.length}), passage à Groq`);
  selectedProvider = 'groq';
  // Recréer le provider
}
```

**Avantages** :
- ✅ Simple à implémenter
- ✅ Garantit que tous les tools sont disponibles
- ✅ Transparent

**Inconvénients** :
- ⚠️ Modifie le choix du provider de l'utilisateur
- ⚠️ Groq peut avoir d'autres limitations

---

### Option 4 : Créer des "Agents Légers" avec Moins de Tools

**Stratégie** : Diviser les schémas OpenAPI en sous-ensembles.

**Exemple** :
- **Donna Lite (xAI)** : Unsplash + Clickup (15 tools max)
- **Donna Full (Groq)** : Unsplash + Clickup + Scrivia API V2 (tous les tools)

**Avantages** :
- ✅ xAI reste utilisable
- ✅ Contrôle total sur les tools

**Inconvénients** :
- ⚠️ Fragmentation des agents
- ⚠️ Maintenance complexe

---

## 🎯 Recommandation Immédiate

**1. Court terme (Hotfix)** :
- Implémenter **Option 3** : Forcer Groq si > 15 tools
- Ajouter un warning visible dans le chat

**2. Moyen terme** :
- Implémenter **Option 1** : Sélection intelligente par schéma
- Ajouter une configuration UI pour choisir les tools prioritaires

**3. Long terme** :
- Créer des "Agent Profiles" avec des presets de tools optimisés
- Ajouter un outil de diagnostic des tools dans la page agents

---

## 📊 Logs de Debug Manquants

Actuellement, les logs `[TOOLS]` ajoutés ne s'affichent que lors de l'envoi de messages.

**Actions** :
1. ✅ Ajouter un log au chargement des schémas OpenAPI
2. ✅ Afficher le nombre de tools par schéma
3. ✅ Afficher les tools coupés (si limite appliquée)

---

## 🔧 Actions Immédiates

1. [ ] Tester le nombre exact de tools pour chaque schéma
2. [ ] Implémenter l'Option 3 (Groq fallback)
3. [ ] Ajouter des logs détaillés pour le debug
4. [ ] Tester avec Donna (Unsplash + Scrivia)

---

**Conclusion** : Le problème est **CONFIRMÉ** et **CRITIQUE** pour les agents multi-schémas avec xAI.

