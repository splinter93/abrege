import MarkdownIt from 'markdown-it';
import markdownItGithubTables from './markdownItGithubTables';
import anchor from 'markdown-it-anchor';
import { slugify } from './markdownTOC';

// Configuration markdown-it avec support GFM (tables) via plugin local
export function createMarkdownIt() {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    breaks: true,
    typographer: true,
    quotes: '""\'\''
  });
  md.use(markdownItGithubTables);
  md.use(anchor, {
    slugify,
    level: [1,2,3,4,5,6],
    permalink: false // pas de lien, juste l'id
  });
  return md;
} 