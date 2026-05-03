'use client';

import React from 'react';
import { FiImage } from 'react-icons/fi';
import type { EditorState } from '@/hooks/editor/useEditorState';
import type { UseEditorHandlersReturn } from '@/hooks/editor/useEditorHandlers';
import { uploadImageForNote } from '@/utils/fileUpload';

export interface AddHeaderImageRowProps {
  noteId: string;
  editorState: EditorState;
  handlers: UseEditorHandlersReturn;
}

/**
 * CTA « ajouter image d’en-tête » (drag & drop + bouton).
 * En pleine page : rendu dans le flux document ; en panneau note : via EditorLayout → coin du wrapper de contenu.
 */
export function AddHeaderImageRow({ noteId, editorState, handlers }: AddHeaderImageRowProps) {
  return (
    <div className="editor-add-header-image-row editor-add-image-center">
      <div
        className="editor-add-header-image"
        onDragOver={(e) => {
          const items = Array.from(e.dataTransfer?.items || []);
          const hasLocalFile = items.some((it) => it.kind === 'file');
          const hasSidebarImage = e.dataTransfer?.types.includes('application/x-scrivia-image-url');
          if (hasLocalFile || hasSidebarImage) e.preventDefault();
        }}
        onDrop={async (e) => {
          try {
            if (!e.dataTransfer) return;

            const imageUrl = e.dataTransfer.getData('application/x-scrivia-image-url');
            if (imageUrl) {
              e.preventDefault();
              handlers.handleHeaderChange(imageUrl);
              return;
            }

            const files = Array.from(e.dataTransfer.files || []);
            if (!files.length) return;
            const image = files.find((f) => /^image\/(jpeg|png|webp|gif)$/.test(f.type));
            if (!image) return;
            e.preventDefault();
            const { publicUrl } = await uploadImageForNote(image, noteId);
            handlers.handleHeaderChange(publicUrl);
          } catch {
            /* drop image en-tête annulé — ignoré */
          }
        }}
      >
        <button
          className="editor-add-header-image-btn"
          onClick={() => {
            editorState.setImageMenuTarget('header');
            editorState.setImageMenuOpen(true);
          }}
          aria-label="Ajouter une image d'en-tête"
          title="Ajouter une image d'en-tête"
        >
          <FiImage size={20} />
        </button>
      </div>
    </div>
  );
}
