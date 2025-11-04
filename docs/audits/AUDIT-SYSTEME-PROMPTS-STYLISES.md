# 🔍 AUDIT - SYSTÈME PROMPTS STYLISÉS

**Date** : 4 novembre 2025  
**Auditeur** : Jean-Claude (AI Assistant)  
**Standard** : GAFAM - Code pour 1M+ users

---

## 📊 VUE D'ENSEMBLE

### Fonctionnalités Implémentées
✅ Affichage stylisé prompts (`/Nom` en vert)  
✅ Affichage stylisé mentions (`@slug` en orange)  
✅ Suppression atomique (d'un bloc)  
✅ Injection template au backend  
✅ Fix mobile (pas de double texte)

### Fichiers Modifiés
1. `src/hooks/useChatSend.ts` (221 lignes)
2. `src/components/chat/TextareaWithMentions.tsx` (229 lignes)
3. `src/hooks/useMentionDeletion.ts` (153 lignes)
4. `src/hooks/useChatInputHandlers.ts` (180 lignes)
5. `src/hooks/useNoteSelectionWithTextarea.ts` (129 lignes)
6. `src/components/chat/UserMessageText.tsx` (133 lignes)
7. `src/styles/chat-clean.css` (+80 lignes)
8. `src/components/chat/ChatInput.tsx` (1 ligne modifiée)

**Total** : ~1245 lignes touchées, 8 fichiers

---

## ✅ CONFORMITÉ STANDARDS

### TypeScript Strict
✅ **CONFORME**
- Aucun `any` introduit
- Aucun `@ts-ignore` ou `@ts-expect-error`
- Interfaces explicites (`TextPart`, `UseChatSendOptions`)
- Types importés correctement (`EditorPrompt`, `NoteMention`)

### Architecture
✅ **CONFORME**
- Séparation responsabilités respectée
- Hooks < 300 lignes (max 229)
- 1 fichier = 1 responsabilité
- Pas de circular dependencies

### Performance
✅ **CONFORME**
- `useMemo` pour parsing (TextareaWithMentions ligne 69)
- `useCallback` pour handlers (useChatInputHandlers ligne 98)
- Regex compilée une seule fois
- Pas de re-renders inutiles

---

## ⚠️ PROBLÈMES IDENTIFIÉS

### 🟡 MOYEN - Regex Potentiellement Fragile

**Fichier** : `useChatSend.ts` ligne 49

**Code** :
```typescript
const promptRegex = /(\/[A-ZÀ-Ýa-zà-ÿ][^\s@]*(?:\s+[^\s@]+)*?\s*)(?=@|\n|$)/g;
```

**Risques** :
1. **Faux positifs** : Peut matcher des URLs (`https://example.com`)
2. **Edge cases** : `/A` seul matche (1 lettre)
3. **Caractères spéciaux** : `/Nom-avec-tiret` ne matche pas (majuscule requise après)

**Impact** : 🟡 Moyen
- Fonctionnel pour cas normaux
- Peut échouer sur edge cases
- Pas de crash, juste pas de remplacement

**Recommandation** :
```typescript
// Option 1 : Whitelist stricte (utiliser les prompts chargés)
const promptNames = allPrompts.map(p => p.name);
for (const name of promptNames) {
  const pattern = `/${name}`;
  if (message.includes(pattern)) {
    finalMessage = finalMessage.replace(pattern, prompt.template);
  }
}

// Option 2 : Ignorer URLs
const promptRegex = /(?<!https?:)(\/[A-ZÀ-Ýa-zà-ÿ][^\s@]{2,}(?:\s+[^\s@]+)*?\s*)(?=@|\n|$)/g;
```

---

### 🟡 MOYEN - Pas de Validation Template Vide

**Fichier** : `useChatSend.ts` ligne 72-76

**Code** :
```typescript
if (prompt) {
  replacements.push({
    original: match[0],
    template: prompt.prompt_template, // ❌ Peut être vide
    name: promptName
  });
}
```

**Risque** :
Si `prompt_template` est vide ou null → Message envoyé vide

**Impact** : 🟡 Moyen
- Peu probable (templates validés lors création)
- Mais pas de garde-fou

**Recommandation** :
```typescript
if (prompt && prompt.prompt_template && prompt.prompt_template.trim()) {
  replacements.push({
    original: match[0],
    template: prompt.prompt_template,
    name: promptName
  });
} else {
  logger.warn('[useChatSend] ⚠️ Template vide pour prompt:', promptName);
}
```

---

### 🟢 MINEUR - Logs en Dev Mode

**Fichier** : `useChatSend.ts` lignes 53-57, 63-67, 79-90, 99-106

**Code** :
```typescript
logger.dev('[useChatSend] 🔍 Recherche prompts...');
logger.info('[useChatSend] ✨ Prompts remplacés...');
```

**Risque** : Logs excessifs en production

**Impact** : 🟢 Mineur
- `logger.dev()` désactivé en prod normalement
- `logger.info()` OK pour events importants

**Recommandation** :
- ✅ Garder `logger.info()` pour remplacements réussis (metrics)
- ✅ Garder `logger.warn()` pour erreurs
- ⚠️ Réduire `logger.dev()` ou conditionner sur flag DEBUG

---

### 🟢 MINEUR - Pas de Tests

**Impact** : 🟢 Mineur (MVP pragmatique)

**Tests manquants** :
- Remplacement prompts avec edge cases
- Suppression atomique avec curseur à différentes positions
- Parsing regex avec URLs mixées

**Recommandation Phase 2** :
```typescript
describe('[useChatSend] replacePromptsWithTemplates', () => {
  it('should replace prompt with template', () => {
    const message = '/Améliorer lorem';
    const prompts = [{ name: 'Améliorer', prompt_template: 'Améliore : {selection}' }];
    const result = replacePromptsWithTemplates(message, prompts);
    expect(result).toBe('Améliore : {selection}\n\nlorem');
  });
  
  it('should ignore URLs with slashes', () => {
    const message = 'https://example.com/path';
    const result = replacePromptsWithTemplates(message, prompts);
    expect(result).toBe('https://example.com/path'); // Pas de remplacement
  });
});
```

---

## 🔴 PROBLÈMES CRITIQUES

### ❌ AUCUN IDENTIFIÉ

---

## 🎯 ROBUSTESSE GLOBALE

### ✅ Points Forts

1. **TypeScript Strict** ✅
   - Tous les types explicites
   - Pas de any/ts-ignore
   - Interfaces bien définies

2. **Séparation Responsabilités** ✅
   - Parsing : TextareaWithMentions
   - Remplacement : useChatSend
   - Suppression : useMentionDeletion
   - Affichage : UserMessageText

3. **Performance** ✅
   - useMemo pour parsing (recalcul uniquement si value change)
   - useCallback pour handlers (pas de re-render)
   - Regex compilée une fois

4. **Error Handling** ✅
   - Fallback si prompts pas chargés
   - Logs pour debugging
   - Pas de crash sur edge cases

5. **UX** ✅
   - Suppression atomique comme Notion/Slack
   - Fix mobile (pas de double texte)
   - Couleurs distinctives

### ⚠️ Points d'Attention

1. **Regex Edge Cases** 🟡
   - Peut matcher URLs avec slashes
   - Solution : Whitelist des noms de prompts

2. **Template Validation** 🟡
   - Pas de vérification template vide
   - Solution : Guard clause avant push

3. **Tests Manquants** 🟢
   - Acceptable pour MVP
   - À ajouter Phase 2

---

## 📋 CORRECTIONS RECOMMANDÉES

### 🔧 Fix 1 : Whitelist au lieu de Regex (ROBUSTE)

**Fichier** : `src/hooks/useChatSend.ts`

**Problème actuel** :
- Regex peut matcher n'importe quoi qui ressemble à `/Texte`
- Peut créer faux positifs avec URLs

**Solution** :
```typescript
const replacePromptsWithTemplates = useCallback((message: string): string => {
  if (!allPrompts || allPrompts.length === 0) return message;
  
  let finalMessage = message;
  
  // ✅ Parcourir les prompts connus (whitelist)
  for (const prompt of allPrompts) {
    const promptPattern = `/${prompt.name}`;
    
    // Chercher toutes les occurrences
    let index = finalMessage.indexOf(promptPattern);
    while (index !== -1) {
      // Vérifier que c'est bien un prompt isolé (pas dans une URL)
      const charBefore = index > 0 ? finalMessage[index - 1] : ' ';
      const charAfter = finalMessage[index + promptPattern.length];
      
      // Vérifier contexte valide (début de ligne ou espace avant, espace/fin après)
      const isValidContext = 
        (charBefore === ' ' || charBefore === '\n' || index === 0) &&
        (charAfter === ' ' || charAfter === '\n' || charAfter === undefined);
      
      if (isValidContext && prompt.prompt_template?.trim()) {
        // Remplacer ce prompt
        const before = finalMessage.substring(0, index);
        const after = finalMessage.substring(index + promptPattern.length).trimStart(); // Virer espaces
        finalMessage = before + prompt.prompt_template + '\n\n' + after;
        
        logger.info('[useChatSend] ✅ Prompt remplacé:', {
          name: prompt.name,
          templateLength: prompt.prompt_template.length
        });
        
        break; // Une seule occurrence par prompt
      }
      
      index = finalMessage.indexOf(promptPattern, index + 1);
    }
  }
  
  return finalMessage;
}, [allPrompts]);
```

**Avantages** :
- ✅ 100% fiable (whitelist des noms réels)
- ✅ Pas de faux positifs avec URLs
- ✅ Validation template non vide
- ✅ Plus lisible et maintenable

---

### 🔧 Fix 2 : Guard Clause Template Vide

**Ajout simple dans la boucle actuelle** :
```typescript
if (prompt && prompt.prompt_template?.trim()) {
  // OK
} else {
  logger.warn('[useChatSend] Template vide ignoré:', promptName);
  continue;
}
```

---

## 🎯 VERDICT GLOBAL

### Note : **8/10** ✅ Production-Ready avec corrections mineures

**Blockers** : ❌ AUCUN  
**Dette technique** : 🟡 Mineure (regex + validation)  
**Maintenabilité** : ✅ Excellente  
**Performance** : ✅ Optimale  
**Sécurité** : ✅ Pas de risque

---

## 📝 PLAN D'ACTION

### Option 1 : Push tel quel (ACCEPTABLE)
- ✅ Fonctionne pour tous les cas normaux
- ⚠️ Peut avoir edge cases rares
- 🎯 Recommandation : **OK pour MVP**, corriger plus tard

### Option 2 : Corriger maintenant (RECOMMANDÉ)
- 🔧 Remplacer regex par whitelist (5 min)
- 🔧 Ajouter validation template (2 min)
- ✅ Code production-grade immédiat

---

## 🚦 RECOMMANDATION FINALE

**Pour un solo founder avec 1M+ users visés** : Je recommande **Option 2** (corriger maintenant).

**Pourquoi ?**
- Les corrections prennent 10 minutes
- Évitent bugs subtils en prod
- Code plus maintenable
- Respect strict du guide

**Citation du guide** :
> "MAINTENABILITÉ > VÉLOCITÉ  
> 1 semaine propre > 3 jours dette"

---

**Tu veux que j'applique les corrections ou on push tel quel ?**

