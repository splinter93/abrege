# 🔧 PLAN DE REFACTORING - ÉDITEUR

**Objectif** : Réduire `Editor.tsx` de **1,385 lignes → <300 lignes**  
**Impact** : Maintenabilité ✅, Testabilité ✅, Performance ✅

---

## 📊 ÉTAT ACTUEL

```
Editor.tsx (1,385 lignes)
├── 55+ imports
├── 15+ useState
├── 20+ useCallback
├── 10+ useEffect
└── Logique métier + UI + État + Realtime
```

**Problème** : Tout est mélangé, impossible à maintenir.

---

## 🎯 ARCHITECTURE CIBLE

```
src/
├── hooks/
│   └── editor/
│       ├── useEditorState.ts (100 lignes) ✨ NOUVEAU
│       ├── useEditorAppearance.ts (80 lignes) ✨ NOUVEAU
│       ├── useEditorRealtime.ts (60 lignes) ✨ NOUVEAU
│       ├── useEditorCallbacks.ts (100 lignes) ✨ NOUVEAU
│       └── useEditorUI.ts (50 lignes) ✨ NOUVEAU
│
├── contexts/
│   └── EditorContext.tsx (50 lignes) ✨ NOUVEAU
│
└── components/
    └── editor/
        ├── Editor.tsx (<250 lignes) ✅ REFACTORÉ
        ├── EditorToolbar.tsx (déjà existe)
        └── EditorContent.tsx (déjà existe)
```

---

## 📦 DÉCOUPAGE PAR RESPONSABILITÉ

### 1️⃣ **`useEditorState.ts`** - État de la note

**Ce qu'il gère** :
- Récupération de la note depuis le store
- Preprocessing du Markdown (~ → ≈)
- Synchronisation avec le store
- Sauvegarde automatique

```typescript
/**
 * Hook pour la gestion de l'état de la note
 */
export function useEditorState(noteId: string) {
  const note = useFileSystemStore(s => s.notes[noteId]);
  const updateNote = useFileSystemStore(s => s.updateNote);
  
  // Preprocessing Markdown
  const rawContent = note?.markdown_content || '';
  const content = useMemo(() => preprocessMarkdown(rawContent), [rawContent]);
  
  // Sauvegarde debounced
  const debouncedSave = useMemo(() => 
    debounce((updates: NoteUpdate) => {
      updateNote(noteId, updates);
    }, 500)
  , [noteId, updateNote]);
  
  return { 
    note, 
    content, 
    updateNote,
    debouncedSave 
  };
}
```

**Lignes extraites** : ~150 lignes de `Editor.tsx`

---

### 2️⃣ **`useEditorAppearance.ts`** - Apparence visuelle

**Ce qu'il gère** :
- Header image (URL, offset, blur, overlay)
- Titre dans l'image
- Mode A4, Wide mode
- Font family
- Preview mode

```typescript
/**
 * Hook pour la gestion de l'apparence de l'éditeur
 */
export function useEditorAppearance(note: Note | undefined) {
  const [headerImageUrl, setHeaderImageUrl] = useState(note?.header_image);
  const [headerOffset, setHeaderOffset] = useState(note?.header_image_offset ?? 50);
  const [headerBlur, setHeaderBlur] = useState(note?.header_image_blur ?? 0);
  const [headerOverlay, setHeaderOverlay] = useState(note?.header_image_overlay ?? 0);
  const [titleInImage, setTitleInImage] = useState(note?.header_title_in_image ?? false);
  
  const [a4Mode, setA4Mode] = useState(note?.a4_mode ?? false);
  const [fullWidth, setFullWidth] = useState(note?.wide_mode ?? false);
  const [fontFamily, setFontFamily] = useState(note?.font_family ?? 'Inter');
  const [previewMode, setPreviewMode] = useState(false);
  
  // Sync avec la note
  useEffect(() => {
    if (!note) return;
    setHeaderImageUrl(note.header_image);
    setHeaderOffset(note.header_image_offset ?? 50);
    // ... etc
  }, [note]);
  
  return {
    headerImageUrl,
    setHeaderImageUrl,
    headerOffset,
    setHeaderOffset,
    // ... tous les autres
    previewMode,
    setPreviewMode,
  };
}
```

**Lignes extraites** : ~200 lignes de `Editor.tsx`

---

### 3️⃣ **`useEditorRealtime.ts`** - Collaboration temps réel

**Ce qu'il gère** :
- Connexion realtime Supabase
- Synchronisation avec autres utilisateurs
- Gestion des conflits

```typescript
/**
 * Hook pour la gestion du realtime
 */
export function useEditorRealtime(noteId: string, userId: string) {
  const realtime = useRealtime({
    userId,
    noteId,
    debug: false,
    onEvent: (event) => {
      // Traité par le dispatcher global
    },
    onStateChange: (state) => {
      console.log('Realtime state:', state);
    },
  });
  
  return realtime;
}
```

**Lignes extraites** : ~50 lignes de `Editor.tsx`

---

### 4️⃣ **`useEditorCallbacks.ts`** - Callbacks et événements

