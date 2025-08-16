'use client';

import React, { createContext, useContext, ReactNode } from 'react';

interface NoteData {
  source_title: string;
  summary?: string;
  header_image: string | null;
  header_image_blur: number | null;
  header_image_overlay: number | null;
  header_title_in_image: boolean | null;
  slug: string;
  username: string;
}

interface NoteDataContextType {
  noteData: NoteData | null;
  setNoteData: (data: NoteData | null) => void;
}

const NoteDataContext = createContext<NoteDataContextType | undefined>(undefined);

export function NoteDataProvider({ children }: { children: ReactNode }) {
  const [noteData, setNoteData] = React.useState<NoteData | null>(null);

  return (
    <NoteDataContext.Provider value={{ noteData, setNoteData }}>
      {children}
    </NoteDataContext.Provider>
  );
}

export function useNoteData() {
  const context = useContext(NoteDataContext);
  if (context === undefined) {
    throw new Error('useNoteData must be used within a NoteDataProvider');
  }
  return context;
} 