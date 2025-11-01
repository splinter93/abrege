# 🎯 Plan : Refonte Toolbar Éditeur - Style Sobre et Propre

**Date:** 31 octobre 2025  
**Objectif:** Refaire la toolbar complètement from scratch avec style sobre

---

## 📐 Layout Final

```
┌────────────────────────────────────────────────────────────────┐
│ [Logo]    [═══════════ Toolbar ═══════════]    [👁] [⋮] [✕]   │
└────────────────────────────────────────────────────────────────┘
```

**Structure :**
- **Gauche :** Logo Scrivia
- **Centre :** Toolbar de formatting (Bold, Italic, Heading, etc.)
- **Droite :** 3 boutons
  - 👁 Preview
  - ⋮ Kebab menu (à plat)
  - ✕ Fermer

---

## 🎨 Style sobre et propre

**Inspiration :** Notion, Linear, Arc Browser

- **Couleurs :** Gris neutres, pas de couleurs vives (sauf accent orange pour AI)
- **Spacing :** Aéré, pas surchargé
- **Borders :** Subtiles, pas trop marquées
- **Hover :** Transitions douces
- **Icons :** React Icons, taille 16-18px
- **Responsive :** Menu "..." sur mobile pour outils secondaires

---

## 📦 Composants à refaire

### 1. EditorHeader (nouveau)
**Fichier :** `src/components/editor/EditorHeader.tsx`

**Responsabilités :**
- Layout principal (Logo | Toolbar | Actions)
- Gestion du state de la toolbar
- Props pour callbacks (onClose, onPreview, etc.)

**Props :**
```tsx
interface EditorHeaderProps {
  editor: FullEditorInstance | null;
  onClose: () => void;
  onPreview: () => void;
  onMenuClick: () => void;
  readonly?: boolean;
}
```

### 2. EditorToolbar (refonte)
**Fichier :** `src/components/editor/EditorToolbar.tsx`

**Boutons principaux (toujours visibles desktop) :**
- Undo / Redo
- Bold, Italic, Underline
- Heading (dropdown)
- Lists (bullet, numbered)
- Link
- Image
- AI

**Boutons secondaires (menu "..." mobile) :**
- Blockquote
- Code block
- Table
- Color / Highlight
- Align

### 3. EditorHeaderActions (nouveau)
**Fichier :** `src/components/editor/EditorHeaderActions.tsx`

**3 boutons simples :**
- Preview (eye icon)
- Kebab menu (dots horizontal)
- Close (X icon)

---

## 🛠️ Implémentation

### Phase 1 : Nettoyer l'existant

**Supprimer/archiver :**
- `src/components/EditorToolbar.tsx` (ancien)
- `src/components/editor/ModernToolbar.tsx` (actuel)
- Tous les sous-composants de toolbar actuels

**Garder :**
- `src/components/EditorKebabMenu.tsx` (utilisé par HeaderActions)

### Phase 2 : Nouveau CSS minimaliste

**Fichier :** `src/components/editor/editor-header-new.css`

**Variables :**
```css
:root {
  --header-height: 48px;
  --header-padding: 12px 24px;
  --header-bg: var(--surface-1);
  --header-border: var(--border-subtle);
  
  --btn-size: 32px;
  --btn-radius: 6px;
  --btn-gap: 4px;
  
  --toolbar-gap: 8px;
  --toolbar-group-gap: 16px;
}
```

**Structure :**
```css
.editor-header-new {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  height: var(--header-height);
  padding: var(--header-padding);
  background: var(--header-bg);
  border-bottom: 1px solid var(--header-border);
}

.editor-header-logo { }

.editor-header-toolbar-container {
  display: flex;
  justify-content: center;
}

.editor-header-actions {
  display: flex;
  gap: var(--btn-gap);
}
```

### Phase 3 : EditorHeader.tsx

**Structure :**
```tsx
<div className="editor-header-new">
  <div className="editor-header-logo">
    <LogoHeader />
  </div>
  
  <div className="editor-header-toolbar-container">
    <EditorToolbar editor={editor} readonly={readonly} />
  </div>
  
  <div className="editor-header-actions">
    <HeaderButton icon={<FiEye />} onClick={onPreview} tooltip="Preview" />
    <HeaderButton icon={<FiMoreHorizontal />} onClick={onMenuClick} tooltip="Menu" />
    <HeaderButton icon={<FiX />} onClick={onClose} tooltip="Fermer" />
  </div>
</div>
```

### Phase 4 : EditorToolbar.tsx (refonte)

