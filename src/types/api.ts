import type { NextRequest } from 'next/server';

// Types pour les paramètres d'API
export interface ApiParams {
  ref: string;
}

export interface ApiContext {
  params: Promise<ApiParams>;
}

// Types pour les réponses d'API
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  details?: string[];
  success?: boolean;
}

// Types pour les endpoints de notes
export interface NoteUpdateData {
  source_title?: string;
  markdown_content?: string;
  html_content?: string;
  header_image?: string;
  folder_id?: string | null;
}

export interface NoteCreateData {
  source_title: string;
  notebook_id: string;
  markdown_content?: string;
  header_image?: string;
  folder_id?: string | null;
}

export interface NotePublishData {
  visibility: 'private' | 'public' | 'link-private' | 'link-public' | 'limited' | 'scrivia';
}

export interface NoteAddContentData {
  text: string;
  position?: 'start' | 'end';
}

// Types pour les endpoints de dossiers
export interface FolderUpdateData {
  name?: string;
  parent_id?: string | null;
}

export interface FolderCreateData {
  name: string;
  classeur_id: string;
  parent_id?: string | null;
}

// Types pour les endpoints de classeurs
export interface ClasseurUpdateData {
  name?: string;
  emoji?: string;
  position?: number;
}

export interface ClasseurCreateData {
  name: string;
  emoji?: string;
}

// Types pour les endpoints de réorganisation
export interface ReorderData {
  classeurs: Array<{
    id: string;
    position: number;
  }>;
}

// Types pour les fonctions d'API
export type ApiHandler = (req: NextRequest, context: ApiContext) => Promise<Response>;

// Types pour les erreurs
export interface ApiError extends Error {
  status?: number;
  statusText?: string;
}

// Types pour l'authentification
export interface AuthenticatedClient {
  supabase: any; // TODO: Typer avec SupabaseClient
  userId: string;
}

// Types pour les paramètres de requête
export interface RequestParams {
  [key: string]: string | string[] | undefined;
}

// Types pour les headers
export interface ApiHeaders {
  'Content-Type': string;
  'Authorization'?: string;
  [key: string]: string | undefined;
} 