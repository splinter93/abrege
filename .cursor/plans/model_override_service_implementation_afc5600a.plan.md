---
name: Model Override Service Implementation
overview: Mise en place d'un service modulaire ModelOverrideService pour gérer les overrides de modèle et paramètres LLM (images, reasoning) de manière isolée, extensible et maintenable.
todos:
  - id: "1"
    content: Créer types.ts avec interfaces strictes (LLMParams, ModelOverrideContext, ModelOverrideResult, ModelOverrideRule)
    status: completed
  - id: "2"
    content: Créer ModelOverrideService.ts (singleton, orchestration, fusion params)
    status: completed
    dependencies:
      - "1"
  - id: "3"
    content: Créer ImageSupportRule.ts (détection images, fallback Llama 4 Maverick)
    status: completed
    dependencies:
      - "1"
  - id: "4"
    content: Créer ReasoningOverrideRule.ts (mapping reasoning par provider, override params optionnel)
    status: completed
    dependencies:
      - "1"
  - id: "5"
    content: Créer rules/index.ts et modelOverride/index.ts (exports centralisés, initialisation service)
    status: completed
    dependencies:
      - "2"
      - "3"
      - "4"
  - id: "6"
    content: Étendre validation.ts (ajouter reasoningOverride dans uiContextSchema)
    status: completed
  - id: "7"
    content: Intégrer dans route.ts (détection images, construction contexte, résolution override, logging)
    status: completed
    dependencies:
      - "5"
      - "6"
  - id: "8"
    content: Passer reasoningOverride depuis frontend (useChatResponse, ChatContextBuilder, useChatMessageActions)
    status: completed
    dependencies:
      - "6"
  - id: "9"
    content: Tests unitaires (ModelOverrideService, ImageSupportRule, ReasoningOverrideRule)
    status: completed
    dependencies:
      - "5"
  - id: "10"
    content: Vérifications finales (read_lints, tests non-régression, tests intégration)
    status: completed
    dependencies:
      - "7"
      - "8"
      - "9"
---

# Plan : Mise en place ModelOverrideService

## Objectif

Créer un service modulaire et extensible pour gérer les overrides de modèle LLM et paramètres (temperature, topP, maxTokens) selon deux cas d'usage :

1. **Images** : Switch automatique vers Llama 4 Maverick si modèle sans vision (sauf xAI)
2. **Reasoning** : Switch de modèle selon le niveau reasoning sélectionné (advanced/general/fast)

## Architecture

```javascript
src/services/llm/modelOverride/
  ├── ModelOverrideService.ts      # Service principal (orchestration)
  ├── types.ts                     # Types stricts (interfaces)
  └── rules/
      ├── ImageSupportRule.ts       # Rule : fallback images
      ├── ReasoningOverrideRule.ts  # Rule : switch reasoning
      └── index.ts                  # Export centralisé
```



## Étapes d'implémentation

### 1. Créer la structure de types (`types.ts`)

**Fichier** : `src/services/llm/modelOverride/types.ts`

- Interface `LLMParams` : temperature, topP, maxTokens (extensible)
- Interface `ModelOverrideContext` : contexte d'override (modèle original, provider, hasImages, reasoningOverride, originalParams)
- Interface `ModelOverrideResult` : résultat avec modèle, params override, reason, wasOverridden
- Interface `ModelOverrideRule` : contrat standardisé pour toutes les rules

**Standards** :

- Types stricts (pas de `any`)
- JSDoc pour toutes les interfaces publiques
- Max 150 lignes

### 2. Créer le service principal (`ModelOverrideService.ts`)

**Fichier** : `src/services/llm/modelOverride/ModelOverrideService.ts`**Responsabilités** :

- Singleton pattern (conforme aux services LLM existants)
- Enregistrement des rules (méthode `registerRule`)
- Résolution modèle + params (méthode `resolveModelAndParams`)
- Application séquentielle des rules avec fusion des paramètres

**Standards** :

- Max 200 lignes
- Logging structuré avec contexte
- Gestion d'erreurs robuste (fallback gracieux)
- JSDoc complet

### 3. Créer ImageSupportRule (`rules/ImageSupportRule.ts`)

**Fichier** : `src/services/llm/modelOverride/rules/ImageSupportRule.ts`**Logique** :

- `shouldApply` : vérifie si provider !== 'xai' ET hasImages ET modèle actuel ne supporte pas images
- `apply` : retourne Llama 4 Maverick (`meta-llama/llama-4-maverick-17b-128e-instruct`)
- Utilise `getModelInfo()` de `@/constants/groqModels` pour vérifier capabilities

**Standards** :

- Max 150 lignes
- Fonction pure pour détection support images
- Logging du switch avec raison

### 4. Créer ReasoningOverrideRule (`rules/ReasoningOverrideRule.ts`)

**Fichier** : `src/services/llm/modelOverride/rules/ReasoningOverrideRule.ts`**Logique** :

