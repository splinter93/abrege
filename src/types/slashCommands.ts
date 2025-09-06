/**
 * Types pour les commandes slash
 */

export interface SlashCommand {
  id: string;
  label: string;
  alias: string[];
  description: string;
  content: string;
  icon?: string;
  category?: string;
}

export const slashCommands: SlashCommand[] = [
  {
    id: 'heading1',
    label: 'Titre 1',
    alias: ['h1', 'titre1', 'heading1'],
    description: 'Grand titre',
    content: '# ',
    icon: 'H1',
    category: 'Texte'
  },
  {
    id: 'heading2',
    label: 'Titre 2',
    alias: ['h2', 'titre2', 'heading2'],
    description: 'Titre moyen',
    content: '## ',
    icon: 'H2',
    category: 'Texte'
  },
  {
    id: 'heading3',
    label: 'Titre 3',
    alias: ['h3', 'titre3', 'heading3'],
    description: 'Petit titre',
    content: '### ',
    icon: 'H3',
    category: 'Texte'
  },
  {
    id: 'paragraph',
    label: 'Paragraphe',
    alias: ['p', 'paragraphe', 'text'],
    description: 'Texte normal',
    content: '',
    icon: 'P',
    category: 'Texte'
  },
  {
    id: 'bulletList',
    label: 'Liste à puces',
    alias: ['liste', 'bullet', 'ul'],
    description: 'Liste avec des puces',
    content: '- ',
    icon: '•',
    category: 'Listes'
  },
  {
    id: 'orderedList',
    label: 'Liste numérotée',
    alias: ['numero', 'ordered', 'ol'],
    description: 'Liste avec des numéros',
    content: '1. ',
    icon: '1.',
    category: 'Listes'
  },
  {
    id: 'codeBlock',
    label: 'Bloc de code',
    alias: ['code', 'bloc', '```'],
    description: 'Code avec coloration syntaxique',
    content: '```\n\n```',
    icon: '</>',
    category: 'Code'
  },
  {
    id: 'quote',
    label: 'Citation',
    alias: ['quote', 'citation', '>'],
    description: 'Citation ou note',
    content: '> ',
    icon: '"',
    category: 'Texte'
  },
  {
    id: 'divider',
    label: 'Séparateur',
    alias: ['divider', 'separateur', '---'],
    description: 'Ligne de séparation',
    content: '---\n',
    icon: '—',
    category: 'Mise en page'
  },
  {
    id: 'image',
    label: 'Image',
    alias: ['image', 'img', 'photo'],
    description: 'Insérer une image',
    content: '![Texte alternatif](url)',
    icon: '🖼️',
    category: 'Médias'
  }
];
