/**
 * Hook pour les commandes de formatage du menu
 */

import { useMemo } from 'react';
import type { Editor } from '@tiptap/react';
import { FiBold, FiItalic, FiUnderline, FiCode, FiLink } from 'react-icons/fi';
import type { FormatCommand } from '../types';

export function useFormatCommands(editor: Editor | null): FormatCommand[] {
  return useMemo(() => [
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
  ], [editor]);
}

