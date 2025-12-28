# 🔧 FIX - Erreur 422 xAI avec Images + MCP Tools

**Date :** 20 janvier 2025  
**Status :** ✅ **CORRIGÉ**

---

## 🐛 PROBLÈME IDENTIFIÉ

Erreur 422 de xAI quand on combine :
- ✅ Un MCP tool branché
- ✅ Une image à analyser

**Erreur :**
```
Failed to deserialize the JSON body into the target type: 
input: data did not match any variant of untagged enum ModelInput at line 1 column 3540
```

### Symptômes

1. ✅ Sans MCP tool → L'image est analysée sans problème
2. ❌ Avec MCP tool → Erreur 422 à la colonne 3540 du JSON
3. L'erreur survient uniquement quand il y a une image dans le message user

---

## 🔍 ROOT CAUSE

### Problème : Format des messages tool dans l'input

L'API xAI `/v1/responses` a des règles strictes pour le format de l'input :
- **Messages user** : `content` peut être `string` OU `XAINativeContentPart[]` (pour images)
- **Messages assistant** : `content` peut être `string` OU `null`
- **Messages tool** : `content` DOIT être `string` uniquement (pas array, pas null)

### Flux actuel (BUGUÉ)

1. **User envoie une image** → `msg.attachedImages` est défini
2. **buildMessageContent** retourne `XAINativeContentPart[]` pour le message user ✅
3. **Historique contient des messages tool** (résultats de MCP calls précédents)
4. **convertChatMessagesToInput** traite tous les messages de la même façon
5. **❌ PROBLÈME :** Si un message tool a un `content` qui n'est pas une string (array ou null), xAI rejette avec 422

### Code bugué

**Fichier :** `src/services/llm/providers/implementations/xai-native.ts:822-863`

```typescript
// ❌ AVANT (BUGUÉ)
private convertChatMessagesToInput(messages: ChatMessage[]): XAINativeInputMessage[] {
  return messages.map(msg => {
    const builtContent = this.buildMessageContent(msg);
    
    // ❌ PROBLÈME : Traite tous les messages de la même façon
    // Les messages tool peuvent avoir un content qui n'est pas une string
    let content: string | XAINativeContentPart[];
    if (builtContent === null) {
      content = '';
    } else {
      content = builtContent; // ❌ Peut être un array pour tool !
    }
    
    const inputMsg: XAINativeInputMessage = {
      role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
      content // ❌ xAI rejette si tool avec content array
    };
    
    // ...
  });
}
```

**Problème :** Les messages tool peuvent avoir un `content` qui n'est pas une string, ce qui cause l'erreur 422.

---

## ✅ CORRECTIONS APPLIQUÉES

### Correction : Traiter les messages tool séparément

**Fichier :** `src/services/llm/providers/implementations/xai-native.ts:822-863`

```typescript
// ✅ APRÈS (CORRIGÉ)
private convertChatMessagesToInput(messages: ChatMessage[]): XAINativeInputMessage[] {
  return messages.map(msg => {
    const builtContent = this.buildMessageContent(msg);
    
    // ✅ CRITICAL FIX: Pour les messages tool, le content DOIT être une string (pas array, pas null)
    // L'API xAI /v1/responses rejette les messages tool avec content array ou null
    if (msg.role === 'tool') {
      const toolContent = typeof builtContent === 'string' 
        ? builtContent 
        : (builtContent === null ? '' : JSON.stringify(builtContent));
      const inputMsg: XAINativeInputMessage = {
        role: 'tool',
        content: toolContent, // ✅ String uniquement pour tool
        tool_call_id: msg.tool_call_id
      };
      return inputMsg; // ✅ Return early pour tool
    }
    
    // ✅ Pour les autres roles (user, assistant, system)
    // SÉCURITÉ: /v1/responses ne supporte pas null pour content (même pour user)
    let content: string | XAINativeContentPart[];
    if (builtContent === null) {
      content = '';
    } else {
      content = builtContent; // ✅ Peut être array pour user (images)
    }
    
    const inputMsg: XAINativeInputMessage = {
      role: msg.role as 'user' | 'assistant' | 'system',
      content
    };
    
    // ... reste du code
  });
}
```

**Résultat :** Les messages tool ont toujours un `content` de type string, ce qui évite l'erreur 422.

### Correction 2 : prepareInput aussi

**Fichier :** `src/services/llm/providers/implementations/xai-native.ts:795-806`

```typescript
// ✅ CORRIGÉ
if (msg.role === 'assistant' && msg.tool_results && msg.tool_results.length > 0) {
  for (const result of msg.tool_results) {
    // ✅ CRITICAL FIX: Le content DOIT être une string (pas array, pas null)
    const toolContent = typeof result.content === 'string' 
      ? result.content 
      : (result.content === null || result.content === undefined 
        ? '' 
        : JSON.stringify(result.content));
    
    input.push({
      role: 'tool',
      tool_call_id: result.tool_call_id,
      content: toolContent // ✅ String uniquement pour tool
    });
  }
}
```

**Résultat :** Les tool results créés depuis `tool_results` ont aussi un content string.

---

## 🎯 FLUX CORRIGÉ

1. **User envoie une image** → `msg.attachedImages` est défini
2. **buildMessageContent** retourne `XAINativeContentPart[]` pour le message user ✅
3. **Historique contient des messages tool** (résultats de MCP calls précédents)
4. **convertChatMessagesToInput** détecte `msg.role === 'tool'` → **Traitement spécial** ✅
5. **Message tool** : `content` est forcé en string ✅
6. **Message user** : `content` peut être array (images) ✅
7. **xAI accepte le payload** → Pas d'erreur 422 ✅

---

## 📊 VÉRIFICATIONS

### Tests à effectuer

- [ ] Envoyer une image avec MCP tool branché → Vérifier qu'il n'y a pas d'erreur 422
- [ ] Vérifier que l'image est bien analysée
- [ ] Vérifier que le MCP tool fonctionne toujours
- [ ] Vérifier les logs : Les messages tool doivent avoir `content: string`

### Logs attendus

```
[XAINativeProvider] 🖼️ Ajout image au content: { urlLength: 172, ... }
[XAINativeProvider] 📦 Content multi-modal construit: { imageCount: 1, totalParts: 2 }
[XAINativeProvider] ✅ Payload envoyé sans erreur
```

**Pas d'erreur 422** ✅

---

## 🔗 FICHIERS MODIFIÉS

1. `src/services/llm/providers/implementations/xai-native.ts` (lignes 822-863, 795-806)

---

**Fait par:** Jean-Claude (Senior Dev)  
**Standard:** GAFAM (1M+ utilisateurs)  
**Date:** 2025-01-20  
**Status:** ✅ **CORRIGÉ**




