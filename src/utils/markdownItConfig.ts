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
  
  // Plugin pour ajouter target="_blank" aux liens externes
  md.use((md) => {
    const defaultRender = md.renderer.rules.link_open || function(tokens, idx, options, env, renderer) {
      return renderer.renderToken(tokens, idx, options);
    };

    md.renderer.rules.link_open = function(tokens, idx, options, env, renderer) {
      const token = tokens[idx];
      const href = token.attrGet('href');
      
      // Si c'est un lien externe, ajouter target="_blank" et rel="noopener noreferrer"
      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        token.attrSet('target', '_blank');
        token.attrSet('rel', 'noopener noreferrer');
      }
      
      return defaultRender(tokens, idx, options, env, renderer);
    };
  });
  
  md.use(markdownItGithubTables);
  md.use(anchor, {
    slugify,
    level: [1,2,3,4,5,6],
    permalink: false // pas de lien, juste l'id
  });
  return md;
} 