# 🔍 Audit - Page Publique - Styles

**Date :** 18 octobre 2025  
**Problème :** Les styles de l'éditeur ne s'appliquent pas correctement sur la page publique

---

## 🎯 Objectif

La page publique doit reprendre **EXACTEMENT** les mêmes styles que l'éditeur :
- ✅ Blocs de code (unified-blocks)
- ✅ Diagrammes Mermaid
- ✅ Checkboxes
- ✅ Tableaux
- ✅ Citations
- ✅ Images
- ✅ Toute la typographie

---

## 📊 Structure Actuelle

### Page Publique
```
.public-note-container
  .noteLayout-content
    .editor-container-width
      .markdown-body
        [CONTENU HTML]
```

### Imports CSS (PublicNoteContent.tsx)
```typescript
import '@/styles/public-note.css';        // Priorité maximale
import '@/styles/typography.css';
import '@/styles/design-system.css';
import '@/styles/markdown.css';
import '@/styles/unified-blocks.css';     // ← Blocs unifiés
import '@/styles/mermaid.css';            // ← Mermaid
import '@/styles/syntax-highlighting.css';
import '@/components/mermaid/MermaidModal.css';
```

---

## 🔍 Problèmes Identifiés

### 1. Spécificité CSS

**Styles unifiés ciblent :**
```css
.markdown-body .u-block { ... }
.ProseMirror .u-block { ... }
```

**Mais sur la page publique, le HTML est :**
```html
<div class="public-note-container">
  <div class="markdown-body">
    <div class="u-block">...</div>
  </div>
</div>
```

**Problème potentiel :** Les règles `.public-note-container .markdown-body .u-block` pourraient nécessiter une spécificité plus élevée.

### 2. Checkboxes

Les checkboxes utilisent maintenant `checkbox-simple-approach.css` qui cible :
```css
.ProseMirror li[data-type="taskItem"] { ... }
.markdown-body li:has(> input[type="checkbox"]) { ... }
```

**Sur la page publique :**
- ✅ `.markdown-body` est présent
- ✅ Les checkboxes devraient fonctionner
- ❓ À vérifier si le sélecteur s'applique correctement

### 3. Blocs de Code

**PublicMarkdownRenderer transforme bien le HTML :**
```typescript
// Ligne 41 : Crée la structure unifiée
container.className = 'u-block u-block--code';
toolbar.className = 'u-block__toolbar';
```

**Donc les classes sont présentes** ✅

**Mais peut-être que les styles ne s'appliquent pas ?**

---

## ✅ Solution : Fichier CSS Spécifique

Créer `/src/styles/public-note-content-fix.css` qui force l'application des styles sur `.public-note-container .markdown-body`.

### Approche 1 : Surcharge Spécifique

```css
/* Force l'application des styles unifiés sur la page publique */
.public-note-container .markdown-body .u-block,
.public-note-container .markdown-body .u-block--code,
.public-note-container .markdown-body .u-block--mermaid {
  /* Hériter de unified-blocks.css */
  background: var(--blk-bg);
  color: var(--blk-fg);
  border-radius: var(--blk-radius);
  margin: 1.75rem 0;
}

.public-note-container .markdown-body .u-block__toolbar {
  /* Hériter de unified-blocks.css */
  height: var(--blk-toolbar-h);
  display: flex;
  justify-content: space-between;
}
```

### Approche 2 : Import Conditionnel

Modifier `unified-blocks.css` pour cibler aussi `.public-note-container .markdown-body` :

```css
.ProseMirror .u-block,
.markdown-body .u-block,
.public-note-container .markdown-body .u-block,
.chat-markdown-content .u-block {
  /* ... */
}
```

**Recommandation :** Approche 2 - Modifier directement les fichiers sources pour unifier le ciblage.

---

## 📝 Plan d'Action

1. **Vérifier sur une vraie page publique** quels éléments ont un problème de style
2. **Inspecter le HTML généré** pour voir si les classes sont bien présentes
3. **Ajouter `.public-note-container .markdown-body` aux sélecteurs** dans :
   - `unified-blocks.css` (blocs de code)
   - `mermaid.css` (diagrammes)
   - `checkbox-simple-approach.css` (checkboxes)
   - `markdown.css` (tableaux, citations, etc.)
4. **Tester tous les types de contenu** :
   - Code blocks avec différents langages
   - Mermaid diagrams
   - Checkboxes
   - Tableaux
   - Images
   - Citations

---

## 🧪 Tests à Effectuer

- [ ] Créer une note avec tous les éléments
- [ ] La partager en public
- [ ] Ouvrir la page publique
- [ ] Vérifier chaque élément :
  - [ ] Bloc de code (toolbar visible ?)
  - [ ] Syntax highlighting (couleurs OK ?)
  - [ ] Bouton copier (fonctionne ?)
  - [ ] Mermaid (rendu correct ?)
  - [ ] Checkboxes (alignées ?)
  - [ ] Tableaux (style OK ?)
  - [ ] Citations (style OK ?)

---

## 📁 Fichiers à Modifier

1. `/src/styles/unified-blocks.css` - Ajouter `.public-note-container .markdown-body`
2. `/src/styles/mermaid.css` - Ajouter `.public-note-container .markdown-body`
3. `/src/styles/checkbox-simple-approach.css` - Vérifier/Ajouter le scope
4. `/src/styles/markdown.css` - Vérifier tous les sélecteurs

---

**Status :** En cours d'investigation

