# 🔥 GALÈRES NOTE EMBED + REACT 18

**Date** : 6 nov 2025  
**Problème** : Implémenter les note embeds Notion-style avec Tiptap + React 18  
**Symptômes** : `flushSync` errors, embeds disparaissent au refresh/preview  
**Durée debug** : ~2h de galère intense  

---

## 🎯 PROBLÈMES RENCONTRÉS

### 1️⃣ **flushSync Error (React 18)**

**Symptôme** :
```
flushSync was called from inside a lifecycle method. 
React cannot flush when React is already rendering.
```

**Cause Root** :
- `ReactNodeViewRenderer` de Tiptap utilise `flushSync` pour rendre les NodeViews
- Quand appelé PENDANT un lifecycle React (useEffect), ça casse tout
- Encore pire avec React 18 StrictMode (double mount)

**Solutions appliquées** :
```typescript
// ✅ 1. Déplacer setContent hors du cycle render
queueMicrotask(() => {
  editor.commands.setContent(processedContent);
});

// ✅ 2. Wrapper les setState dans startTransition
startTransition(() => {
  setNote(metadata);
  setLoading(false);
});

// ✅ 3. NodeViewWrapper avec contentEditable={false}
<NodeViewWrapper contentEditable={false}>

// ✅ 4. Render conditionnel - attendre chargement initial
{isContentReady && <TiptapEditorContent editor={editor} />}
```

---

### 2️⃣ **Embed Disparaît au Refresh**

**Symptôme** :
- User crée `{{embed:xyz}}` → s'affiche ✅
- Sauvegarde → disparaît au refresh ❌

**Cause Root - Chaîne cassée** :
```
DB: {{embed:xyz}}
  ↓
preprocessEmbeds() → <div data-type="note-embed">
  ↓
Tiptap parse HTML → node noteEmbed ✅
  ↓
SAUVEGARDE (PROBLÈME ICI !)
  ↓
tiptap-markdown (html: true) → Sérialise en HTML au lieu d'utiliser serializer custom
  ↓
sanitizeMarkdownContent() → Échappe HTML → &lt;div...&gt; 💥
  ↓
DB: &lt;div data-note-ref=&quot;xyz&quot;&gt; ❌
  ↓
RELOAD → Parse HTML échappé → texte brut → pas de node ❌
```

**Solution** :
```typescript
// ✅ 1. html: true → Nécessaire pour PARSER le HTML de preprocessEmbeds()
Markdown.configure({ 
  html: true, // Parse le HTML
  extensions: [markdownItNoteEmbed],
})

// ✅ 2. addStorage() avec serializer custom
addStorage() {
  return {
    markdown: {
      serialize(state, node) {
        state.write(`{{embed:${node.attrs.noteRef}}}`);
        state.closeBlock(node);
      }
    }
  };
}

// ✅ 3. Protéger {{embed:...}} dans le sanitizer
processed = processed.replace(/(\{\{embed:[^}]+\}\})/g, (match) => {
  protectedBlocks.push(match);
  return `${placeholder}${index}___`;
});
```

---

### 3️⃣ **Contenu Chargé Vide au Mount**

**Symptôme** :
```
hasContent: false, alreadyLoaded: true
```
Impossible de charger le contenu initial !

**Cause** :
1. `storeContent` vide au premier render (fetch DB pas fini)
2. EditorSyncManager charge avec `""` 
3. `hasLoadedInitialContentRef.current = true`
4. Quand le contenu arrive, c'est trop tard (`alreadyLoaded: true`)

**Solution** :
```typescript
// ✅ Reset flag PENDANT le render (pas dans useEffect)
if (lastNoteIdRef.current !== noteId) {
  hasLoadedInitialContentRef.current = false;
  lastNoteIdRef.current = noteId;
}

// ✅ Attendre que le contenu existe
if (!editor || hasLoadedInitialContentRef.current || !storeContent) return;
```

---

### 4️⃣ **Embed Invisible en Preview**

**Symptôme** :
- Mode édition : embed s'affiche ✅
- Mode preview : rien ❌

**Cause** :
En preview : `dangerouslySetInnerHTML={{ __html }}` injecte HTML brut.  
Les `<div data-type="note-embed">` ne sont PAS des composants React → pas de NodeView !

**Solution** :
```typescript
// ✅ Hydrator qui scanne le DOM et remplace les divs par des composants React
<NoteEmbedHydrator containerRef={editorContainerRef} html={html} />

// Dans NoteEmbedHydrator.tsx:
const embedDivs = container.querySelectorAll('div[data-type="note-embed"]');
embedDivs.forEach(div => {
  const wrapper = document.createElement('div');
  div.replaceWith(wrapper);
  
  const root = createRoot(wrapper);
  root.render(<NoteEmbedContent noteRef={noteRef} standalone={true} />);
});
```

