import MarkdownIt from 'markdown-it';
import markdownItGithubTables from './markdownItGithubTables';

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
  return md;
} 