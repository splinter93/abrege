/**
 * Hook pour gérer la fermeture des menus au clic extérieur
 * Remplace 5-7 useEffect séparés par une logique centralisée
 * @module hooks/useMenuClickOutside
 */

import { useEffect } from 'react';

interface MenuConfig {
  isOpen: boolean;
  menuClass: string;
  triggerClass: string;
  onClose: () => void;
  additionalCleanup?: () => void;
}

/**
 * Hook pour fermer un menu au clic extérieur
 * 
 * @param config - Configuration du menu
 */
export function useMenuClickOutside(config: MenuConfig) {
  const { isOpen, menuClass, triggerClass, onClose, additionalCleanup } = config;

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`.${menuClass}`) && !target.closest(`.${triggerClass}`)) {
        onClose();
        if (additionalCleanup) {
          additionalCleanup();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, menuClass, triggerClass, onClose, additionalCleanup]);
}

/**
 * Hook pour gérer plusieurs menus avec clic extérieur
 * Alternative optimisée pour gérer plusieurs menus à la fois
 * 
 * @param menus - Tableau de configurations de menus
 */
export function useMultipleMenusClickOutside(menus: MenuConfig[]) {
  useEffect(() => {
    const openMenus = menus.filter(menu => menu.isOpen);
    if (openMenus.length === 0) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      openMenus.forEach(menu => {
        const { menuClass, triggerClass, onClose, additionalCleanup } = menu;
        
        if (!target.closest(`.${menuClass}`) && !target.closest(`.${triggerClass}`)) {
          onClose();
          if (additionalCleanup) {
            additionalCleanup();
          }
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menus]);
}

