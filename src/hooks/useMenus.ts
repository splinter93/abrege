/**
 * Hook pour gérer l'état des menus contextuels du chat
 * Centralise la gestion de 5 menus : file, web search, reasoning, notes, slash
 * @module hooks/useMenus
 */

import { useState, useCallback } from 'react';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Types de menus disponibles
 */
export type MenuType = 'file' | 'websearch' | 'reasoning' | 'notes' | 'slash';

/**
 * État d'un menu
 */
export interface MenuState {
  type: MenuType | null;
  isOpen: boolean;
}

/**
 * Hook pour gérer les menus contextuels du chat
 * Garantit qu'un seul menu est ouvert à la fois (singleton pattern)
 * 
 * @returns {Object} Hook API
 * @returns {MenuType | null} activeMenu - Menu actuellement ouvert
 * @returns {boolean} showFileMenu - Le menu file est ouvert
 * @returns {boolean} showWebSearchMenu - Le menu web search est ouvert
 * @returns {boolean} showReasoningMenu - Le menu reasoning est ouvert
 * @returns {boolean} showNoteSelector - Le menu notes est ouvert
 * @returns {boolean} showSlashMenu - Le menu slash est ouvert
 * @returns {Function} openMenu - Ouvre un menu (ferme les autres)
 * @returns {Function} closeMenu - Ferme le menu actif
 * @returns {Function} closeAllMenus - Ferme tous les menus
 * @returns {Function} toggleMenu - Toggle un menu spécifique
 */
export function useMenus() {
  const [activeMenu, setActiveMenu] = useState<MenuType | null>(null);

  /**
   * Ouvre un menu spécifique (ferme automatiquement les autres)
   */
  const openMenu = useCallback((menu: MenuType) => {
    if (activeMenu === menu) {
      // Déjà ouvert, ne rien faire
      return;
    }

    logger.dev(`[useMenus] 📂 Ouverture menu: ${menu}`);
    setActiveMenu(menu);
  }, [activeMenu]);

  /**
   * Ferme le menu actuellement actif
   */
  const closeMenu = useCallback(() => {
    if (activeMenu) {
      logger.dev(`[useMenus] ❌ Fermeture menu: ${activeMenu}`);
      setActiveMenu(null);
    }
  }, [activeMenu]);

  /**
   * Ferme tous les menus (alias de closeMenu pour compatibilité)
   */
  const closeAllMenus = useCallback(() => {
    if (activeMenu) {
      logger.dev(`[useMenus] ❌ Fermeture de tous les menus`);
      setActiveMenu(null);
    }
  }, [activeMenu]);

  /**
   * Toggle un menu (ouvre si fermé, ferme si ouvert)
   */
  const toggleMenu = useCallback((menu: MenuType) => {
    if (activeMenu === menu) {
      logger.dev(`[useMenus] 🔄 Toggle OFF menu: ${menu}`);
      setActiveMenu(null);
    } else {
      logger.dev(`[useMenus] 🔄 Toggle ON menu: ${menu}`);
      setActiveMenu(menu);
    }
  }, [activeMenu]);

  /**
   * Helpers pour vérifier quel menu est ouvert
   */
  const showFileMenu = activeMenu === 'file';
  const showWebSearchMenu = activeMenu === 'websearch';
  const showReasoningMenu = activeMenu === 'reasoning';
  const showNoteSelector = activeMenu === 'notes';
  const showSlashMenu = activeMenu === 'slash';

  return {
    // État
    activeMenu,
    showFileMenu,
    showWebSearchMenu,
    showReasoningMenu,
    showNoteSelector,
    showSlashMenu,

    // Actions
    openMenu,
    closeMenu,
    closeAllMenus,
    toggleMenu,

    // Getters utilitaires
    isAnyMenuOpen: activeMenu !== null,
    isMenuOpen: (menu: MenuType) => activeMenu === menu
  };
}

