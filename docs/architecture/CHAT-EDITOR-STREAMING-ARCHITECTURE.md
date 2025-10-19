# Architecture Chat ↔ Éditeur avec Streaming

**Date:** 19 octobre 2025  
**Statut:** 📋 À implémenter  
**Objectif:** Streaming temps réel du chat vers l'éditeur quand l'utilisateur a la note ouverte

---

## 🎯 Vision

Deux modes d'écriture selon le contexte :

### Mode 1 : API (Sauvegarde directe) - ACTUEL ✅
**Quand :** 
- Outil externe (ChatGPT, MCP, agents)
- Chat Scrivia mais **éditeur fermé**

**Flux :**
```
Agent/Chat → API /note/[ref]/insert-content → markdown_content (DB) → Sauvegarde immédiate
```

**Caractéristiques :**
- ✅ Persiste directement
- ✅ Fonctionne même si l'éditeur n'est pas ouvert
- ❌ Pas de preview
- ❌ Pas de streaming
- ❌ Pas d'annulation facile

### Mode 2 : Streaming Éditeur (Preview + Validation) - À FAIRE ✨
**Quand :**
- Chat Scrivia et **éditeur ouvert** sur la même note

**Flux :**
```
Chat → Détection éditeur ouvert → Stream SSE → TipTap editor.insertContent()
                                                ↓
                                          L'utilisateur voit l'écriture en temps réel
                                                ↓
                                          CMD+S = sauvegarder
                                          CMD+Z = annuler
```

**Caractéristiques :**
- ✅ **Streaming temps réel** (mot par mot)
- ✅ **Preview** avant validation
- ✅ **Annulation facile** (CMD+Z)
- ✅ **UX fluide** (comme Cursor/Claude)
- ❌ Ne persiste pas automatiquement

---

## 🏗️ Architecture Technique

### 1. Détection de l'éditeur ouvert

**Côté client :**
```typescript
// Dans useUIContext ou EditorState
const editorRegistry = new Map<string, {
  editor: Editor,
  noteId: string,
  isActive: boolean
}>();

// Quand l'éditeur se monte
editorRegistry.set(noteId, { editor, noteId, isActive: true });

// Quand l'éditeur se démonte
editorRegistry.delete(noteId);
```

**Côté API Chat :**
```typescript
// Le chat envoie le noteId ciblé
POST /api/chat
{
  message: "Ajoute une section...",
  context: {
    noteId: "12e80fc3-...",
    editorOpen: true  // ← Flag envoyé par le client
  }
}
```

### 2. Streaming SSE (Server-Sent Events)

**Route API streaming :**
```typescript
// /api/chat/stream
export async function POST(request: NextRequest) {
  const { message, context } = await request.json();
  
  // Si l'éditeur est ouvert, stream vers le client
  if (context.editorOpen && context.noteId) {
    return streamToEditor(message, context);
  }
  
  // Sinon, écriture directe en base
  return writeToDatabase(message, context);
}

async function* streamToEditor(message: string, context: Context) {
  const stream = await llmApi.streamCompletion(message);
  
  for await (const chunk of stream) {
    // Envoyer chaque chunk au client
    yield {
      type: 'content_delta',
      delta: chunk.delta,
      noteId: context.noteId
    };
  }
  
  // Signal de fin
  yield {
    type: 'content_done',
    noteId: context.noteId
  };
}
```

**Côté client (Chat) :**
```typescript
// Hook pour consommer le stream
export function useChatStreaming({ noteId }: { noteId: string }) {
  const sendMessageWithStreaming = async (message: string) => {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      body: JSON.stringify({
        message,
        context: {
          noteId,
          editorOpen: editorRegistry.has(noteId)
        }
      })
    });
    
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const data = JSON.parse(chunk);
      
      if (data.type === 'content_delta') {
        // Envoyer au store global ou directement à l'éditeur
        editorRegistry.get(noteId)?.editor.commands.insertContent(data.delta);
      }
    }
  };
  
  return { sendMessageWithStreaming };
}
```

### 3. Insertion dans TipTap

**Dans l'éditeur :**
```typescript
// Écouter les events de streaming
useEffect(() => {
  const handleStreamChunk = (event: CustomEvent) => {
    if (!editor) return;
    
    const { delta, noteId: targetNoteId } = event.detail;
    
    // Vérifier que c'est pour cette note
    if (targetNoteId !== noteId) return;
    
    // Insérer le chunk à la fin du document
    editor.chain()
      .focus('end')
      .insertContent(delta)
      .run();
  };
  
  window.addEventListener('chat:stream', handleStreamChunk);
  return () => window.removeEventListener('chat:stream', handleStreamChunk);
}, [editor, noteId]);
```