⚠️ **Piège** : `useRouter()` ne marche PAS dans `createRoot()` → utiliser `window.location`

---

## 🏗️ ARCHITECTURE FINALE

### **Fichiers créés** :
1. `NoteEmbedExtension.ts` - Extension Tiptap custom
2. `NoteEmbedView.tsx` - React NodeView pour mode édition
3. `NoteEmbedContent.tsx` - Composant partagé (édition + preview)
4. `NoteEmbedHydrator.tsx` - Hydratation DOM → React (preview uniquement)
5. `markdown-it-note-embed.ts` - Parser markdown `{{embed:xyz}}` → HTML
6. `preprocessEmbeds.ts` - Convertir `{{embed:xyz}}` → HTML avant Tiptap
7. `useNoteEmbedMetadata.ts` - Hook pour fetch note avec cache + retry
8. `noteEmbedCacheService.ts` - Cache in-memory (évite fetch multiples)
9. `EmbedDepthContext.tsx` - Prévention récursion infinie (max 3 niveaux)
10. `markdown-it-youtube-embed.ts` - Parser markdown `{{youtube:...}}`
11. `YouTubeEmbedExtension.ts` - Extension Tiptap pour iframes YouTube
12. `YouTubeEmbedView.tsx` - NodeView React (édition)
13. `YouTubeEmbedContent.tsx` - Composant partagé (édition + preview)
14. `youtube-embed.css` - Styles responsives (ratio 16/9, focus states)
15. `utils/youtube.ts` - Extraction d’ID et génération URL embed sécurisée

### **Fichiers modifiés** :
1. `editor-extensions.ts` - Config Markdown (plugins embed) + enregistrement Note/YouTube
2. `EditorSyncManager.tsx` - Chargement async avec queueMicrotask
3. `Editor.tsx` - Render conditionnel avec isContentReady
4. `EditorMainContent.tsx` - Hydrator en mode preview
5. `markdownSanitizer.server.ts` - Protection de {{embed:...}}
6. `preprocessEmbeds.ts` - Conversion `{{youtube:...}}` → `<youtube-embed>`
7. `NoteEmbedHydrator.tsx` - Support hydration `<youtube-embed>`

---

## 🔑 FLUX COMPLET (FONCTIONNEL)

### **MODE ÉDITION**
```
DB → {{embed:xyz}}
  ↓
EditorSyncManager (queueMicrotask)
  ↓
preprocessEmbeds() → <div data-type="note-embed" data-note-ref="xyz">
  ↓
Tiptap parseHTML → node noteEmbed
  ↓
ReactNodeViewRenderer → <NoteEmbedView>
  ↓
useNoteEmbedMetadata (startTransition) → Fetch API
  ↓
Affichage avec skeleton → contenu
  ↓
SAUVEGARDE: addStorage().markdown.serialize() → {{embed:xyz}}
  ↓
sanitizeMarkdownContent (protège {{embed:...}}) → {{embed:xyz}}
  ↓
DB → {{embed:xyz}} ✅ (cycle complet !)
```

### **MODE PREVIEW**
```
DB → {{embed:xyz}}
  ↓
useMarkdownRender → markdown-it avec plugin markdownItNoteEmbed
  ↓
<div data-type="note-embed" data-note-ref="xyz">
  ↓
dangerouslySetInnerHTML → HTML injecté
  ↓
NoteEmbedHydrator (setTimeout 100ms)
  ↓
querySelector → Trouve les divs
  ↓
createRoot() → <NoteEmbedContent standalone={true}>
  ↓
useNoteEmbedMetadata → Fetch API
  ↓
Affichage ✅
```

### **MODE ÉDITION (YouTube)**
```
DB → {{youtube:https://youtu.be/ID}}
  ↓
EditorSyncManager (queueMicrotask)
  ↓
preprocessEmbeds() → <youtube-embed data-video-id="ID">
  ↓
YouTubeEmbedExtension.parseHTML() → node youtubeEmbed
  ↓
ReactNodeViewRenderer → <YouTubeEmbedView>
  ↓
YouTubeEmbedContent → iframe 16/9 + styles (startSeconds optionnel)
  ↓
SAUVEGARDE → serialize() → {{youtube:ID|start=92 (optionnel)}}
  ↓
sanitizeMarkdownContent (protège {{youtube:...}})
  ↓
DB → {{youtube:ID|start=92}} ✅
```

### **MODE PREVIEW (YouTube)**
```
DB → {{youtube:ID}}
  ↓
markdown-it (markdownItYouTubeEmbed) → <youtube-embed data-video-id="ID">
  ↓
dangerouslySetInnerHTML → HTML injecté
  ↓
NoteEmbedHydrator → détecte <youtube-embed>
  ↓
createRoot() → <YouTubeEmbedContent standalone>
  ↓
Iframe responsive (allow autoplay, lazy)
  ↓
Lecture vidéo ✅
```

