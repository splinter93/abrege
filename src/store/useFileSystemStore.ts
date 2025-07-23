import { create } from 'zustand';
import { StateCreator } from 'zustand';

// Types de base
export interface Note {
  id: string;
  title: string;
  folder_id?: string | null;
  classeur_id?: string;
  [key: string]: any;
}
export interface Folder {
  id: string;
  name: string;
  parent_id?: string | null;
  classeur_id?: string;
  [key: string]: any;
}
export interface Classeur {
  id: string;
  name: string;
  [key: string]: any;
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
  // Actions notes
  addNote: (note: Note) => void;
  removeNote: (id: string) => void;
  renameNote: (id: string, title: string) => void;
  moveNote: (id: string, folder_id: string | null, classeur_id?: string) => void;
  /**
   * Met à jour dynamiquement le contenu d'une note (realtime LLM/editor)
   * @param noteId string
   * @param patch EditorPatch
   */
  updateNoteContent: (noteId: string, patch: EditorPatch) => void;
  // Actions dossiers
  addFolder: (folder: Folder) => void;
  removeFolder: (id: string) => void;
  renameFolder: (id: string, name: string) => void;
  moveFolder: (id: string, parent_id: string | null, classeur_id?: string) => void;
  // Actions classeurs
  addClasseur: (classeur: Classeur) => void;
  removeClasseur: (id: string) => void;
  renameClasseur: (id: string, name: string) => void;
  setActiveClasseurId: (id: string) => void;
  // Actions globales d'hydratation
  setFolders: (folders: Folder[]) => void;
  setClasseurs: (classeurs: Classeur[]) => void;
  setNotes: (notes: Note[]) => void;
}

/**
 * useFileSystemStore - Zustand store pour le système de fichiers temps réel
 *
 * - notes, folders, classeurs : Record<string, T>
 * - actions pour chaque mutation (add, remove, rename, move)
 *
 * Utilisation :
 *   const notes = useFileSystemStore(s => s.notes);
 *   const addNote = useFileSystemStore(s => s.addNote);
 *   ...
 */
export const useFileSystemStore = create<FileSystemState>((set: Parameters<StateCreator<FileSystemState>>[0]) => ({
  notes: {},
  folders: {},
  classeurs: {},
  activeClasseurId: null,
  // Notes
  addNote: (note: Note) => set(state => ({ notes: { ...state.notes, [note.id]: note } })),
  removeNote: (id: string) => set(state => { const n = { ...state.notes }; delete n[id]; return { notes: n }; }),
  renameNote: (id: string, title: string) => set(state => ({ notes: { ...state.notes, [id]: { ...state.notes[id], title } } })),
  moveNote: (id: string, folder_id: string | null, classeur_id?: string) => set(state => ({ notes: { ...state.notes, [id]: { ...state.notes[id], folder_id, classeur_id } } })),
  updateNoteContent: (noteId: string, patch: EditorPatch) => set(state => {
    // Pour l’instant, on remplace tout le contenu (pas de diff)
    if (!state.notes[noteId]) return {};
    return {
      notes: {
        ...state.notes,
        [noteId]: {
          ...state.notes[noteId],
          content: patch.content,
          _lastPatch: patch // Pour debug/animation future
        }
      }
    };
  }),
  // Folders
  addFolder: (folder: Folder) => set(state => ({ folders: { ...state.folders, [folder.id]: folder } })),
  removeFolder: (id: string) => set(state => { const f = { ...state.folders }; delete f[id]; return { folders: f }; }),
  renameFolder: (id: string, name: string) => set(state => ({ folders: { ...state.folders, [id]: { ...state.folders[id], name } } })),
  moveFolder: (id: string, parent_id: string | null, classeur_id?: string) => set(state => ({ folders: { ...state.folders, [id]: { ...state.folders[id], parent_id, classeur_id } } })),
  // Classeurs
  addClasseur: (classeur: Classeur) => set(state => ({ classeurs: { ...state.classeurs, [classeur.id]: classeur } })),
  removeClasseur: (id: string) => set(state => { const c = { ...state.classeurs }; delete c[id]; return { classeurs: c }; }),
  renameClasseur: (id: string, name: string) => set(state => ({ classeurs: { ...state.classeurs, [id]: { ...state.classeurs[id], name } } })),
  setActiveClasseurId: (id: string) => {
    console.log('[ZUSTAND] setActiveClasseurId called', id);
    set({ activeClasseurId: id });
  },
  // Actions globales d'hydratation
  setFolders: (folders: Folder[]) => set(() => ({ folders: Object.fromEntries(folders.map(f => [f.id, f])) })),
  setClasseurs: (classeurs: Classeur[]) => set(() => ({ classeurs: Object.fromEntries(classeurs.map(c => [c.id, c])) })),
  setNotes: (notes: Note[]) => set(() => ({ notes: Object.fromEntries(notes.map(n => [n.id, n])) })),
})); 