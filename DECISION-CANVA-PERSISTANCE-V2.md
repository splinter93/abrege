# DÉCISION FINALE - PERSISTANCE CANVA V2
**Date :** 11 novembre 2025  
**Version :** 2.0 - Approche "Note Directe"  
**Status :** DRAFT - À valider

---

## 🎯 NOUVELLE APPROCHE : Créer Note Directe

**Principe :** À l'ouverture du canva, créer immédiatement une note en DB et l'afficher dans l'éditeur.

---

## 📊 COMPARAISON DES 2 VARIANTES

### Variante A : Note dans Classeur Dédié (QuickNotes)
```
Canva ouvert → Créer note DB
              ↓
         classeur_id = "QuickNotes"
         folder_id = "Canva" (dossier auto-créé)
              ↓
    Note VISIBLE dans sidebar QuickNotes > Canva
              ↓
    Auto-save toutes les 2s → UPDATE note
              ↓
    Bouton "Déplacer vers..." → UPDATE classeur_id + folder_id
```

**Avantages :**
- ✅ **Sécurité totale** - Note persistée immédiatement en DB
- ✅ **Traçabilité** - User voit tous ses brouillons dans QuickNotes
- ✅ **Récupération facile** - Crash → Notes restent visibles
- ✅ **Organisation** - Dossier "Canva" = zone de brouillons claire
- ✅ **Multi-device** - Sync automatique via Supabase

**Inconvénients :**
- ⚠️ **Pollution visible** - Sidebar encombrée de brouillons
- ⚠️ **Classeur QuickNotes requis** - Doit exister ou être créé
- ⚠️ **Coût DB** - Write toutes les 2s (+ load Supabase)

**Architecture :**
```typescript
// 1. Créer classeur QuickNotes si inexistant
const quickNotesClasseur = await ensureQuickNotesClasseur(userId);

// 2. Créer dossier Canva si inexistant
const canvaFolder = await ensureCanvaFolder(quickNotesClasseur.id, userId);

// 3. Créer note vierge
const note = await v2UnifiedApi.createNote({
  source_title: 'Canva — Sans titre',
  markdown_content: '',
  notebook_id: quickNotesClasseur.id,
  folder_id: canvaFolder.id
}, userId);

// 4. Afficher dans Editor
<Editor noteId={note.id} />

// 5. Auto-save
useEffect(() => {
  const interval = setInterval(() => {
    v2UnifiedApi.updateNote(note.id, {
      markdown_content: editor.getMarkdown(),
      html_content: editor.getHTML()
    });
  }, 2000);
  return () => clearInterval(interval);
}, []);
```

---

### Variante B : Note "Orpheline" (Sans Classeur) ⭐ **RECOMMANDÉ**
```
Canva ouvert → Créer note DB
              ↓
         classeur_id = NULL
         folder_id = NULL
              ↓
    Note INVISIBLE (pas de classeur → pas dans sidebar)
              ↓
    Auto-save toutes les 2s → UPDATE note
              ↓
    Bouton "Sauvegarder" → UPDATE classeur_id + folder_id → VISIBLE
```

**Avantages :**
- ✅ **Pas de pollution UI** - Note invisible jusqu'à sauvegarde explicite
- ✅ **Sécurité DB** - Persisté immédiatement
- ✅ **Workflow clair** - Canva = brouillon invisible, Save = publier
- ✅ **Pas de dépendance** - Pas besoin de QuickNotes/dossier spécial
- ✅ **Cleanup facile** - Cron job supprime notes orphelines > 7j

**Inconvénients :**
- ⚠️ **Notes orphelines** - Risque accumulation si jamais sauvées
- ⚠️ **Pas visible avant save** - User ne voit pas dans sidebar (feature ?)
- ⚠️ **Requiert cleanup** - Job automatique nécessaire

**Architecture :**
```typescript
// 1. Créer note orpheline
const note = await v2UnifiedApi.createNote({
  source_title: 'Canva — Sans titre',
  markdown_content: '',
  notebook_id: null, // ← NULL = orpheline
  folder_id: null
}, userId);

// 2. Afficher dans Editor
<Editor noteId={note.id} />

// 3. Auto-save (même que Variante A)
useEffect(() => {
  const interval = setInterval(() => {
    v2UnifiedApi.updateNote(note.id, {
      markdown_content: editor.getMarkdown(),
      html_content: editor.getHTML()
    });
  }, 2000);
  return () => clearInterval(interval);
}, []);

// 4. Sauvegarder = attacher à un classeur
const handleSave = async (targetClasseurId: string, targetFolderId?: string) => {
  await v2UnifiedApi.updateNote(note.id, {
    classeur_id: targetClasseurId,
    folder_id: targetFolderId
  });
  // → Note devient visible dans sidebar
  closeCanva();
};

// 5. Cleanup automatique (Cron Supabase)
-- supabase/migrations/XXX_cleanup_orphan_canva_notes.sql
CREATE OR REPLACE FUNCTION cleanup_orphan_notes()
RETURNS void AS $$
BEGIN
  DELETE FROM articles
  WHERE classeur_id IS NULL
    AND folder_id IS NULL
    AND created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule every day at 3am
SELECT cron.schedule(
  'cleanup-orphan-notes',
  '0 3 * * *',
  $$SELECT cleanup_orphan_notes()$$
);
```

