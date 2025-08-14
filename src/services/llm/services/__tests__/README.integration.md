# Tests d'Intégration Groq

Ce dossier contient les tests d'intégration complets pour le système Groq, testant l'interaction entre tous les composants.

## Structure des Tests

### 1. `GroqRoundFSM.integration.test.ts`
Tests d'intégration pour la machine à états finis (FSM) qui gère le cycle de vie des rounds Groq.

**Couverture :**
- Flux complet mono-tool et multi-tools
- Gestion des états et transitions
- Gestion des verrous et concurrence
- Métriques et monitoring
- Validation des données
- Gestion des erreurs et récupération
- Performance et optimisation

### 2. `GroqOrchestratorV2.integration.test.ts`
Tests d'intégration pour l'orchestrateur principal qui coordonne tous les composants.

**Couverture :**
- Flux complet d'orchestration
- Gestion des tool calls complexes
- Gestion de l'historique et du contexte
- Gestion des erreurs et récupération
- Performance et optimisation
- Intégration avec l'API batch

### 3. `GroqBatchApiClient.integration.test.ts`
Tests d'intégration pour le client API batch qui persiste les résultats des tools.

**Couverture :**
- Persistance des tool results
- Gestion des conflits et erreurs
- Gestion des retry et fallbacks
- Gestion des headers et métadonnées
- Validation des payloads
- Performance et monitoring

### 4. `GroqToolExecutor.integration.test.ts`
Tests d'intégration pour l'exécuteur de tools qui gère l'exécution des function calls.

**Couverture :**
- Exécution mono-tool et multi-tools
- Gestion des limites et contraintes
- Gestion des types de tools
- Gestion des arguments et paramètres
- Gestion des erreurs et récupération
- Performance et optimisation
- Intégration avec le contexte

### 5. `groqSchemas.integration.test.ts`
Tests d'intégration pour les schémas de validation Zod qui assurent l'intégrité des données.

**Couverture :**
- Validation des tool calls
- Validation des messages assistant avec tool calls
- Validation des messages tool
- Validation des arguments JSON
- Validation du contenu des messages tool
- Validation de l'appariement tool call ID
- Validation de l'ordre des messages batch
- Validation des payloads d'API batch
- Validation des schémas Zod
- Validation des cas limites

### 6. `GroqSystem.integration.test.ts`
Tests d'intégration end-to-end pour l'ensemble du système Groq.

**Couverture :**
- Flux complet d'orchestration avec FSM
- Intégration tool execution et batch API
- Gestion de l'historique et du contexte
- Gestion des erreurs et récupération
- Performance et optimisation
- Intégration complète end-to-end

## Configuration

### Fichier de Configuration Jest
`jest.integration.config.js` - Configuration spécifique pour les tests d'intégration avec :
- Timeout étendu (30s)
- Couverture de code ciblée
- Tests séquentiels (maxWorkers: 1)
- Reporters spécialisés

### Fichier de Setup
`setup.integration.ts` - Configuration globale des mocks et variables d'environnement.

## Exécution des Tests

### Tous les Tests d'Intégration
```bash
npm run test:integration
```

### Tests Spécifiques
```bash
# Tests FSM
npm run test:integration -- --testNamePattern="GroqRoundFSM"

# Tests Orchestrateur
npm run test:integration -- --testNamePattern="GroqOrchestratorV2"

# Tests avec couverture
npm run test:integration -- --coverage
```

## Scénarios de Test

### 1. Flux Mono-Tool
- Utilisateur demande un calcul simple
- Assistant génère un tool call
- Tool est exécuté avec succès
- Résultat est persisté via batch API
- Assistant génère une réponse finale

### 2. Flux Multi-Tools avec Dépendances
- Utilisateur demande une opération complexe
- Assistant génère plusieurs tool calls
- Tools sont exécutés dans l'ordre
- Dépendances entre tools sont résolues
- Tous les résultats sont persistés
- Assistant génère une réponse finale

### 3. Gestion des Erreurs
- Tool execution échoue
- Erreur est capturée et analysée
- État d'erreur est géré par la FSM
- Utilisateur reçoit un message d'erreur approprié
- Système peut récupérer et retenter

### 4. Concurrence et Verrous
- Plusieurs rounds simultanés pour la même session
- Premier round obtient le verrou
- Autres rounds échouent avec erreur de verrou
- Système gère les conflits gracieusement

### 5. Performance et Optimisation
- Tests de temps d'exécution
- Gestion des gros payloads
- Limites de tool calls respectées
- Nettoyage automatique de l'historique

## Métriques de Qualité

### Couverture de Code
- **Branches :** 80% minimum
- **Fonctions :** 80% minimum
- **Lignes :** 80% minimum
- **Statements :** 80% minimum

### Performance
- **Round simple :** < 100ms
- **Round avec tools :** < 1s
- **Round complexe :** < 2s
- **Gros payload :** < 5s

### Fiabilité
- **Tests flaky :** 0%
- **Retry automatique :** 1 fois maximum
- **Timeout :** 30s maximum

## Maintenance

### Ajout de Nouveaux Tests
1. Créer le fichier de test dans `__tests__/`
2. Suivre la convention de nommage `*.integration.test.ts`
3. Ajouter les mocks nécessaires
4. Documenter les scénarios de test
5. Vérifier la couverture de code

### Mise à Jour des Mocks
1. Identifier les dépendances externes
2. Créer des mocks réalistes
3. Maintenir la cohérence entre les tests
4. Documenter les changements

### Debug des Tests
1. Utiliser `--verbose` pour plus de détails
2. Vérifier les logs de mock
3. Utiliser `--detectOpenHandles` pour identifier les promesses non résolues
4. Vérifier la configuration Jest

## Bonnes Pratiques

### 1. Isolation des Tests
- Chaque test doit être indépendant
- Utiliser `beforeEach` pour le setup
- Nettoyer les mocks après chaque test

### 2. Mocks Réalistes
- Simuler le comportement réel des services
- Inclure les cas d'erreur et de succès
- Maintenir la cohérence des données

### 3. Assertions Claires
- Vérifier les appels aux services mockés
- Tester les transitions d'état
- Valider la structure des données

### 4. Gestion des Timeouts
- Utiliser des timeouts appropriés
- Éviter les tests qui attendent indéfiniment
- Gérer les opérations asynchrones correctement

### 5. Documentation
- Documenter les scénarios complexes
- Expliquer les mocks et leur comportement
- Maintenir la cohérence avec l'implémentation 