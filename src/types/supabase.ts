// Types générés Supabase (extrait)

export type Article = {
  classeur_id: string | null;
  created_at: string | null;
  description: string | null;
  embedding: number[] | null;
  folder_id: string | null;
  header_image: string | null;
  header_image_blur: number | null;
  header_image_offset: number | null; // DECIMAL(5,2) - peut avoir 2 décimales
  header_image_overlay: number | null;
  header_title_in_image: boolean | null;
  html_content: string | null;
  id: string;
  insight: string | null;
  is_in_trash: boolean | null;
  markdown_content: string | null;
  podcast_url: string | null;
  position: number | null;
  public_url: string | null;
  slug: string | null;
  source_title: string;
  source_type: string | null;
  source_url: string | null;
  summary: string | null;
  tags: string[] | null;
  trashed_at: string | null;
  updated_at: string | null;
  user_id: string | null;
  view_count: number;
  share_settings: {
    visibility: 'private' | 'link-private' | 'link-public' | 'limited' | 'scrivia';
    invited_users?: string[];
    allow_edit?: boolean;
    allow_comments?: boolean;
  };
  wide_mode: boolean | null;
  font_family: string | null;
};

export type ArticlePermission = {
  id: string;
  article_id: string;
  user_id: string;
  role: 'viewer' | 'editor' | 'owner';
  granted_by: string | null;
  created_at: string;
};

export type ClasseurPermission = {
  id: string;
  classeur_id: string;
  user_id: string;
  role: 'viewer' | 'editor' | 'owner';
  granted_by: string | null;
  created_at: string;
};

export type FolderPermission = {
  id: string;
  folder_id: string;
  user_id: string;
  role: 'viewer' | 'editor' | 'owner';
  granted_by: string | null;
  created_at: string;
};

export type SharedNote = {
  classeur_id: string | null;
  created_at: string | null;
  description: string | null;
  embedding: number[] | null;
  folder_id: string | null;
  header_image: string | null;
  header_image_blur: number | null;
  header_image_offset: number | null;
  header_image_overlay: number | null;
  header_title_in_image: boolean | null;
  html_content: string | null;
  id: string;
  insight: string | null;
  markdown_content: string | null;
  original_user_id: string; // Auteur original
  podcast_url: string | null;
  position: number | null;
  public_url: string | null;
  slug: string | null;
  source_title: string;
  source_type: string | null;
  source_url: string | null;
  summary: string | null;
  tags: string[] | null;
  updated_at: string | null;
  user_id: string; // Utilisateur qui a reçu la note
  view_count: number;
  share_settings: {
    visibility: 'private' | 'link-private' | 'link-public' | 'limited' | 'scrivia';
    invited_users?: string[];
    allow_edit?: boolean;
    allow_comments?: boolean;
  };
  wide_mode: boolean | null;
  font_family: string | null;
};

export type File = {
  id: string;
  user_id: string;
  note_id: string | null;
  folder_id: string | null;
  filename: string;
  slug: string | null;
  mime_type: string;
  size: number | null;
  url: string;
  preview_url: string | null;
  extension: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean | null;
  visibility: 'private' | 'public' | 'targeted';
};

export type Classeur = {
  created_at: string | null;
  emoji: string | null;
  id: string;
  is_in_trash: boolean | null;
  name: string;
  position: number;
  trashed_at: string | null;
  user_id: string | null;
};

export type Folder = {
  classeur_id: string | null;
  created_at: string | null;
  id: string;
  is_in_trash: boolean | null;
  name: string;
  parent_id: string | null;
  position: number | null;
  trashed_at: string | null;
  user_id: string | null;
};

// Types pour la corbeille
export type TrashItem = {
  id: string;
  type: 'note' | 'folder' | 'classeur' | 'file';
  name: string;
  trashed_at: string;
  expires_at: string;
  original_path?: string;
  size?: number;
};

export type TrashStatistics = {
  total: number;
  notes: number;
  folders: number;
  classeurs: number;
  files: number;
};

export type User = {
  id: string;
  email: string | null;
  username: string;
  created_at: string | null;
  profile_picture: string | null;
  name: string | null;
  surname: string | null;
  display_name: string | null;
  bio: string | null;
  timezone: string;
  language: string;
  settings: Record<string, any> | null;
};

export type UserSettings = {
  id: string;
  user_id: string;
  
  // Paramètres d'interface
  default_header_image: boolean;
  default_font_family: string;
  default_wide_mode: boolean;
  theme_mode: 'light' | 'dark' | 'auto';
  last_theme_choice: string | null;
  
  // Paramètres de notifications
  notifications_enabled: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  
  // Paramètres de langue et localisation
  default_language: string;
  timezone: string;
  
  // Paramètres d'affichage
  items_per_page: number;
  auto_save_interval: number;
  show_toolbar: boolean;
  show_sidebar: boolean;
  
  // Paramètres d'édition
  auto_complete_enabled: boolean;
  spell_check_enabled: boolean;
  word_wrap_enabled: boolean;
  
  // Paramètres de partage
  default_visibility: 'private' | 'shared' | 'members' | 'public';
  auto_share_enabled: boolean;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}; 