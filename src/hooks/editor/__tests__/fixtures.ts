import type { MenusState } from '../useMenusState';

/** État menus par défaut pour les tests — garder aligné avec {@link MenusState}. */
export const DEFAULT_MENUS_STATE: MenusState = {
  imageMenuOpen: false,
  imageMenuTarget: 'content',
  kebabOpen: false,
  kebabPos: { top: 0, left: 0 },
  exportModalOpen: false,
};