- `shouldApply` : vérifie si `reasoningOverride !== null`
- `apply` : mapping par provider :
- **xAI** : advanced → `grok-4-0709`, general → `grok-4-1-fast-reasoning`, fast → `grok-4-1-fast-non-reasoning`
- **Autres providers** : logique à définir selon besoins futurs
- Optionnel : override params (temperature plus basse pour advanced, plus haute pour fast)

**Standards** :

- Max 200 lignes
- Mapping extensible par provider
- Logging du switch avec raison

### 5. Créer index des rules (`rules/index.ts`)

**Fichier** : `src/services/llm/modelOverride/rules/index.ts`

- Export centralisé de toutes les rules
- Facilite l'ajout de nouvelles rules

### 6. Initialiser le service avec les rules

**Fichier** : `src/services/llm/modelOverride/index.ts`

- Export du service singleton
- Initialisation avec ImageSupportRule et ReasoningOverrideRule
- Pattern similaire à `SystemMessageBuilder.getInstance()`

### 7. Étendre validation Zod (`validation.ts`)

**Fichier** : `src/app/api/chat/llm/validation.ts`

- Ajouter `reasoningOverride` dans `uiContextSchema` :
  ```typescript
    reasoningOverride: z.enum(['advanced', 'general', 'fast']).nullable().optional()
  ```




### 8. Intégrer dans la route stream (`route.ts`)

**Fichier** : `src/app/api/chat/llm/stream/route.ts`**Modifications** (après ligne 151, avant création provider) :

1. Importer le service :
   ```typescript
      const { modelOverrideService } = await import('@/services/llm/modelOverride');
   ```




2. Détecter images dans le message (déjà fait lignes 371-403)
3. Construire le contexte d'override :
   ```typescript
      const overrideContext: ModelOverrideContext = {
        originalModel: model,
        provider: providerType,
        hasImages: !!userMessageImages?.length,
        reasoningOverride: context.reasoningOverride,
        originalParams: { temperature, topP, maxTokens }
      };
   ```




4. Résoudre modèle et params :
   ```typescript
      const overrideResult = modelOverrideService.resolveModelAndParams(overrideContext);
      model = overrideResult.model;
      const finalTemperature = overrideResult.params.temperature ?? temperature;
      const finalTopP = overrideResult.params.topP ?? topP;
      const finalMaxTokens = overrideResult.params.maxTokens ?? maxTokens;
   ```




5. Logger si override :
   ```typescript
      if (overrideResult.reasons.length > 0) {
        logger.info('[Stream Route] Model/Params override:', {
          originalModel: overrideResult.originalModel,
          newModel: overrideResult.model,
          reasons: overrideResult.reasons
        });
      }
   ```




6. Utiliser les paramètres finaux pour créer le provider (ligne 154-164)

### 9. Passer reasoningOverride depuis le frontend

**Fichier** : `src/hooks/useChatResponse.ts`**Modification** (ligne 111-117) :

- Ajouter `reasoningOverride` dans le body de la requête :
  ```typescript
    context: {
      ...(context || { sessionId }),
      reasoningOverride: options.reasoningOverride // À ajouter dans les options
    }
  ```


**Fichier** : `src/services/chat/ChatContextBuilder.ts`

- Ajouter `reasoningOverride` dans les options de build
- Passer depuis `ChatMessageSendingService.prepare()` si disponible

**Fichier** : `src/hooks/chat/useChatMessageActions.ts`

- Récupérer `reasoningOverride` depuis `useChatState`
- Passer dans les options de `sendMessage`

### 10. Tests et vérifications

**Tests unitaires** :

- `src/services/llm/modelOverride/__tests__/ModelOverrideService.test.ts`
- `src/services/llm/modelOverride/rules/__tests__/ImageSupportRule.test.ts`
- `src/services/llm/modelOverride/rules/__tests__/ReasoningOverrideRule.test.ts`

**Vérifications** :

- `read_lints` sur tous les fichiers créés/modifiés
- Tests de non-régression (modèle sans override fonctionne)
- Tests d'intégration (switch images, switch reasoning)

## Ordre d'exécution

1. Types (`types.ts`)
2. Service principal (`ModelOverrideService.ts`)
3. Rules (ImageSupportRule, ReasoningOverrideRule)
4. Index et initialisation
5. Validation Zod
6. Intégration route stream
7. Frontend (passer reasoningOverride)
8. Tests

## Points d'attention

- **Isolation** : Chaque rule est indépendante, testable séparément
- **Extensibilité** : Ajouter une rule = créer fichier + 1 ligne d'enregistrement
- **Traçabilité** : Chaque override loggé avec raison claire
- **Performance** : Service léger, pas de side effects
- **Type safety** : Zéro `any`, interfaces strictes

## Conformité GUIDE-EXCELLENCE-CODE

- Max 300 lignes par fichier
- 1 fichier = 1 responsabilité
- Types stricts (pas de `any`)
- Logging structuré avec contexte
- JSDoc pour fonctions publiques
- Tests unitaires pour chaque rule
- Singleton pattern pour service stateful