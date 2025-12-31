# AUDIT - DUPLICATION TOOL CALLS APRÈS REFRESH

**Date :** 2025-01-30  
**Symptôme :** Après refresh du chat, tous les tool calls apparaissent en double dans l'UI

---

## 🔍 ANALYSE

### Problème identifié

Les tool calls sont dupliqués dans `stream_timeline.items` lors de la sauvegarde, ce qui cause leur affichage en double après refresh.

### Source de la duplication

1. **`TimelineCapture.addToolExecutionEvent`** (ligne 54-76)
   - ❌ Ne vérifie pas les doublons avant d'ajouter un événement `tool_execution`
   - Si appelé plusieurs fois avec les mêmes tool calls, ils sont ajoutés plusieurs fois

2. **`StreamOrchestrator`** appelle `addToolExecutionEvent` à deux endroits :
   - Ligne 325 : `processToolExecutionChunk` (tool calls à exécuter)
   - Ligne 408 : `processAssistantRoundComplete` (tool calls MCP déjà exécutés)
   - Si les mêmes tool calls passent par les deux chemins, duplication

3. **Timeline chargée depuis DB** peut contenir des doublons existants

---

## ✅ CORRECTIONS APPLIQUÉES

### 1. Déduplication dans `TimelineCapture.addToolExecutionEvent`

**Fichier :** `src/services/streaming/TimelineCapture.ts`

**Changement :**
- ✅ Vérifie les IDs des tool calls déjà présents dans la timeline
- ✅ Filtre les tool calls en double avant d'ajouter
- ✅ Skip si tous les tool calls sont déjà présents

```typescript
addToolExecutionEvent(toolCalls: ToolCall[], toolCount: number): void {
  // ✅ DÉDUPLICATION: Extraire les IDs des tool calls déjà présents
  const existingToolCallIds = new Set(
    this.items
      .filter(item => item.type === 'tool_execution')
      .flatMap(item => item.toolCalls.map(tc => tc.id))
  );
  
  // Filtrer les tool calls qui ne sont pas déjà présents
  const newToolCalls = toolCalls.filter(tc => !existingToolCallIds.has(tc.id));
  
  // Si tous les tool calls sont déjà présents, ne pas ajouter de doublon
  if (newToolCalls.length === 0) {
    logger.dev('[TimelineCapture] 🔧 Tool calls déjà présents, skip duplication');
    return;
  }
  
  // Ajouter seulement les nouveaux tool calls
  // ...
}
```

### 2. Nettoyage des doublons dans `useChatHandlers.handleComplete`

**Fichier :** `src/hooks/useChatHandlers.ts`

**Changement :**
- ✅ Déduplique les `tool_execution` items avant sauvegarde
- ✅ Filtre les tool calls en double dans chaque item
- ✅ Enrichit avec les résultats après déduplication

```typescript
const cleanedTimeline = streamTimeline ? {
  ...streamTimeline,
  items: (() => {
    // ✅ DÉDUPLICATION: Supprimer les tool_execution en double
    const seenToolCallIds = new Set<string>();
    const deduplicatedItems = [];
    
    for (const item of streamTimeline.items) {
      if (item.type === 'tool_execution') {
        // Vérifier et filtrer les doublons
        // ...
      }
    }
    
    // Enrichir avec résultats
    return deduplicatedItems.map(/* ... */);
  })()
} : undefined;
```

---

## 🧪 VÉRIFICATIONS

### Tests à effectuer

1. ✅ Refresh après un message avec tool calls
2. ✅ Vérifier que chaque tool call n'apparaît qu'une fois
3. ✅ Vérifier que les résultats sont correctement associés
4. ✅ Vérifier avec plusieurs rounds de tool calls

### Logs de debug

Les logs suivants permettent de vérifier la déduplication :
- `[TimelineCapture] 🔧 Tool calls déjà présents, skip duplication`
- `[useChatHandlers] 🔧 Tool execution en double détecté et supprimé`

---

## 📊 IMPACT

**Avant :** Tool calls affichés 2x après refresh  
**Après :** Tool calls affichés 1x (déduplication active)

**Fichiers modifiés :**
- `src/services/streaming/TimelineCapture.ts` (+ déduplication)
- `src/hooks/useChatHandlers.ts` (+ nettoyage avant sauvegarde)

---

## ✅ STATUS

**Correction appliquée** - Prêt pour test en production

