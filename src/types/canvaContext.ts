'use client';

export type CanvaSessionStatus = 'open' | 'closed' | 'saved' | 'deleted';

export interface CanvaContextSessionNote {
  id: string;
  slug: string | null;
  title: string;
}

export interface CanvaContextSession {
  canvaId: string;
  status: CanvaSessionStatus;
  isActive: boolean;
  note: CanvaContextSessionNote;
}

export interface CanvaContextMetadata {
  total: number;
  open: number;
  closed: number;
  saved: number;
}

export interface CanvaContextPayload {
  session: {
    chatSessionId: string | null;
    activeCanvaId: string | null;
  };
  activeNote: CanvaContextSession | null;
  canvases: CanvaContextSession[];
  stats: CanvaContextMetadata;
}

