# 🎤 AUDIT WHISPER CHAT - PERFORMANCE

**Date** : 2025-01-XX  
**Objectif** : Identifier pourquoi Whisper est plus lent dans le chat que dans l'éditeur et proposer optimisations

---

## 📊 COMPARAISON ARCHITECTURE

### ✅ ÉDITEUR (INSTANTANÉ)

**Flux** :
```
AudioRecorder → onTranscriptionComplete → EditorToolbar.handleAudioTranscription
→ editor.chain().focus().insertContent(text).run()
```

**Caractéristiques** :
- ✅ Insertion **directe** dans Tiptap (DOM natif, pas React state)
- ✅ **Aucun re-render** React déclenché
- ✅ **Aucun hook** réexécuté
- ✅ Focus + insertion en **1 opération synchrone**
- ✅ Tiptap gère undo/redo automatiquement

**Temps estimé** : < 50ms (insertion DOM pure)

---

### ⚠️ CHAT (PLUS LENT)

**Flux** :
```
AudioRecorder → onTranscriptionComplete → useChatActions.handleTranscriptionComplete
→ setMessage(prev => prev + text) 
→ Re-render ChatInput
→ useTextareaAutoResize (recalcule hauteur)
→ useInputDetection (détecte commandes)
→ useGlobalChatShortcuts (peut réagir)
→ useChatState (met à jour état)
→ Tous les hooks dépendants de `message`
→ Focus textarea avec setTimeout(100ms)
```

**Caractéristiques** :
- ❌ Insertion via **React state** (`setMessage`)
- ❌ **Re-render complet** de ChatInput
- ❌ **Tous les hooks** se réexécutent (15+ hooks)
- ❌ Focus différé avec `setTimeout(100ms)` pour éviter conflits
- ❌ Auto-resize recalcule hauteur (layout thrash possible)

**Temps estimé** : 150-300ms (React render + hooks + layout)

---

## 🔍 BOTTLENECKS IDENTIFIÉS

### 1. **Insertion via React State** (CRITIQUE)

**Fichier** : `src/hooks/useChatActions.ts:172-191`

```typescript
const handleTranscriptionComplete = useCallback((text: string) => {
  setMessage(prev => prev + (prev ? ' ' : '') + text); // ❌ Déclenche re-render
  setAudioError(null);
  
  // Focus différé (100ms) pour éviter conflits
  setTimeout(() => {
    textareaRef.current?.focus();
    textareaRef.current?.setSelectionRange(...);
  }, 100);
}, [textareaRef, setMessage, setAudioError]);
```

**Impact** : 
- Re-render complet de `ChatInput` (400+ lignes)
- Tous les hooks se réexécutent
- Layout recalcule hauteur textarea

**Solution** : Insérer directement dans le DOM, puis synchroniser l'état

---

### 2. **Auto-Resize Recalcul** (MOYEN)

**Fichier** : `src/hooks/useTextareaAutoResize.ts:26-51`

```typescript
useEffect(() => {
  if (textareaRef.current) {
    // Recalcule scrollHeight à chaque changement de `message`
    const scrollHeight = textarea.scrollHeight;
    const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
    // Layout thrash possible
  }
}, [message, textareaRef, minHeight, maxHeight]);
```

**Impact** :
- Layout recalcule hauteur à chaque transcription
- `requestAnimationFrame` ajoute 1 frame de délai (~16ms)

**Solution** : Désactiver auto-resize pendant transcription, ou utiliser `useDeferredValue`

---

### 3. **Command Detection** (FAIBLE)

**Fichier** : `src/hooks/useInputDetection.ts` (appelé via `detectCommands`)

**Impact** :
- Regex sur tout le message à chaque changement
- Peut ouvrir/fermer menus (slash, mention)

**Solution** : Skip detection pendant transcription (pas critique)

---

### 4. **Focus Différé** (MOYEN)

**Fichier** : `src/hooks/useChatActions.ts:179-187`

```typescript
setTimeout(() => {
  textareaRef.current?.focus();
  textareaRef.current?.setSelectionRange(...);
}, 100); // ❌ 100ms de délai artificiel
```

**Impact** :
- 100ms de latence perceptible
- Nécessaire pour éviter conflits avec React render

**Solution** : Focus immédiat si insertion DOM directe

---

## 🚀 OPTIMISATIONS PROPOSÉES

### **OPTION 1 : Insertion DOM Directe (RECOMMANDÉE)**

**Principe** : Comme l'éditeur, insérer directement dans le textarea DOM, puis synchroniser l'état React après.

**Implémentation** :

