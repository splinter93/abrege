/**
 * EditorHeader - Header sobre et propre pour l'éditeur
 * Logo à gauche, toolbar au centre, 3 boutons à droite
 */

import React from 'react';
import Link from 'next/link';
import { FiEye, FiMoreHorizontal, FiX, FiEdit2 } from 'react-icons/fi';
import LogoHeader from '@/components/LogoHeader';
import EditorToolbar from './EditorToolbar';
import type { FullEditorInstance } from '@/types/editor';
import './editor-header.css';

interface EditorHeaderProps {
  editor: FullEditorInstance | null;
  onClose: () => void;
  onPreview: () => void;
  onMenuOpen: () => void;
  onImageClick?: () => void;
  onFontChange?: (fontName: string, scope?: 'all' | 'headings' | 'body') => void;
  currentFont?: string;
  kebabBtnRef?: React.RefObject<HTMLButtonElement>;
  readonly?: boolean;
  previewMode?: boolean;
  showToolbar?: boolean;
  canEdit?: boolean; // Si l'user peut éditer (pour afficher le lien vers l'éditeur)
  noteId?: string; // ID de la note pour le lien vers l'éditeur
  kebabMenu?: React.ReactNode; // ✅ Menu kebab rendu dans le header
  onTranscriptionComplete?: (text: string) => void;
}

