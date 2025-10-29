# 🚨 AUDIT CRITIQUE - Régression Tool Calls

**Date** : 29 Octobre 2025  
**Sévérité** : 🔴 BLOCKER  
**Impact** : LLM complètement cassé

---

## 🔍 SYMPTÔMES

### 1. LLM Génère du XML/JSON Brut

```
Je vais réessayer...

<tool_calls>
[{"name": "pexels_search", "arguments": {...}}]
</tool_calls>
```

**Au lieu de** : Tool calls structurés parsés et exécutés

### 2. Historique DB Corrompu

```sql
SELECT content FROM chat_messages WHERE role = 'tool' LIMIT 1;
→ {"type":"tool_result","toolCallId":"fc_...","toolName":"pexels__get",...}
```

**Devrait être** : Le résultat réel du tool (JSON de l'API Pexels)

### 3. Tool Calls Pas Exécutés

- API ne détecte pas les tool_calls
- Rien ne s'exécute
- LLM hallucine

---

## 🐛 ROOT CAUSE IDENTIFIÉ

### Bug #1 : useChatResponse.ts ligne 317 (BEFORE FIX)

```typescript
// ❌ AVANT (cassé)
onToolResult?.(chunk.toolName || '', chunk, chunk.success || false, chunk.toolCallId);
//                                    ^^^^^ 
// Passe l'objet chunk complet { type: 'tool_result', ... }
```

**Conséquence** :
- `handleToolResult` reçoit `chunk` au lieu de `chunk.result`
- `normalizeResult` stringify le chunk complet
- DB contient `{"type":"tool_result",...}` au lieu du vrai résultat

### Bug #2 : Historique Contient JSON Brut

**Messages tool corrompus dans l'historique** :
```javascript
{
  role: 'tool',
  content: '{"type":"tool_result","toolCallId":"...","result":{...}}'
  // Au lieu de : content: '{...résultat Pexels...}'
}
```

**Conséquence** :
- LLM voit du JSON bizarre dans l'historique
- Se confond et génère du XML brut
- Pense qu'il doit formater comme ça

---

## ✅ FIX APPLIQUÉ

### useChatResponse.ts ligne 317

```typescript
// ✅ APRÈS (corrigé)
onToolResult?.(chunk.toolName || '', chunk.result, chunk.success || false, chunk.toolCallId);
//                                    ^^^^^^^^^^^^
// Passe chunk.result (le vrai résultat)
```

---

## 🔧 ACTIONS REQUISES

### 1. Nettoyer la DB (URGENT)

Les messages tool corrompus doivent être supprimés :

```sql
-- Voir les messages tool corrompus
SELECT id, session_id, sequence_number, LEFT(content, 200) 
FROM chat_messages 
WHERE role = 'tool' 
AND content LIKE '{"type":"tool_result"%'
ORDER BY created_at DESC;

-- Option 1: Supprimer ces messages
DELETE FROM chat_messages 
WHERE role = 'tool' 
AND content LIKE '{"type":"tool_result"%';

-- Option 2: Réparer le content (extraire result)
UPDATE chat_messages
SET content = (content::jsonb->>'result')::text
WHERE role = 'tool'
AND content LIKE '{"type":"tool_result"%'
AND content::jsonb ? 'result';
```

### 2. Créer Nouvelle Conversation

Les conversations avec historique corrompu vont continuer à bugger.

**Recommandation** : Créer nouvelle conversation pour tester

### 3. Vérifier Fix

- [ ] Nouveau message avec tool calls
- [ ] Vérifier DB : content = résultat réel (pas JSON wrapper)
- [ ] LLM génère tool_calls structurés (pas XML)
- [ ] Tool calls exécutés
- [ ] Réponse finale correcte

---

## 📊 COMMITS IMPACTÉS

**Introduit par** : Refactoring récent (probablement lors extraction useChatResponse)

**Commits suspects** :
- Aucun commit récent ne modifiait cette ligne
- Bug existait AVANT le refactoring ?
- À vérifier dans l'historique Git

---

## ⚠️ RISQUE PROD

🔴 **CRITIQUE** - Bloque toutes les fonctionnalités avec tool calls

**Impact utilisateur** :
- Tool calls ne fonctionnent plus
- LLM hallucine
- Données corrompues en DB

**Priorité** : 🔴 FIX IMMÉDIAT + HOTFIX

---

## ✅ STATUT

- [x] Bug identifié (ligne 317 useChatResponse)
- [x] Fix appliqué (chunk.result au lieu de chunk)
- [ ] DB nettoyée
- [ ] Tests validation
- [ ] Push et deploy

**NE PAS COMMIT AVANT** :
- Nettoyer DB
- Tester avec nouvelle conversation
- Valider que LLM fonctionne

---

**ATTENTE VALIDATION UTILISATEUR**

