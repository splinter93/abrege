# 🔧 GUIDE DE CORRECTION MANUELLE - DETTE TECHNIQUE

## 📋 PRÉREQUIS

Avant de commencer les corrections manuelles, exécutez le script automatique :

```bash
npm run fix-critical
```

## 🎯 PHASE 1 : CORRECTION DES TYPES CRITIQUES

### 1.1 Services LLM - Groq Provider

**Fichier :** `src/services/llm/providers/implementations/groq.ts`

#### Problèmes identifiés :
- 50+ occurrences de `any`
- Variables non utilisées
- Types manquants

#### Corrections à apporter :

```typescript
// ❌ AVANT
export class GroqProvider implements LLMProvider {
  async call(message: any, context: any): Promise<any> {
    // ...
  }
}

// ✅ APRÈS
interface GroqCallParams {
  message: string;
  context: {
    model: string;
    temperature?: number;
    maxTokens?: number;
  };
}

interface GroqResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class GroqProvider implements LLMProvider {
  async call(message: string, context: GroqCallParams['context']): Promise<GroqResponse> {
    // ...
  }
}
```

### 1.2 GroqOrchestrator

**Fichier :** `src/services/llm/services/GroqOrchestrator.ts`

#### Problèmes identifiés :
- 40+ occurrences de `any`
- Variables non utilisées
- Types incompatibles

#### Corrections à apporter :

```typescript
// ❌ AVANT
const normalized = ToolResultNormalizer.normalizeToolResult(
  toolName,
  rawResult
) as NormalizedToolResult;

// ✅ APRÈS
interface ToolResult {
  tool_name: string;
  result: unknown;
  success: boolean;
}

const normalized: ToolResult = ToolResultNormalizer.normalizeToolResult(
  toolName,
  rawResult
);
```

### 1.3 Utilitaires de base

**Fichier :** `src/utils/v2DatabaseUtils.ts`

#### Problèmes identifiés :
- 30+ occurrences de `any`
- Variables non utilisées

#### Corrections à apporter :

```typescript
// ❌ AVANT
export async function updateNote(id: string, data: any): Promise<any> {
  // ...
}

// ✅ APRÈS
interface NoteUpdateData {
  title?: string;
  content?: string;
  slug?: string;
  visibility?: 'public' | 'private';
}

interface NoteUpdateResult {
  id: string;
  updated_at: string;
  success: boolean;
}

export async function updateNote(
  id: string, 
  data: NoteUpdateData
): Promise<NoteUpdateResult> {
  // ...
}
```

## 🎯 PHASE 2 : CORRECTION DES HOOKS REACT

### 2.1 useOptimizedMemo

**Fichier :** `src/hooks/useOptimizedMemo.ts`

#### Problèmes identifiés :
- Dépendances manquantes dans useCallback/useMemo
- Types `any` non spécifiés

#### Corrections à apporter :

```typescript
// ❌ AVANT
const memoizedValue = useMemo(() => {
  return expensiveCalculation(data);
}, []); // ❌ Dépendances manquantes

// ✅ APRÈS
const memoizedValue = useMemo(() => {
  return expensiveCalculation(data);
}, [data]); // ✅ Dépendances correctes

// Pour les cas complexes, utiliser useCallback
const memoizedCallback = useCallback((param: string) => {
  return expensiveCalculation(data, param);
}, [data]);
```

### 2.2 useContextMenuManager

**Fichier :** `src/hooks/useContextMenuManager.ts`

#### Problèmes identifiés :
- Dépendances manquantes dans useCallback

#### Corrections à apporter :

```typescript
// ❌ AVANT
const openContextMenu = useCallback((event: MouseEvent, items: MenuItem[]) => {
  setContextMenu({ x: event.clientX, y: event.clientY, items });
}, []); // ❌ Dépendances manquantes

// ✅ APRÈS
const openContextMenu = useCallback((event: MouseEvent, items: MenuItem[]) => {
  setContextMenu({ x: event.clientX, y: event.clientY, items });
}, [setContextMenu]); // ✅ Dépendances correctes
```

## 🎯 PHASE 3 : CORRECTION DES COMPOSANTS DE TEST

### 3.1 Caractères non échappés dans JSX

**Fichiers concernés :** Tous les fichiers dans `src/components/test/`

#### Corrections à apporter :

```jsx
// ❌ AVANT
<p>L'utilisateur a dit "bonjour"</p>
<div>Test avec 'apostrophe'</div>

// ✅ APRÈS
<p>L&apos;utilisateur a dit &quot;bonjour&quot;</p>
<div>Test avec &apos;apostrophe&apos;</div>
```

### 3.2 Variables non utilisées

**Fichier :** `src/components/test/TestToolCallsSimple.tsx`

#### Corrections à apporter :

```typescript
// ❌ AVANT
const { toolCallId, isProcessing } = props;
// toolCallId n'est jamais utilisé

// ✅ APRÈS
const { isProcessing } = props;
// Supprimer toolCallId s'il n'est pas nécessaire
```

