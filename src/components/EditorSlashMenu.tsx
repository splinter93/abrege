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
      onInsert(cmd);
      closeMenu();
    };

    React.useEffect(() => {
      if (!slashOpen) return;
      // Fermer au clic extérieur
      const handleClick = (e: MouseEvent) => {
        setSlashOpen(false);
      };
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }, [slashOpen]);

    React.useEffect(() => {
      if (!slashOpen) return;
      // Fermer si le champ de recherche ne commence plus par '/'
      if (slashSearch && !slashSearch.startsWith('/')) {
        setSlashOpen(false);
      }
    }, [slashSearch, slashOpen]);

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