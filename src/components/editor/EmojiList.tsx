import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { ReactRenderer } from '@tiptap/react';
import { SuggestionOptions } from '@tiptap/suggestion';

interface EmojiItem {
  name: string;
  emoji: string;
  keywords: string[];
}

interface EmojiListProps {
  items: EmojiItem[];
  command: (item: EmojiItem) => void;
}

export interface EmojiListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const EmojiList = forwardRef<EmojiListRef, EmojiListProps>(({ items, command }, ref) => {
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
    <div className="emoji-list">
      {items.length ? (
        items.map((item, index) => (
          <button
            key={item.name}
            className={`emoji-item ${index === selectedIndex ? 'is-selected' : ''}`}
            onClick={() => selectItem(index)}
            title={item.name}
          >
            <span className="emoji-char">{item.emoji}</span>
            <span className="emoji-name">{item.name}</span>
          </button>
        ))
      ) : (
        <div className="emoji-empty">Aucun emoji trouvé</div>
      )}
    </div>
  );
});

EmojiList.displayName = 'EmojiList';

export default EmojiList;
