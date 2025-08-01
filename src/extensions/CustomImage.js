import Image from '@tiptap/extension-image';

const CustomImage = Image.extend({
  addNodeView() {
    return ({ node, editor }) => {
      const src = node.attrs.src;
      const dom = document.createElement('div');
      dom.className = 'editor-image-wrapper';
      if (!src) {
        dom.classList.add('editor-image-placeholder');
        dom.innerHTML = `<div class="editor-image-placeholder-inner"><svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="M21 15l-5-5L5 21"></path></svg><span>Ajouter une image</span></div>`;
        dom.onclick = (e) => {
          e.stopPropagation();
          if (editor.options.handleOpenImageMenu) editor.options.handleOpenImageMenu();
        };
      } else {
        const img = document.createElement('img');
        img.src = src;
        img.className = 'editor-image';
        dom.appendChild(img);
      }
      // Ajout du contentDOM pour permettre la mise en forme markdown sous l'image
      const contentDOM = document.createElement('div');
      contentDOM.className = 'editor-image-content';
      dom.appendChild(contentDOM);
      return {
        dom,
        contentDOM,
      };
    };
  },
});

export default CustomImage; 