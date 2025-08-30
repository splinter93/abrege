# 📁 LISTE COMPLÈTE DES FICHIERS - TOOL CALLS ET INJECTION HISTORIQUE LLM

## 🎯 **VUE D'ENSEMBLE**

Ce document recense **TOUS** les fichiers du projet Abrège liés aux tool calls et à la gestion d'injection dans l'historique du LLM. La liste est organisée par catégorie et inclut une description de chaque fichier.

---

## 🔧 **CORE SERVICES - GESTION DES TOOL CALLS**

### **1. Orchestration principale**
- **`src/services/llm/groqGptOss120b.ts`** - Point d'entrée principal pour l'API Groq
- **`src/services/llm/services/GroqOrchestrator.ts`** - Orchestrateur principal des tool calls
- **`src/services/llm/services/GroqRoundFSM.ts`** - Machine à états finis pour les rounds
- **`src/services/llm/services/GroqHistoryBuilder.ts`** - Construction intelligente de l'historique

### **2. Exécution des tools**
- **`src/services/llm/services/GroqToolExecutor.ts`** - Exécution des tool calls
- **`src/services/llm/services/ToolCallPersistenceService.ts`** - Persistance des tool calls
- **`src/services/llm/services/BatchMessageService.ts`** - Gestion des messages en batch
- **`src/services/agentApiV2Tools.ts`** - Interface avec l'API v2 des agents

### **3. Gestion de l'historique**
- **`src/services/chatHistoryCleaner.ts`** - Nettoyage et optimisation de l'historique
- **`src/services/toolCallSyncService.ts`** - Synchronisation des tool calls
- **`src/services/llm/ThreadBuilder.ts`** - Construction des threads de conversation
- **`src/services/llm/services/GroqBatchApiClient.ts`** - Client API batch pour Groq

---

## 🗄️ **PERSISTANCE ET BASE DE DONNÉES**

### **1. API de chat**
- **`src/app/api/chat/llm/route.ts`** - Route principale pour l'API LLM
- **`src/app/api/ui/chat-sessions/[id]/messages/route.ts`** - Gestion des messages de session
- **`src/app/api/ui/chat-sessions/[id]/messages/batch/route.ts`** - Gestion batch des messages
- **`src/app/api/ui/chat-sessions/route.ts`** - Gestion des sessions de chat

### **2. Services de persistance**
- **`src/services/chatSessionService.ts`** - Service de gestion des sessions
- **`src/services/sessionSyncService.ts`** - Synchronisation des sessions
- **`src/store/useChatStore.ts`** - Store Zustand pour la gestion de l'état

---

## 🎨 **COMPOSANTS UI ET HOOKS**

### **1. Composants de chat**
- **`src/components/chat/ChatWidget.tsx`** - Widget de chat principal
- **`src/components/chat/ChatFullscreenV2.tsx`** - Interface de chat plein écran
- **`src/components/chat/ChatSidebar.tsx`** - Barre latérale du chat
- **`src/components/chat/ChatMessage.tsx`** - Composant de message individuel

### **2. Hooks et gestion d'état**
- **`src/hooks/useChatResponse.ts`** - Hook pour les réponses de chat
- **`src/hooks/useChatStore.ts`** - Hook d'accès au store de chat
- **`src/hooks/useAppContext.ts`** - Contexte global de l'application

---

## 🔌 **PROVIDERS ET INTÉGRATIONS**

### **1. Providers LLM**
- **`src/services/llm/providers/implementations/groq.ts`** - Provider Groq principal
- **`src/services/llm/providers/implementations/groqResponses.ts`** - Provider Groq Responses
- **`src/services/llm/providers/BaseProvider.ts`** - Classe de base pour les providers

### **2. Intégrations API**
- **`src/services/llm/agentApiV2Tools.d.ts`** - Types pour l'API v2 des agents
- **`src/services/llm/agentApiV2Tools.demo.ts`** - Démonstration de l'API v2
- **`src/services/llm/agentApiV2Tools.test.ts`** - Tests de l'API v2

---

## 📋 **TYPES ET VALIDATION**

### **1. Types TypeScript**
- **`src/services/llm/types/groqTypes.ts`** - Types principaux pour Groq
- **`src/types/chat.ts`** - Types pour les messages de chat
- **`src/types/api.ts`** - Types pour l'API
- **`src/types/dossiers.ts`** - Types pour les dossiers

### **2. Validation et schémas**
- **`src/services/llm/validation/groqSchemas.ts`** - Schémas de validation Groq
- **`src/services/llm/validation/__tests__/groqSchemas.integration.test.ts`** - Tests des schémas

---

## 🧪 **TESTS ET VALIDATION**

### **1. Tests d'intégration**
- **`src/services/llm/services/__tests__/GroqOrchestrator.integration.test.ts`** - Tests de l'orchestrateur
- **`src/services/llm/services/__tests__/GroqRoundFSM.integration.test.ts`** - Tests de la machine à états
- **`src/services/llm/services/__tests__/GroqBatchApiClient.integration.test.ts`** - Tests du client batch

### **2. Tests de composants**
- **`src/components/__tests__/ChatWidget.test.tsx`** - Tests du widget de chat
- **`src/hooks/__tests__/useChatStore.test.ts`** - Tests du store de chat

