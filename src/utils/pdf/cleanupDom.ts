/**
 * Nettoyage du DOM pour l'export PDF
 * 
 * @description Supprime ou masque les éléments non-exportables
 * - Masque les éléments UI (toolbars, menus, etc.)
 * - Nettoie les wrappers de tableaux et code blocks
 */

/**
 * Masque les éléments non-exportables (toolbars, menus, etc.)
 * 
 * @param element - Élément DOM à nettoyer
 */
export function hideNonExportableElements(element: HTMLElement): void {
  const elementsToHide = element.querySelectorAll(
    '.notion-drag-handle, .slash-menu, .context-menu, .floating-menu, button, .editor-toolbar, .editor-header, .editor-sidebar, .tiptap-editor-container, .u-block__toolbar, .toolbar-left, .toolbar-right'
  );
  
  elementsToHide.forEach((el) => {
    (el as HTMLElement).style.display = 'none';
  });
}

/**
 * Nettoie les wrappers de tableaux pour un meilleur rendu PDF
 * 
 * @param element - Élément DOM contenant potentiellement des tableaux wrappés
 */
export function cleanupTableWrappers(element: HTMLElement): void {
  const tableWrappers = element.querySelectorAll('.table-wrapper-chat, .table-wrapper');
  
  tableWrappers.forEach((wrapper) => {
    const table = wrapper.querySelector('table');
    if (table && wrapper.parentNode) {
      wrapper.parentNode.insertBefore(table, wrapper);
      wrapper.remove();
    }
  });
}

/**
 * Nettoie les toolbars des blocs de code
 * 
 * @param element - Élément DOM contenant potentiellement des blocs de code
 */
export function cleanupCodeBlockToolbars(element: HTMLElement): void {
  const codeToolbars = element.querySelectorAll('.u-block__toolbar, .code-block-toolbar');
  codeToolbars.forEach((toolbar) => {
    toolbar.remove();
  });
}

/**
 * Nettoie les wrappers de blocs de code
 * 
 * @param element - Élément DOM contenant potentiellement des wrappers de code
 */
export function cleanupCodeBlockWrappers(element: HTMLElement): void {
  const codeBlockWrappers = element.querySelectorAll('.u-block--code');
  
  codeBlockWrappers.forEach((wrapper) => {
    const pre = wrapper.querySelector('pre');
    if (pre && wrapper.parentNode) {
      wrapper.parentNode.insertBefore(pre, wrapper);
      wrapper.remove();
    }
  });
}

/**
 * Nettoie complètement le DOM pour l'export PDF
 * 
 * @param element - Élément DOM à nettoyer
 */
export function cleanupDomForPdf(element: HTMLElement): void {
  hideNonExportableElements(element);
  cleanupTableWrappers(element);
  cleanupCodeBlockToolbars(element);
  cleanupCodeBlockWrappers(element);
}

