import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import SlashMenu from './SlashMenu';

export interface EditorSlashMenuProps {
  onInsert: (type: string, data?: any) => void;
  lang?: string;
}

export interface EditorSlashMenuHandle {
  openMenu: (anchor: { left: number; top: number }) => void;
}

const EditorSlashMenu = forwardRef<EditorSlashMenuHandle, EditorSlashMenuProps>(
  ({ onInsert, lang = 'fr' }, ref) => {
    const [slashOpen, setSlashOpen] = useState(false);
    const [slashSearch, setSlashSearch] = useState('');
    const slashAnchorRef = useRef<{ left: number; top: number }>({ left: 0, top: 0 });

    // Fonction pour ouvrir le menu à une position donnée
    const openMenu = (anchor: { left: number; top: number }) => {
      slashAnchorRef.current = anchor;
      setSlashOpen(true);
    };

    useImperativeHandle(ref, () => ({ openMenu }), [openMenu]);

    // Fonction pour fermer le menu
    const closeMenu = () => {
      setSlashOpen(false);
      setSlashSearch('');
    };

    // Fonction pour insérer un bloc
    const handleSelect = (cmd: any) => {
      onInsert(cmd.type, cmd.data);
      closeMenu();
    };

    return (
      <SlashMenu
        open={slashOpen}
        search={slashSearch}
        setSearch={setSlashSearch}
        onSelect={handleSelect}
        anchorRef={slashAnchorRef}
        lang={lang}
      />
    );
  }
);

export default EditorSlashMenu; 