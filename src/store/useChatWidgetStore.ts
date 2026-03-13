/**
 * Store pour l'état du chat widget (ouvert/fermé)
 * Utilisé sur la page Notebooks et extensible à d'autres pages
 */

import { create } from 'zustand';

interface ChatWidgetState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useChatWidgetStore = create<ChatWidgetState>()((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}));
