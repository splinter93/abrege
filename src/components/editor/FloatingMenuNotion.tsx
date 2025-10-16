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
import './floating-menu-notion.css';
import TransformMenu from './TransformMenu';
import AskAIMenu from './AskAIMenu';

interface FloatingMenuNotionProps {
  editor: Editor | null;
  onAskAI?: (selectedText: string) => void;
}

interface MenuPosition {
  top: number;
  left: number;
  visible: boolean;
}

const FloatingMenuNotion: React.FC<FloatingMenuNotionProps> = ({ 
  editor, 
  onAskAI 
}) => {
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
    const selectionType = selection.constructor.name;
    if (selectionType === 'NodeSelection' || selectionType === 'AllSelection') {
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

        // Obtenir le nœud DOM au début de la sélection
        const { node: domNode } = view.domAtPos(from);
        let currentNode: Node | null = domNode;

        // Remonter dans l'arbre DOM pour trouver le parent de type bloc
        let blockParent: HTMLElement | null = null;
        while (currentNode && currentNode !== view.dom) {
          if (currentNode.nodeType === Node.ELEMENT_NODE) {
            const element = currentNode as HTMLElement;
            const style = window.getComputedStyle(element);
            
            if (style.display === 'block' || style.display === 'list-item') {
              blockParent = element;
              break;
            }
          }
          currentNode = currentNode.parentNode;
        }

        const startCoords = view.coordsAtPos(from);
        const endCoords = view.coordsAtPos(to);
        
        let topPosition: number;
        if (blockParent) {
          // Si on a trouvé le bloc parent, on utilise sa position supérieure
          const rect = blockParent.getBoundingClientRect();
          topPosition = rect.top;
        } else {
          // Sinon, on se rabat sur la position du curseur
          topPosition = startCoords.top;
        }
        
        const menuHeight = 60; // Hauteur approximative du menu + espace
        const top = topPosition - menuHeight;
        
        // La position horizontale reste centrée sur la sélection
        const left = (startCoords.left + endCoords.left) / 2;

        setPosition({
          top: Math.max(10, top), // Marge minimale du haut de la page
          left: Math.max(10, left - 150), // Centrer le menu horizontalement
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
    editor.on('transaction', handleSelectionUpdate);

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
      editor.off('transaction', handleSelectionUpdate);
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
      id: 'strikethrough',
      icon: FiEdit3,
      label: 'Barré',
      action: () => editor?.chain().focus().toggleStrike().run(),
      isActive: () => editor?.isActive('strike') || false
    },
    {
      id: 'highlight',
      icon: FiEdit3,
      label: 'Surligner',
      action: () => editor?.chain().focus().toggleHighlight().run(),
      isActive: () => editor?.isActive('highlight') || false
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
  ], [editor, onAskAI, selectedText]);

  if (!editor || !position.visible) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="floating-menu-notion"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
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
              className={`floating-menu-button ${command.className || ''} ${isActive ? 'active' : ''}`}
              onClick={command.action}
              title={command.label}
              aria-label={command.label}
            >
              {Icon && <Icon size={16} />}
              <span className="button-label">{command.label}</span>
            </button>
          );
        })}
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
            onAskAI={(prompt, text) => onAskAI?.(`${prompt}: ${text}`)}
          />
        </div>
      )}
    </div>
  );
};

export default FloatingMenuNotion;
