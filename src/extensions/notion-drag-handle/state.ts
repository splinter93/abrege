/**
 * Variables globales et state management pour Notion Drag Handle
 */

import type { EditorView } from '@tiptap/pm/view';

// ============================================================================
// VARIABLES GLOBALES MODULE
// ============================================================================

let globalDragHandle: HTMLElement | null = null;
let globalDragHandleCleanup: (() => void) | null = null; // Cleanup listeners
let currentView: EditorView | null = null;
let hideTimeout: NodeJS.Timeout | null = null;
let hoverBridge: HTMLElement | null = null;
let listenersAttached = false;

// ============================================================================
// GETTERS
// ============================================================================

export function getGlobalDragHandle(): HTMLElement | null {
  return globalDragHandle;
}

export function getGlobalDragHandleCleanup(): (() => void) | null {
  return globalDragHandleCleanup;
}

export function getCurrentView(): EditorView | null {
  return currentView;
}

export function getHideTimeout(): NodeJS.Timeout | null {
  return hideTimeout;
}

export function getHoverBridge(): HTMLElement | null {
  return hoverBridge;
}

export function getListenersAttached(): boolean {
  return listenersAttached;
}

// ============================================================================
// SETTERS
// ============================================================================

export function setGlobalDragHandle(handle: HTMLElement | null): void {
  globalDragHandle = handle;
}

export function setGlobalDragHandleCleanup(cleanup: (() => void) | null): void {
  globalDragHandleCleanup = cleanup;
}

export function setCurrentView(view: EditorView | null): void {
  currentView = view;
}

export function setHideTimeout(timeout: NodeJS.Timeout | null): void {
  hideTimeout = timeout;
}

export function setHoverBridge(bridge: HTMLElement | null): void {
  hoverBridge = bridge;
}

export function setListenersAttached(attached: boolean): void {
  listenersAttached = attached;
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Nettoie complètement le state global
 * À appeler lors de la destruction de l'extension
 */
export function cleanupGlobalState(): void {
  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }

  if (globalDragHandleCleanup) {
    globalDragHandleCleanup();
    globalDragHandleCleanup = null;
  }

  if (globalDragHandle && globalDragHandle.parentNode) {
    globalDragHandle.parentNode.removeChild(globalDragHandle);
  }
  globalDragHandle = null;

  if (hoverBridge && hoverBridge.parentNode) {
    hoverBridge.parentNode.removeChild(hoverBridge);
  }
  hoverBridge = null;

  currentView = null;
  listenersAttached = false;
}