## 🎯 PHASE 4 : CORRECTION DES MODULES MANQUANTS

### 4.1 Services Mermaid

**Fichier :** `src/services/mermaid/index.ts`

#### Problème :
- Imports d'exports inexistants

#### Corrections à apporter :

```typescript
// ❌ AVANT
import { 
  FlowchartConfig,
  SequenceConfig,
  GanttConfig,
  JourneyConfig,
  GitGraphConfig,
  PieConfig,
  EntityRelationshipConfig,
  ClassConfig,
  MermaidBlock,
  TextBlock,
  MermaidValidation,
  ContentBlock,
  MermaidRenderResult,
  MermaidRenderOptions
} from './mermaidConfig';

// ✅ APRÈS
// Vérifier d'abord ce qui existe réellement dans mermaidConfig
import { 
  // Importer seulement ce qui existe
  MermaidConfig,
  MermaidOptions
} from './mermaidConfig';

// Ou créer les types manquants
interface FlowchartConfig {
  // Définir l'interface
}

interface SequenceConfig {
  // Définir l'interface
}

// ... etc pour tous les types manquants
```

## 🎯 PHASE 5 : CORRECTION DES TESTS

### 5.1 Tests d'intégration

**Fichiers concernés :** Tous les fichiers dans `src/tests/`

#### Corrections à apporter :

```typescript
// ❌ AVANT
const mockSessionSyncService: any = {
  syncSessionsFromDB: jest.fn(),
  createSessionAndSync: jest.fn(),
};

// ✅ APRÈS
interface MockSessionSyncService {
  syncSessionsFromDB: jest.MockedFunction<() => Promise<void>>;
  createSessionAndSync: jest.MockedFunction<(name: string) => Promise<void>>;
}

const mockSessionSyncService: MockSessionSyncService = {
  syncSessionsFromDB: jest.fn(),
  createSessionAndSync: jest.fn(),
};
```

### 5.2 Tests de composants

**Corrections à apporter :**

```typescript
// ❌ AVANT
test('should render correctly', () => {
  const result = render(<Component />);
  expect(result).toBeDefined();
});

// ✅ APRÈS
test('should render correctly', () => {
  const { container } = render(<Component />);
  expect(container.firstChild).toBeInTheDocument();
});
```

## 🛠️ OUTILS DE CORRECTION

### 1. Correction automatique ESLint

```bash
# Corriger automatiquement les erreurs ESLint
npm run lint:fix

# Corriger un fichier spécifique
npx eslint src/path/to/file.ts --fix
```

### 2. Vérification TypeScript

```bash
# Vérifier les types sans compilation
npx tsc --noEmit

# Vérifier avec mode strict
npx tsc --strict --noEmit
```

### 3. Audit complet

```bash
# Audit complet (lint + types + sécurité)
npm run audit:full
```

## 📋 CHECKLIST DE VALIDATION

### Après chaque correction :

- [ ] Le fichier passe ESLint sans erreurs
- [ ] Le fichier passe TypeScript sans erreurs
- [ ] Les tests passent
- [ ] Le build fonctionne
- [ ] La fonctionnalité n'est pas cassée

### Après chaque phase :

- [ ] Tous les fichiers de la phase sont corrigés
- [ ] Les nouveaux tests couvrent les corrections
- [ ] La documentation est mise à jour
- [ ] Le code est revu par un pair

## 🚨 PROBLÈMES CRITIQUES À RÉSOUDRE EN PRIORITÉ

### 1. Configuration TypeScript
- [ ] Activer le mode strict
- [ ] Activer noImplicitAny
- [ ] Activer noUnusedLocals

### 2. Services LLM
- [ ] Typer correctement GroqProvider
- [ ] Typer correctement GroqOrchestrator
- [ ] Supprimer les variables non utilisées

### 3. Hooks React
- [ ] Corriger les dépendances manquantes
- [ ] Typer les paramètres
- [ ] Optimiser les performances

### 4. Tests
- [ ] Corriger les mocks mal typés
- [ ] Corriger les caractères non échappés
- [ ] Améliorer la couverture

## 📈 MÉTRIQUES DE SUIVI

### Avant correction :
- Erreurs TypeScript : 475
- Erreurs ESLint : 100+
- Couverture de types : ~60%

### Objectifs par phase :
- **Phase 1 :** -50% erreurs TypeScript
- **Phase 2 :** -75% erreurs TypeScript
- **Phase 3 :** -90% erreurs TypeScript
- **Phase 4 :** -95% erreurs TypeScript
- **Phase 5 :** 0 erreurs TypeScript

## 🎯 CONCLUSION

Ce guide fournit une approche structurée pour corriger la dette technique. Suivez les phases dans l'ordre et validez chaque étape avant de passer à la suivante.

**Temps estimé :** 4-6 semaines pour un développeur senior TypeScript.

**Priorité :** Commencer par la Phase 1 (Configuration + Services LLM) qui représente 70% des problèmes.
