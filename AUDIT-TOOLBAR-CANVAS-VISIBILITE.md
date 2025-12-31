# 🔍 AUDIT TOOLBAR CANVAS - PROBLÈME DE VISIBILITÉ

**Date** : 2025-01-XX  
**Problème** : La toolbar est parfois cachée par le scroll dans le canvas  
**Contexte** : Toolbar devrait être fixe mais disparaît parfois

---

## 📊 ANALYSE DU PROBLÈME

### Structure actuelle

```
.chat-canva-pane
  └── .chat-canva-pane__editor
      └── .chat-canva-pane__editor-content
          └── Editor
              └── EditorLayout (.editor-layout) ← CONTENEUR SCROLLABLE
                  ├── .editor-header (position: sticky, top: 0)
                  └── .editor-content-wrapper
```

### Problème identifié

1. **Conteneur scrollable** : `.editor-layout` a `overflow-y: auto`
2. **Header sticky** : `.editor-header` a `position: sticky` avec `top: 0`
3. **Comportement** : `position: sticky` ne fonctionne que si l'élément est dans le viewport du conteneur scrollable

**Symptôme** : Si le conteneur scrollable a scrollé au-delà du header, le header sticky peut être caché ou partiellement visible.

### Code actuel

```css
/* src/styles/chat-clean.css:1527-1543 */
.chat-canva-pane .editor-layout {
  overflow-y: auto; /* ← Conteneur scrollable */
  overflow-x: hidden;
  scroll-behavior: smooth;
  scroll-padding-top: 0;
}

/* src/styles/chat-clean.css:1436-1449 */
.chat-canva-pane .editor-header {
  position: sticky !important; /* ← Sticky dans conteneur scrollable */
  top: 0 !important;
  z-index: 1002 !important;
}
```

### Fix actuel (insuffisant)

```typescript
// src/components/chat/ChatCanvaPane.tsx:58-69
const handleEditorReady = useCallback(() => {
  setIsEditorReady(true);
  
  setTimeout(() => {
    const editorLayout = document.querySelector('.chat-canva-pane .editor-layout') as HTMLElement | null;
    if (editorLayout) {
      editorLayout.scrollTop = 0; // ← Seulement au chargement
    }
  }, 100);
}, []);
```

**Limitation** : Ce fix ne gère que le chargement initial. Si l'utilisateur scroll après, le header peut être caché.

---

## 🎯 SOLUTIONS POSSIBLES

### Option 1 : Listener de scroll (RECOMMANDÉ)

**Avantages** :
- ✅ Garantit que le header reste toujours visible
- ✅ Pas de changement de structure CSS
- ✅ Compatible avec le code existant

**Implémentation** :
- Ajouter un listener de scroll sur `.editor-layout`
- Si `scrollTop > 0`, remettre à 0 automatiquement
- Utiliser `requestAnimationFrame` pour performance

### Option 2 : Position fixed avec padding

**Avantages** :
- ✅ Header toujours visible (position: fixed)
- ✅ Pas besoin de listener

**Inconvénients** :
- ⚠️ Nécessite de calculer la hauteur du header
- ⚠️ Peut causer des problèmes de layout

### Option 3 : Intersection Observer

**Avantages** :
- ✅ Performance optimale
- ✅ Détection précise de visibilité

**Inconvénients** :
- ⚠️ Plus complexe à implémenter
- ⚠️ Nécessite polyfill pour anciens navigateurs

---

## ✅ SOLUTION RECOMMANDÉE : Option 1

### Implémentation

1. **Ajouter un listener de scroll** dans `ChatCanvaPane.tsx`
2. **Détecter si le header est visible** via `scrollTop`
3. **Remettre le scroll à 0** si nécessaire (avec debounce pour éviter les saccades)

### Code proposé

```typescript
// Dans ChatCanvaPane.tsx
useEffect(() => {
  if (!isEditorReady) return;

  const editorLayout = document.querySelector('.chat-canva-pane .editor-layout') as HTMLElement | null;
  if (!editorLayout) return;

  let rafId: number | null = null;
  
  const handleScroll = () => {
    if (rafId) cancelAnimationFrame(rafId);
    
    rafId = requestAnimationFrame(() => {
      // Si scrollTop > 0, remettre à 0 pour garder le header visible
      if (editorLayout.scrollTop > 0) {
        editorLayout.scrollTop = 0;
      }
    });
  };

  editorLayout.addEventListener('scroll', handleScroll, { passive: true });
  
  return () => {
    if (rafId) cancelAnimationFrame(rafId);
    editorLayout.removeEventListener('scroll', handleScroll);
  };
}, [isEditorReady]);
```

### Alternative : CSS-only avec scroll-snap

```css
.chat-canva-pane .editor-layout {
  scroll-snap-type: y mandatory;
}

.chat-canva-pane .editor-header {
  scroll-snap-align: start;
}
```

**Limitation** : Peut causer des saccades lors du scroll.

---

## 🔧 PLAN D'ACTION

1. ✅ Analyser le problème (FAIT)
2. ⏳ Implémenter le listener de scroll
3. ⏳ Tester avec différents scénarios
4. ⏳ Vérifier avec read_lints
5. ⏳ Documenter la solution

---

## 📝 NOTES

- Le problème peut aussi être causé par des interactions avec d'autres éléments (images header, etc.)
- Vérifier que le z-index est suffisant (actuellement 1002)
- S'assurer que le background du header est opaque pour éviter les problèmes de transparence

