# 🧹 **PLAN DE NETTOYAGE COMPLET - ABRÈGE**

## 📋 **VUE D'ENSEMBLE**
Plan de nettoyage priorisé pour améliorer la qualité, la maintenabilité et les performances du code.

---

## 🎯 **PHASE 1 : LOGS EXCESSIFS (URGENT - 2h)**

### **Objectif :** Réduire les ~200 console.log en production

#### **1.1 Implémenter le système de logger conditionnel**
```typescript
// src/utils/logger.ts - Améliorer
export const logger = {
  dev: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] ${message}`, ...args);
    }
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  info: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.info(`[INFO] ${message}`, ...args);
    }
  }
};
```

#### **1.2 Fichiers prioritaires à nettoyer :**
- `src/components/chat/ChatFullscreenV2.tsx` (15+ logs)
- `src/app/api/chat/llm/route.ts` (20+ logs)
- `src/store/useChatStore.ts` (10+ logs)
- `src/services/llm/providers/template.ts` (8+ logs)
- `src/components/chat/ChatSidebar.tsx` (5+ logs)

#### **1.3 Remplacer les patterns :**
```typescript
// AVANT
console.log('[ChatFullscreenV2] 📊 État du store:', {...});

// APRÈS
logger.dev('[ChatFullscreenV2] État du store:', {...});
```

---

## 🎯 **PHASE 2 : TYPES ANY (IMPORTANT - 4h)**

### **Objectif :** Éliminer les ~150 occurrences de `any`

#### **2.1 Types critiques à corriger :**

**Services API :**
- `src/services/supabase.ts` (30+ any)
- `src/services/optimizedApi.ts` (10+ any)
- `src/services/llm/providers/template.ts` (8+ any)

**Hooks :**
- `src/hooks/useRealtime.ts` (8+ any)
- `src/hooks/useChatStreaming.ts` (3+ any)

**Composants :**
- `src/components/chat/ChatSidebar.tsx` (5+ any)
- `src/components/EditorToolbar.tsx` (15+ any)

#### **2.2 Créer des types spécifiques :**
```typescript
// src/types/api.ts - Ajouter
export interface ApiResponse<T = unknown> {
  data: T;
  error?: string;
  status: number;
}

export interface SupabaseQueryResult<T = unknown> {
  data: T[] | null;
  error: any;
  count: number | null;
}

export interface LLMConfig {
  model: string;
  temperature: number;
  max_tokens: number;
  top_p?: number;
  system_instructions?: string;
}
```

#### **2.3 Remplacer les patterns :**
```typescript
// AVANT
export const getClasseurs = async (): Promise<any[]> => {

// APRÈS
export const getClasseurs = async (): Promise<Classeur[]> => {
```

---

## 🎯 **PHASE 3 : VARIABLES INUTILISÉES (NORMAL - 2h)**

### **Objectif :** Supprimer ~50 variables non utilisées

#### **3.1 Fichiers prioritaires :**
- `src/app/(private)/note/[id]/page.tsx` (5+ variables)
- `src/components/EditorToolbar.tsx` (8+ variables)
- `src/hooks/useRealtime.ts` (6+ variables)
- `src/services/llm/providers/deepseek.ts` (4+ imports)

#### **3.2 Actions :**
1. **Supprimer les imports inutilisés**
2. **Supprimer les variables déclarées mais non utilisées**
3. **Nettoyer les paramètres de fonction inutilisés**

#### **3.3 Exemples :**
```typescript
// AVANT
import { useState, useEffect, useCallback, useRef } from 'react';
const { error, setError } = useChatStore(); // error non utilisé

// APRÈS
import { useState, useEffect, useCallback } from 'react';
const { setError } = useChatStore();
```

---

## 🎯 **PHASE 4 : HOOKS REACT (NORMAL - 3h)**

### **Objectif :** Corriger les dépendances et optimisations

#### **4.1 Problèmes identifiés :**
- **Dépendances manquantes** dans useEffect
- **Hooks conditionnels** (règles violées)
- **useCallback** avec dépendances inutiles

#### **4.2 Fichiers à corriger :**
- `src/app/(private)/note/[id]/page.tsx` (3 warnings)
- `src/components/EditorToolbar.tsx` (3 hooks conditionnels)
- `src/hooks/useEditorSave.ts` (1 warning)
- `src/hooks/useContextMenuManager.ts` (3 warnings)

#### **4.3 Solutions :**
```typescript
// AVANT
useEffect(() => {
  handleSave();
}, []); // ⚠️ Dépendance manquante

// APRÈS
useEffect(() => {
  handleSave();
}, [handleSave]); // ✅ Dépendance ajoutée
```

---

## 🎯 **PHASE 5 : OPTIMISATIONS IMAGES (MINEUR - 1h)**

### **Objectif :** Remplacer `<img>` par `<Image />`

#### **5.1 Composants à optimiser :**
- `src/components/LogoScrivia.tsx`
- `src/components/chat/ChatFullscreenV2.tsx`
- `src/components/EditorHeader.tsx`
- `src/app/(private)/summary/[id]/page.tsx`

#### **5.2 Pattern de remplacement :**
```typescript
// AVANT
<img src="/logo scrivia white.png" alt="Scrivia" />

// APRÈS
import Image from 'next/image';
<Image 
  src="/logo scrivia white.png" 
  alt="Scrivia"
  width={120}
  height={40}
  priority
/>
```

---

## 🎯 **PHASE 6 : TESTS ET VALIDATION (FINAL - 1h)**

### **Objectif :** Vérifier que tout fonctionne après nettoyage

#### **6.1 Tests à effectuer :**
1. **Build** : `npm run build`
2. **Lint** : `npm run lint`
3. **Types** : `npm run type-check`
4. **Fonctionnalités** : Test manuel des features critiques

#### **6.2 Métriques de succès :**
- ✅ Build sans erreur
- ✅ Lint avec < 10 warnings
- ✅ Types sans erreur
- ✅ Fonctionnalités préservées

---

## 📊 **PLANNING DÉTAILLÉ**

### **Jour 1 :**
- **Matin** : Phase 1 (Logs) + Phase 2 (Types critiques)
- **Après-midi** : Phase 3 (Variables) + Tests

### **Jour 2 :**
- **Matin** : Phase 4 (Hooks) + Phase 5 (Images)
- **Après-midi** : Phase 6 (Validation) + Corrections

---

## 🎯 **MÉTRIQUES DE SUCCÈS**

### **Avant nettoyage :**
- ❌ ~200 console.log
- ❌ ~150 types `any`
- ❌ ~50 variables inutilisées
- ❌ ~20 warnings hooks
- ❌ ~10 images non optimisées

### **Après nettoyage :**
- ✅ < 20 console.log (seulement critiques)
- ✅ < 10 types `any` (seulement nécessaires)
- ✅ 0 variable inutilisée
- ✅ < 5 warnings hooks
- ✅ Toutes images optimisées

---

## 🚀 **COMMANDES DE VALIDATION**

```bash
# Validation finale
npm run build
npm run lint
npm run type-check

# Tests fonctionnels
npm run test
npm run test:integration
```

---

## 📝 **NOTES IMPORTANTES**

1. **Backup** : Commiter avant chaque phase
2. **Tests** : Valider après chaque fichier modifié
3. **Incremental** : Traiter fichier par fichier
4. **Documentation** : Mettre à jour les commentaires

**Objectif final : Code propre, maintenable et performant !** 🎯 