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

  // Mise à jour de la position du menu avec délai
  const updatePosition = () => {
    if (!editor) return;

    // Annuler le timeout précédent
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const { state } = editor;
    const { selection } = state;
    
    // Vérifier s'il y a une sélection de texte
    if (selection.empty) {
      console.log('FloatingMenu: Sélection vide');
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
      console.log('FloatingMenu: Texte vide');
      timeoutRef.current = setTimeout(() => {
        setPosition(prev => ({ ...prev, visible: false }));
      }, 100);
      return;
    }

    console.log('FloatingMenu: Texte sélectionné:', text);

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

        console.log('FloatingMenu: Block parent found:', blockParent, 'Calculated top:', top);

      } catch (error) {
        console.warn('Erreur lors du calcul de la position du menu flottant:', error);
        setPosition(prev => ({ ...prev, visible: false }));
      }
    }, 150);
  };

  // Fermer le sous-menu si le menu principal se ferme
  useEffect(() => {
    if (!position.visible) {
      setTransformMenuOpen(false);
    }
  }, [position.visible]);

  // Écouter les changements de sélection
  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
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
  const formatCommands = [
    {
      id: 'ask-ai',
      icon: FiZap,
      label: 'Ask AI',
      action: () => onAskAI?.(selectedText),
      className: 'ask-ai-button'
    },
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
  ];

  // Debug: afficher le menu même si invisible pour tester
  if (!editor) {
    return null;
  }

  // Debug: forcer l'affichage pour tester
  if (!position.visible) {
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
          onClick={() => setTransformMenuOpen(!isTransformMenuOpen)}
        >
          <FiType size={16} />
          <span>Transformer</span>
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
    </div>
  );
};

export default FloatingMenuNotion;
