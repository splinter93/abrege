import React, { useEffect, useState, useRef } from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import './table-controls.css';
import type { FullEditorInstance } from '@/types/editor';
import { logger, LogCategory } from '@/utils/logger';

interface TableControlsProps {
  editor: FullEditorInstance | null;
  containerRef: React.RefObject<HTMLElement>;
}

interface Position {
  top: number;
  left: number;
}

const TableControls: React.FC<TableControlsProps> = ({ editor, containerRef }) => {
  const [pos, setPos] = useState<Position>({ top: 0, left: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const controlsRef = useRef<HTMLDivElement>(null);

  // Find table element at cursor position
  const findTableAtCursor = (el: Element | null): Element | null => {
    if (!el) return null;
    let node: Element | null = el instanceof HTMLElement ? el : null;
    if (!node && el) {
      const elementWithNode = el as Element & { node?: Element };
      if (elementWithNode.node) {
        node = elementWithNode.node;
      }
    }
    
    // Walk up the DOM tree to find a table
    while (node && node !== containerRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'TABLE') {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  };

  // Update position when selection changes
  const updatePosition = () => {
    if (!editor || !containerRef.current) return;

    try {
      const view = editor.view;
      const { from } = view.state.selection;
      const coords = view.coordsAtPos(from);
      
      if (coords) {
        const table = findTableAtCursor(view.dom.querySelector('.ProseMirror-selectednode'));
        if (table) {
          const rect = table.getBoundingClientRect();
          const containerRect = containerRef.current.getBoundingClientRect();
          
          setPos({
            top: rect.top - containerRect.top - 40,
            left: rect.left - containerRect.left + rect.width / 2 - 60
          });
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      }
    } catch (error) {
      logger.error(LogCategory.EDITOR, 'Erreur lors de la mise à jour de la position des contrôles de tableau', error);
    }
  };

  // Subscribe to editor events
  useEffect(() => {
    if (!editor) return;

    // Use a more efficient polling approach
    const interval = setInterval(() => {
      // Only update position if editor is focused and has selection
      if (editor.isFocused && editor.state.selection) {
        updatePosition();
      }
    }, 200); // Check every 200ms when focused

    return () => {
      clearInterval(interval);
    };
  }, [editor]);

  // Check if operations are possible
  const canAddRowBefore = !!editor && !!editor.can?.().chain().focus().addRowBefore().run();
  const canAddRowAfter = !!editor && !!editor.can?.().chain().focus().addRowAfter().run();
  const canAddColBefore = !!editor && !!editor.can?.().chain().focus().addColumnBefore().run();
  const canAddColAfter = !!editor && !!editor.can?.().chain().focus().addColumnAfter().run();

  // Table operations
  const addRowAbove = () => {
    if (editor) {
      editor.chain().focus().addRowBefore().run();
    }
  };
  const addRowBelow = () => {
    if (editor) {
      editor.chain().focus().addRowAfter().run();
    }
  };
  const addColLeft = () => {
    if (editor) {
      editor.chain().focus().addColumnBefore().run();
    }
  };
  const addColRight = () => {
    if (editor) {
      editor.chain().focus().addColumnAfter().run();
    }
  };

  if (!isVisible || !editor) return null;

  return (
    <div className="table-controls" style={{ top: pos.top, left: pos.left }}>
      <div className="table-controls-row">
        <button
          className="table-control-btn"
          onClick={addRowAbove}
          disabled={!canAddRowBefore}
          title="Ajouter une ligne au-dessus"
        >
          <FiPlus size={14} />
        </button>
        <button
          className="table-control-btn"
          onClick={addRowBelow}
          disabled={!canAddRowAfter}
          title="Ajouter une ligne en-dessous"
        >
          <FiPlus size={14} />
        </button>
      </div>
      <div className="table-controls-col">
        <button
          className="table-control-btn"
          onClick={addColLeft}
          disabled={!canAddColBefore}
          title="Ajouter une colonne à gauche"
        >
          <FiPlus size={14} />
        </button>
        <button
          className="table-control-btn"
          onClick={addColRight}
          disabled={!canAddColAfter}
          title="Ajouter une colonne à droite"
        >
          <FiPlus size={14} />
        </button>
      </div>
    </div>
  );
};

export default TableControls; 