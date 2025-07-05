import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';

const CodeBlockWithCopy = CodeBlockLowlight.extend({
  addNodeView() {
    return ({ node }) => {
      const container = document.createElement('div');
      container.style.position = 'relative';

      const pre = document.createElement('pre');
      const code = document.createElement('code');

      if (node.attrs.language) {
        code.className = 'language-' + node.attrs.language;
      }
      pre.appendChild(code);
      
      const button = document.createElement('button');
      button.className = 'code-copy-button';
      button.title = 'Copier le code';
      
      const copyIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      `;
      const checkIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
      
      button.innerHTML = copyIcon;
      button.addEventListener('click', () => {
        navigator.clipboard.writeText(node.textContent).then(() => {
          button.innerHTML = checkIcon;
          button.style.color = 'var(--accent-primary)';
          button.classList.add('copied');
          setTimeout(() => {
            button.innerHTML = copyIcon;
            button.style.color = '';
            button.classList.remove('copied');
          }, 2000);
        });
      });

      container.append(pre, button);

      return {
        dom: container,
        contentDOM: code,
      };
    };
  },
});

export default CodeBlockWithCopy; 