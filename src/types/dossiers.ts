// Types spécifiques pour le système de dossiers
// Remplacent les types 'any' et améliorent la sécurité TypeScript

export interface AuthenticatedUser {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
  app_metadata?: {
    provider?: string;
    [key: string]: string | number | boolean | undefined;
  };
}

export interface DossierFolder {
  id: string;
  name: string;
  parent_id: string | null;
  classeur_id: string;
  position: number;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface DossierNote {
  id: string;
  source_title: string;
  folder_id: string | null;
  classeur_id: string;
  position: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  markdown_content?: string;
  html_content?: string;
  slug?: string;
}

export interface DossierClasseur {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  emoji?: string;
  position: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  slug?: string;
}

export interface FolderPathItem {
  id: string;
  name: string;
  parent_id: string | null;
  classeur_id: string;
  position: number;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface CreateFolderRequest {
  name: string;
  classeur_id: string;
  parent_id?: string | null;
}

export interface CreateNoteRequest {
  source_title: string;
  notebook_id: string;
  markdown_content?: string;
  folder_id?: string | null;
}

export interface CreateClasseurRequest {
  name: string;
  description?: string;
  icon?: string;
  emoji?: string;
}

export interface UpdateClasseurRequest {
  name?: string;
  description?: string;
  icon?: string;
  emoji?: string;
  position?: number;
}

export interface ViewMode {
  type: 'list' | 'grid';
  label: string;
  icon: string;
}

export interface ErrorState {
  message: string;
  code?: string;
  retryCount: number;
  canRetry: boolean;
  timestamp: number;
}

export interface LoadingState {
  isLoading: boolean;
  progress?: number;
  message?: string;
}

export interface DossierPageState {
  loading: LoadingState;
  error: ErrorState | null;
  activeClasseurId: string | null;
  currentFolderId: string | null;
  viewMode: ViewMode;
  folderPath: FolderPathItem[];
} 