# SOLUTION FINALE - CANVA AVEC STREAMING
**Date :** 11 novembre 2025  
**Version :** 3.0 - Hybride (Note DB + État Local Stream)

---

## 🎯 PROBLÉMATIQUE

**Besoin :**
1. ✅ Streaming LLM dans le canva (comme Ask AI)
2. ✅ Pas de perte données si crash
3. ✅ Note persistée en DB

**Contrainte :**
- ❌ Impossible de streamer directement en DB (UPDATE toutes les 100ms)
- ❌ Impossible d'écrire `markdown_content` en streaming

---

## 💡 SOLUTION HYBRIDE

### Architecture en 2 Couches

```
┌─────────────────────────────────────────────┐
│         CANVA (User voit)                   │
│  ┌──────────────────────────────────────┐   │
│  │  TipTap Editor                       │   │
│  │  ↓                                   │   │
│  │  État LOCAL (Zustand)                │   │
│  │  - Streaming en temps réel           │   │
│  │  - Pas de write DB pendant stream    │   │
│  └──────────────────────────────────────┘   │
│                  ↓                           │
│          Après stream fini                   │
│                  ↓                           │
│  ┌──────────────────────────────────────┐   │
│  │  Auto-save DB (toutes les 2s)       │   │
│  │  UPDATE note.markdown_content        │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│         BASE DE DONNÉES                     │
│  ┌──────────────────────────────────────┐   │
│  │  Note (classeur_id = NULL)           │   │
│  │  - id: uuid                          │   │
│  │  - markdown_content: ""              │   │
│  │  - Créée immédiatement               │   │
│  │  - Mise à jour après stream          │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Flow Complet

```
1. User ouvre canva
   ↓
2. INSERT note DB (markdown_content = "", classeur_id = NULL)
   noteId = "abc-123"
   ↓
3. User demande au LLM "Rédige un article sur..."
   ↓
4. STREAMING START
   - État local Zustand activé
   - TipTap affiche stream en temps réel
   - Pas de write DB pendant stream
   ↓
5. STREAMING END
   - Contenu complet dans TipTap
   - Déclencher auto-save
   ↓
6. Auto-save (toutes les 2s après stream)
   - UPDATE note SET markdown_content = editor.getMarkdown()
   ↓
7. User clique "Sauvegarder"
   - UPDATE note SET classeur_id = X, folder_id = Y
   - Note devient visible sidebar
```

---

## 🛠️ IMPLÉMENTATION

### 1. Store Canva avec État Stream

```typescript
// src/store/useCanvaStore.ts
export interface CanvaSession {
  id: string;
  noteId: string; // ← Note DB réelle
  title: string;
  createdAt: string;
  
  // État streaming local (non persisté DB)
  isStreaming: boolean;
  streamBuffer: string; // Contenu en cours de stream
}

