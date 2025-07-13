// Types générés Supabase (extrait)

export type Article = {
  classeur_id: string | null;
  created_at: string | null;
  flash_summary: string | null;
  folder_id: string | null;
  header_image: string | null;
  html_content: string | null;
  id: string;
  image_url: string | null;
  markdown_content: string | null;
  podcast_url: string | null;
  position: number | null;
  source_title: string;
  source_type: string;
  source_url: string | null;
  summary: string | null;
  tags: string[] | null;
  title_align: string | null;
  updated_at: string | null;
  user_id: string | null;
};

export type Classeur = {
  color: string | null;
  created_at: string | null;
  emoji: string | null;
  id: string;
  name: string;
  position: number;
  user_id: string | null;
};

export type Folder = {
  classeur_id: string | null;
  created_at: string | null;
  id: string;
  name: string;
  parent_id: string | null;
  position: number | null;
  user_id: string | null;
}; 