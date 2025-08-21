import { create } from 'zustand';
// import.*StateCreator.*from 'zustand';
import type { DiffResult } from '@/services/diffService';

// Types de base - mis à jour pour correspondre aux types réels
export interface Note {
  id: string;
  source_title: string; // Correspond à FileArticle
  title?: string; // Alias pour source_title (pour compatibilité)
  source_type?: string;
  updated_at?: string;
  created_at?: string;
  classeur_id?: string;
  folder_id?: string | null;
  position?: number;
  markdown_content?: string;
  content?: string; // Alias pour markdown_content (pour compatibilité éditeur)
  html_content?: string;
  header_image?: string | null;
  header_image_offset?: number | null;
  header_image_blur?: number | null;
  header_image_overlay?: number | null;
  header_title_in_image?: boolean | null;
  wide_mode?: boolean | null;
  font_family?: string | null;
          public_url?: string | null; // URL publique si publiée
        slug?: string | null; // Slug unique de la note pour les URLs
        share_settings?: {
          visibility: 'private' | 'link-private' | 'link-public' | 'limited' | 'scrivia';
          invited_users?: string[];
          allow_edit?: boolean;
          allow_comments?: boolean;
        }; // Configuration de partage (nouveau système)
  // Propriétés additionnelles pour l'état optimiste et le diff
  _optimistic?: boolean | 'deleting';
  _lastPatch?: any;
  _lastDiff?: DiffResult;
}

export interface Folder {
  id: string;
  name: string;
  parent_id?: string | null;
  classeur_id?: string;
  position?: number;
  created_at?: string;
  _optimistic?: boolean | 'deleting';
}

export interface Classeur {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  emoji?: string;
  position?: number;
  created_at?: string;
  _optimistic?: boolean | 'deleting';
}

export interface EditorPatch {
  selector: string;
  content: string;
  position?: 'before' | 'after' | 'replace';
  type: 'insert' | 'delete' | 'update' | 'image';
}

export interface FileSystemState {
  notes: Record<string, Note>;
  folders: Record<string, Folder>;
  classeurs: Record<string, Classeur>;
  activeClasseurId?: string | null;
  
  // Actions notes - MUTATIONS LOCALES (sans fetch)
  addNote: (note: Note) => void;
  removeNote: (id: string) => void;
  updateNote: (id: string, patch: Partial<Note>) => void;
  renameNote: (id: string, title: string) => void;
  moveNote: (id: string, folder_id: string | null, classeur_id?: string) => void;
  /**
   * Met à jour dynamiquement le contenu d'une note (realtime LLM/editor)
   * @param noteId string
   * @param patch EditorPatch
   */
  updateNoteContent: (noteId: string, patch: EditorPatch) => void;
  
  // Actions dossiers - MUTATIONS LOCALES (sans fetch)
  addFolder: (folder: Folder) => void;
  removeFolder: (id: string) => void;
  updateFolder: (id: string, patch: Partial<Folder>) => void;
  renameFolder: (id: string, name: string) => void;
  moveFolder: (id: string, parent_id: string | null, classeur_id?: string) => void;
  
  // Actions classeurs - MUTATIONS LOCALES (sans fetch)
  addClasseur: (classeur: Classeur) => void;
  removeClasseur: (id: string) => void;
  updateClasseur: (id: string, patch: Partial<Classeur>) => void;
  renameClasseur: (id: string, name: string) => void;
  setActiveClasseurId: (id: string | null) => void;
  
  // Actions globales d'hydratation
  setFolders: (folders: Folder[]) => void;
  setClasseurs: (classeurs: Classeur[]) => void;
  setNotes: (notes: Note[]) => void;

  // Actions optimistes
  addNoteOptimistic: (note: Note, tempId: string) => void;
  updateNoteOptimistic: (id: string, patch: Partial<Note>) => void;
  removeNoteOptimistic: (id: string) => void;
  
  // Actions optimistes pour dossiers
  addFolderOptimistic: (folder: Folder) => void;
  updateFolderOptimistic: (tempId: string, realFolder: Folder) => void;
  removeFolderOptimistic: (tempId: string) => void;
  
  // Actions optimistes pour classeurs
  addClasseurOptimistic: (classeur: Classeur) => void;
  updateClasseurOptimistic: (tempId: string, realClasseur: Classeur) => void;
  removeClasseurOptimistic: (tempId: string) => void;

