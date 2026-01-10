# 📋 Fichiers Restants à Refactorer

**Date :** 2026-01-06  
**Standard :** GUIDE-EXCELLENCE-CODE.md (max 300 lignes strict)  
**Statut :** ✅ `SpecializedAgentManager.ts` terminé

---

## 🔴 PRIORITÉ P0 - CRITIQUE (À faire maintenant)

### 1. ✅ `SpecializedAgentManager.ts` (1641 → 129 lignes)
**Statut :** ✅ **TERMINÉ** (2026-01-06)  
**Résultat :** 18 modules créés, 0 régression, tests validés

---

### 2. ✅ `V2UnifiedApi.ts` (1523 → 141 lignes)
**Statut :** ✅ **TERMINÉ** (refactoring existant activé)  
**Résultat :** 
- Wrapper de compatibilité : 141 lignes
- Modules refactorés dans `src/services/v2Api/` :
  - `NoteApi.ts` : 282 lignes ✅
  - `FolderApi.ts` : 260 lignes ✅
  - `ClasseurApi.ts` : 273 lignes ✅
  - `ApiClient.ts` : 119 lignes ✅
  - `NoteContentApi.ts` : 96 lignes ✅
  - `ClasseurContentApi.ts` : 89 lignes ✅
  - `types.ts` : 61 lignes ✅
- Build réussi, 0 erreur TypeScript

---

### 3. `stream/route.ts` (1396 lignes) - **4.7x la limite**
**Fichier :** `src/app/api/chat/llm/stream/route.ts`  
**Impact :** 🔴 CRITIQUE
- Route API critique (chat streaming)
- Utilisé à chaque message chat
- Logique complexe (streaming, tool calls, retries)

**Plan de refactoring :**
```
src/app/api/chat/llm/stream/
├── route.ts                    (~200 lignes - orchestrateur)
├── handlers/
│   ├── streamHandler.ts       (~250 lignes)
│   ├── toolCallHandler.ts     (~250 lignes)
│   └── errorHandler.ts         (~200 lignes)
├── utils/
│   ├── streamUtils.ts          (~200 lignes)
│   └── responseBuilder.ts      (~200 lignes)
└── types/
    └── streamTypes.ts          (~100 lignes)
```

**Effort estimé :** 2-3 jours  
**Risque :** 🔴 ÉLEVÉ (route critique)

---

## 🟡 PRIORITÉ P1 - IMPORTANT (À faire sous 2 semaines)

### 4. `groq.ts` (1614 lignes) - **5.4x la limite**
**Fichier :** `src/services/llm/providers/implementations/groq.ts`  
**Impact :** 🟡 IMPORTANT
- Provider LLM principal (Groq)
- Logique complexe (streaming, tool calls, retries)

**Plan de refactoring :**
```
src/services/llm/providers/implementations/groq/
├── groq.ts                     (~200 lignes - orchestrateur)
├── handlers/
│   ├── streamHandler.ts        (~250 lignes)
│   ├── toolCallHandler.ts      (~250 lignes)
│   └── errorHandler.ts         (~200 lignes)
├── utils/
│   ├── requestBuilder.ts       (~200 lignes)
│   └── responseParser.ts        (~200 lignes)
└── types/
    └── groqTypes.ts            (~100 lignes)
```

**Effort estimé :** 2 jours  
**Risque :** 🟡 MOYEN

---

### 5. `openapi-schema/route.ts` (1520 lignes) - **5.1x la limite**
**Fichier :** `src/app/api/v2/openapi-schema/route.ts`  
**Impact :** 🟡 IMPORTANT
- Route API pour gestion schémas OpenAPI
- Logique complexe (validation, parsing, génération)

**Plan de refactoring :**
```
src/app/api/v2/openapi-schema/
├── route.ts                    (~200 lignes - orchestrateur)
├── handlers/
│   ├── schemaHandler.ts        (~250 lignes)
│   ├── validationHandler.ts    (~250 lignes)
│   └── generationHandler.ts     (~250 lignes)
├── utils/
│   ├── schemaParser.ts         (~200 lignes)
│   └── schemaValidator.ts      (~200 lignes)
└── types/
    └── schemaTypes.ts          (~100 lignes)
```

