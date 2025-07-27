import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { StateCreator } from 'zustand';

// Types de base - mis à jour pour correspondre aux types réels
export interface Note {
  id: string;
  source_title: string; // Correspond à FileArticle
  source_type?: string;
  updated_at?: string;
  classeur_id?: string;
  folder_id?: string | null;
  markdown_content?: string;
  html_content?: string;
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

// Interface pour la note persistée localement
export interface PersistedNote {
  id: string;
  title: string;
  content: string;
  lastModified: number;
}

// Interface pour l'état persisté
export interface PersistedState {
  currentNote: PersistedNote | null;
  hasUnsavedChanges: boolean;
}

export interface FileSystemState {
  notes: Record<string, Note>;
  folders: Record<string, Folder>;
  classeurs: Record<string, Classeur>;
  activeClasseurId?: string | null;
  
  // État de persistance locale
  currentNote: PersistedNote | null;
  hasUnsavedChanges: boolean;
  
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
  
  // Actions de persistance locale
  setCurrentNote: (note: PersistedNote | null) => void;
  updateCurrentNote: (updates: Partial<PersistedNote>) => void;
  clearCurrentNote: () => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  /**
   * Sauvegarde la note actuelle localement
   * @param noteId string
   * @param title string
   * @param content string
   */
  saveCurrentNoteLocally: (noteId: string, title: string, content: string) => void;
  /**
   * Réinitialise l'état persisté après une sauvegarde réussie
   */
  clearPersistedState: () => void;
}

/**
 * useFileSystemStore - Zustand store pour le système de fichiers temps réel
 *
 * - notes, folders, classeurs : Record<string, T>
 * - actions pour chaque mutation (add, remove, update, rename, move)
 * - MUTATIONS LOCALES SEULEMENT (pas de fetch, pas d'effet secondaire)
 * - PERSISTANCE LOCALE pour la note en cours d'édition
 *
 * Utilisation :
 *   const notes = useFileSystemStore(s => s.notes);
 *   const addNote = useFileSystemStore(s => s.addNote);
 *   ...
 */
export const useFileSystemStore = create<FileSystemState>()(
  persist(
    (set, get) => ({
      notes: {},
      folders: {},
      classeurs: {},
      activeClasseurId: null,
      
      // État de persistance locale
      currentNote: null,
      hasUnsavedChanges: false,
      
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
      
      moveNote: (id: string, folder_id: string | null, classeur_id?: string) => set(state => ({ 
        notes: { 
          ...state.notes, 
          [id]: { ...state.notes[id], folder_id, classeur_id } 
        } 
      })),
      
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
      
      moveFolder: (id: string, parent_id: string | null, classeur_id?: string) => set(state => ({ 
        folders: { 
          ...state.folders, 
          [id]: { ...state.folders[id], parent_id, classeur_id } 
        } 
      })),
      
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
        // 🚧 Temp: Authentification non implémentée
        // TODO: Remplacer USER_ID par l'authentification Supabase
        set({ activeClasseurId: id });
      },
      
      // Actions globales d'hydratation
      setFolders: (folders: Folder[]) => set(() => ({ 
        folders: Object.fromEntries(folders.map(f => [f.id, f])) 
      })),
      
      setClasseurs: (classeurs: Classeur[]) => set(() => ({ 
        classeurs: Object.fromEntries(classeurs.map(c => [c.id, c])) 
      })),
      
      setNotes: (notes: Note[]) => set(() => ({ 
        notes: Object.fromEntries(notes.map(n => [n.id, n])) 
      })),
      
      // Actions de persistance locale
      setCurrentNote: (note: PersistedNote | null) => set({ 
        currentNote: note,
        hasUnsavedChanges: !!note
      }),
      
      updateCurrentNote: (updates: Partial<PersistedNote>) => set(state => {
        if (!state.currentNote) return {};
        return {
          currentNote: {
            ...state.currentNote,
            ...updates,
            lastModified: Date.now()
          },
          hasUnsavedChanges: true
        };
      }),
      
      clearCurrentNote: () => set({ 
        currentNote: null,
        hasUnsavedChanges: false
      }),
      
      setHasUnsavedChanges: (hasChanges: boolean) => set({ 
        hasUnsavedChanges: hasChanges 
      }),
      
      saveCurrentNoteLocally: (noteId: string, title: string, content: string) => set({
        currentNote: {
          id: noteId,
          title,
          content,
          lastModified: Date.now()
        },
        hasUnsavedChanges: true
      }),
      
      clearPersistedState: () => set({
        currentNote: null,
        hasUnsavedChanges: false
      }),
    }),
    {
      name: 'abrege-editor-state', // Nom de la clé dans localStorage
      storage: createJSONStorage(() => localStorage),
      // Ne persiste que les champs spécifiés
      partialize: (state) => ({
        currentNote: state.currentNote,
        hasUnsavedChanges: state.hasUnsavedChanges,
      }),
      // Version du schéma de persistance (pour migrations futures)
      version: 1,
      // Fonction de migration si nécessaire
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // Migration depuis l'ancienne version
          return {
            ...persistedState,
            currentNote: persistedState.currentNote || null,
            hasUnsavedChanges: persistedState.hasUnsavedChanges || false,
          };
        }
        return persistedState;
      },
    }
  )
); 