const EditorHeader: React.FC<EditorHeaderProps> = ({
  editor,
  onClose,
  onPreview,
  onMenuOpen,
  onImageClick,
  onFontChange,
  currentFont,
  kebabBtnRef,
  readonly = false,
  previewMode = false,
  showToolbar = true,
  canEdit = true,
  noteId,
  kebabMenu,
  onTranscriptionComplete
}) => {
  // ✅ DEBUG: Log synchrone pour capturer le problème (pas dans useEffect)
  const shouldRenderToolbar = !previewMode && showToolbar;
  if (process.env.NODE_ENV === 'development') {
    console.log('[EditorHeader] Render state (SYNC)', {
      showToolbar,
      previewMode,
      readonly,
      shouldRenderToolbar,
      noteId,
      timestamp: Date.now(),
      willRender: shouldRenderToolbar
    });
  }

  // ✅ DEBUG: Log pour diagnostiquer (asynchrone)
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[EditorHeader] Render state (ASYNC)', {
        showToolbar,
        previewMode,
        readonly,
        shouldRenderToolbar: !previewMode && showToolbar,
        noteId
      });
    }
  }, [showToolbar, previewMode, readonly, noteId]);

  return (
    <div className={`editor-header ${!showToolbar ? 'editor-header--transparent' : ''}`}>
      {/* Logo à gauche */}
      <div className="editor-header__logo">
        <LogoHeader />
      </div>

      {/* Toolbar au centre - cachée en mode preview ET si showToolbar = false */}
      {/* ✅ FIX: Ne rendre EditorToolbar que si editor existe (évite race condition) */}
      {shouldRenderToolbar && editor ? (
        <div className="editor-header__center" data-debug-toolbar="visible" ref={(el) => {
          // ✅ DEBUG: Vérifier le DOM après le render avec détails complets
          if (process.env.NODE_ENV === 'development' && el) {
            setTimeout(() => {
              const computedStyle = window.getComputedStyle(el);
              const toolbarElement = el.querySelector('.editor-toolbar') as HTMLElement | null;
              const parentHeader = el.closest('.editor-header') as HTMLElement | null;
              
              const debugInfo: any = {
                // Container center
                containerDisplay: computedStyle.display,
                containerVisibility: computedStyle.visibility,
                containerOpacity: computedStyle.opacity,
                containerWidth: computedStyle.width,
                containerHeight: computedStyle.height,
                containerZIndex: computedStyle.zIndex,
                containerPosition: computedStyle.position,
                containerTop: computedStyle.top,
                
                // Toolbar element
                hasToolbar: !!toolbarElement,
                toolbarDisplay: toolbarElement ? window.getComputedStyle(toolbarElement).display : 'N/A',
                toolbarVisibility: toolbarElement ? window.getComputedStyle(toolbarElement).visibility : 'N/A',
                toolbarOpacity: toolbarElement ? window.getComputedStyle(toolbarElement).opacity : 'N/A',
                toolbarWidth: toolbarElement ? window.getComputedStyle(toolbarElement).width : 'N/A',
                toolbarHeight: toolbarElement ? window.getComputedStyle(toolbarElement).height : 'N/A',
                toolbarZIndex: toolbarElement ? window.getComputedStyle(toolbarElement).zIndex : 'N/A',
                
                // Parent header
                hasParentHeader: !!parentHeader,
                parentHeaderDisplay: parentHeader ? window.getComputedStyle(parentHeader).display : 'N/A',
                parentHeaderVisibility: parentHeader ? window.getComputedStyle(parentHeader).visibility : 'N/A',
                parentHeaderOpacity: parentHeader ? window.getComputedStyle(parentHeader).opacity : 'N/A',
                parentHeaderZIndex: parentHeader ? window.getComputedStyle(parentHeader).zIndex : 'N/A',
                parentHeaderPosition: parentHeader ? window.getComputedStyle(parentHeader).position : 'N/A',
                parentHeaderTop: parentHeader ? window.getComputedStyle(parentHeader).top : 'N/A',
                
                // Canvas context
                isInCanvas: el.closest('.chat-canva-pane') !== null,
                canvasPaneDisplay: el.closest('.chat-canva-pane') ? window.getComputedStyle(el.closest('.chat-canva-pane') as HTMLElement).display : 'N/A',
                
                // Editor state
                hasEditor: !!editor,
                shouldRenderToolbar,
                timestamp: Date.now()
              };
              
              // ✅ Afficher les valeurs critiques directement dans le message
              const toolbarComputed = toolbarElement ? window.getComputedStyle(toolbarElement) : null;
              
              // ✅ Vérifier si la toolbar est réellement visible à l'écran (viewport)
              let isToolbarInViewport = false;
              let toolbarRect = null;
              if (toolbarElement) {
                toolbarRect = toolbarElement.getBoundingClientRect();
                isToolbarInViewport = (
                  toolbarRect.top >= 0 &&
                  toolbarRect.left >= 0 &&
                  toolbarRect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                  toolbarRect.right <= (window.innerWidth || document.documentElement.clientWidth)
                );
              }
              
              // ✅ Vérifier si la toolbar est masquée par un parent (overflow hidden, etc.)
              let isToolbarClipped = false;
              if (toolbarElement && parentHeader) {
                const headerRect = parentHeader.getBoundingClientRect();
                const toolbarRect2 = toolbarElement.getBoundingClientRect();
                isToolbarClipped = (
                  toolbarRect2.top < headerRect.top ||
                  toolbarRect2.bottom > headerRect.bottom ||
                  toolbarRect2.left < headerRect.left ||
                  toolbarRect2.right > headerRect.right
                );
              }
              
              const criticalValues = {
                hasToolbar: !!toolbarElement,
                toolbarDisplay: toolbarComputed?.display || 'N/A',
                toolbarVisibility: toolbarComputed?.visibility || 'N/A',
                toolbarOpacity: toolbarComputed?.opacity || 'N/A',
                toolbarWidth: toolbarComputed?.width || 'N/A',
                toolbarHeight: toolbarComputed?.height || 'N/A',
                toolbarZIndex: toolbarComputed?.zIndex || 'N/A',
                toolbarPosition: toolbarComputed?.position || 'N/A',
                toolbarTop: toolbarComputed?.top || 'N/A',
                containerDisplay: computedStyle.display,
                containerVisibility: computedStyle.visibility,
                containerOpacity: computedStyle.opacity,
                containerWidth: computedStyle.width,
                containerHeight: computedStyle.height,
                parentHeaderZIndex: parentHeader ? window.getComputedStyle(parentHeader).zIndex : 'N/A',
                parentHeaderPosition: parentHeader ? window.getComputedStyle(parentHeader).position : 'N/A',
                parentHeaderTop: parentHeader ? window.getComputedStyle(parentHeader).top : 'N/A',
                isInCanvas: debugInfo.isInCanvas,
                hasEditor: !!editor,
                shouldRenderToolbar,
                // ✅ Nouvelles vérifications critiques
                isToolbarInViewport,
                isToolbarClipped,
                toolbarRect: toolbarRect ? {
                  top: toolbarRect.top,
                  left: toolbarRect.left,
                  bottom: toolbarRect.bottom,
                  right: toolbarRect.right,
                  width: toolbarRect.width,
                  height: toolbarRect.height
                } : null,
                viewportHeight: window.innerHeight,
                viewportWidth: window.innerWidth
              };
              
              console.log('[EditorHeader] ✅ Center container DOM (DETAILED)', {
                ...debugInfo,
                // ✅ Valeurs critiques en premier pour faciliter la lecture
                CRITICAL: criticalValues
              });
              
              // ✅ Alerte si toolbar est dans le DOM mais invisible
              if (toolbarElement && toolbarComputed) {
                if (toolbarComputed.display === 'none' || toolbarComputed.visibility === 'hidden' || toolbarComputed.opacity === '0') {
                  console.error('[EditorHeader] ❌ Toolbar INVISIBLE dans le DOM (CSS)', {
                    display: toolbarComputed.display,
                    visibility: toolbarComputed.visibility,
                    opacity: toolbarComputed.opacity,
                    width: toolbarComputed.width,
                    height: toolbarComputed.height,
                    containerDisplay: computedStyle.display,
                    containerVisibility: computedStyle.visibility,
                    containerOpacity: computedStyle.opacity,
                    timestamp: Date.now()
                  });
                } else if (isToolbarClipped) {
                  console.error('[EditorHeader] ❌ Toolbar CLIPPED par parent (overflow/position)', {
                    display: toolbarComputed.display,
                    visibility: toolbarComputed.visibility,
                    opacity: toolbarComputed.opacity,
                    toolbarRect,
                    parentHeaderRect: parentHeader ? parentHeader.getBoundingClientRect() : null,
                    timestamp: Date.now()
                  });
                } else if (!isToolbarInViewport && toolbarRect) {
                  console.warn('[EditorHeader] ⚠️ Toolbar HORS VIEWPORT (scroll?)', {
                    display: toolbarComputed.display,
                    visibility: toolbarComputed.visibility,
                    opacity: toolbarComputed.opacity,
                    toolbarRect,
                    viewportHeight: window.innerHeight,
                    viewportWidth: window.innerWidth,
                    timestamp: Date.now()
                  });
                } else {
                  // ✅ Log de succès si toolbar est visible ET dans le viewport
                  console.log('[EditorHeader] ✅ Toolbar VISIBLE et dans le viewport', {
                    display: toolbarComputed.display,
                    visibility: toolbarComputed.visibility,
                    opacity: toolbarComputed.opacity,
                    width: toolbarComputed.width,
                    height: toolbarComputed.height,
                    toolbarRect,
                    isInViewport: isToolbarInViewport,
                    isClipped: isToolbarClipped,
                    timestamp: Date.now()
                  });
                }
              } else if (shouldRenderToolbar && editor) {
                console.error('[EditorHeader] ❌ Toolbar NOT FOUND dans le DOM alors que devrait être rendue', {
                  shouldRenderToolbar,
                  hasEditor: !!editor,
                  containerDisplay: computedStyle.display,
                  containerVisibility: computedStyle.visibility,
                  containerOpacity: computedStyle.opacity,
                  timestamp: Date.now()
                });
              }
            }, 0);
          }
        }}>
          {/* ✅ DEBUG: Log synchrone pour vérifier le rendu */}
          {process.env.NODE_ENV === 'development' && console.log('[EditorHeader] ✅ Rendering EditorToolbar', { hasEditor: !!editor, readonly, noteId, timestamp: Date.now() })}
          <EditorToolbar 
            editor={editor} 
            readonly={readonly} 
            onImageClick={onImageClick}
            onFontChange={onFontChange}
            currentFont={currentFont}
            onTranscriptionComplete={onTranscriptionComplete}
          />
        </div>
      ) : shouldRenderToolbar && !editor ? (
        // ✅ DEBUG: Log si editor n'existe pas encore
        <div className="editor-header__center" data-debug-toolbar="waiting-editor">
          {process.env.NODE_ENV === 'development' && console.warn('[EditorHeader] ⏳ Waiting for editor', { noteId, timestamp: Date.now() })}
        </div>
      ) : (
        <div className="editor-header__center" data-debug-toolbar="hidden" style={{ display: 'none' }}>
          {/* ✅ DEBUG: Toolbar cachée */}
          {process.env.NODE_ENV === 'development' && console.warn('[EditorHeader] ❌ Toolbar NOT rendered', { showToolbar, previewMode, shouldRenderToolbar, noteId, timestamp: Date.now() })}
        </div>
      )}

      {/* Actions à droite */}
      <div className="editor-header__actions">
        {/* Bouton Preview/Edit - 3 cas distincts */}
        {readonly && !previewMode && canEdit && noteId ? (
          // CAS 1 : Page publique (readonly=true, previewMode=false) + owner → Lien vers l'éditeur
          <Link
            href={`/private/note/${noteId}`}
            className="header-action-btn header-action-btn--edit"
            aria-label="Éditer cette note"
            title="Éditer cette note"
          >
            <FiEdit2 size={18} />
          </Link>
        ) : !readonly || previewMode ? (
          // CAS 2 : Page privée (readonly=false) OU mode preview → Toggle preview
          <button
            className={`header-action-btn ${previewMode ? 'active' : ''}`}
            onClick={onPreview}
            aria-label={previewMode ? "Mode édition" : "Mode lecture"}
            title={previewMode ? "Mode édition" : "Mode lecture"}
          >
            {previewMode ? <FiEdit2 size={18} /> : <FiEye size={18} />}
          </button>
        ) : null}
        {/* CAS 3 : Page publique + pas owner → Pas de bouton (null) */}
        
        {/* 🔧 FIX: Menu kebab masqué en mode readonly sauf si canEdit (owner) */}
        {(!readonly || canEdit) && (
          <button
            ref={kebabBtnRef}
            className="header-action-btn"
            onClick={onMenuOpen}
            aria-label="Menu"
            title="Menu"
          >
            <FiMoreHorizontal size={18} />
          </button>
        )}
        
        {/* 🔧 FIX: Bouton fermer masqué en mode readonly (page publique) */}
        {!readonly && (
          <button
            className="header-action-btn"
            onClick={onClose}
            aria-label="Fermer"
            title="Fermer"
          >
            <FiX size={18} />
          </button>
        )}
      </div>
      
      {/* ✅ Menu kebab rendu dans le header pour suivre le sticky */}
      {kebabMenu}
    </div>
  );
};

export default EditorHeader;

