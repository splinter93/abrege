// Types générés Supabase (extrait)

export type Article = {
  allow_comments: boolean | null;
  classeur_id: string | null;
  created_at: string | null;
  folder_id: string | null;
  header_image: string | null;
  header_image_blur: number | null;
  header_image_offset: number | null; // DECIMAL(5,2) - peut avoir 2 décimales
  header_image_overlay: number | null;
  header_title_in_image: boolean | null;
  html_content: string | null;
  id: string;
  ispublished: boolean | null;
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
  title_align: string | null;
  updated_at: string | null;
  user_id: string | null;
  wide_mode: boolean | null;
  font_family: string | null;
};

export type Classeur = {
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