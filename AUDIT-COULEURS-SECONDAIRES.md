# 🔍 AUDIT COULEURS SECONDAIRES

## ❌ PROBLÈMES DÉTECTÉS

### 1. **Code blocks (pages publiques)**
**Fichier**: `src/styles/unified-blocks.css`

```css
/* ❌ LIGNE 238 - Couleur en dur */
.public-note-content-wrapper .markdown-body .hljs {
  color: #a0a0a0;
}

/* ❌ LIGNE 277 - Couleur en dur */
.public-note-content-wrapper .markdown-body .hljs * {
  color: #a0a0a0;
}
```

**Devrait être**: `var(--chat-text-secondary)`

---

### 2. **Sidebar liens (unified sidebar)**
**Fichier**: `src/styles/sidebar-collapsible.css`

```css
/* ❌ LIGNE 233 - Couleur en dur */
.unified-nav-link:hover {
  color: #ffffff !important;
}

/* ❌ LIGNE 243 - Couleur en dur */
.unified-nav-link.active {
  color: #ffffff !important;
}

/* ❌ LIGNE 273, 278 - SVG avec couleur en dur */
.unified-nav-link:hover svg {
  color: #ffffff !important;
}

.unified-nav-link.active svg {
  color: #ffffff !important;
}
```

**Devrait être**: `var(--chat-text-primary)` (car au hover/actif, on utilise la couleur principale)

---

## ✅ ÉLÉMENTS CORRECTS

1. ✅ **Chat input placeholder** : `var(--chat-text-secondary)`
2. ✅ **Sidebar search placeholder** : `var(--chat-text-secondary)`
3. ✅ **Bouton nouvelle note** : `var(--chat-text-secondary)`
4. ✅ **Items sidebar (défaut)** : `var(--chat-text-secondary)`
5. ✅ **Code blocks (chat)** : `var(--blk-fg)` → `var(--chat-text-secondary)`
6. ✅ **Tableaux (th, td)** : `var(--chat-text-secondary)`

---

## 🎯 ACTIONS REQUISES

1. **Remplacer `#a0a0a0`** par `var(--chat-text-secondary)` dans `unified-blocks.css` (code blocks publics)
2. **Remplacer `#ffffff`** par `var(--chat-text-primary)` dans `sidebar-collapsible.css` (hovers/actifs)