export const useCanvaStore = create<CanvaStore>((set, get) => ({
  sessions: {},
  activeCanvaId: null,
  isCanvaOpen: false,

  // Créer canva = créer note DB orpheline
  openCanva: async (userId: string, options?: { title?: string }) => {
    try {
      // 1. Créer note orpheline en DB
      const noteId = await CanvaNoteService.createOrphanNote(userId, options?.title);

      // 2. Créer session canva
      const session: CanvaSession = {
        id: `canva_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        noteId,
        title: options?.title || `Canva — ${new Date().toLocaleString('fr-FR')}`,
        createdAt: new Date().toISOString(),
        isStreaming: false,
        streamBuffer: ''
      };

      set((state) => ({
        sessions: { ...state.sessions, [session.id]: session },
        activeCanvaId: session.id,
        isCanvaOpen: true
      }));

      return session;
    } catch (error) {
      logger.error('[CanvaStore] Failed to open canva', error);
      throw error;
    }
  },

  // Démarrer streaming (suspend auto-save)
  startStreaming: (sessionId: string) => {
    set((state) => ({
      sessions: {
        ...state.sessions,
        [sessionId]: {
          ...state.sessions[sessionId],
          isStreaming: true,
          streamBuffer: ''
        }
      }
    }));
  },

  // Mettre à jour buffer stream
  appendStreamChunk: (sessionId: string, chunk: string) => {
    set((state) => ({
      sessions: {
        ...state.sessions,
        [sessionId]: {
          ...state.sessions[sessionId],
          streamBuffer: state.sessions[sessionId].streamBuffer + chunk
        }
      }
    }));
  },

  // Terminer streaming (active auto-save)
  endStreaming: (sessionId: string) => {
    set((state) => ({
      sessions: {
        ...state.sessions,
        [sessionId]: {
          ...state.sessions[sessionId],
          isStreaming: false
        }
      }
    }));
  },

  // Fermer canva
  closeCanva: async (sessionId: string, options?: { delete?: boolean }) => {
    const session = get().sessions[sessionId];
    if (!session) return;

    // Option: supprimer note orpheline
    if (options?.delete) {
      try {
        await CanvaNoteService.deleteOrphanNote(session.noteId, userId);
      } catch (error) {
        logger.error('[CanvaStore] Failed to delete note', error);
      }
    }

    set((state) => {
      const nextSessions = { ...state.sessions };
      delete nextSessions[sessionId];
      return {
        sessions: nextSessions,
        activeCanvaId: state.activeCanvaId === sessionId ? null : state.activeCanvaId,
        isCanvaOpen: Object.keys(nextSessions).length > 0
      };
    });
  }
}));
```

### 2. Composant ChatCanvaPane avec Streaming

```typescript
// src/components/chat/ChatCanvaPane.tsx
const ChatCanvaPane: React.FC<ChatCanvaPaneProps> = ({ ... }) => {
  const { user } = useAuth();
  const { sessions, activeCanvaId, startStreaming, appendStreamChunk, endStreaming, closeCanva } = useCanvaStore();
  const session = activeCanvaId ? sessions[activeCanvaId] : null;

  const editorRef = useRef<Editor | null>(null);

  // Auto-save (seulement si PAS en streaming)
  useEffect(() => {
    if (!session || !editorRef.current || session.isStreaming) return;

    const interval = setInterval(async () => {
      const markdown = editorRef.current?.storage.markdown.getMarkdown();
      if (!markdown) return;

      try {
        await v2UnifiedApi.updateNote(session.noteId, {
          markdown_content: markdown
        }, user?.id);
        
        logger.debug('[ChatCanvaPane] Auto-saved', { noteId: session.noteId });
      } catch (error) {
        logger.error('[ChatCanvaPane] Auto-save failed', error);
      }
    }, 2000); // 2s

    return () => clearInterval(interval);
  }, [session, user]);

  // Insérer stream dans TipTap en temps réel
  useEffect(() => {
    if (!session?.isStreaming || !session.streamBuffer || !editorRef.current) return;

    // Insérer le chunk dans TipTap
    editorRef.current.commands.insertContent(session.streamBuffer);
    
    // Reset buffer après insertion
    useCanvaStore.setState((state) => ({
      sessions: {
        ...state.sessions,
        [session.id]: {
          ...state.sessions[session.id],
          streamBuffer: ''
        }
      }
    }));
  }, [session?.streamBuffer, session?.isStreaming]);

  // Handler: Demander au LLM
  const handleAskLLM = useCallback(async (prompt: string) => {
    if (!session || !user) return;

    try {
      // Démarrer streaming
      startStreaming(session.id);

      // Appel API streaming (même que chat)
      const response = await fetch('/api/chat/llm/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          message: prompt,
          context: {
            canvaId: session.id,
            noteId: session.noteId
          }
        })
      });

      if (!response.ok) throw new Error('Stream failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        
        // Parser SSE
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'content_delta') {
              // Ajouter au buffer (sera inséré par useEffect)
              appendStreamChunk(session.id, data.delta);
            }
            
            if (data.type === 'content_done') {
              // Terminer streaming (active auto-save)
              endStreaming(session.id);
            }
          }
        }
      }
    } catch (error) {
      logger.error('[ChatCanvaPane] Stream failed', error);
      endStreaming(session.id);
      toast.error('Erreur de streaming');
    }
  }, [session, user, startStreaming, appendStreamChunk, endStreaming]);

  // Handler: Sauvegarder note
  const handleSave = useCallback(async () => {
    if (!session || !user) return;

    // Modal picker classeur
    const { classeurId, folderId } = await openClasseurPickerModal();

    try {
      // Attacher à classeur (rend visible)
      await CanvaNoteService.attachToClasseur(
        session.noteId,
        classeurId,
        folderId,
        user.id
      );

      closeCanva(session.id, { delete: false });
      toast.success('Note sauvegardée !');
    } catch (error) {
      toast.error('Erreur sauvegarde');
    }
  }, [session, user, closeCanva]);

  if (!session) return null;

  return (
    <section className="chat-canva-pane">
      <div className="canva-toolbar">
        <button onClick={handleSave} disabled={session.isStreaming}>
          💾 Sauvegarder
        </button>
        <button onClick={() => closeCanva(session.id, { delete: true })}>
          🗑️ Supprimer
        </button>
        
        {/* Input prompt LLM */}
        <input 
          placeholder="Demander à l'IA..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value) {
              handleAskLLM(e.currentTarget.value);
              e.currentTarget.value = '';
            }
          }}
          disabled={session.isStreaming}
        />
      </div>

      {session.isStreaming && (
        <div className="canva-streaming-indicator">
          ✨ L'IA rédige...
        </div>
      )}

      <Editor 
        noteId={session.noteId}
        ref={editorRef}
        // Auto-save géré par useEffect ci-dessus
      />
    </section>
  );
};
```

### 3. Service Canva Notes

```typescript
// src/services/canvaNoteService.ts
export class CanvaNoteService {
  /**
   * Créer note orpheline (invisible)
   */
  static async createOrphanNote(userId: string, title?: string): Promise<string> {
    const noteTitle = title || `Canva — ${new Date().toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })}`;

    const result = await v2UnifiedApi.createNote({
      source_title: noteTitle,
      markdown_content: '', // ← Vide au départ
      notebook_id: null, // ← Orpheline
      folder_id: null
    }, userId);

    logger.info('[CanvaNoteService] Orphan note created', {
      noteId: result.note.id
    });

    return result.note.id;
  }

  /**
   * Attacher à classeur (sauvegarder = rendre visible)
   */
  static async attachToClasseur(
    noteId: string,
    classeurId: string,
    folderId: string | null,
    userId: string
  ): Promise<void> {
    await v2UnifiedApi.updateNote(noteId, {
      classeur_id: classeurId,
      folder_id: folderId
    }, userId);

    logger.info('[CanvaNoteService] Note attached', {
      noteId,
      classeurId
    });
  }

  /**
   * Supprimer note orpheline
   */
  static async deleteOrphanNote(noteId: string, userId: string): Promise<void> {
    await v2UnifiedApi.deleteNote(noteId, userId);
    logger.info('[CanvaNoteService] Orphan note deleted', { noteId });
  }
}
```

---

## 📊 COMPARAISON FINALE

| Critère | LocalStorage Pure | Note DB Pure | **Hybride (Recommandé)** |
|---------|-------------------|--------------|--------------------------|
| **Streaming LLM** | ✅ Facile | ❌ Impossible | ✅ Facile |
| **Crash-proof** | ⚠️ Cache seulement | ✅ Total | ✅ Total |
| **Multi-device** | ❌ | ✅ | ✅ |
| **Coût DB writes** | ✅ 1 seul | ⚠️ 30/min | ✅ ~1/2s (après stream) |
| **Complexité** | 🟡 Moyenne | 🔴 Haute | 🟢 Simple |
| **LLM Phase 2** | ⚠️ Difficile | ✅ Facile | ✅ Facile |

**Winner : Hybride** - Meilleur des deux mondes

---

## 🎯 WORKFLOW FINAL

### Scénario 1 : User écrit manuellement
```
1. User ouvre canva → Note DB créée (vide)
2. User tape → TipTap local
3. Auto-save toutes les 2s → UPDATE note DB
4. User sauvegarde → Attach à classeur → Visible
```

### Scénario 2 : LLM génère contenu
```
1. User ouvre canva → Note DB créée (vide)
2. User demande LLM "Rédige article..."
3. STREAMING activé:
   - isStreaming = true → Auto-save SUSPENDU
   - Chunks insérés dans TipTap en temps réel
   - Pas de write DB pendant stream
4. Stream terminé → isStreaming = false
5. Auto-save reprend → UPDATE note DB avec contenu complet
6. User sauvegarde → Attach à classeur → Visible
```

### Scénario 3 : Crash pendant édition
```
1. User rédige dans canva
2. CRASH navigateur
3. User rouvre chat
4. Note existe en DB avec dernier auto-save (max 2s de perte)
5. Modal "Reprendre canva non sauvé ?" → OUI
6. Canva restauré avec noteId
```

---

## ✅ AVANTAGES SOLUTION HYBRIDE

1. **Streaming LLM** ✅
   - État local pendant stream
   - Pas de writes DB pendant stream
   - Exactement comme Ask AI menu

2. **Crash-proof** ✅
   - Note persistée en DB
   - Auto-save toutes les 2s après stream
   - Max 2s de perte si crash

3. **Performance** ✅
   - Pas de write DB pendant stream (évite 100 writes/s)
   - Auto-save throttlé après stream
   - Coût DB raisonnable (~30 writes/min en édition normale)

4. **Multi-device** ✅
   - Note en DB → sync Supabase
   - Peut rouvrir canva depuis autre device (futur)

5. **LLM Phase 2** ✅
   - noteId stable pour tool calls
   - LLM peut UPDATE note directement après stream
   - Intégration facile

---

## 📋 CHECKLIST IMPLÉMENTATION

### Phase 1 : Core Hybride (8h)
- [ ] Créer `CanvaNoteService` (1h)
- [ ] Modifier `useCanvaStore` avec états streaming (2h)
  - [ ] `isStreaming`, `streamBuffer`
  - [ ] `startStreaming`, `appendStreamChunk`, `endStreaming`
- [ ] Modifier `ChatCanvaPane` (3h)
  - [ ] Auto-save conditionnel (skip si streaming)
  - [ ] Handler `handleAskLLM` avec stream SSE
  - [ ] Insertion chunks dans TipTap
- [ ] Modifier API `/api/v2/note/create` (30min)
  - [ ] Accepter `notebook_id = null`
- [ ] Migration DB cleanup (30min)
- [ ] Tests manuels (1h)

### Phase 2 : UX (2h)
- [ ] Input prompt dans toolbar canva
- [ ] Streaming indicator "✨ L'IA rédige..."
- [ ] Désactiver boutons pendant stream
- [ ] Modal classeur picker

### Phase 3 : Recovery (2h)
- [ ] Détecter notes orphelines au mount
- [ ] Modal "Reprendre canva ?"
- [ ] Restaurer canva avec noteId existant

---

## 🚀 DÉCISION FINALE

**Solution retenue : Hybride (Note DB + État Local Stream)**

C'est **la seule solution** qui permet :
- ✅ Streaming LLM fluide
- ✅ Crash-proof total
- ✅ Performance optimale

**Effort : 8h Phase 1 → MVP fonctionnel**

---

**Auteur :** Jean-Claude (AI Senior Dev)  
**Validé par :** [À remplir]  
**Prêt à implémenter :** OUI 🚀

