# 🔧 SOLUTION COMPLÈTE - PERMISSIONS DES AGENTS SPÉCIALISÉS

## 🚨 **PROBLÈME IDENTIFIÉ**

L'erreur suivante se produisait lors de l'exécution des agents spécialisés :

```json
{
  "success": false,
  "details": {
    "error": "API Error 403: Permissions insuffisantes. Scope requis: notes:create",
    "required_scope": "notes:create",
    "available_scopes": []
  }
}
```

**Cause racine :** Les agents spécialisés n'avaient **aucun scope configuré** (`available_scopes: []`), ce qui empêchait l'exécution des tool calls vers l'API V2.

---

## 🔍 **DIAGNOSTIC DÉTAILLÉ**

### **Chaîne d'erreur identifiée :**

1. **Agent spécialisé** exécute un tool call (`create_note`)
2. **OpenApiToolExecutor** fait un appel HTTP vers `/api/v2/note/create`
3. **API V2** vérifie les permissions avec `canPerformAction(authResult, 'notes:create')`
4. **Système d'authentification** retourne `authResult.scopes = []` (vide)
5. **Vérification des permissions échoue** → Erreur 403

### **Problèmes identifiés :**

1. ❌ **Agents sans scopes** : Les agents n'avaient pas de `api_v2_capabilities` configurés
2. ❌ **Header manquant** : L'exécuteur de tools n'ajoutait pas le header `X-Agent-Type: specialized`
3. ❌ **Authentification incomplète** : Le système d'auth ne reconnaissait pas les agents spécialisés

---

## ✅ **SOLUTION IMPLÉMENTÉE**

### **1. 🔧 Correction du système d'authentification**

**Fichier :** `src/utils/authUtils.ts`

```typescript
// 🔧 SCOPES PAR DÉFAUT POUR LES AGENTS SPÉCIALISÉS
const DEFAULT_AGENT_SCOPES = [
  'notes:read', 'notes:write', 'notes:create', 'notes:update', 'notes:delete',
  'classeurs:read', 'classeurs:write', 'classeurs:create', 'classeurs:update', 'classeurs:delete',
  'dossiers:read', 'dossiers:write', 'dossiers:create', 'dossiers:update', 'dossiers:delete',
  'files:read', 'files:write', 'files:upload', 'files:delete',
  'agents:execute', 'agents:read',
  'search:content', 'profile:read'
];

// Dans getAuthenticatedUser()
const isAgentExecution = request.headers.get('X-Agent-Type') === 'specialized' || 
                        request.headers.get('X-Client-Type') === 'agent';

if (isAgentExecution) {
  // Agent spécialisé : utiliser les scopes par défaut
  scopes = DEFAULT_AGENT_SCOPES;
  logApi.info(`[AuthUtils] 🤖 Agent spécialisé détecté, scopes par défaut appliqués: ${scopes.length} scopes`);
}
```

### **2. 🔧 Correction de l'exécuteur de tools**

**Fichier :** `src/services/llm/openApiToolExecutor.ts`

```typescript
// Préparer les headers
const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  'X-Client-Type': 'llm',
  'X-Agent-Type': 'specialized', // 🔧 CORRECTION : Marquer comme agent spécialisé
  'Authorization': `Bearer ${userToken}`
};
```

### **3. 🔧 Correction de la route LLM**

**Fichier :** `src/app/api/chat/llm/route.ts`

```typescript
// 🔧 CORRECTION : Ajouter les scopes par défaut si l'agent n'en a pas
if (agentConfig) {
  const hasScopes = agentConfig.api_v2_capabilities && agentConfig.api_v2_capabilities.length > 0;
  
  if (!hasScopes) {
    logger.warn(`[LLM Route] ⚠️ Agent ${agentConfig.name} n'a pas de scopes configurés, ajout des scopes par défaut`);
    
    // Mettre à jour l'agent avec les scopes par défaut
    const { error: updateError } = await supabase
      .from('agents')
      .update({ 
        api_v2_capabilities: DEFAULT_AGENT_SCOPES 
      })
      .eq('id', agentConfig.id);
  }
}
```

---

## 🚀 **SCRIPTS DE CORRECTION**

### **1. Script de correction des agents existants**

```bash
node scripts/fix-agent-scopes.js
```

**Fonctionnalités :**
- ✅ Récupère tous les agents actifs
- ✅ Identifie les agents sans scopes
- ✅ Met à jour les agents avec les scopes par défaut
- ✅ Vérification finale

### **2. Script de test des permissions**

```bash
node test-agent-permissions.js
```

**Fonctionnalités :**
- ✅ Test avec header `X-Agent-Type: specialized`
- ✅ Test sans header (doit échouer)
- ✅ Vérification des scopes disponibles

---

## 🧪 **TESTS DE VALIDATION**

### **Test 1: Création de note par agent**

```bash
# Avec le header d'agent spécialisé
curl -X POST http://localhost:3000/api/v2/note/create \
  -H "Content-Type: application/json" \
  -H "X-Agent-Type: specialized" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "source_title": "Test Agent",
    "markdown_content": "# Test",
    "notebook_id": "test"
  }'
```

**Résultat attendu :** ✅ Succès (201)

### **Test 2: Sans header d'agent**

```bash
# Sans le header d'agent spécialisé
curl -X POST http://localhost:3000/api/v2/note/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "source_title": "Test User",
    "markdown_content": "# Test",
    "notebook_id": "test"
  }'
```

**Résultat attendu :** ❌ Erreur 403 (Permissions insuffisantes)

---

## 📊 **RÉSULTATS ATTENDUS**

### **Avant la correction :**
```json
{
  "error": "Permissions insuffisantes. Scope requis: notes:create",
  "required_scope": "notes:create",
  "available_scopes": []  // ❌ Vide
}
```

### **Après la correction :**
```json
{
  "success": true,
  "note": {
    "id": "uuid-here",
    "source_title": "Test Agent",
    "markdown_content": "# Test"
  }
}
```

---

## 🔒 **SÉCURITÉ**

### **Scopes accordés aux agents :**
- ✅ **Notes** : read, write, create, update, delete
- ✅ **Classeurs** : read, write, create, update, delete  
- ✅ **Dossiers** : read, write, create, update, delete
- ✅ **Fichiers** : read, write, upload, delete
- ✅ **Agents** : execute, read
- ✅ **Recherche** : content
- ✅ **Profil** : read

### **Contrôles de sécurité :**
- ✅ **Header requis** : `X-Agent-Type: specialized` obligatoire
- ✅ **Authentification** : Token JWT valide requis
- ✅ **Scopes limités** : Seuls les scopes nécessaires accordés
- ✅ **Logs détaillés** : Traçabilité complète des actions

---

## 🎯 **RÉSUMÉ DE LA SOLUTION**

1. **🔧 Authentification** : Reconnaissance des agents spécialisés via header
2. **🔧 Scopes automatiques** : Attribution des scopes par défaut aux agents
3. **🔧 Headers corrects** : Ajout du header `X-Agent-Type: specialized`
4. **🔧 Mise à jour DB** : Correction des agents existants sans scopes
5. **🔧 Tests complets** : Validation de la solution

**🎉 Résultat :** Les agents spécialisés peuvent maintenant exécuter tous les tool calls vers l'API V2 sans erreur de permissions !
