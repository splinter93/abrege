// Types partagés pour l'éditeur

export interface Heading {
  id: string;
  text: string;
  level: number;
}

export interface NoteData {
  title: string;
  markdown_content: string;
  html_content: string;
  headerImage?: string | null;
  titleAlign?: 'left' | 'center' | 'right';
} 