/**
 * Store des préférences Notebooks (mode d'ouverture des notes)
 * Persisté dans localStorage
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NoteOpeningMode = 'normal' | 'side-panel' | 'modal';

interface NotebookSettingsState {
  noteOpeningMode: NoteOpeningMode;
  setNoteOpeningMode: (mode: NoteOpeningMode) => void;
}

const STORAGE_KEY = 'notebook-settings';

export const useNotebookSettingsStore = create<NotebookSettingsState>()(
  persist(
    (set) => ({
      noteOpeningMode: 'normal',
      setNoteOpeningMode: (mode) => set({ noteOpeningMode: mode }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ noteOpeningMode: state.noteOpeningMode }),
    }
  )
);
