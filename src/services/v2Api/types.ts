/**
 * Types pour V2UnifiedApi
 * Extrait de V2UnifiedApi.ts pour réutilisation dans les modules
 */

export interface CreateNoteData {
  source_title: string;
  notebook_id: string;
  markdown_content?: string;
  header_image?: string;
  folder_id?: string | null;
  description?: string;
}

export interface UpdateNoteData {
  source_title?: string;
  markdown_content?: string;
  html_content?: string;
  header_image?: string | null;
  header_image_offset?: number;
  header_image_blur?: number;
  header_image_overlay?: number;
  header_title_in_image?: boolean;
  wide_mode?: boolean;
  a4_mode?: boolean;
  slash_lang?: 'fr' | 'en';
  font_family?: string;
  folder_id?: string | null;
  description?: string;
  classeur_id?: string | null;
  is_canva_draft?: boolean;
}

export interface CreateFolderData {
  name: string;
  classeur_id: string;
  parent_id?: string | null;
}

export interface UpdateFolderData {
  name?: string;
  parent_id?: string | null;
}

export interface CreateClasseurData {
  name: string;
  description?: string;
  icon?: string;
  emoji?: string;
}

export interface UpdateClasseurData {
  name?: string;
  description?: string;
  icon?: string;
  emoji?: string;
  position?: number;
}