---

## 🎯 RECOMMANDATION FINALE : **Variante B** (Orpheline)

**Justification :**

### 1. UX Supérieure
- **Pas de pollution** - Sidebar reste propre
- **Workflow intuitif** - Canva = espace temporaire invisible jusqu'à save explicite
- **Pas de "où est mon brouillon ?"** - Soit dans canva (actif), soit sauvé (visible)

### 2. Architecture Propre
- **Pas de dépendance** - Pas besoin de créer/gérer QuickNotes
- **Logique claire** - `classeur_id = NULL` → invisible, `classeur_id != NULL` → visible
- **Cleanup automatique** - Cron job supprime déchets

### 3. Sécurité & Performance
- **Persistance DB** - Aucune perte données si crash
- **Auto-save 2s** - Balance entre sécurité et load DB
- **Multi-device** - Supabase sync (futur)

### 4. Évolutivité
- **Phase 2 facile** - LLM peut créer notes orphelines puis les attacher
- **Phase 3 multi-canva** - Chaque canva = note orpheline différente
- **Feature "Brouillons"** - Page dédiée pour lister notes orphelines user

---

## 🛠️ IMPLÉMENTATION DÉTAILLÉE

### 1. Modification API `/api/v2/note/create`

```typescript
// src/app/api/v2/note/create/route.ts
export async function POST(request: NextRequest): Promise<NextResponse> {
  // ... auth ...
  
  const body = await request.json();
  const validatedData = NoteCreateSchema.parse(body);
  
  // ✅ Autoriser notebook_id = NULL pour notes orphelines
  const classeurId = validatedData.notebook_id || null; // ← Changement clé
  
  // Si classeurId fourni, vérifier existence (logique existante)
  if (classeurId) {
    // ... validation classeur ...
  }
  
  // Créer la note (orpheline si classeurId = NULL)
  const { data: note, error } = await supabase
    .from('articles')
    .insert({
      source_title: validatedData.source_title,
      markdown_content: validatedData.markdown_content || '',
      classeur_id: classeurId, // ← Peut être NULL
      folder_id: validatedData.folder_id || null,
      user_id: userId,
      slug: await generateSlug(validatedData.source_title),
      // ... autres champs ...
    })
    .select()
    .single();
  
  return NextResponse.json({ success: true, note });
}
```

### 2. Nouveau Service `canvaNoteService.ts`

```typescript
// src/services/canvaNoteService.ts
import { v2UnifiedApi } from './V2UnifiedApi';
import { logger, LogCategory } from '@/utils/logger';

export class CanvaNoteService {
  /**
   * Créer une note orpheline pour un canva
   * Note invisible jusqu'à sauvegarde explicite
   */
  static async createOrphanNote(userId: string, title?: string): Promise<string> {
    try {
      const noteTitle = title || `Canva — ${new Date().toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })}`;

      const result = await v2UnifiedApi.createNote({
        source_title: noteTitle,
        markdown_content: '',
        notebook_id: null, // ← Orpheline
        folder_id: null
      }, userId);

      logger.info(LogCategory.EDITOR, '[CanvaNoteService] Orphan note created', {
        noteId: result.note.id,
        title: noteTitle
      });

      return result.note.id;
      
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[CanvaNoteService] Failed to create orphan note', error);
      throw error;
    }
  }

  /**
   * Attacher une note orpheline à un classeur (= sauvegarder)
   * La note devient visible dans la sidebar
   */
  static async attachToClasseur(
    noteId: string,
    classeurId: string,
    folderId: string | null,
    userId: string
  ): Promise<void> {
    try {
      await v2UnifiedApi.updateNote(noteId, {
        classeur_id: classeurId,
        folder_id: folderId
      }, userId);

      logger.info(LogCategory.EDITOR, '[CanvaNoteService] Note attached to classeur', {
        noteId,
        classeurId,
        folderId
      });
      
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[CanvaNoteService] Failed to attach note', error);
      throw error;
    }
  }

  /**
   * Supprimer une note orpheline (annuler canva)
   */
  static async deleteOrphanNote(noteId: string, userId: string): Promise<void> {
    try {
      await v2UnifiedApi.deleteNote(noteId, userId);
      
      logger.info(LogCategory.EDITOR, '[CanvaNoteService] Orphan note deleted', {
        noteId
      });
      
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[CanvaNoteService] Failed to delete orphan note', error);
      throw error;
    }
  }

  /**
   * Lister toutes les notes orphelines de l'user (pour page "Brouillons" future)
   */
  static async listOrphanNotes(userId: string): Promise<Note[]> {
    // TODO: Créer endpoint API dédié
    // GET /api/v2/notes/orphans
    throw new Error('Not implemented yet');
  }
}
```