### 4. Sauvegarde manuelle

**Comportement actuel conservé :**
- `CMD+S` : Sauvegarde le contenu de l'éditeur
- `CMD+Z` : Annule les dernières modifications
- `handleEditorUpdate` : **Ne sauvegarde pas** si `!editor.isFocused` (comportement actuel OK)

---

## 🎨 UX Visuelle

### Indicateur de streaming
```tsx
{isStreaming && (
  <div className="editor-streaming-indicator">
    <div className="streaming-dot" />
    <span>L'IA écrit...</span>
  </div>
)}
```

### Position d'insertion
```typescript
// Option 1: À la fin du document (défaut)
editor.commands.focus('end').insertContent(delta);

// Option 2: À une section spécifique (si contexte fourni)
const heading = findHeadingBySlug(editor, context.targetSection);
editor.commands.focus(heading.pos).insertContent(delta);

// Option 3: Remplacer la sélection actuelle
editor.commands.deleteSelection().insertContent(delta);
```

---

## 📊 Comparaison des modes

| Critère | Mode API (actuel) | Mode Streaming (à faire) |
|---------|-------------------|-------------------------|
| **Sauvegarde** | Immédiate | Manuelle (CMD+S) |
| **Preview** | ❌ Non | ✅ Oui |
| **Streaming** | ❌ Non | ✅ Oui (temps réel) |
| **Annulation** | ⚠️ Difficile | ✅ Facile (CMD+Z) |
| **UX** | Basique | ✨ Fluide |
| **Use case** | API externe, éditeur fermé | Chat + éditeur ouvert |

---

## 🚀 Plan d'implémentation

### Phase 1 : Détection de l'éditeur
- [ ] Créer un registry global des éditeurs ouverts
- [ ] Hook `useEditorRegistry` pour enregistrer/désenregistrer
- [ ] Ajouter `editorOpen` flag dans le contexte du chat

### Phase 2 : API Streaming
- [ ] Route `/api/chat/stream` avec SSE
- [ ] Logique de routing : stream vs direct DB write
- [ ] Hook `useChatStreaming` côté client

### Phase 3 : Intégration TipTap
- [ ] Event listener pour les chunks de streaming
- [ ] Insertion progressive dans l'éditeur
- [ ] Indicateur visuel de streaming

### Phase 4 : UX Polish
- [ ] Animation d'écriture
- [ ] Indicateur de position d'insertion
- [ ] Bouton "Annuler la génération"
- [ ] Toast "Contenu généré, CMD+S pour sauvegarder"

---

## 🎯 Avantages

### Pour l'utilisateur
- **Feedback immédiat** : Voit l'écriture en temps réel
- **Contrôle total** : Valide ou annule facilement
- **UX moderne** : Comme Cursor, Claude, etc.

### Pour le système
- **Moins d'écritures DB** : Sauvegarde uniquement si validé
- **Meilleure séparation** : API externe vs chat interactif
- **Plus flexible** : Possibilité de modifier pendant le streaming

---

## 📝 Notes

### AskAI Menu (actuel)
Le menu AskAI utilise **déjà** cette approche :
- Écrit dans l'éditeur local
- Pas de sauvegarde auto
- L'utilisateur valide avec CMD+S

Cette architecture généralise ce pattern au chat.

### Compatibilité
Les outils externes (ChatGPT, MCP) continueront d'utiliser l'API directe car :
- Ils n'ont pas accès au registry des éditeurs
- Ils doivent écrire même si l'éditeur est fermé
- Pas besoin de streaming (appels API ponctuels)

---

## 🔮 Évolutions futures

### Collaborative streaming
Si plusieurs utilisateurs ont la même note ouverte :
```typescript
// Broadcast via WebSocket
io.to(`note-${noteId}`).emit('stream_delta', {
  delta: chunk,
  userId: authorId
});
```

### Choix de position
```typescript
// Popup pour choisir où insérer
<StreamTargetSelector
  options={['À la fin', 'Avant cette section', 'Remplacer la sélection']}
  onSelect={(target) => setStreamTarget(target)}
/>
```

### Pause/Resume
```typescript
// Contrôles de streaming
<StreamControls
  onPause={() => pauseStream()}
  onResume={() => resumeStream()}
  onCancel={() => cancelStream()}
/>
```

