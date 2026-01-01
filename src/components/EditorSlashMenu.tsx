import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import SlashMenu from './SlashMenu';
import './editor/editor-slash-menu.css';
import type { Editor } from '@tiptap/react';

/**
 * Type pour une commande slash dans EditorSlashMenu
 * Différent du type dans @/types/slashCommands (multilingue avec Record)
 */
export type EditorSlashCommand = {
  id: string;
  alias: Record<string, string | string[]>;
  label: Record<string, string>;
  description: Record<string, string>;
  preview?: string;
  action?: (editor: Editor) => void;
  [key: string]: unknown;
};

export interface EditorSlashMenuProps {
  editor: Editor | null;
  onInsert: (cmd: EditorSlashCommand) => void;
  lang?: string;
  onOpenImageMenu?: () => void;
}

export interface EditorSlashMenuHandle {
  openMenu: (anchor: { left: number; top: number }) => void;
  closeMenu: () => void;
}

const EditorSlashMenu = forwardRef<EditorSlashMenuHandle, EditorSlashMenuProps>(
  function EditorSlashMenu({ editor, onInsert, lang = 'fr', onOpenImageMenu }, ref) {
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
      // Remettre le focus sur l'éditeur
      if (editor) {
        editor.commands.focus();
      }
    };

    useImperativeHandle(ref, () => ({ openMenu, closeMenu }), [openMenu]);

    // Fonction pour insérer un bloc
    const handleSelect = (cmd: EditorSlashCommand) => {
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
      // Ferme si la recherche ne commence plus par '/'
      if (slashSearch && !slashSearch.startsWith('/')) {
        setSlashOpen(false);
        setSlashSearch('');
      }
      // Si un espace suit '/', on ferme le menu, on refocus l'éditeur et on insère l'espace
      if (/^\/\s/.test(slashSearch)) {
        setSlashOpen(false);
        setSlashSearch('');
        if (editor) {
          editor.chain().focus().insertContent(' ').run();
        }
      }
    }, [slashSearch, slashOpen, editor]);

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