### **TIMESTAMP YOUTUBE (START)**
```
Input utilisateur → https://youtu.be/ID?t=92
  ↓
parseYouTubeInput() → { videoId: ID, startSeconds: 92 }
  ↓
serialize() → {{youtube:ID|start=92}}
  ↓
preprocessEmbeds() → <youtube-embed data-video-id="ID" data-start="92">
  ↓
YouTubeEmbedContent → buildYouTubeEmbedUrl(..., start=92)
  ↓
Iframe démarre à 92s ✅
```

---

## ⚠️ PIÈGES À ÉVITER

### **❌ NE JAMAIS** :
1. Appeler `editor.setContent()` directement dans un useEffect
2. Utiliser `useRouter()` dans un composant rendu avec `createRoot()`
3. Passer `html: false` dans `Markdown.configure()` (casse le parsing HTML)
4. Oublier de protéger `{{embed:...}}` dans le sanitizer
5. Charger le contenu avant que la DB fetch soit terminée

### **✅ TOUJOURS** :
1. Wrapper `setContent()` dans `queueMicrotask()`
2. Wrapper `setState` dans `startTransition()` pour les NodeViews
3. Utiliser `contentEditable={false}` sur les NodeViewWrapper
4. Attendre `storeContent` non-vide avant de charger
5. Hydrater le DOM en preview avec `createRoot()`

---

## 🧪 VÉRIFICATIONS FINALES

### **Mode Édition**
- [ ] Embed s'affiche au chargement
- [ ] Embed persiste au refresh
- [ ] Sauvegarde → DB contient `{{embed:xyz}}`
- [ ] 0 erreur `flushSync` en console

### **Mode Preview**
- [ ] Embed s'affiche en preview
- [ ] Click → Navigation fonctionne
- [ ] Skeleton → contenu s'affiche
- [ ] 0 erreur console

### **YouTube Embed**
- [ ] Insertion via `{{youtube:...}}` ou paste URL → iframe visible
- [ ] Sauvegarde → DB contient `{{youtube:VIDEO_ID}}`
- [ ] Preview hydratée → vidéo lisible + responsive
- [ ] Suppression via handles / backspace fonctionne
- [ ] Timestamp (`?t=` ou `|start=`) → lecture au bon offset

### **Sérialisation**
- [ ] markdown_content : `{{embed:xyz}}` (PAS de HTML)
- [ ] html_content : `<div data-type="note-embed">` (OK)
- [ ] markdown_content : `{{youtube:VIDEO_ID}}`
- [ ] html_content : `<youtube-embed data-video-id="...">`
- [ ] markdown_content : `{{youtube:VIDEO_ID|start=92}}` si timestamp présent
- [ ] html_content : `<youtube-embed data-video-id="..." data-start="92">`

---

## 📦 DÉPENDANCES

- `tiptap-markdown@0.9.0` - Conversion markdown ↔ ProseMirror
- `markdown-it` - Parser markdown côté preview
- React 18 avec `startTransition` API
- Next.js App Router (sans `useRouter` dans les portals)

---

## 🎯 LEÇONS APPRISES

1. **React 18 est STRICT sur flushSync** → Utiliser microtasks et transitions
2. **tiptap-markdown a ses limites** → Comprendre quand il sérialise en HTML vs custom
3. **Hydratation DOM → React nécessite createRoot()** → Pas de hooks Next.js (useRouter)
4. **Timing matters** → Attendre que les données soient prêtes avant de charger
5. **Un bon serializer sauve des vies** → `{{embed:xyz}}` simple et debuggable

---

**MANTRA** : "Si ça casse à 3h du matin avec 10K users, est-ce debuggable rapidement ?"

✅ OUI → Logs clairs, syntaxe simple `{{embed:xyz}}`, flux explicite


---

## 📓 Journal incident — 7 nov 2025

### Situation
- Plusieurs embeds successifs disparaissaient en édition après refresh, mais restaient visibles en preview.
- Drop/drag gérait bien un embed par node, mais le parsing initial confondait les nodes avec les callouts.
- Handles Notion détectaient un seul bloc lorsque les embeds étaient contigus.

### Root causes identifiées
1. **CalloutExtension** interceptait `div[data-type="note-embed"]` → conversion en callout.
2. `NoteEmbedExtension` déclarée d’abord comme node inline → ProseMirror regroupait plusieurs embeds dans le même parent block → handle unique.
3. `ReactNodeViewRenderer.update` ne gardait pas la node en cache → crash `Cannot read properties of undefined (reading 'name')` après reload.
4. Preview HTML produisait des `<div data-type="note-embed">` empilés inline (pas de retour ligne naturel).
5. À l’enregistrement, certains placeholders restaient en `<div ...>` (HTML) au lieu du Markdown attendu `{{embed:xyz}}` → regressions futures probables.

