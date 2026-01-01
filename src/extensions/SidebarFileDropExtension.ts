/**
 * Extension pour gérer le drag & drop de fichiers depuis la sidebar
 * - Images : insertion directe comme image
 * - Autres fichiers : insertion comme lien markdown
 * 
 * Priorité élevée pour intercepter avant les autres handlers
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { logger, LogCategory } from '@/utils/logger';

const SidebarFileDropExtension = Extension.create({
  name: 'sidebarFileDrop',
  
  priority: 1001, // ✅ Priorité plus élevée que NoteEmbedExtension (1000)

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('sidebarFileDrop'),
        
        props: {
          handleDrop: (view, event) => {
            const dataTransfer = (event as DragEvent).dataTransfer;
            if (!dataTransfer) {
              logger.debug(LogCategory.EDITOR, '[SidebarFileDrop] ⚠️ Pas de dataTransfer');
              return false;
            }

            // ✅ DEBUG: Logger tous les types disponibles
            logger.debug(LogCategory.EDITOR, '[SidebarFileDrop] 🔍 Types disponibles:', {
              types: Array.from(dataTransfer.types),
              hasImageType: dataTransfer.types.includes('application/x-scrivia-image-url'),
              hasFileType: dataTransfer.types.includes('application/x-scrivia-file-link')
            });

            // ✅ 1. Vérifier si c'est une image depuis la sidebar
            const imageUrl = dataTransfer.getData('application/x-scrivia-image-url');
            const imageMarkdown = dataTransfer.getData('text/plain');
            
            if (imageUrl) {
              logger.debug(LogCategory.EDITOR, '[SidebarFileDrop] 🖼️ Image détectée:', { imageUrl, imageMarkdown });
              event.preventDefault();
              
              const coordinates = view.posAtCoords({
                left: event.clientX,
                top: event.clientY
              });
              
              if (!coordinates) {
                logger.warn(LogCategory.EDITOR, '[SidebarFileDrop] ⚠️ Impossible de déterminer la position du drop');
                return false;
              }

              try {
                const { state } = view;
                const $pos = state.doc.resolve(coordinates.pos);
                const nodeHere = ($pos.nodeAfter && $pos.nodeAfter.type.name === 'image')
                  ? $pos.nodeAfter
                  : ($pos.nodeBefore && $pos.nodeBefore.type.name === 'image')
                    ? $pos.nodeBefore
                    : null;
                
                if (nodeHere) {
                  // Mettre à jour l'image existante
                  const { NodeSelection } = require('prosemirror-state');
                  const imagePos = $pos.nodeAfter && $pos.nodeAfter.type.name === 'image' 
                    ? coordinates.pos 
                    : (coordinates.pos - (nodeHere?.nodeSize || 1));
                  const tr = state.tr.setSelection(NodeSelection.create(state.doc, imagePos));
                  
                  // Mettre à jour l'attribut src de l'image
                  const imageNode = state.doc.nodeAt(imagePos);
                  if (imageNode && imageNode.type.name === 'image') {
                    tr.setNodeMarkup(imagePos, undefined, { ...imageNode.attrs, src: imageUrl });
                  }
                  
                  view.dispatch(tr);
                } else {
                  // ✅ SOLUTION ALTERNATIVE: Si l'insertion ProseMirror échoue, utiliser le markdown
                  // Vérifier si on a du markdown d'image dans text/plain
                  if (imageMarkdown && imageMarkdown.startsWith('![') && imageMarkdown.includes('](')) {
                    logger.debug(LogCategory.EDITOR, '[SidebarFileDrop] 📝 Utilisation du markdown d\'image:', { imageMarkdown });
                    // Insérer le markdown d'image comme texte (sera parsé par MarkdownPasteHandler)
                    const tr = state.tr.insertText(imageMarkdown, coordinates.pos);
                    view.dispatch(tr);
                  } else {
                    // Tentative d'insertion directe via ProseMirror
                    try {
                      const imageNode = state.schema.nodes.image.create({ src: imageUrl });
                      const tr = state.tr.insert(coordinates.pos, imageNode);
                      view.dispatch(tr);
                    } catch (proseError) {
                      logger.warn(LogCategory.EDITOR, '[SidebarFileDrop] ⚠️ Échec insertion ProseMirror, fallback markdown:', proseError);
                      // Fallback: insérer le markdown
                      const fallbackMarkdown = `![Image](${imageUrl})`;
                      const tr = state.tr.insertText(fallbackMarkdown, coordinates.pos);
                      view.dispatch(tr);
                    }
                  }
                }
                
                logger.info(LogCategory.EDITOR, '[SidebarFileDrop] ✅ Image insérée:', { imageUrl, method: imageMarkdown ? 'markdown' : 'prosemirror' });
                return true;
              } catch (error) {
                logger.error(LogCategory.EDITOR, '[SidebarFileDrop] ❌ Erreur insertion image:', error);
                return false;
              }
            }

            // ✅ 2. Vérifier si c'est un fichier depuis la sidebar
            const fileUrl = dataTransfer.getData('application/x-scrivia-file-link');
            if (fileUrl) {
              const fileLink = dataTransfer.getData('text/plain');
              if (fileLink && fileLink.startsWith('[') && fileLink.includes('](') && fileLink.endsWith(')')) {
                event.preventDefault();
                
                const coordinates = view.posAtCoords({
                  left: event.clientX,
                  top: event.clientY
                });
                
                if (!coordinates) {
                  logger.warn(LogCategory.EDITOR, '[SidebarFileDrop] ⚠️ Impossible de déterminer la position du drop');
                  return false;
                }

                try {
                  // Insérer le lien markdown directement comme texte
                  const tr = view.state.tr.insertText(fileLink, coordinates.pos);
                  view.dispatch(tr);
                  
                  logger.info(LogCategory.EDITOR, '[SidebarFileDrop] ✅ Lien fichier inséré:', { fileLink });
                  return true;
                } catch (error) {
                  logger.error(LogCategory.EDITOR, '[SidebarFileDrop] ❌ Erreur insertion lien:', error);
                  return false;
                }
              }
            }

            // Ne pas intercepter, laisser les autres handlers gérer
            return false;
          },
        },
      }),
    ];
  },
});

export default SidebarFileDropExtension;

