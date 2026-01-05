/**
 * Composant de liste virtualisée pour les notes
 * Utilise @tanstack/react-virtual pour rendre uniquement les items visibles
 * 
 * Conforme GUIDE-EXCELLENCE-CODE.md :
 * - Virtualisation si > 20 items
 * - Render seulement items visibles + buffer 5 items
 * - Max hauteur : 600px, item height : 60px
 */

'use client';

import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

export interface VirtualizedNoteListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight?: number;
  maxHeight?: number;
  className?: string;
}

/**
 * Liste virtualisée générique
 */
export function VirtualizedNoteList<T>({
  items,
  renderItem,
  itemHeight = 60,
  maxHeight = 600,
  className = ''
}: VirtualizedNoteListProps<T>): React.ReactElement {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 5 // Buffer de 5 items
  });

  return (
    <div
      ref={parentRef}
      className={className}
      style={{
        height: Math.min(maxHeight, items.length * itemHeight),
        overflow: 'auto'
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