**Structure minimaliste :**
```tsx
<div className="editor-toolbar-new">
  {/* Groupe 1 : History */}
  <ToolbarGroup>
    <ToolbarButton icon={<FiRotateCcw />} onClick={undo} disabled={!canUndo} />
    <ToolbarButton icon={<FiRotateCw />} onClick={redo} disabled={!canRedo} />
  </ToolbarGroup>
  
  <ToolbarDivider />
  
  {/* Groupe 2 : Format */}
  <ToolbarGroup>
    <ToolbarButton icon={<FiBold />} onClick={toggleBold} active={isBold} />
    <ToolbarButton icon={<FiItalic />} onClick={toggleItalic} active={isItalic} />
    <ToolbarButton icon={<FiUnderline />} onClick={toggleUnderline} active={isUnderline} />
  </ToolbarGroup>
  
  <ToolbarDivider />
  
  {/* Groupe 3 : Structure */}
  <ToolbarGroup>
    <HeadingDropdown editor={editor} />
    <ToolbarButton icon={<FiList />} onClick={toggleBulletList} active={isBulletList} />
    <ToolbarButton icon={<FiLayers />} onClick={toggleOrderedList} active={isOrderedList} />
  </ToolbarGroup>
  
  <ToolbarDivider className="desktop-only" />
  
  {/* Groupe 4 : Insert (desktop only sur certains) */}
  <ToolbarGroup className="desktop-only">
    <ToolbarButton icon={<FiLink />} onClick={insertLink} />
    <ToolbarButton icon={<FiImage />} onClick={openImageMenu} />
  </ToolbarGroup>
  
  {/* Bouton AI (toujours visible) */}
  <ToolbarButton icon={<FiZap />} onClick={openAI} className="ai-button" />
  
  {/* Menu overflow mobile */}
  <ToolbarButton 
    icon={<FiMoreVertical />} 
    onClick={toggleMore} 
    className="mobile-only"
  />
</div>
```

### Phase 5 : ToolbarButton (composant atomique)

**Fichier :** `src/components/editor/toolbar/ToolbarButton.tsx`

```tsx
interface ToolbarButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  tooltip?: string;
  className?: string;
}

export const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  icon,
  onClick,
  active = false,
  disabled = false,
  tooltip,
  className = '',
}) => {
  return (
    <Tooltip text={tooltip}>
      <button
        className={`toolbar-btn ${active ? 'active' : ''} ${className}`}
        onClick={onClick}
        disabled={disabled}
      >
        {icon}
      </button>
    </Tooltip>
  );
};
```

### Phase 6 : Responsive

**Breakpoints :**
```css
/* Mobile (≤ 768px) */
@media (max-width: 768px) {
  .editor-header-new {
    padding: 8px 12px;
    height: 44px;
  }
  
  .desktop-only {
    display: none !important;
  }
  
  .mobile-only {
    display: inline-flex !important;
  }
  
  .toolbar-btn {
    width: 28px;
    height: 28px;
  }
  
  .toolbar-group {
    gap: 2px;
  }
}
```

---

## 📁 Structure des fichiers

```
src/components/editor/
├── EditorHeader.tsx (NOUVEAU - header complet)
├── EditorToolbar.tsx (REFONTE - toolbar propre)
├── EditorHeaderActions.tsx (NOUVEAU - 3 boutons droite)
├── toolbar/
│   ├── ToolbarButton.tsx (NOUVEAU)
│   ├── ToolbarGroup.tsx (NOUVEAU)
│   ├── ToolbarDivider.tsx (NOUVEAU)
│   ├── HeadingDropdown.tsx (NOUVEAU)
│   └── ToolbarOverflowMenu.tsx (NOUVEAU)
├── editor-header-new.css (NOUVEAU)
└── editor-toolbar-new.css (NOUVEAU)
```

---

## ✅ Checklist

- [ ] Créer EditorHeader.tsx (layout principal)
- [ ] Créer EditorHeaderActions.tsx (3 boutons droite)
- [ ] Refaire EditorToolbar.tsx (sobre et propre)
- [ ] Créer ToolbarButton.tsx (composant atomique)
- [ ] Créer ToolbarGroup.tsx (grouper boutons)
- [ ] Créer ToolbarDivider.tsx (séparateurs)
- [ ] Créer HeadingDropdown.tsx (dropdown heading)
- [ ] Créer editor-header-new.css (styles grid)
- [ ] Créer editor-toolbar-new.css (styles boutons)
- [ ] Intégrer dans Editor.tsx
- [ ] Supprimer ancien code
- [ ] Tests responsive
- [ ] 0 erreur TypeScript

---

## 🎯 Résultat attendu

**Desktop :**
```
[Logo]  [Undo|Redo | B I U | H1 • ≡ | Link Image | AI]  [👁 ⋮ ✕]
```

**Mobile :**
```
[Logo]  [B I H1 AI ⋮]  [👁 ⋮ ✕]
```

Style sobre, minimaliste, performant, responsive. 🎨

