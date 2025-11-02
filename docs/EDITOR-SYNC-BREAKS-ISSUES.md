# ⚠️ PROBLÈMES CONNUS - EditorSync & Breaks

> **TL;DR :** EditorSync et `breaks: true` peuvent causer des bugs de curseur et d'effacement. Ce guide explique comment les désactiver rapidement.

---

## 🐛 PROBLÈME 1 : EditorSyncManager

### Symptômes

- **Effacement de caractères** pendant la frappe
- **Curseur qui saute** ou se repositionne
- **Retours à la ligne automatiques** non voulus
- **Performance dégradée** en mode édition

### Cause

`EditorSyncManager` synchronise le store Zustand → éditeur Tiptap en continu pour le realtime.

**Problème :** Quand le store se met à jour (realtime), il appelle `editor.commands.setContent()` qui :
1. Remplace **TOUT** le contenu de l'éditeur
2. Reset le curseur
3. Casse l'undo/redo stack
4. Interfère avec la frappe de l'utilisateur

### Solution

**Désactiver le sync realtime en mode édition** (gardé en readonly uniquement).

**Fichier :** `src/components/editor/EditorCore/EditorSyncManager.tsx`

**Lignes 81-108 :** Commenter le `useEffect` de sync realtime

```tsx
// ⚠️ DÉSACTIVÉ : Sync realtime causait bugs (effacement caractères, retours auto)
// En mode édition, pas de sync du store → éditeur
// Le realtime fonctionne uniquement en readonly
/*
React.useEffect(() => {
  // ... code de sync ...
}, [storeContent, editor, editorState]);
*/
```

**Status actuel :** ✅ Désactivé (2 nov 2025)

---

## 🐛 PROBLÈME 2 : Markdown `breaks: true`

### Symptômes

- **Retours à ligne non voulus** dans paragraphes normaux
- **Comportement inattendu** du curseur
- **Différence édition/readonly** dans le rendu

### Cause

L'extension Markdown Tiptap avec `breaks: true` convertit **tous** les retours simples en `<br>`.

**Utile pour :** Blockquotes multi-lignes (comme dans le chat)
**Problème :** Peut causer des retours partout ailleurs

### Solution

**Désactiver `breaks: true`** si comportement problématique.

**Fichier :** `src/config/editor-extensions.ts`

**Lignes 160 et 230 :** Changer `breaks: true` → `breaks: false`

```tsx
// AVANT (avec breaks)
Markdown.configure({ 
  html: false,
  breaks: true, // ✅ Convertir retours simples en <br>
  transformPastedText: false,
  transformCopiedText: false,
}),

// APRÈS (sans breaks)
Markdown.configure({ 
  html: false,
  breaks: false, // ❌ Désactivé - causait retours non voulus
  transformPastedText: false,
  transformCopiedText: false,
}),
```

**⚠️ Impact :** Les blockquotes multi-lignes s'afficheront différemment en édition vs readonly

**Status actuel :** ✅ Activé (2 nov 2025) - À surveiller

---

## 🐛 PROBLÈME 3 : HardBreak Extension

### Symptômes similaires à `breaks: true`

L'extension HardBreak permet Shift+Enter pour créer des `<br>`.

**Fichier :** `src/config/editor-extensions.ts`

**Lignes 101 et 191 :** Changer `hardBreak: true` → `hardBreak: false`

```tsx
StarterKit.configure({
  hardBreak: false, // ❌ Désactiver si bugs
  // ...
}),
```

**Status actuel :** ✅ Activé (2 nov 2025) - À surveiller

---

## 🎯 RÉSUMÉ - DÉSACTIVATION RAPIDE

**Si bugs de curseur / effacement :**

### 1. Désactiver EditorSync realtime
```tsx
// src/components/editor/EditorCore/EditorSyncManager.tsx
// Ligne 84 : Commenter le useEffect de sync
```

### 2. Désactiver breaks
```tsx
// src/config/editor-extensions.ts
// Lignes 160 + 230 : breaks: false
```

### 3. Désactiver hardBreak
```tsx
// src/config/editor-extensions.ts  
// Lignes 101 + 191 : hardBreak: false
```

---

## 📊 COMPROMIS

| Feature | Avantage | Inconvénient |
|---------|----------|--------------|
| **EditorSync realtime** | Sync multi-onglets en édition | Bugs curseur, effacement |
| **breaks: true** | Blockquotes multi-lignes propres | Retours partout |
| **hardBreak: true** | Shift+Enter = `<br>` | Peut causer bugs |

**Recommandation actuelle (2 nov 2025) :**
- ❌ EditorSync realtime : **DÉSACTIVÉ** (causait bugs confirmés)
- ✅ breaks: true : **ACTIVÉ** (à surveiller)
- ✅ hardBreak: true : **ACTIVÉ** (à surveiller)

---

## 🔍 DEBUG

**Si bugs persistent après désactivation complète :**

1. Vérifier la console pour erreurs
2. Tester avec une note vide
3. Désactiver progressivement d'autres extensions
4. Vérifier les conflits CSS (blockquote styles)

---

**Créé :** 2 novembre 2025  
**Dernière mise à jour :** 2 novembre 2025