**Ce qu'il gère** :
- `onUpdate` de l'éditeur
- Sauvegarde du titre
- Upload d'images
- Gestion du header
- Sharing settings

```typescript
/**
 * Hook pour tous les callbacks de l'éditeur
 */
export function useEditorCallbacks(
  editor: Editor | null,
  noteId: string,
  debouncedSave: (updates: NoteUpdate) => void
) {
  // Callback quand l'éditeur est mis à jour
  const handleEditorUpdate = useCallback(({ editor }: { editor: Editor }) => {
    if (!editor) return;
    
    const md = editor.storage?.markdown?.getMarkdown?.();
    if (md) {
      // Nettoyer le preprocessing avant sauvegarde
      const cleaned = cleanEscapedMarkdown(md);
      debouncedSave({ markdown_content: cleaned });
    }
  }, [debouncedSave]);
  
  // Callback pour le titre
  const handleTitleChange = useCallback((newTitle: string) => {
    debouncedSave({ source_title: newTitle });
  }, [debouncedSave]);
  
  // Callback pour le header
  const handleHeaderChange = useCallback(async (url: string | null) => {
    // ... logique upload
    debouncedSave({ header_image: url });
  }, [debouncedSave]);
  
  // ... autres callbacks
  
  return {
    handleEditorUpdate,
    handleTitleChange,
    handleHeaderChange,
    // ... tous les callbacks
  };
}
```

**Lignes extraites** : ~300 lignes de `Editor.tsx`

---

### 5️⃣ **`useEditorUI.ts`** - État UI (menus, modals)

**Ce qu'il gère** :
- Kebab menu (position, ouvert/fermé)
- Image menu (ouvert/fermé)
- Context menu (position, type)
- Slash menu (référence)

```typescript
/**
 * Hook pour la gestion de l'UI de l'éditeur
 */
export function useEditorUI() {
  const [kebabOpen, setKebabOpen] = useState(false);
  const kebabBtnRef = useRef<HTMLButtonElement | null>(null);
  const [kebabPos, setKebabPos] = useState({ top: 0, left: 0 });
  
  const [imageMenuOpen, setImageMenuOpen] = useState(false);
  const [imageMenuTarget, setImageMenuTarget] = useState<'header' | 'content'>('header');
  
  const [contextMenu, setContextMenu] = useState({
    isOpen: false,
    position: { x: 0, y: 0 },
    nodeType: 'paragraph',
    hasSelection: false,
    nodePosition: 0,
  });
  
  const slashMenuRef = useRef<EditorSlashMenuHandle>(null);
  
  return {
    kebabOpen,
    setKebabOpen,
    kebabBtnRef,
    kebabPos,
    setKebabPos,
    imageMenuOpen,
    setImageMenuOpen,
    imageMenuTarget,
    setImageMenuTarget,
    contextMenu,
    setContextMenu,
    slashMenuRef,
  };
}
```

**Lignes extraites** : ~100 lignes de `Editor.tsx`

---

### 6️⃣ **`EditorContext.tsx`** - Contexte global

**Ce qu'il fournit** :
- Accès à l'éditeur Tiptap
- Tous les hooks ci-dessus
- Méthodes utilitaires

```typescript
/**
 * Contexte partagé pour l'éditeur
 */
interface EditorContextValue {
  editor: Editor | null;
  note: Note | undefined;
  state: ReturnType<typeof useEditorState>;
  appearance: ReturnType<typeof useEditorAppearance>;
  callbacks: ReturnType<typeof useEditorCallbacks>;
  ui: ReturnType<typeof useEditorUI>;
  realtime: ReturnType<typeof useEditorRealtime>;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ 
  noteId, 
  userId, 
  readonly, 
  children 
}: EditorProviderProps) {
  const state = useEditorState(noteId);
  const appearance = useEditorAppearance(state.note);
  const ui = useEditorUI();
  const realtime = useEditorRealtime(noteId, userId);
  const callbacks = useEditorCallbacks(editor, noteId, state.debouncedSave);
  
  const editor = useEditor({
    extensions: createEditorExtensions(PRODUCTION_EXTENSIONS_CONFIG, lowlight),
    content: state.content,
    editable: !readonly && !appearance.previewMode,
    onUpdate: callbacks.handleEditorUpdate,
  });
  
  const value = {
    editor,
    note: state.note,
    state,
    appearance,
    callbacks,
    ui,
    realtime,
  };
  
  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditorContext() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditorContext must be used within EditorProvider');
  return ctx;
}
```

**Lignes extraites** : ~50 lignes de `Editor.tsx`

---

### 7️⃣ **`Editor.tsx` refactoré** - Orchestration

**Ce qu'il fait** :
- Rendu de la structure HTML
- Composition des sous-composants
- Gestion du layout
- **C'est tout !**

