/**
 * Composant DragHandle personnalisé pour l'éditeur
 * 
 * @description Composant React qui utilise l'extension @tiptap/extension-drag-handle-react
 * avec un design personnalisé inspiré de Notion. Affiche l'icône grip (⋮⋮) 
 * et gère le positionnement et les interactions de drag & drop.
 */

import React from 'react';
import { DragHandle as TiptapDragHandle } from '@tiptap/extension-drag-handle-react';
import type { Editor } from '@tiptap/react';
import type { Node } from '@tiptap/pm/model';
import { GripVertical } from 'lucide-react';

interface DragHandleProps {
  editor: Editor;
  className?: string;
  onNodeChange?: (data: { node: Node | null; editor: Editor; pos: number }) => void;
}

/**
 * Composant DragHandle personnalisé avec design Notion-like
 */
export const DragHandle: React.FC<DragHandleProps> = ({ 
  editor, 
  className = 'drag-handle-custom',
  onNodeChange 
}) => {
  return (
    <TiptapDragHandle
      editor={editor}
      className={className}
      onNodeChange={onNodeChange}
      computePositionConfig={{
        placement: 'left-start',
        strategy: 'absolute',
        middleware: [
          {
            name: 'offset',
            options: {
              offset: [-8, 0],
            },
          },
          {
            name: 'flip',
            options: {
              fallbackPlacements: ['right-start', 'left-end', 'right-end'],
            },
          },
        ],
      }}
    >
      {/* Icône grip personnalisée style Notion */}
      <div className="drag-handle-content">
        <GripVertical size={16} className="drag-handle-icon" />
        <div className="drag-handle-dots">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
      </div>
    </TiptapDragHandle>
  );
};

export default DragHandle;


