/**
 * Menu flottant Notion-like pour l'éditeur
 * 
 * @description Menu contextuel qui apparaît lors de la sélection de texte
 * avec les options de formatage et "Ask AI" en premier.
 * Design inspiré de Notion avec animations fluides.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Editor } from '@tiptap/react';
import { 
  FiBold, 
  FiItalic, 
  FiUnderline, 
  FiZap,
  FiCode,
  FiLink,
  FiEdit3,
  FiChevronDown,
  FiType
} from 'react-icons/fi';
import { useAuth } from '@/hooks/useAuth';
import { EditorPromptExecutor } from '@/services/editorPromptExecutor';
import type { EditorPrompt } from '@/types/editorPrompts';
import { simpleLogger as logger } from '@/utils/logger';
import './floating-menu-notion.css';
import TransformMenu from './TransformMenu';
import AskAIMenu from './AskAIMenu';

interface FloatingMenuNotionProps {
  editor: Editor | null;
  noteId?: string;
  noteTitle?: string;
  noteContent?: string;
  noteSlug?: string;
  classeurId?: string;
  classeurName?: string;
}

interface MenuPosition {
  top: number;
  left: number;
  visible: boolean;
}

const FloatingMenuNotion: React.FC<FloatingMenuNotionProps> = ({ 
  editor,
  noteId,
  noteTitle,
  noteContent,
  noteSlug,
  classeurId,
  classeurName
}) => {
  const { user, getAccessToken } = useAuth();
  const [position, setPosition] = useState<MenuPosition>({
    top: 0,
    left: 0,
    visible: false
  });
  
  const menuRef = useRef<HTMLDivElement>(null);
  const [selectedText, setSelectedText] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isTransformMenuOpen, setTransformMenuOpen] = useState(false);
  const [isAskAIMenuOpen, setAskAIMenuOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const isDraggingRef = useRef(false);

  // Mise à jour de la position du menu avec délai
  const updatePosition = () => {
    if (!editor) return;

    // Annuler le timeout précédent
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const { state } = editor;
    const { selection } = state;
    
    // 🔧 FIX : Ne PAS afficher le menu pour les NodeSelection (drag handles, images, etc.)
    // ✅ MAIS autoriser AllSelection (CMD+A)
    const selectionType = selection.constructor.name;
    if (selectionType === 'NodeSelection') {
      timeoutRef.current = setTimeout(() => {
        setPosition(prev => ({ ...prev, visible: false }));
      }, 100);
      return;
    }
    
    // 🔧 FIX : Vérifier si un drag handle est actif
    // Les drag handles ont des classes spécifiques
    const activeElement = document.activeElement;
    const isDragHandleActive = activeElement?.closest('.notion-drag-handle') || 
                              activeElement?.closest('.drag-handle-custom') ||
                              activeElement?.closest('[data-drag-handle]');
    
    if (isDragHandleActive) {
      timeoutRef.current = setTimeout(() => {
        setPosition(prev => ({ ...prev, visible: false }));
      }, 100);
      return;
    }
    
    // Vérifier s'il y a une sélection de texte
    if (selection.empty) {
      // Délai avant de masquer le menu
      timeoutRef.current = setTimeout(() => {
        setPosition(prev => ({ ...prev, visible: false }));
      }, 100);
      return;
    }

    // Récupérer le texte sélectionné
    const text = state.doc.textBetween(selection.from, selection.to);
    setSelectedText(text);

    // Vérifier que le texte n'est pas vide
    if (!text.trim()) {
      timeoutRef.current = setTimeout(() => {
        setPosition(prev => ({ ...prev, visible: false }));
      }, 100);
      return;
    }


    // Délai avant d'afficher le menu
    timeoutRef.current = setTimeout(() => {
      // Calculer la position
      try {
        const { view } = editor;
        const { from, to } = selection;

        // ✅ LIKE MENTION MENU : Position relative au conteneur éditeur
        const editorElement = view.dom;
        const editorRect = editorElement.getBoundingClientRect();
        
        // Coordonnées de la sélection (absolues page)
        const startCoords = view.coordsAtPos(from);
        const endCoords = view.coordsAtPos(to);
        
        // ✅ Convertir en coordonnées relatives à l'éditeur
        const relativeTop = startCoords.top - editorRect.top;
        const relativeLeft = (startCoords.left + endCoords.left) / 2 - editorRect.left;
        
        // ✅ Position verticale : 60px au-dessus de la sélection
        const menuHeight = 60;
        let top = relativeTop - menuHeight;
        
        // Si pas assez de place en haut, positionner EN DESSOUS
        if (top < 10) {
          top = (endCoords.bottom - editorRect.top) + 10;
        }
        
        // ✅ Position horizontale : Centrée sur la sélection
        let left = relativeLeft - 150; // Centrer le menu (300px de large)
        
        // Empêcher débordement horizontal
        left = Math.max(10, Math.min(left, editorRect.width - 310));

        setPosition({
          top: top,
          left: left,
          visible: true
        });

      } catch (error) {
        // Erreur lors du calcul de la position du menu flottant
        setPosition(prev => ({ ...prev, visible: false }));
      }
    }, 150);
  };

  // Fermer les sous-menus si le menu principal se ferme
  useEffect(() => {
    if (!position.visible) {
      setTransformMenuOpen(false);
      setAskAIMenuOpen(false);
    }
  }, [position.visible]);

  // 🔧 FIX : Détecter les interactions avec drag handles
  useEffect(() => {
    if (!editor) return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Vérifier si le clic est sur un drag handle
      if (target.closest('.notion-drag-handle') || 
          target.closest('.drag-handle-custom') ||
          target.closest('[data-drag-handle]')) {
        isDraggingRef.current = true;
        // Masquer le menu immédiatement
        setPosition(prev => ({ ...prev, visible: false }));
      }
    };

    const handleMouseUp = () => {
      // Réinitialiser après un court délai
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 200);
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [editor]);

  // Écouter les changements de sélection
  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      // 🔧 FIX : Ne pas mettre à jour si on est en train de drag
      if (isDraggingRef.current) {
        return;
      }
      
      updatePosition();
    };

    editor.on('selectionUpdate', handleSelectionUpdate);
    // ✅ Supprimer l'écoute de 'transaction' qui se déclenche trop souvent (scroll, etc.)
    // editor.on('transaction', handleSelectionUpdate);

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
      // editor.off('transaction', handleSelectionUpdate);
      // Nettoyer le timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [editor]);

  // Gérer le clic en dehors du menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setPosition(prev => ({ ...prev, visible: false }));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Commandes de formatage
  const formatCommands = React.useMemo(() => [
    {
      id: 'bold',
      icon: FiBold,
      label: 'Gras',
      action: () => editor?.chain().focus().toggleBold().run(),
      isActive: () => editor?.isActive('bold') || false
    },
    {
      id: 'italic',
      icon: FiItalic,
      label: 'Italique',
      action: () => editor?.chain().focus().toggleItalic().run(),
      isActive: () => editor?.isActive('italic') || false
    },
    {
      id: 'underline',
      icon: FiUnderline,
      label: 'Souligné',
      action: () => editor?.chain().focus().toggleUnderline().run(),
      isActive: () => editor?.isActive('underline') || false
    },
    {
      id: 'code',
      icon: FiCode,
      label: 'Code',
      action: () => editor?.chain().focus().toggleCode().run(),
      isActive: () => editor?.isActive('code') || false
    },
    {
      id: 'link',
      icon: FiLink,
      label: 'Lien',
      action: () => {
        const url = window.prompt('Entrez l\'URL du lien:');
        if (url) {
          editor?.chain().focus().setLink({ href: url }).run();
        }
      },
      isActive: () => editor?.isActive('link') || false
    }
  ], [editor]);

  if (!editor || !position.visible) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="floating-menu-notion"
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 9999
      }}
    >
      <div className="floating-menu-content">
        <button
          className="floating-menu-button transform-button"
          onClick={() => {
            setTransformMenuOpen(!isTransformMenuOpen);
            setAskAIMenuOpen(false);
          }}
          aria-expanded={isTransformMenuOpen}
        >
          <FiType size={16} />
          <span>Transformer</span>
          <FiChevronDown size={14} className="chevron-icon" />
        </button>

        <button
          className="floating-menu-button ask-ai-dropdown-button"
          onClick={() => {
            setAskAIMenuOpen(!isAskAIMenuOpen);
            setTransformMenuOpen(false);
          }}
          aria-expanded={isAskAIMenuOpen}
        >
          <FiZap size={16} />
          <span>Ask AI</span>
          <FiChevronDown size={14} className="chevron-icon" />
        </button>

        <div className="separator"></div>

        {formatCommands.map((command) => {
          const Icon = command.icon;
          const isActive = command.isActive?.() || false;
          
          return (
            <button
              key={command.id}
              className={`floating-menu-button ${isActive ? 'active' : ''}`}
              onClick={command.action}
              title={command.label}
              aria-label={command.label}
            >
              {Icon && <Icon size={16} />}
              <span className="button-label">{command.label}</span>
            </button>
          );
        })}

        {isExecuting && (
          <div className="streaming-indicator">
            <span>L'IA écrit</span>
            <div className="streaming-dots">
              <div className="streaming-dot"></div>
              <div className="streaming-dot"></div>
              <div className="streaming-dot"></div>
            </div>
          </div>
        )}
      </div>
      {isTransformMenuOpen && editor && (
        <div className="transform-menu-container">
          <TransformMenu editor={editor} onClose={() => setTransformMenuOpen(false)} />
        </div>
      )}
      {isAskAIMenuOpen && editor && (
        <div className="ask-ai-menu-container">
          <AskAIMenu 
            editor={editor} 
            selectedText={selectedText}
            onClose={() => setAskAIMenuOpen(false)}
            onExecutePrompt={async (prompt: EditorPrompt, text: string) => {
              // ✅ FIX: Utiliser user.id directement au lieu du JWT
              if (!user?.id) {
                logger.error('[FloatingMenuNotion] ❌ Utilisateur non connecté');
                return;
              }

              setIsExecuting(true);
              logger.info('[FloatingMenuNotion] 🚀 Exécution prompt (streaming):', prompt.name);

              try {
                // 🎯 Préparer la position d'insertion selon le mode
                const insertionMode = prompt.insertion_mode || 'replace';
                const { from, to } = editor.state.selection;
                
                // Sauvegarder la position d'insertion
                let insertPosition = from;
                
                // Préparer le curseur selon le mode d'insertion
                switch (insertionMode) {
                  case 'replace':
                    // Supprimer la sélection AVANT le streaming
                    editor.chain().focus().deleteSelection().run();
                    insertPosition = editor.state.selection.from;
                    logger.dev('[FloatingMenuNotion] 🎯 Mode replace: sélection supprimée');
                    break;
                    
                  case 'append':
                    // Positionner après la sélection avec saut de ligne
                    editor.chain().focus(to).insertContent('\n\n').run();
                    insertPosition = editor.state.selection.from;
                    logger.dev('[FloatingMenuNotion] 🎯 Mode append: curseur après sélection');
                    break;
                    
                  case 'prepend':
                    // Positionner avant la sélection
                    editor.chain().focus(from).run();
                    insertPosition = from;
                    logger.dev('[FloatingMenuNotion] 🎯 Mode prepend: curseur avant sélection');
                    break;
                    
                  default:
                    // Fallback sur replace
                    editor.chain().focus().deleteSelection().run();
                    insertPosition = editor.state.selection.from;
                    logger.warn('[FloatingMenuNotion] ⚠️ Mode d\'insertion inconnu, fallback sur replace');
                }

                // 🌊 STREAMING : Texte brut pendant stream + Markdown parsé à la fin
                let accumulatedContent = '';
                const startPos = insertPosition;
                
                // ✅ NOUVEAU : Construire le contexte enrichi de la note
                const noteContext = noteId && noteTitle && noteContent ? {
                  noteId,
                  noteTitle,
                  noteContent,
                  noteSlug,
                  classeurId,
                  classeurName
                } : undefined;

                logger.dev('[FloatingMenuNotion] 📎 Contexte note pour Ask AI:', {
                  hasContext: !!noteContext,
                  noteTitle: noteContext?.noteTitle,
                  contentLength: noteContext?.noteContent?.length
                });
                
                const result = await EditorPromptExecutor.executePromptStream(
                  prompt,
                  text,
                  user.id,
                  (chunk: string) => {
                    // ✅ Accumuler le contenu complet
                    accumulatedContent += chunk;
                    
                    // ✅ Pendant le streaming : Insertion en TEXTE BRUT uniquement (pas de parsing)
                    // Remplacer tout le texte brut accumulé à chaque chunk
                    const currentLength = editor.state.doc.textBetween(startPos, editor.state.doc.content.size).length;
                    const endPos = startPos + Math.min(accumulatedContent.length, currentLength + chunk.length);
                    
                    editor.chain()
                      .focus()
                      .setTextSelection({ from: startPos, to: Math.min(endPos, editor.state.doc.content.size) })
                      .deleteSelection()
                      .focus(startPos)
                      .insertContent({ type: 'text', text: accumulatedContent }) // Texte brut (pas de parsing)
                      .run();
                  },
                  noteContext // ✅ NOUVEAU : Passer le contexte enrichi
                );

                logger.info('[FloatingMenuNotion] ✅ Streaming terminé, conversion en markdown...', {
                  success: result.success,
                  mode: insertionMode,
                  contentLength: accumulatedContent.length
                });

                // ✅ À LA FIN : Remplacer le texte brut par du markdown parsé
                if (result.success && accumulatedContent) {
                  const endPos = startPos + accumulatedContent.length;
                  editor.chain()
                    .focus()
                    .setTextSelection({ from: startPos, to: Math.min(endPos, editor.state.doc.content.size) })
                    .deleteSelection()
                    .focus(startPos)
                    .insertContent(accumulatedContent) // Parse le markdown complet maintenant
                    .run();
                  
                  logger.info('[FloatingMenuNotion] ✅ Markdown converti avec succès');
                }

                // Ajouter saut de ligne après si mode prepend
                if (insertionMode === 'prepend' && result.success) {
                  editor.commands.insertContent('\n\n');
                }

                if (!result.success) {
                  logger.error('[FloatingMenuNotion] ❌ Erreur streaming:', result.error || 'Erreur inconnue');
                }
              } catch (error) {
                logger.error('[FloatingMenuNotion] ❌ Erreur:', error);
              } finally {
                setIsExecuting(false);
              }
            }}
          />
        </div>
      )}
    </div>
  );
};

export default FloatingMenuNotion;
