import { create } from 'zustand';
// import.*StateCreator.*from 'zustand';
import type { DiffResult } from '@/services/diffService';

// Types de base - mis à jour pour correspondre aux types réels
export interface Note {
  id: string;
  source_title: string;
  markdown_content: string;
  html_content?: string;
  folder_id: string | null;
  classeur_id: string;
  position: number;
  created_at: string;
  updated_at: string;
  slug: string;
  is_published?: boolean;
  public_url?: string;
  header_image?: string;
  header_image_offset?: number;
  header_image_blur?: number;
  header_image_overlay?: number;
  header_title_in_image?: boolean;
  wide_mode?: boolean;
  a4_mode?: boolean;
  slash_lang?: 'fr' | 'en';
  font_family?: string;
  share_settings?: {
    visibility?: string;
    invited_users?: string[];
    allow_edit?: boolean;
    allow_comments?: boolean;
  };
}

export interface Folder {
  id: string;
  name: string;
  parent_id?: string | null;
  classeur_id?: string;
  position?: number;
  created_at?: string;
}

export interface Classeur {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  emoji?: string;
  position?: number;
  created_at?: string;
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
export const useFileSystemStore = create<FileSystemState>()((set) => ({
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
      // Logger au lieu de console.log pour production
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
    // ✅ CORRECTION: Remplacer complètement pour gérer les suppressions
    folders: Object.fromEntries(folders.map(f => [f.id, f]))
  })),
  
  setClasseurs: (classeurs: Classeur[]) => set((state) => {
    // ✅ CORRECTION: Remplacer complètement pour gérer les suppressions
    const newClasseurs = {};
    classeurs.forEach(c => {
      newClasseurs[c.id] = c;
    });
    return { classeurs: newClasseurs };
  }),
  
  setNotes: (notes: Note[]) => set((state) => ({ 
    // ✅ CORRECTION: Remplacer complètement pour gérer les suppressions
    notes: Object.fromEntries(notes.map(n => [n.id, n]))
  })),

  // Action pour le diff
  applyDiff: (noteId: string, diff: DiffResult) => set(state => {
    if (!state.notes[noteId]) return {};
    
    const currentNote = state.notes[noteId];
    
    return {
      notes: {
        ...state.notes,
        [noteId]: {
          ...currentNote,
          updated_at: new Date().toISOString()
        }
      }
    };
  })
})); 