**Effort estimé :** 1-2 jours  
**Risque :** 🟡 MOYEN

---

### 6. `llmApi.ts` (1135 lignes) - **3.8x la limite**
**Fichier :** `src/services/llmApi.ts`  
**Impact :** 🟡 IMPORTANT
- Service LLM principal
- Utilisé dans plusieurs composants

**Plan de refactoring :**
```
src/services/llm/
├── llmApi.ts                   (~200 lignes - orchestrateur)
├── handlers/
│   ├── requestHandler.ts       (~250 lignes)
│   ├── responseHandler.ts       (~250 lignes)
│   └── errorHandler.ts          (~200 lignes)
├── utils/
│   ├── apiUtils.ts              (~200 lignes)
│   └── apiTypes.ts              (~150 lignes)
```

**Effort estimé :** 1-2 jours  
**Risque :** 🟡 MOYEN

---

## 🟢 PRIORITÉ P2 - MOYEN (À faire sous 1 mois)

### 7. `xai-native.ts` (1213 lignes) - **4.0x la limite**
**Fichier :** `src/services/llm/providers/implementations/xai-native.ts`  
**Effort estimé :** 1-2 jours

### 8. `xai.ts` (1129 lignes) - **3.8x la limite**
**Fichier :** `src/services/llm/providers/implementations/xai.ts`  
**Effort estimé :** 1-2 jours

### 9. `useCanvaStore.ts` (1091 lignes) - **3.6x la limite**
**Fichier :** `src/store/useCanvaStore.ts`  
**Effort estimé :** 1-2 jours

### 10. `optimizedApi.ts` (983 lignes) - **3.3x la limite**
**Fichier :** `src/services/optimizedApi.ts`  
**Effort estimé :** 1 jour

### 11. `canvaNoteService.ts` (950 lignes) - **3.2x la limite**
**Fichier :** `src/services/canvaNoteService.ts`  
**Effort estimé :** 1 jour

### 12. `liminality.ts` (848 lignes) - **2.8x la limite**
**Fichier :** `src/services/llm/providers/implementations/liminality.ts`  
**Effort estimé :** 1 jour

### 13. `RealtimeService.ts` (843 lignes) - **2.8x la limite**
**Fichier :** `src/services/RealtimeService.ts`  
**Effort estimé :** 1 jour

### 14. `ChatCanvaPane.tsx` (824 lignes) - **2.7x la limite**
**Fichier :** `src/components/chat/ChatCanvaPane.tsx`  
**Effort estimé :** 1 jour

---

## 📊 RÉSUMÉ

### Priorité P0 (Critique) - 1 fichier restant
- ✅ `SpecializedAgentManager.ts` - TERMINÉ
- ✅ `V2UnifiedApi.ts` - TERMINÉ (refactoring activé)
- ⏳ `stream/route.ts` (1396 lignes) - 2-3 jours

**Total P0 restant :** 2-3 jours

### Priorité P1 (Important) - 3 fichiers
- ⏳ `groq.ts` (1614 lignes) - 2 jours
- ⏳ `openapi-schema/route.ts` (1520 lignes) - 1-2 jours
- ⏳ `llmApi.ts` (1135 lignes) - 1-2 jours

**Total P1 :** 4-6 jours

### Priorité P2 (Moyen) - 8 fichiers
**Total P2 :** ~8-10 jours

---

## 🎯 RECOMMANDATION

**Ordre suggéré :**
1. ✅ `SpecializedAgentManager.ts` - TERMINÉ
2. ✅ `V2UnifiedApi.ts` - TERMINÉ (refactoring activé)
3. `stream/route.ts` (P0) - 2-3 jours
4. `groq.ts` (P1) - 2 jours
5. `openapi-schema/route.ts` (P1) - 1-2 jours
6. `llmApi.ts` (P1) - 1-2 jours

**Total estimé P0+P1 restant :** 6-9 jours de travail

---

**Prochaine étape suggérée :** Commencer par `stream/route.ts` (P0, 2-3 jours)

