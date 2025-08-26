import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import SlashMenu from './SlashMenu';
import './editor/editor-slash-menu.css';
// import type { SlashCommand } from './SlashMenu';
type SlashCommand = {
  id: string;
  alias: Record<string, string | string[]>;
  label: Record<string, string>;
  description: Record<string, string>;
  preview?: string;
  action?: (editor: unknown) => void;
  [key: string]: unknown;
};

export interface EditorSlashMenuProps {
  onInsert: (cmd: SlashCommand) => void;
  lang?: string;
  onOpenImageMenu?: () => void;
}

export interface EditorSlashMenuHandle {
  openMenu: (anchor: { left: number; top: number }) => void;
  closeMenu: () => void;
}

const EditorSlashMenu = forwardRef<EditorSlashMenuHandle, EditorSlashMenuProps>(
  function EditorSlashMenu({ onInsert, lang = 'fr', onOpenImageMenu }, ref) {
    const [slashOpen, setSlashOpen] = useState(false);
    const [slashSearch, setSlashSearch] = useState('');
    const slashAnchorRef = useRef<{ left: number; top: number; closeMenu?: () => void }>({ left: 0, top: 0 });

    // Fonction pour ouvrir le menu à une position donnée
    const openMenu = (anchor: { left: number; top: number }) => {
      slashAnchorRef.current = {
        ...anchor,
        closeMenu: () => {
          setSlashOpen(false);
          setSlashSearch('');
        },
      };
      setSlashSearch('/');
      setSlashOpen(true);
    };

    // Fonction pour fermer le menu
    const closeMenu = () => {
      setSlashOpen(false);
      setSlashSearch('');
    };

    useImperativeHandle(ref, () => ({ openMenu, closeMenu }), [openMenu]);

    // Fonction pour insérer un bloc
    const handleSelect = (cmd: SlashCommand) => {
      // Gestion spéciale pour la commande image
      if (cmd.id === 'image' && onOpenImageMenu) {
        onOpenImageMenu();
        closeMenu();
        return;
      }
      
      onInsert(cmd);
      closeMenu();
    };

    React.useEffect(() => {
      if (!slashOpen) return;
      // Fermer au clic extérieur
      const handleClick = () => {
        setSlashOpen(false);
      };
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }, [slashOpen]);

    React.useEffect(() => {
      if (!slashOpen) return;
      // Ferme si la recherche ne commence plus par '/' OU si un espace suit immédiatement '/'
      if (slashSearch && (!slashSearch.startsWith('/') || /^\/\s/.test(slashSearch))) {
        setSlashOpen(false);
        setSlashSearch('');
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