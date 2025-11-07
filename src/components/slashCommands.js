import { insertDefaultTable } from '../utils/editorTables';

export const SLASH_COMMANDS = [
  {
    id: 'h1',
    label: { fr: 'Heading 1', en: 'Heading 1' },
    alias: { fr: ['/t1', '/titre1', '/h1'], en: ['/h1', '/heading1', '/title1'] },
    description: { fr: 'Titre principal de la page', en: 'Main page heading' },
    action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: 'h2',
    label: { fr: 'Heading 2', en: 'Heading 2' },
    alias: { fr: ['/t2', '/titre2', '/h2'], en: ['/h2', '/heading2', '/title2'] },
    description: { fr: 'Titre de section', en: 'Section heading' },
    action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'h3',
    label: { fr: 'Heading 3', en: 'Heading 3' },
    alias: { fr: ['/t3', '/titre3', '/h3'], en: ['/h3', '/heading3', '/title3'] },
    description: { fr: 'Sous-titre de section', en: 'Subsection heading' },
    action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: 'text',
    label: { fr: 'Paragraph', en: 'Paragraph' },
    alias: { fr: ['/texte', '/paragraphe', '/p'], en: ['/text', '/paragraph', '/p'] },
    description: { fr: 'Paragraphe de texte simple', en: 'Simple text paragraph' },
    action: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    id: 'ul',
    label: { fr: 'Bullet List', en: 'Bullet List' },
    alias: { fr: ['/liste', '/puces', '/ul'], en: ['/list', '/bullets', '/ul'] },
    description: { fr: 'Liste avec puces', en: 'List with bullet points' },
    action: (editor) => {
      // Essayer d'abord la méthode toggle
      try {
        editor.chain().focus().toggleBulletList().run();
      } catch (error) {
        // Si ça ne marche pas, insérer directement le markdown
        editor.chain().focus().insertContent('- ').run();
      }
    },
  },
  {
    id: 'ol',
    label: { fr: 'Numbered List', en: 'Numbered List' },
    alias: { fr: ['/liste numérotée', '/numéros', '/ol'], en: ['/numbered', '/numbers', '/ol'] },
    description: { fr: 'Liste ordonnée avec numéros', en: 'Ordered list with numbers' },
    action: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'checklist',
    label: { fr: 'Checklist', en: 'Checklist' },
    alias: { fr: ['/checklist', '/tâches', '/todo'], en: ['/checklist', '/tasks', '/todo'] },
    description: { fr: 'Liste de tâches à cocher', en: 'Checkable task list' },
    action: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    id: 'quote',
    label: { fr: 'Quote Block', en: 'Quote Block' },
    alias: { fr: ['/citation', '/quote', '/guillemets'], en: ['/quote', '/citation', '/quotes'] },
    description: { fr: 'Bloc de citation mis en valeur', en: 'Highlighted quote block' },
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'code',
    label: { fr: 'Code Block', en: 'Code Block' },
    alias: { fr: ['/code', '/programme', '/script'], en: ['/code', '/script', '/program'] },
    description: { fr: 'Bloc de code avec coloration', en: 'Code block with syntax highlighting' },
    action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'separator',
    label: { fr: 'Horizontal Rule', en: 'Horizontal Rule' },
    alias: { fr: ['/séparateur', '/ligne', '/hr'], en: ['/separator', '/line', '/hr'] },
    description: { fr: 'Ligne de séparation horizontale', en: 'Horizontal separation line' },
    action: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    id: 'image',
    label: { fr: 'Image', en: 'Image' },
    alias: { fr: ['/image', '/img', '/photo'], en: ['/image', '/img', '/photo'] },
    description: { fr: 'Insérer une image dans le document', en: 'Insert an image into the document' },
    action: (editor) => {
      // Cette action sera gérée spécialement par EditorSlashMenu
      // pour ouvrir le menu image de la toolbar
      return false;
    },
  },
  {
    id: 'video',
    label: { fr: 'Video', en: 'Video' },
    alias: { fr: ['/vidéo', '/video', '/film'], en: ['/video', '/movie', '/clip'] },
    description: { fr: 'Intégrer une vidéo ou un lien vidéo', en: 'Embed a video or video link' },
    action: (editor) => editor.chain().focus().insertContent('<div class="video-embed">Paste a video link here...</div>').run(),
  },
  {
    id: 'ai',
    label: { fr: 'AI Assistant', en: 'AI Assistant' },
    alias: { fr: ['/ai', '/assistant', '/intelligence'], en: ['/ai', '/assistant', '/intelligence'] },
    description: { fr: 'Demander de l\'aide à l\'intelligence artificielle', en: 'Ask AI for assistance' },
    action: () => {/* Ouvre un menu IA ou déclenche une action */},
  },
  {
    id: 'table',
    label: { fr: 'Table', en: 'Table' },
    alias: { fr: ['/tableau', '/table', '/grille'], en: ['/table', '/grid', '/spreadsheet'] },
    description: { fr: 'Créer un tableau de données', en: 'Create a data table' },
    action: (editor) => insertDefaultTable(editor),
  },
  {
    id: 'callout',
    label: { fr: 'Callout', en: 'Callout' },
    alias: { fr: ['/appel', '/callout', '/info'], en: ['/callout', '/info', '/highlight'] },
    description: { fr: 'Bloc d\'information mis en valeur', en: 'Highlighted information block' },
    action: (editor) => editor.chain().focus().insertContent('<div class="callout callout-info">💡 Callout</div>').run(),
  },
  {
    id: 'link',
    label: { fr: 'Link', en: 'Link' },
    alias: { fr: ['/lien', '/link', '/url'], en: ['/link', '/url', '/hyperlink'] },
    description: { fr: 'Insérer un lien hypertexte', en: 'Insert a hyperlink' },
    action: (editor) => editor.chain().focus().setLink({ href: '' }).run(),
  },
  {
    id: 'draft',
    label: { fr: 'Draft', en: 'Draft' },
    alias: { fr: ['/brouillon', '/draft', '/brouillon'], en: ['/draft', '/sketch', '/rough'] },
    description: { fr: 'Marquer le contenu comme brouillon', en: 'Mark content as draft' },
    action: (editor) => editor.chain().focus().insertContent('<span class="draft">Draft</span>').run(),
  },
  {
    id: 'task-list',
    label: { fr: 'Task List', en: 'Task List' },
    alias: { fr: ['/liste de tâches', '/tâches', '/todo'], en: ['/todo', '/tasks', '/checklist'] },
    description: { fr: 'Liste interactive de tâches à accomplir', en: 'Interactive list of tasks to complete' },
    action: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    id: 'emoji',
    label: { fr: 'Emoji', en: 'Emoji' },
    alias: { fr: ['/emoji', '/smiley', '/icône'], en: ['/emoji', '/smiley', '/icon'] },
    description: { fr: 'Sélectionner et insérer un emoji', en: 'Select and insert an emoji' },
    action: () => {/* Ouvre un picker d'emoji */},
  },
  {
    id: 'callout-info',
    label: { fr: 'Callout Info', en: 'Info Callout' },
    alias: { fr: ['/info', '/callout-info'], en: ['/info', '/callout-info'] },
    description: { fr: 'Bloc d\'information coloré', en: 'Colored information block' },
    action: (editor) => editor.chain().focus().insertContent('<div class="callout callout-info">💡 Info</div>').run(),
  },
  {
    id: 'callout-warning',
    label: { fr: 'Callout Attention', en: 'Warning Callout' },
    alias: { fr: ['/attention', '/warning', '/callout-warning'], en: ['/warning', '/callout-warning'] },
    description: { fr: 'Bloc d\'attention coloré', en: 'Colored warning block' },
    action: (editor) => editor.chain().focus().insertContent('<div class="callout callout-warning">⚠️ Attention</div>').run(),
  },
  {
    id: 'callout-error',
    label: { fr: 'Callout Erreur', en: 'Error Callout' },
    alias: { fr: ['/erreur', '/error', '/callout-error'], en: ['/error', '/callout-error'] },
    description: { fr: 'Bloc d\'erreur coloré', en: 'Colored error block' },
    action: (editor) => editor.chain().focus().insertContent('<div class="callout callout-error">❌ Erreur</div>').run(),
  },
  {
    id: 'callout-success',
    label: { fr: 'Callout Succès', en: 'Success Callout' },
    alias: { fr: ['/succes', '/success', '/callout-success'], en: ['/success', '/callout-success'] },
    description: { fr: 'Bloc de succès coloré', en: 'Colored success block' },
    action: (editor) => editor.chain().focus().insertContent('<div class="callout callout-success">✅ Succès</div>').run(),
  },
  {
    id: 'callout-note',
    label: { fr: 'Callout Note', en: 'Note Callout' },
    alias: { fr: ['/note', '/callout-note'], en: ['/note', '/callout-note'] },
    description: { fr: 'Bloc de note coloré', en: 'Colored note block' },
    action: (editor) => editor.chain().focus().insertContent('<div class="callout callout-note">📝 Note</div>').run(),
  },
  {
    id: 'callout-tip',
    label: { fr: 'Callout Conseil', en: 'Tip Callout' },
    alias: { fr: ['/conseil', '/tip', '/callout-tip'], en: ['/tip', '/callout-tip'] },
    description: { fr: 'Bloc de conseil coloré', en: 'Colored tip block' },
    action: (editor) => editor.chain().focus().insertContent('<div class="callout callout-tip">💡 Conseil</div>').run(),
  },
]; 