### 3. Modification `useCanvaStore`

```typescript
// src/store/useCanvaStore.ts
export interface CanvaSession {
  id: string;
  noteId: string; // ← ID de la note DB (pas temporaire)
  title: string;
  createdAt: string;
  // Supprimer markdownDraft/htmlDraft (plus nécessaire, tout en DB)
}

export const useCanvaStore = create<CanvaStore>((set, get) => ({
  sessions: {},
  activeCanvaId: null,
  isCanvaOpen: false,

  openCanva: async (userId: string, options?: { title?: string }) => {
    try {
      // Créer note orpheline en DB
      const noteId = await CanvaNoteService.createOrphanNote(userId, options?.title);

      const now = new Date();
      const session: CanvaSession = {
        id: `canva_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
        noteId, // ← Note réelle en DB
        title: options?.title || `Canva — ${now.toLocaleString('fr-FR')}`,
        createdAt: now.toISOString()
      };

      set((state) => ({
        sessions: {
          ...state.sessions,
          [session.id]: session
        },
        activeCanvaId: session.id,
        isCanvaOpen: true
      }));

      return session;
      
    } catch (error) {
      logger.error('[CanvaStore] Failed to open canva', error);
      throw error;
    }
  },

  closeCanva: async (sessionId: string, options?: { delete?: boolean }) => {
    const { activeCanvaId } = get();
    const targetId = sessionId || activeCanvaId;
    if (!targetId) return;

    const session = get().sessions[targetId];
    if (!session) return;

    // Option: Supprimer la note orpheline si demandé
    if (options?.delete) {
      try {
        await CanvaNoteService.deleteOrphanNote(session.noteId, userId);
      } catch (error) {
        logger.error('[CanvaStore] Failed to delete orphan note', error);
      }
    }

    set((state) => {
      const nextSessions = { ...state.sessions };
      delete nextSessions[targetId];

      return {
        sessions: nextSessions,
        activeCanvaId: state.activeCanvaId === targetId ? null : state.activeCanvaId,
        isCanvaOpen: Object.keys(nextSessions).length > 0
      };
    });
  }
}));
```

### 4. Modification `ChatCanvaPane`

```typescript
// src/components/chat/ChatCanvaPane.tsx
const ChatCanvaPane: React.FC<ChatCanvaPaneProps> = ({ ... }) => {
  const { user } = useAuth();
  const { sessions, activeCanvaId, closeCanva } = useCanvaStore();
  const session = activeCanvaId ? sessions[activeCanvaId] : null;

  // Plus besoin de créer note temporaire dans FileSystemStore
  // La note existe déjà en DB avec session.noteId

  const handleSave = useCallback(async () => {
    if (!session || !user?.id) return;

    // Modal pour choisir destination
    const { classeurId, folderId } = await openClasseurPickerModal();

    try {
      // Attacher la note orpheline au classeur
      await CanvaNoteService.attachToClasseur(
        session.noteId,
        classeurId,
        folderId,
        user.id
      );

      // Fermer canva (sans delete)
      closeCanva(session.id, { delete: false });

      toast.success('Note sauvegardée avec succès !');
      
      // Optionnel : rediriger
      router.push(`/private/note/${classeurId}/${session.noteId}`);
      
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  }, [session, user, closeCanva]);

  const handleCancel = useCallback(async () => {
    if (!session) return;

    // Confirmation
    const confirmed = await confirm('Supprimer ce brouillon ?');
    if (!confirmed) return;

    // Fermer et supprimer la note orpheline
    closeCanva(session.id, { delete: true });
  }, [session, closeCanva]);

  return (
    <section className="chat-canva-pane">
      <div className="canva-actions">
        <button onClick={handleSave}>💾 Sauvegarder</button>
        <button onClick={handleCancel}>🗑️ Supprimer</button>
      </div>

      <Editor 
        noteId={session.noteId} // ← Note DB réelle
        // Auto-save géré par Editor (déjà existant)
      />
    </section>
  );
};
```

### 5. Migration DB pour Cleanup Automatique

```sql
-- supabase/migrations/20251112_cleanup_orphan_canva_notes.sql

-- Fonction de cleanup des notes orphelines
CREATE OR REPLACE FUNCTION cleanup_orphan_canva_notes()
RETURNS TABLE(deleted_count INTEGER) AS $$
DECLARE
  delete_count INTEGER;
BEGIN
  -- Supprimer notes orphelines > 7 jours
  DELETE FROM articles
  WHERE classeur_id IS NULL
    AND folder_id IS NULL
    AND created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS delete_count = ROW_COUNT;
  
  RETURN QUERY SELECT delete_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Scheduler cron (tous les jours à 3h)
SELECT cron.schedule(
  'cleanup-orphan-canva-notes',
  '0 3 * * *',
  $$SELECT cleanup_orphan_canva_notes()$$
);

-- Index pour optimiser le cleanup
CREATE INDEX IF NOT EXISTS idx_articles_orphan_cleanup
ON articles(created_at)
WHERE classeur_id IS NULL AND folder_id IS NULL;

COMMENT ON FUNCTION cleanup_orphan_canva_notes IS 
'Cleanup automatique des notes orphelines (Canva non sauvés) > 7 jours';
```

---

## 📋 CHECKLIST IMPLÉMENTATION

### Phase 1 : Core (6h)
- [ ] Modifier `/api/v2/note/create` pour accepter `notebook_id = null` (30min)
- [ ] Créer `CanvaNoteService` (1h)
  - [ ] `createOrphanNote`
  - [ ] `attachToClasseur`
  - [ ] `deleteOrphanNote`
- [ ] Modifier `useCanvaStore` (2h)
  - [ ] `openCanva` async (crée note DB)
  - [ ] `closeCanva` avec option delete
  - [ ] Supprimer `markdownDraft`/`htmlDraft`
- [ ] Modifier `ChatCanvaPane` (2h)
  - [ ] Bouton "Sauvegarder" + modal picker classeur
  - [ ] Bouton "Supprimer" + confirmation
  - [ ] Supprimer logique création note temporaire
- [ ] Migration DB cleanup automatique (30min)

### Phase 2 : UX (3h)
- [ ] Modal `ClasseurPickerModal` (1h)
- [ ] Confirmation avant fermeture si contenu non vide (30min)
- [ ] Toast feedback save/delete (30min)
- [ ] Keyboard shortcuts (Cmd+S save, Cmd+W close) (1h)

### Phase 3 : Features Avancées (Future)
- [ ] Page "Brouillons" listant notes orphelines
- [ ] Récupération notes orphelines au mount
- [ ] Multi-canva avec liste dans sidebar chat

---

## 🎯 AVANTAGES VARIANTE B vs LocalStorage

| Critère | LocalStorage (Option 3) | Note Orpheline (Variante B) |
|---------|------------------------|----------------------------|
| **Perte données crash** | ❌ Possible si cache vidé | ✅ Impossible (DB) |
| **Multi-device** | ❌ Non | ✅ Oui (Supabase sync) |
| **Visibilité sidebar** | ✅ Aucune | ✅ Aucune (jusqu'à save) |
| **Coût DB** | ✅ Zéro | ⚠️ Writes toutes les 2s |
| **Limite taille** | ⚠️ ~5MB localStorage | ✅ Illimitée (DB) |
| **Cleanup** | ✅ Auto (expiry) | ✅ Cron job |
| **Complexité** | 🟡 Moyenne | 🟢 Simple (réutilise Editor) |
| **LLM Integration** | ⚠️ Difficile (pas d'ID stable) | ✅ Facile (noteId DB) |

**Winner : Variante B** - Plus robuste, scalable, et facile à intégrer avec LLM (Phase 2)

---

## 🚀 DÉCISION FINALE

**Approche retenue : Variante B - Note Orpheline**

**Workflow final :**
1. User ouvre canva → Note DB créée (`classeur_id = NULL`)
2. User rédige → Auto-save 2s → UPDATE note DB
3. User clique "Sauvegarder" → Modal classeur → UPDATE `classeur_id` → Note visible sidebar
4. User clique "Supprimer" → DELETE note DB
5. Cron daily → Cleanup notes orphelines > 7j

**Avantages clés :**
- 🟢 Aucune perte données (DB persistent)
- 🟢 Sidebar propre (invisible jusqu'à save)
- 🟢 Multi-device ready
- 🟢 LLM-friendly (noteId stable)
- 🟢 Scalable (Phase 2/3)

---

**Auteur :** Jean-Claude (AI Senior Dev)  
**Validé par :** [À remplir]  
**Date implémentation :** [À planifier]