---

## 📚 **DOCUMENTATION ET SCRIPTS**

### **1. Documentation technique**
- **`MECANISME-TOOL-CALLS-COMPLET.md`** - Mécanisme complet des tool calls
- **`MECANISME-INJECTION-TOOL-CALLS.md`** - Mécanisme d'injection des tool calls
- **`MECANISME-INJECTION-TOOLS-CORRIGE.md`** - Mécanisme d'injection corrigé
- **`CORRECTION-FINALE-TOOL-CALLS.md`** - Correction finale des tool calls
- **`CORRECTION-HISTORIQUE-TOOL-CALLS.md`** - Correction de l'historique des tool calls
- **`CORRECTION-DUPLICATION-TOOL-CALLS.md`** - Correction de la duplication des tool calls

### **2. Scripts de test et maintenance**
- **`scripts/test-duplication-fix.js`** - Test de la correction de duplication
- **`scripts/test-tool-content-format.js`** - Test du format du contenu des tools
- **`scripts/fix-history-transmission.js`** - Correction de la transmission de l'historique

---

## 🔍 **FICHIERS DE CONFIGURATION**

### **1. Configuration des providers**
- **`src/services/llm/providers/config/groqConfig.ts`** - Configuration Groq
- **`src/services/llm/providers/config/providerConfig.ts`** - Configuration des providers

### **2. Configuration des outils**
- **`src/services/llm/tools/toolRegistry.ts`** - Registre des outils disponibles
- **`src/services/llm/tools/toolValidator.ts`** - Validation des outils

---

## 📊 **MONITORING ET LOGS**

### **1. Logging et traçabilité**
- **`src/utils/logger.ts`** - Utilitaire de logging principal
- **`src/services/llm/services/GroqPerformanceMonitor.ts`** - Monitoring des performances

### **2. Métriques et analytics**
- **`src/services/llm/metrics/toolCallMetrics.ts`** - Métriques des tool calls
- **`src/services/llm/metrics/performanceMetrics.ts`** - Métriques de performance

---

## 🚀 **FICHIERS DE DÉPLOIEMENT**

### **1. Migrations de base de données**
- **`supabase/migrations/20241215_create_files_table.sql`** - Table des fichiers
- **`supabase/migrations/20241205_add_slug_columns.sql`** - Colonnes de slug

### **2. Configuration d'environnement**
- **`.env.example`** - Exemple de variables d'environnement
- **`next.config.js`** - Configuration Next.js

---

## 📈 **STATISTIQUES GÉNÉRALES**

### **📊 Répartition par catégorie :**
- **Core Services** : 12 fichiers
- **Persistance et DB** : 7 fichiers  
- **Composants UI** : 6 fichiers
- **Providers** : 4 fichiers
- **Types et Validation** : 6 fichiers
- **Tests** : 8 fichiers
- **Documentation** : 8 fichiers
- **Scripts** : 3 fichiers
- **Configuration** : 4 fichiers
- **Monitoring** : 3 fichiers
- **Déploiement** : 3 fichiers

### **📁 Total : 64 fichiers**

---

## 🎯 **FICHIERS CRITIQUES À SURVEILLER**

### **🚨 Fichiers de production critiques :**
1. **`src/services/llm/services/GroqOrchestrator.ts`** - Cœur du système
2. **`src/app/api/chat/llm/route.ts`** - API principale
3. **`src/services/agentApiV2Tools.ts`** - Exécution des outils
4. **`src/services/chatSessionService.ts`** - Persistance des sessions

### **🔧 Fichiers de maintenance :**
1. **`src/services/chatHistoryCleaner.ts`** - Nettoyage de l'historique
2. **`src/services/llm/services/ToolCallPersistenceService.ts`** - Persistance des tool calls
3. **`src/services/llm/services/GroqHistoryBuilder.ts`** - Construction de l'historique

### **📚 Fichiers de documentation :**
1. **`MECANISME-TOOL-CALLS-COMPLET.md`** - Architecture générale
2. **`CORRECTION-DUPLICATION-TOOL-CALLS.md`** - Corrections récentes
3. **`AUDIT-COMPLET-TOOL-CALLS-HISTORIQUE.md`** - Audit complet

---

## 💡 **RECOMMANDATIONS**

### **🔍 Pour le développement :**
- Commencer par `GroqOrchestrator.ts` pour comprendre le flux principal
- Consulter `MECANISME-TOOL-CALLS-COMPLET.md` pour l'architecture
- Utiliser les tests d'intégration pour valider les modifications

### **🚀 Pour le déploiement :**
- Vérifier la configuration des providers dans `groqConfig.ts`
- Tester les migrations de base de données
- Valider les variables d'environnement

### **🐛 Pour le debugging :**
- Utiliser `ToolCallPersistenceService.ts` pour tracer les tool calls
- Consulter `ChatHistoryCleaner.ts` pour les problèmes d'historique
- Vérifier les logs dans `logger.ts`

---

**Cette liste couvre l'ensemble du système de tool calls et d'injection dans l'historique du LLM du projet Abrège. 🎉** 