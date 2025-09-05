import { Node } from '@tiptap/pm/model';
import type { Editor } from '@tiptap/react';

const SUPPORTED_LANGUAGES = [
  { value: 'plaintext', label: 'Plain Text' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'csharp', label: 'C#' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'sql', label: 'SQL' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'bash', label: 'Bash' },
];

export function createCodeBlockToolbar(node: Node, getPos: () => number, editor: Editor, container: HTMLElement) {
  const toolbar = document.createElement('div');
  toolbar.className = 'unified-toolbar code-block-toolbar'; // Classe unifiée

  // --- Conteneur gauche (sélecteur de langage) ---
  const leftContainer = document.createElement('div');
  leftContainer.className = 'toolbar-left';
  const languageSelector = createLanguageSelector(node, getPos, editor);
  leftContainer.appendChild(languageSelector);

  // --- Conteneur droite (bouton copier) ---
  const rightContainer = document.createElement('div');
  rightContainer.className = 'toolbar-right';
  const copyButton = createCopyButton(node);
  rightContainer.appendChild(copyButton);

  // --- Assemblage ---
  toolbar.appendChild(leftContainer);
  toolbar.appendChild(rightContainer);

  return toolbar;
}

function createLanguageSelector(node: Node, getPos: () => number, editor: Editor) {
  const selectContainer = document.createElement('div');
  selectContainer.className = 'language-selector-container';

  const select = document.createElement('select');
  select.className = 'language-selector';

  const currentLanguage = node.attrs.language || 'plaintext';

  SUPPORTED_LANGUAGES.forEach(lang => {
    const option = document.createElement('option');
    option.value = lang.value;
    option.textContent = lang.label;
    if (lang.value === currentLanguage) {
      option.selected = true;
    }
    select.appendChild(option);
  });

  select.addEventListener('change', (event) => {
    const newLanguage = (event.target as HTMLSelectElement).value;
    editor.view.dispatch(
      editor.view.state.tr.setNodeMarkup(getPos(), undefined, {
        language: newLanguage,
      })
    );
  });
  
  selectContainer.appendChild(select);
  return selectContainer;
}


function createCopyButton(node: Node) {
    const copyButton = document.createElement('button');
    copyButton.className = 'toolbar-btn copy-btn';
    copyButton.title = 'Copy code';
    copyButton.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    `;

    let copyTimeout: NodeJS.Timeout | null = null;
  
    copyButton.addEventListener('click', () => {
      navigator.clipboard.writeText(node.textContent).then(() => {
        copyButton.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        `;
        copyButton.classList.add('copied');
        
        if (copyTimeout) clearTimeout(copyTimeout);
        
        copyTimeout = setTimeout(() => {
          copyButton.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          `;
          copyButton.classList.remove('copied');
        }, 2000);
      });
    });

    return copyButton;
}
