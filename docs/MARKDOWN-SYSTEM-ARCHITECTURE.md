# Architecture Système Markdown

**Date :** 2 novembre 2025  
**Version :** 2.0 - Clean & Séparé  
**Status :** Production Ready ✅

---

## Fichiers CSS

### 1. `editor-markdown.css`
**Contextes :** Éditeur + Mode lecture + Page publique  
**Sélecteurs :** `.ProseMirror`, `.markdown-body`

**Variables utilisées :**
- `--editor-font-family-body` (dynamique via useFontManager)
- `--editor-font-family-headings` (dynamique via useFontManager)
- `--editor-body-size`
- `--editor-line-height-base`

**Changement de font :**
```typescript
// src/hooks/useFontManager.ts
document.documentElement.style.setProperty('--editor-font-family-body', fontFamily);
```

---

### 2. `chat-markdown.css`
**Contexte :** Chat uniquement  
**Sélecteur :** `.chat-markdown`

**Variables utilisées :**
- `--font-chat-text` (dynamique via SettingsModal)
- `--font-chat-headings` (dynamique via SettingsModal)
- `--chat-text-primary`, `--chat-text-secondary` (dynamique via palettes)

**Changement de font :**
```typescript
// src/components/chat/SettingsModal.tsx ligne 192
document.documentElement.style.setProperty('--font-chat-base', fontMap[fontValue]);
```

**Changement de couleurs :**
```typescript
// src/components/chat/SettingsModal.tsx ligne 195-216
document.body.style.setProperty('--chat-text-primary', primaryColor, 'important');
document.body.style.setProperty('--chat-text-secondary', secondaryColor, 'important');
```

---

### 3. `unified-blocks.css`
**Contextes :** Tous (éditeur, chat, lecture)  
**Sélecteurs :** `.u-block`, `.u-block--code`, `.u-block--mermaid`

**Responsabilité :** Code blocks et diagrammes Mermaid avec toolbar + boutons

---

### 4. `checkboxes.css`
**Contextes :** Tous (éditeur, chat, lecture)  
**Sélecteurs :** `input[type="checkbox"]`, `.task-list-item`

**Spacing différencié :**
- Chat : `margin-left: 0`, `margin-right: 3px`
- Éditeur : `margin-left: -20px`, `margin-right: 8px`
- Lecture : `margin-left: -20px`, `margin-right: 3px`

---

## Ordre d'Import

### `globals.css` (Chat)
```css
@import '../styles/typography.css';        /* Variables de base */
@import '../styles/tailwind.css';          /* Reset + utilities */
@import '../styles/chat-clean.css';        /* Design system chat */
@import '../styles/chat-markdown.css';     /* Markdown chat */
@import '../styles/unified-blocks.css';    /* Code blocks */
@import '../styles/checkboxes.css';        /* Checkboxes */
```

### `editor-bundle.css` (Éditeur)
```css
@import './typography.css';                /* Variables de base */
@import './editor-markdown.css';           /* Markdown éditeur */
@import './unified-blocks.css';            /* Code blocks */
@import './checkboxes.css';                /* Checkboxes */
```

**Note :** Ordre NON-critique maintenant, chaque fichier cible des sélecteurs distincts.

---

## Règles d'Or

### 1. Un fichier = Un contexte
- Éditeur → `editor-markdown.css`
- Chat → `chat-markdown.css`
- Code blocks → `unified-blocks.css`
- Checkboxes → `checkboxes.css`

### 2. Zéro duplication
Chaque sélecteur CSS existe dans UN SEUL fichier.

### 3. Variables séparées
- Éditeur : `--editor-font-family-*`
- Chat : `--font-chat-*`

### 4. Mêmes styles visuels
Les marges, paddings, couleurs de base sont identiques. Seules les fonts diffèrent.

---

## Modification des Styles

### Pour changer un style éditeur
**Fichier :** `src/styles/editor-markdown.css`

**Exemple :** Changer margin h1
```css
.ProseMirror h1,
.markdown-body h1 {
  margin: 3rem 0 1.5rem 0; /* Modifié */
}
```

### Pour changer un style chat
**Fichier :** `src/styles/chat-markdown.css`

**Exemple :** Changer margin h1
```css
.chat-markdown h1 {
  margin: 2rem 0 1.25rem 0; /* Modifié */
}
```

### Pour changer un style partagé (code blocks, checkboxes)
**Fichiers :** `unified-blocks.css` ou `checkboxes.css`

---

## Debugging

### Fonts ne changent pas dans l'éditeur ?
1. Vérifier `useFontManager` est appelé dans le composant Editor
2. Check console : `[FontManager] 🎯 Body changé: ...`
3. Inspecter `document.documentElement.style.getPropertyValue('--editor-font-family-body')`

### Fonts ne changent pas dans le chat ?
1. Vérifier `SettingsModal.handleFontChange` ligne 180-193
2. Check localStorage : `chat-font-preference`
3. Inspecter `document.documentElement.style.getPropertyValue('--font-chat-base')`

### Couleurs ne changent pas dans le chat ?
1. Vérifier `SettingsModal.handleColorPaletteChange` ligne 195-216
2. Check localStorage : `chat-color-preference`
3. Inspecter `document.body.style.getPropertyValue('--chat-text-primary')`

---

## Tests de Validation

### Mode édition
- [ ] Listes à puces → bullets visibles
- [ ] Checkboxes → margin-left: -20px, spacing 8px
- [ ] Code blocks → toolbar + gradient
- [ ] Font change via dropdown → tout change
- [ ] Tableaux → font correcte

### Mode lecture
- [ ] Identique au mode édition (même font)
- [ ] Listes à puces → bullets visibles
- [ ] Checkboxes → margin-left: -20px, spacing 3px
- [ ] Code blocks → toolbar + gradient

### Chat
- [ ] Listes à puces → bullets visibles
- [ ] Checkboxes → margin-left: 0, spacing 3px
- [ ] Code blocks → toolbar + gradient
- [ ] Font change via SettingsModal → texte change
- [ ] Couleurs changent via palettes
- [ ] Fonts indépendantes de l'éditeur

---

## Maintenance

**Complexité :** ⭐⭐ (Faible)

**Pour ajouter un nouvel élément markdown :**
1. Ajouter dans `editor-markdown.css` pour `.ProseMirror` et `.markdown-body`
2. Copier dans `chat-markdown.css` pour `.chat-markdown`
3. Adapter si spacing/fonts différents

**Temps estimé par modification :** 10-15 min

---

**Dernière mise à jour :** 2 novembre 2025  
**Mainteneur :** Jean-Claude (Senior Dev)

