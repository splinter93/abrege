import MarkdownIt from 'markdown-it';
import markdownItGithubTables from './markdownItGithubTables';
import markdownItTaskLists from 'markdown-it-task-lists';
import anchor from 'markdown-it-anchor';
import { slugify } from './markdownTOC';
// import { markdownItCallouts } from './markdownItCallouts'; // ⚠️ DÉSACTIVÉ: Casse le parsing markdown

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
  md.use(markdownItTaskLists, {
    enabled: true, // ✅ Checkboxes interactives
    label: true,   // ✅ Avec label cliquable
  });
  // md.use(markdownItCallouts); // ⚠️ DÉSACTIVÉ: Casse le parsing markdown - À refaire
  md.use(anchor, {
    slugify,
    level: [1,2,3,4,5,6],
    permalink: false // pas de lien, juste l'id
  });
  
  // Custom renderer pour forcer les bullets sur les listes normales
  md.renderer.rules.bullet_list_open = function(tokens, idx) {
    const token = tokens[idx];
    // Vérifier si c'est une task list (a l'attribut class="contains-task-list")
    const isTaskList = token.attrGet('class')?.includes('task-list') || token.attrGet('class')?.includes('contains-task-list');
    
    if (isTaskList) {
      return '<ul class="contains-task-list">\n';
    }
    return '<ul style="list-style-type: disc !important; padding-left: 1.5rem !important;">\n';
  };
  
  // Custom renderer pour les code blocks - même structure que mode édition avec boutons
  md.renderer.rules.fence = function(tokens, idx) {
    const token = tokens[idx];
    const content = token.content;
    const lang = token.info.trim() || 'text';
    const langUpper = lang.toUpperCase();
    
    // Mermaid : structure spéciale avec data-mermaid pour le rendu
    if (lang === 'mermaid') {
      return `
        <div class="u-block u-block--mermaid" data-mermaid="true">
          <div class="u-block__toolbar">
            <div class="toolbar-left">
              <span class="toolbar-label">MERMAID</span>
            </div>
            <div class="toolbar-right">
              <button class="toolbar-btn copy-btn" title="Copier le code Mermaid">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
              <button class="toolbar-btn expand-btn" title="Agrandir le diagramme">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              </button>
            </div>
          </div>
          <div class="u-block__body" data-mermaid-content="${md.utils.escapeHtml(content).replace(/"/g, '&quot;')}">
            <pre style="display:none;"><code>${md.utils.escapeHtml(content)}</code></pre>
          </div>
        </div>
      `;
    }
    
    // Code blocks normaux
    return `
      <div class="u-block u-block--code" data-language="${lang}">
        <div class="u-block__toolbar">
          <div class="toolbar-left">
            <span class="toolbar-label">${langUpper}</span>
          </div>
          <div class="toolbar-right">
            <button class="toolbar-btn copy-btn" title="Copier le code" data-content="${md.utils.escapeHtml(content).replace(/"/g, '&quot;')}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
            <button class="toolbar-btn expand-btn" title="Agrandir le code">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="u-block__body">
          <pre><code class="language-${lang}">${md.utils.escapeHtml(content)}</code></pre>
        </div>
      </div>
    `;
  };
  
  return md;
} 