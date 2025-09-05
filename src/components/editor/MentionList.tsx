import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { ReactRenderer } from '@tiptap/react';
import { SuggestionOptions } from '@tiptap/suggestion';

interface MentionItem {
  id: string;
  label: string;
  email: string;
  avatar?: string;
}

interface MentionListProps {
  items: MentionItem[];
  command: (item: MentionItem) => void;
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const MentionList = forwardRef<MentionListRef, MentionListProps>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = items[index];
    if (item) {
      command(item);
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + items.length - 1) % items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }

      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }

      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  return (
    <div className="mention-list">
      {items.length ? (
        items.map((item, index) => (
          <button
            key={item.id}
            className={`mention-item ${index === selectedIndex ? 'is-selected' : ''}`}
            onClick={() => selectItem(index)}
          >
            <div className="mention-avatar">
              {item.avatar ? (
                <img src={item.avatar} alt={item.label} />
              ) : (
                <div className="mention-avatar-placeholder">
                  {item.label.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="mention-content">
              <div className="mention-label">{item.label}</div>
              <div className="mention-email">{item.email}</div>
            </div>
          </button>
        ))
      ) : (
        <div className="mention-empty">Aucun utilisateur trouvé</div>
      )}
    </div>
  );
});

MentionList.displayName = 'MentionList';

export default MentionList;