```typescript
// src/hooks/useChatActions.ts
const handleTranscriptionComplete = useCallback((text: string) => {
  const textarea = textareaRef.current;
  if (!textarea) return;
  
  // ✅ Insertion DOM directe (comme Tiptap)
  const cursorPos = textarea.selectionStart;
  const currentValue = textarea.value;
  const before = currentValue.slice(0, cursorPos);
  const after = currentValue.slice(cursorPos);
  const separator = before && !before.endsWith(' ') ? ' ' : '';
  const newValue = before + separator + text + after;
  
  // Mettre à jour le DOM immédiatement
  textarea.value = newValue;
  const newCursorPos = cursorPos + separator.length + text.length;
  textarea.setSelectionRange(newCursorPos, newCursorPos);
  
  // Focus immédiat
  textarea.focus();
  
  // ✅ Synchroniser l'état React APRÈS (déféré)
  // Utiliser flushSync pour éviter double render
  React.startTransition(() => {
    setMessage(newValue);
    setAudioError(null);
  });
  
  // ✅ Déclencher auto-resize manuellement (évite useEffect)
  if (textarea.scrollHeight > textarea.clientHeight) {
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }
}, [textareaRef, setMessage, setAudioError]);
```

**Gains estimés** :
- ⚡ **-150ms** (pas de re-render immédiat)
- ⚡ **-100ms** (focus immédiat)
- ⚡ **-50ms** (pas de layout thrash)

**Total** : **~300ms gagnés** → Performance proche de l'éditeur

---

### **OPTION 2 : useDeferredValue pour Hooks Lourds**

**Principe** : Différer les recalculs non-critiques pendant la transcription.

**Implémentation** :

```typescript
// src/components/chat/ChatInput.tsx
const deferredMessage = React.useDeferredValue(message);

// Utiliser deferredMessage dans les hooks lourds
const { filteredChatPrompts } = useChatPrompts({
  allPrompts,
  slashQuery: deferredMessage.includes('/') ? slashQuery : '' // Skip si pas de /
});
```

**Gains estimés** :
- ⚡ **-50ms** (hooks lourds différés)

---

### **OPTION 3 : Mémoriser AudioRecorder**

**Principe** : Éviter les re-renders inutiles de `ChatInputToolbar`.

**Implémentation** :

```typescript
// src/components/chat/ChatInputToolbar.tsx
const AudioRecorderMemo = React.memo(AudioRecorder, (prev, next) => {
  // Ne re-render que si props audio changent
  return (
    prev.onTranscriptionComplete === next.onTranscriptionComplete &&
    prev.onError === next.onError &&
    prev.disabled === next.disabled
  );
});
```

**Gains estimés** :
- ⚡ **-20ms** (moins de re-renders toolbar)

---

### **OPTION 4 : Désactiver Auto-Resize Pendant Transcription**

**Principe** : Skip le recalcul de hauteur pendant la transcription (on le fait après).

**Implémentation** :

```typescript
// src/hooks/useTextareaAutoResize.ts
const [isTranscribing, setIsTranscribing] = useState(false);

useEffect(() => {
  if (isTranscribing) return; // Skip pendant transcription
  // ... calcul hauteur normal
}, [message, isTranscribing, ...]);
```

**Gains estimés** :
- ⚡ **-30ms** (pas de layout thrash)

---

## 📈 PLAN D'IMPLÉMENTATION

### **Phase 1 : Insertion DOM Directe (PRIORITÉ HAUTE)**

1. Modifier `handleTranscriptionComplete` dans `useChatActions.ts`
2. Tester insertion directe + focus immédiat
3. Vérifier synchronisation état React (pas de bugs)
4. Mesurer gain de performance

**Estimation** : 1-2h  
**Gain attendu** : **-300ms** (performance proche éditeur)

---

### **Phase 2 : Optimisations Complémentaires**

1. Mémoriser `AudioRecorder`
2. Désactiver auto-resize pendant transcription
3. Utiliser `useDeferredValue` pour hooks lourds

**Estimation** : 1h  
**Gain attendu** : **-100ms** supplémentaires

---

## 🎯 RÉSULTAT ATTENDU

**Avant** : 150-300ms de latence perceptible  
**Après Phase 1** : < 50ms (proche éditeur)  
**Après Phase 2** : < 30ms (quasi-instantané)

---

## ⚠️ RISQUES & MITIGATIONS

### **Risque 1 : Désynchronisation État React**

**Problème** : Si on insère dans le DOM mais que React state n'est pas à jour, bugs possibles.

**Mitigation** :
- Utiliser `React.startTransition` pour synchroniser après
- Vérifier que `textarea.value === message` après chaque opération
- Tests unitaires pour edge cases

---

### **Risque 2 : Conflits avec Autres Hooks**

**Problème** : `useInputDetection`, `useGlobalChatShortcuts` peuvent interférer.

**Mitigation** :
- Skip detection pendant transcription (flag `isTranscribing`)
- Vérifier que focus immédiat ne casse pas les raccourcis

---

### **Risque 3 : Mobile/Touch Devices**

**Problème** : Focus immédiat peut ouvrir le clavier mobile.

**Mitigation** :
- Garder la détection `isTouchDevice` actuelle
- Focus immédiat uniquement sur desktop

---

## ✅ VALIDATION

**Critères de succès** :
- ✅ Latence < 50ms (mesurée avec `performance.now()`)
- ✅ Pas de bugs de synchronisation état
- ✅ Focus immédiat fonctionne
- ✅ Auto-resize toujours correct
- ✅ Tests passent

---

**Status** : 📋 Prêt pour implémentation  
**Priorité** : 🔴 Haute (expérience utilisateur critique)





