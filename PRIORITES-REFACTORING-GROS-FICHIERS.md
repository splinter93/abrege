# 🎯 PRIORITÉS REFACTORING - GROS FICHIERS

**Date :** 2026-01-05  
**Standard :** GUIDE-EXCELLENCE-CODE.md (max 300 lignes strict)  
**Objectif :** Maintenabilité à 1M+ users

---

## 📊 ÉTAT ACTUEL

**TOP 20 fichiers violant la limite de 300 lignes :**

| Rang | Fichier | Lignes | Ratio | Criticité | Priorité |
|------|---------|--------|-------|-----------|----------|
| 1 | `src/utils/v2DatabaseUtils.ts` | **2372** | 7.9x | 🔴 CRITIQUE | **P0** |
| 2 | `src/services/specializedAgents/SpecializedAgentManager.ts` | **1641** | 5.5x | 🔴 CRITIQUE | **P0** |
| 3 | `src/services/llm/providers/implementations/groq.ts` | **1614** | 5.4x | 🔴 CRITIQUE | **P1** |
| 4 | `src/app/api/v2/openapi-schema/route.ts` | **1520** | 5.1x | 🟡 IMPORTANT | **P1** |
| 5 | `src/services/V2UnifiedApi.ts` | **1490** | 5.0x | 🔴 CRITIQUE | **P0** |
| 6 | `src/app/api/chat/llm/stream/route.ts` | **1396** | 4.7x | 🔴 CRITIQUE | **P0** |
| 7 | `src/services/llm/providers/implementations/xai-native.ts` | **1211** | 4.0x | 🟡 IMPORTANT | **P2** |
| 8 | `src/services/llmApi.ts` | **1135** | 3.8x | 🔴 CRITIQUE | **P1** |
| 9 | `src/services/llm/providers/implementations/xai.ts` | **1129** | 3.8x | 🟡 IMPORTANT | **P2** |
| 10 | `src/store/useCanvaStore.ts` | **1091** | 3.6x | 🟡 IMPORTANT | **P2** |
| 11 | `src/app/private/files/page.tsx` | **984** | 3.3x | 🟢 MOYEN | **P3** |
| 12 | `src/services/optimizedApi.ts` | **983** | 3.3x | 🟡 IMPORTANT | **P2** |
| 13 | `src/services/canvaNoteService.ts` | **950** | 3.2x | 🟡 IMPORTANT | **P2** |
| 14 | `src/services/monitoring/__tests__/AlertManager.test.ts` | **923** | 3.1x | 🟢 MOYEN | **P3** |
| 15 | `src/app/private/documentation/page.tsx` | **893** | 3.0x | 🟢 MOYEN | **P3** |
| 16 | `src/services/llm/providers/implementations/liminality.ts` | **848** | 2.8x | 🟡 IMPORTANT | **P2** |
| 17 | `src/services/RealtimeService.ts` | **843** | 2.8x | 🟡 IMPORTANT | **P2** |
| 18 | `src/components/OpenAPIEditor/OpenAPIEditorStyles.tsx` | **835** | 2.8x | 🟢 MOYEN | **P3** |
| 19 | `src/components/chat/ChatCanvaPane.tsx` | **824** | 2.7x | 🟡 IMPORTANT | **P2** |
| 20 | `src/components/chat/ChatFullscreenV2.tsx` | **~950** | 3.2x | 🔴 CRITIQUE | **P1** |

---

## 🔴 PRIORITÉ P0 - BLOQUANT PRODUCTION (À FAIRE MAINTENANT)

### 1. `v2DatabaseUtils.ts` (2372 lignes) - **7.9x la limite**

**Impact :**
- ❌ Utilisé dans **23+ fichiers** (toutes les routes API V2)
- ❌ Point d'entrée unique pour toutes les opérations DB
- ❌ Impossible à débugger (god object)
- ❌ Tests unitaires impossibles

**Plan de refactoring :**
```
src/utils/database/
├── queries/
│   ├── noteQueries.ts          (~250 lignes)
│   ├── classeurQueries.ts      (~250 lignes)
│   ├── dossierQueries.ts       (~250 lignes)
│   ├── fileQueries.ts          (~250 lignes)
│   └── searchQueries.ts        (~250 lignes)
├── mutations/
│   ├── noteMutations.ts        (~250 lignes)
│   ├── classeurMutations.ts   (~250 lignes)
│   ├── dossierMutations.ts    (~250 lignes)
│   └── fileMutations.ts        (~250 lignes)
├── permissions/
│   ├── permissionQueries.ts   (~200 lignes)
│   └── permissionMutations.ts  (~200 lignes)
└── index.ts                    (~50 lignes - exports)
```