### Correctifs appliqués (7 nov 2025)
| Problème | Fix | Fichier(s) |
| --- | --- | --- |
| Callout hijack | Filtrer `data-type="note-embed"` dans `CalloutExtension.parseHTML()` | `src/extensions/CalloutExtension.ts` |
| Node regroupée | Déclarer `group: 'block'`, `content: ''`, priorité `1000` et custom tag `<note-embed>` | `src/extensions/NoteEmbedExtension.ts` |
| Crash `node.type.name` | Guard dans `ReactNodeViewRenderer({ update })` | `src/extensions/NoteEmbedExtension.ts` |
| flushSync React 18 | Warning console connu (Tiptap appelle `flushSync` lors du switch preview → édition). Documenté comme bruit toléré. | N/A |
| Preview inline | Wrapper block `note-embed-inline-wrapper` + `NoteEmbedContent`/`Hydrator` alignés | `NoteEmbedView.tsx`, `NoteEmbedContent.tsx`, `NoteEmbedHydrator.tsx`, `note-embed-inline.css` |
| Sérialisation fiable | `preprocessEmbeds()` + `markdown-it-note-embed` produisent `<note-embed ...>` (tag unique) puis serializer `{{embed:...}}` | `src/utils/preprocessEmbeds.ts`, `src/extensions/markdown-it-note-embed.ts` |

### Checklist consolidation
1. **Avant de livrer un nouveau node**
   - [ ] Déclarer `priority` suffisante pour précéder Callout/Markdown/StarterKit.
   - [ ] `content: ''`, `atom: true`, `group: 'block'` (si handle indépendant requis).
   - [ ] `parseHTML()` ↔ `renderHTML()` symétriques, idéalement via un tag custom pour éviter collisions (`<note-embed>`).
   - [ ] `ReactNodeViewRenderer` : `stopEvent`, guard `update`, `contentEditable={false}`.
   - [ ] Hook de data (`useNoteEmbedMetadata`) encapsulé dans `startTransition` + cache.

2. **Chargement initial (EditorSyncManager)**
   - [ ] `storeContent` non vide avant `setContent`.
   - [ ] `queueMicrotask` (ou `setTimeout`) pour repousser le `setContent` hors du cycle React.
   - [ ] `preprocessEmbeds()` convertit `{{ }}` → tag custom **avant** `editor.setContent`.

3. **Preview**
   - [ ] `markdown-it` génère le tag custom (pas de fallback HTML). 
   - [ ] Hydrator (`NoteEmbedHydrator`) cible explicitement ce tag.
   - [ ] Si un parent `<p>` ne contient que des embeds → forcer `display:flex; flex-direction:column; gap`.

4. **Sanitizer & sérialisation**
   - [ ] Sanitizer protège `{{embed:...}}` (placeholder) avant escape.
   - [ ] Serializer `addStorage().markdown.serialize()` écrit `{{embed:...|display:inline}}` pour l’inline par défaut.

5. **QA rapide**
   - [ ] Drag depuis sidebar → embed inline.
   - [ ] Paste URL publique → embed inline.
   - [ ] Reload édition → nodes toujours visibles, handles indépendants.
   - [ ] Mode preview (readonly) → placeholders hydratés correctement, navigation `window.location`.

### Lessons learned (suite)
- Toujours isoler les NodeViews avec une balise dédiée pour éviter qu’un autre module Tiptap les attrape.
- Priorité haute indispensable lorsqu’on s’appuie sur `Markdown.configure({ html: true })` + autres plugins.
- Quand React 18 et Tiptap se combinent, assumption “node existe toujours” est fausse → guards systématiques.
- Le warning React 18 `flushSync` est accepté pour l’instant ; se manifeste lors du retour preview → édition et n’impacte ni les handles ni la sauvegarde.
- Documenter les transformations Markdown ↔ HTML ↔ Node : `{{embed}}` ↔ `<note-embed>` ↔ NodeView React.
- Les handles Notion reposent sur le `group`/`atom` : garder en tête pour tout nouveau node bloc.

### ToDo (si nouvelle variante)
- [ ] Ajouter `note-embed-compact` : vérifier spacing + sérialisation `display:compact`.
- [ ] Offrir UI pour basculer `display` (inline ↔ card ↔ compact) via menu contextuel ou slash command.
- [ ] Tests unitaires : sérialisation Tiptap ↔ Markdown + hydratation preview (Jest DOM).
- [ ] Monitoring : logguer anomalies `useNoteEmbedMetadata` (erreurs HTTP).