  // Action pour le diff
  applyDiff: (noteId: string, diff: DiffResult) => void;
}

/**
 * useFileSystemStore - Zustand store pour le système de fichiers temps réel
 *
 * - notes, folders, classeurs : Record<string, T>
 * - actions pour chaque mutation (add, remove, update, rename, move)
 * - MUTATIONS LOCALES SEULEMENT (pas de fetch, pas d'effet secondaire)
 *
 * Utilisation :
 *   const notes = useFileSystemStore(s => s.notes);
 *   const addNote = useFileSystemStore(s => s.addNote);
 *   ...
 */
export const useFileSystemStore = create<FileSystemState>()((set, get) => ({
  notes: {},
  folders: {},
  classeurs: {},
  activeClasseurId: null,
  
  // Notes - MUTATIONS LOCALES
  addNote: (note: Note) => set(state => ({ 
    notes: { ...state.notes, [note.id]: note } 
  })),
  
  removeNote: (id: string) => set(state => { 
    const n = { ...state.notes }; 
    delete n[id]; 
    return { notes: n }; 
  }),
  
  updateNote: (id: string, patch: Partial<Note>) => set(state => ({ 
    notes: { 
      ...state.notes, 
      [id]: { ...state.notes[id], ...patch } 
    } 
  })),
  
  renameNote: (id: string, title: string) => set(state => ({ 
    notes: { 
      ...state.notes, 
      [id]: { ...state.notes[id], source_title: title } 
    } 
  })),
  
  moveNote: (id: string, folder_id: string | null, classeur_id?: string) => set(state => {
    // 🔧 CORRECTION: S'assurer que classeur_id est défini
    const targetClasseurId = classeur_id || state.notes[id]?.classeur_id;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Store] 🔄 moveNote:', { id, folder_id, classeur_id, targetClasseurId });
      console.log('[Store] 📝 Note avant:', state.notes[id]);
    }
    
    const updatedNote = { 
      ...state.notes[id], 
      folder_id, 
      classeur_id: targetClasseurId 
    };
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Store] 📝 Note après:', updatedNote);
    }
    
    return {
      notes: { 
        ...state.notes, 
        [id]: updatedNote
      } 
    };
  }),
  
  updateNoteContent: (noteId: string, patch: EditorPatch) => set(state => {
    if (!state.notes[noteId]) return {};
    return {
      notes: {
        ...state.notes,
        [noteId]: {
          ...state.notes[noteId],
          markdown_content: patch.content,
          _lastPatch: patch // Pour debug/animation future
        }
      }
    };
  }),
  
  // Folders - MUTATIONS LOCALES
  addFolder: (folder: Folder) => set(state => ({ 
    folders: { ...state.folders, [folder.id]: folder } 
  })),
  
  removeFolder: (id: string) => set(state => { 
    const f = { ...state.folders }; 
    delete f[id]; 
    return { folders: f }; 
  }),
  
  updateFolder: (id: string, patch: Partial<Folder>) => set(state => ({ 
    folders: { 
      ...state.folders, 
      [id]: { ...state.folders[id], ...patch } 
    } 
  })),
  
  renameFolder: (id: string, name: string) => set(state => ({ 
    folders: { 
      ...state.folders, 
      [id]: { ...state.folders[id], name } 
    } 
  })),
  
  moveFolder: (id: string, parent_id: string | null, classeur_id?: string) => set(state => {
    // 🔧 CORRECTION: S'assurer que classeur_id est défini
    const targetClasseurId = classeur_id || state.folders[id]?.classeur_id;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Store] 🔄 moveFolder:', { id, parent_id, classeur_id, targetClasseurId });
      console.log('[Store] 📁 Dossier avant:', state.folders[id]);
    }
    
    const updatedFolder = { 
      ...state.folders[id], 
      parent_id, 
      classeur_id: targetClasseurId 
    };
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Store] 📁 Dossier après:', updatedFolder);
    }
    
    return {
      folders: { 
        ...state.folders, 
        [id]: updatedFolder
      } 
    };
  }),
  
  // Classeurs - MUTATIONS LOCALES
  addClasseur: (classeur: Classeur) => set(state => ({ 
    classeurs: { ...state.classeurs, [classeur.id]: classeur } 
  })),
  
  removeClasseur: (id: string) => set(state => { 
    const c = { ...state.classeurs }; 
    delete c[id]; 
    return { classeurs: c }; 
  }),
  
  updateClasseur: (id: string, patch: Partial<Classeur>) => set(state => ({ 
    classeurs: { 
      ...state.classeurs, 
      [id]: { ...state.classeurs[id], ...patch } 
    } 
  })),
  
  renameClasseur: (id: string, name: string) => set(state => ({ 
    classeurs: { 
      ...state.classeurs, 
      [id]: { ...state.classeurs[id], name } 
    } 
  })),
  
  setActiveClasseurId: (id: string | null) => {
    set({ activeClasseurId: id });
  },
  
  // Actions globales d'hydratation
  setFolders: (folders: Folder[]) => set((state) => ({ 
    folders: { ...state.folders, ...Object.fromEntries(folders.map(f => [f.id, f])) }
  })),
  
  setClasseurs: (classeurs: Classeur[]) => set((state) => ({ 
    classeurs: { ...state.classeurs, ...Object.fromEntries(classeurs.map(c => [c.id, c])) }
  })),
  
  setNotes: (notes: Note[]) => set((state) => ({ 
    notes: { ...state.notes, ...Object.fromEntries(notes.map(n => [n.id, n])) }
  })),

  // --- ACTIONS OPTIMISTES ---
  addNoteOptimistic: (note: Note, tempId: string) => {
    set(state => ({
      notes: { ...state.notes, [tempId]: { ...note, id: tempId, _optimistic: true } }
    }));
  },

  updateNoteOptimistic: (id: string, patch: Partial<Note>) => {
    set(state => {
      if (!state.notes[id]) return {};
      return {
        notes: {
          ...state.notes,
          [id]: { ...state.notes[id], ...patch, _optimistic: true }
        }
      };
    });
  },

  removeNoteOptimistic: (id: string) => {
    set(state => {
      if (!state.notes[id]) return {};
      return {
        notes: {
          ...state.notes,
          [id]: { ...state.notes[id], _optimistic: 'deleting' }
        }
      };
    });
  },

  // --- ACTIONS OPTIMISTES POUR DOSSIERS ---
  addFolderOptimistic: (folder: Folder) => {
    set(state => ({
      folders: { ...state.folders, [folder.id]: { ...folder, _optimistic: true } }
    }));
  },

  updateFolderOptimistic: (tempId: string, realFolder: Folder) => {
    set(state => {
      const { [tempId]: removed, ...otherFolders } = state.folders;
      return {
        folders: {
          ...otherFolders,
          [realFolder.id]: realFolder
        }
      };
    });
  },

  removeFolderOptimistic: (tempId: string) => {
    set(state => {
      const { [tempId]: removed, ...otherFolders } = state.folders;
      return { folders: otherFolders };
    });
  },

  // --- ACTIONS OPTIMISTES POUR CLASSEURS ---
  addClasseurOptimistic: (classeur: Classeur) => {
    set(state => ({
      classeurs: { ...state.classeurs, [classeur.id]: { ...classeur, _optimistic: true } }
    }));
  },

  updateClasseurOptimistic: (tempId: string, realClasseur: Classeur) => {
    set(state => {
      const { [tempId]: removed, ...otherClasseurs } = state.classeurs;
      return {
        classeurs: {
          ...otherClasseurs,
          [realClasseur.id]: realClasseur
        }
      };
    });
  },

  removeClasseurOptimistic: (tempId: string) => {
    set(state => {
      const { [tempId]: removed, ...otherClasseurs } = state.classeurs;
      return { classeurs: otherClasseurs };
    });
  },

  // --- ACTION POUR APPLIQUER UN DIFF ---
  applyDiff: (noteId: string, diff: DiffResult) => {
    set(state => {
      const note = state.notes[noteId];
      if (!note || !note.markdown_content) return {};

      // Logique d'application du diff (simplifiée)
      const newContent = diff.changes.map(change => {
        if (change.added) {
          return change.value;
        }
        if (change.removed) {
          return '';
        }
        return change.value;
      }).join('');


      return {
        notes: {
          ...state.notes,
          [noteId]: {
            ...note,
            markdown_content: newContent,
            _lastDiff: diff, // Pour debug
          }
        }
      };
    });
  },
})); 