**Effort estimé :** 3-4 jours  
**Risque :** 🔴 ÉLEVÉ (tous les endpoints dépendent)  
**Mitigation :** Créer wrapper de compatibilité, migration progressive

---

### 2. `SpecializedAgentManager.ts` (1641 lignes) - **5.5x la limite**

**Impact :**
- ❌ Gestion de tous les agents spécialisés
- ❌ Logique métier complexe (orchestration, validation, exécution)
- ❌ Utilisé dans routes API agents

**Plan de refactoring :**
```
src/services/specializedAgents/
├── core/
│   ├── AgentManager.ts         (~250 lignes - orchestration)
│   ├── AgentValidator.ts       (~200 lignes - validation)
│   └── AgentRegistry.ts        (~200 lignes - registry)
├── execution/
│   ├── AgentExecutor.ts        (~250 lignes)
│   ├── ToolCallHandler.ts      (~200 lignes)
│   └── ResponseBuilder.ts      (~200 lignes)
├── services/
│   ├── AgentConfigService.ts   (~200 lignes)
│   └── AgentMetricsService.ts  (~150 lignes)
└── types/
    └── agentTypes.ts           (~100 lignes)
```

**Effort estimé :** 2-3 jours  
**Risque :** 🟡 MOYEN (moins de dépendances que v2DatabaseUtils)

---

### 3. `V2UnifiedApi.ts` (1490 lignes) - **5.0x la limite**

**Impact :**
- ❌ API unifiée pour toutes les opérations V2
- ❌ Utilisé dans plusieurs composants/services
- ❌ Logique métier complexe

**Plan de refactoring :**
```
src/services/api/
├── unified/
│   ├── V2UnifiedApi.ts         (~200 lignes - orchestrateur)
│   ├── noteApi.ts              (~250 lignes)
│   ├── classeurApi.ts          (~250 lignes)
│   ├── dossierApi.ts           (~250 lignes)
│   ├── fileApi.ts              (~250 lignes)
│   └── searchApi.ts            (~200 lignes)
└── types/
    └── apiTypes.ts             (~100 lignes)
```

**Effort estimé :** 2 jours  
**Risque :** 🟡 MOYEN

---

### 4. `stream/route.ts` (1396 lignes) - **4.7x la limite**

**Impact :**
- ❌ Route API critique (chat streaming)
- ❌ Utilisé à chaque message chat
- ❌ Logique complexe (streaming, tool calls, retries)

**Plan de refactoring :**
```
src/app/api/chat/llm/stream/
├── route.ts                    (~150 lignes - orchestrateur)
├── handlers/
│   ├── streamHandler.ts        (~250 lignes - gestion chunks)
│   ├── toolCallHandler.ts      (~250 lignes - tool calls)
│   └── errorHandler.ts         (~200 lignes - gestion erreurs)
├── validation/
│   ├── streamValidation.ts     (~200 lignes)
│   └── messageValidation.ts    (~150 lignes)
└── utils/
    ├── streamUtils.ts          (~150 lignes)
    └── messageUtils.ts         (~150 lignes)
```

**Effort estimé :** 2-3 jours  
**Risque :** 🔴 ÉLEVÉ (route critique, beaucoup de logique)  
**Mitigation :** Tests E2E avant refactoring, migration progressive

---

## 🟡 PRIORITÉ P1 - IMPORTANT (À FAIRE SOUS 2 SEMAINES)

### 5. `groq.ts` (1614 lignes) - **5.4x la limite**

**Impact :**
- Provider LLM principal
- Logique complexe (streaming, retries, error handling)

**Plan :**
```
src/services/llm/providers/groq/
├── GroqProvider.ts             (~200 lignes - interface)
├── streaming/
│   ├── GroqStreamHandler.ts    (~250 lignes)
│   └── GroqChunkParser.ts      (~200 lignes)
├── errors/
│   ├── GroqErrorHandler.ts      (~200 lignes)
│   └── GroqRetryLogic.ts       (~200 lignes)
└── utils/
    ├── groqConfig.ts           (~150 lignes)
    └── groqTypes.ts            (~100 lignes)
```

**Effort :** 2 jours

---

### 6. `openapi-schema/route.ts` (1520 lignes) - **5.1x la limite**

**Impact :**
- Route API pour gestion schémas OpenAPI
- Logique complexe (parsing, validation, génération)