```typescript
/**
 * Composant principal de l'éditeur (refactoré)
 */
const Editor: React.FC<EditorProps> = ({ noteId, readonly = false, userId: propUserId }) => {
  const { user } = useAuth();
  const userId = propUserId || user?.id || 'anonymous';
  
  return (
    <EditorProvider noteId={noteId} userId={userId} readonly={readonly}>
      <EditorInner readonly={readonly} />
    </EditorProvider>
  );
};

/**
 * Composant interne avec accès au contexte
 */
const EditorInner: React.FC<{ readonly: boolean }> = ({ readonly }) => {
  const { editor, note, state, appearance, callbacks, ui, realtime } = useEditorContext();
  
  const isReadonly = readonly || appearance.previewMode;
  
  // Hooks de gestion (déjà externalisés)
  useFontManager(appearance.fontFamily, editor);
  useWideModeManager(appearance.fullWidth, editor);
  
  if (!note) {
    return <div>Note non trouvée</div>;
  }
  
  return (
    <EditorLayout
      wide={appearance.fullWidth}
      a4={appearance.a4Mode}
      font={appearance.fontFamily}
    >
      <EditorHeader>
        <EditorHeaderImage
          url={appearance.headerImageUrl}
          offset={appearance.headerOffset}
          blur={appearance.headerBlur}
          overlay={appearance.headerOverlay}
          onOffsetChange={(val) => callbacks.handleHeaderChange(val)}
        />
        <EditorTitle
          value={note.source_title || ''}
          onChange={callbacks.handleTitleChange}
          readonly={isReadonly}
          inImage={appearance.titleInImage}
        />
      </EditorHeader>
      
      <EditorContent>
        {!isReadonly && <ModernToolbar editor={editor} />}
        <TiptapEditorContent editor={editor} />
        <FloatingMenuNotion editor={editor} />
      </EditorContent>
      
      {/* Menus conditionnels */}
      {ui.kebabOpen && (
        <EditorKebabMenu
          position={ui.kebabPos}
          onClose={() => ui.setKebabOpen(false)}
          {...appearance}
        />
      )}
      
      {ui.imageMenuOpen && (
        <ImageMenu
          onClose={() => ui.setImageMenuOpen(false)}
          onSelect={callbacks.handleImageUpload}
        />
      )}
      
      {ui.contextMenu.isOpen && (
        <ContextMenu
          position={ui.contextMenu.position}
          onClose={() => ui.setContextMenu({ ...ui.contextMenu, isOpen: false })}
        />
      )}
      
      {/* Realtime status */}
      <RealtimeStatus connected={realtime.connected} />
    </EditorLayout>
  );
};
```

**Lignes finales** : **~200 lignes** (au lieu de 1,385 !)

---

## 🚀 MIGRATION EN 3 ÉTAPES

### ÉTAPE 1 : Créer les hooks (1-2h)
```bash
# Créer la structure
mkdir -p src/hooks/editor
touch src/hooks/editor/useEditorState.ts
touch src/hooks/editor/useEditorAppearance.ts
touch src/hooks/editor/useEditorRealtime.ts
touch src/hooks/editor/useEditorCallbacks.ts
touch src/hooks/editor/useEditorUI.ts
```

### ÉTAPE 2 : Créer le contexte (30 min)
```bash
mkdir -p src/contexts
touch src/contexts/EditorContext.tsx
```

### ÉTAPE 3 : Refacto Editor.tsx (1h)
- Supprimer le code migré vers les hooks
- Intégrer le contexte
- Simplifier le JSX
- Tester

---

## ✅ BÉNÉFICES

| Avant | Après |
|-------|-------|
| 1,385 lignes | <250 lignes |
| 15+ useState | 0 useState (dans le composant) |
| Impossible à tester | Hooks testables unitairement |
| Complexité : ⚠️⚠️⚠️ | Complexité : ✅ |
| Maintenance : 😰 | Maintenance : 😊 |

---

## 🧪 TESTABILITÉ

**Avant** : Impossible de tester `Editor.tsx` sans monter tout le DOM

**Après** : Chaque hook est testable indépendamment

```typescript
// useEditorState.test.ts
describe('useEditorState', () => {
  it('should preprocess markdown', () => {
    const { result } = renderHook(() => useEditorState('note-123'));
    expect(result.current.content).not.toContain('~');
  });
});

// useEditorAppearance.test.ts
describe('useEditorAppearance', () => {
  it('should sync with note', () => {
    const note = { header_image: 'test.jpg' };
    const { result } = renderHook(() => useEditorAppearance(note));
    expect(result.current.headerImageUrl).toBe('test.jpg');
  });
});
```

---

## 🎯 PRIORITÉ

**URGENT** : Ce refactoring doit être fait **MAINTENANT**.

Plus on attend, plus :
- Le code grossit
- Les bugs s'accumulent
- La dette technique explose

**Temps estimé** : **3-4 heures de dev concentré**  
**Gain** : **Maintenabilité x10** 🚀

---

## 🤔 TU VEUX QUE JE COMMENCE ?

1. ✅ Créer les 5 hooks
2. ✅ Créer le contexte
3. ✅ Refactoriser `Editor.tsx`
4. ✅ Tester que tout fonctionne

Dis-moi et je démarre ! 💪