**Plan :**
```
src/app/api/v2/openapi-schema/
├── route.ts                    (~150 lignes)
├── handlers/
│   ├── schemaHandler.ts        (~250 lignes)
│   ├── validationHandler.ts    (~200 lignes)
│   └── generationHandler.ts    (~250 lignes)
└── utils/
    ├── schemaParser.ts         (~200 lignes)
    └── schemaValidator.ts      (~200 lignes)
```

**Effort :** 1-2 jours

---

### 7. `llmApi.ts` (1135 lignes) - **3.8x la limite**

**Impact :**
- API LLM unifiée
- Utilisé dans plusieurs services

**Plan :**
```
src/services/llm/api/
├── LLMApi.ts                   (~200 lignes)
├── providers/
│   ├── providerFactory.ts     (~200 lignes)
│   └── providerRegistry.ts    (~150 lignes)
└── utils/
    ├── apiUtils.ts             (~200 lignes)
    └── apiTypes.ts             (~150 lignes)
```

**Effort :** 1-2 jours

---

### 8. `ChatFullscreenV2.tsx` (~950 lignes) - **3.2x la limite**

**Impact :**
- Composant UI principal du chat
- Logique complexe (UI + state management)

**Plan :**
```
src/components/chat/ChatFullscreenV2/
├── ChatFullscreenV2.tsx        (~200 lignes - orchestrateur)
├── components/
│   ├── ChatHeader.tsx          (~150 lignes)
│   ├── ChatMessages.tsx        (~200 lignes)
│   ├── ChatInput.tsx           (~200 lignes)
│   └── ChatToolbar.tsx         (~150 lignes)
└── hooks/
    ├── useChatState.ts         (~200 lignes)
    └── useChatActions.ts       (~200 lignes)
```

**Effort :** 2 jours

---

## 🟢 PRIORITÉ P2 - MOYEN (À FAIRE SOUS 1 MOIS)

- `xai-native.ts` (1211 lignes)
- `xai.ts` (1129 lignes)
- `useCanvaStore.ts` (1091 lignes)
- `optimizedApi.ts` (983 lignes)
- `canvaNoteService.ts` (950 lignes)
- `liminality.ts` (848 lignes)
- `RealtimeService.ts` (843 lignes)
- `ChatCanvaPane.tsx` (824 lignes)

**Effort total P2 :** ~5-7 jours

---

## 🔵 PRIORITÉ P3 - BASSE (QUAND TEMPS DISPONIBLE)

- `files/page.tsx` (984 lignes)
- `AlertManager.test.ts` (923 lignes)
- `documentation/page.tsx` (893 lignes)
- `OpenAPIEditorStyles.tsx` (835 lignes)

**Effort total P3 :** ~2-3 jours

---

## 📋 PLAN D'ACTION RECOMMANDÉ

### Phase 1 - Blocants (Semaine 1-2)
1. ✅ **v2DatabaseUtils.ts** (P0) - 3-4 jours
2. ✅ **stream/route.ts** (P0) - 2-3 jours
3. ✅ **V2UnifiedApi.ts** (P0) - 2 jours

### Phase 2 - Critiques (Semaine 3-4)
4. ✅ **SpecializedAgentManager.ts** (P0) - 2-3 jours
5. ✅ **groq.ts** (P1) - 2 jours
6. ✅ **openapi-schema/route.ts** (P1) - 1-2 jours

### Phase 3 - Importants (Mois 2)
7. ✅ **llmApi.ts** (P1) - 1-2 jours
8. ✅ **ChatFullscreenV2.tsx** (P1) - 2 jours
9. ✅ Fichiers P2 (par ordre de criticité)

---

## ⚠️ RÈGLES DE REFACTORING

1. **Tests avant refactoring** : S'assurer que les tests existants passent
2. **Migration progressive** : Créer wrapper de compatibilité si nécessaire
3. **Vérification après chaque étape** : `read_lints` + tests
4. **Documentation** : JSDoc sur chaque module extrait
5. **Pas de régression** : Chaque refactoring doit être transparent

---

## 🎯 MÉTRIQUES DE SUCCÈS

- ✅ 0 fichier > 500 lignes
- ✅ 0 fichier > 300 lignes (objectif final)
- ✅ Tests unitaires pour chaque module extrait
- ✅ Documentation JSDoc complète
- ✅ Build passe sans erreur

---

**Prochaine étape recommandée :** Commencer par `v2DatabaseUtils.ts` (P0) car :
- Impact maximal (23+ fichiers dépendent)
- Blocant pour maintenabilité
- Base pour autres refactorings

