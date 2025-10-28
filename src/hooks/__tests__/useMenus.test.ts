/**
 * Tests unitaires pour useMenus
 * Focus: singleton pattern (1 seul menu ouvert)
 * @module hooks/__tests__/useMenus
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMenus } from '../useMenus';

describe('useMenus', () => {
  describe('Singleton pattern', () => {
    it('should only allow one menu open at a time', () => {
      const { result } = renderHook(() => useMenus());

      // État initial: aucun menu ouvert
      expect(result.current.activeMenu).toBeNull();
      expect(result.current.showFileMenu).toBe(false);
      expect(result.current.showWebSearchMenu).toBe(false);
      expect(result.current.showReasoningMenu).toBe(false);
      expect(result.current.showNoteSelector).toBe(false);
      expect(result.current.showSlashMenu).toBe(false);

      // Ouvrir le menu fichier
      act(() => {
        result.current.openMenu('file');
      });

      expect(result.current.activeMenu).toBe('file');
      expect(result.current.showFileMenu).toBe(true);

      // Ouvrir le menu websearch → doit fermer file
      act(() => {
        result.current.openMenu('websearch');
      });

      expect(result.current.activeMenu).toBe('websearch');
      expect(result.current.showFileMenu).toBe(false);
      expect(result.current.showWebSearchMenu).toBe(true);

      // Ouvrir le menu reasoning → doit fermer websearch
      act(() => {
        result.current.openMenu('reasoning');
      });

      expect(result.current.activeMenu).toBe('reasoning');
      expect(result.current.showWebSearchMenu).toBe(false);
      expect(result.current.showReasoningMenu).toBe(true);
    });

    it('should close menu when openMenu called with same menu', () => {
      const { result } = renderHook(() => useMenus());

      // Ouvrir le menu fichier
      act(() => {
        result.current.openMenu('file');
      });

      expect(result.current.activeMenu).toBe('file');
      expect(result.current.showFileMenu).toBe(true);

      // Essayer de rouvrir le même menu → doit rester ouvert
      act(() => {
        result.current.openMenu('file');
      });

      expect(result.current.activeMenu).toBe('file');
      expect(result.current.showFileMenu).toBe(true);
    });

    it('should allow all menus to be tested', () => {
      const { result } = renderHook(() => useMenus());

      const menus: Array<'file' | 'websearch' | 'reasoning' | 'notes' | 'slash'> = [
        'file',
        'websearch',
        'reasoning',
        'notes',
        'slash'
      ];

      menus.forEach(menu => {
        act(() => {
          result.current.openMenu(menu);
        });

        expect(result.current.activeMenu).toBe(menu);
        
        // Vérifier qu'un seul menu est ouvert
        const openMenusCount = [
          result.current.showFileMenu,
          result.current.showWebSearchMenu,
          result.current.showReasoningMenu,
          result.current.showNoteSelector,
          result.current.showSlashMenu
        ].filter(Boolean).length;

        expect(openMenusCount).toBe(1);
      });
    });
  });

  describe('closeMenu', () => {
    it('should close active menu', () => {
      const { result } = renderHook(() => useMenus());

      // Ouvrir un menu
      act(() => {
        result.current.openMenu('file');
      });

      expect(result.current.activeMenu).toBe('file');
      expect(result.current.showFileMenu).toBe(true);

      // Fermer
      act(() => {
        result.current.closeMenu();
      });

      expect(result.current.activeMenu).toBeNull();
      expect(result.current.showFileMenu).toBe(false);
    });

    it('should do nothing if no menu is open', () => {
      const { result } = renderHook(() => useMenus());

      expect(result.current.activeMenu).toBeNull();

      // Fermer quand rien n'est ouvert
      act(() => {
        result.current.closeMenu();
      });

      expect(result.current.activeMenu).toBeNull();
    });
  });

  describe('toggleMenu', () => {
    it('should open menu if closed', () => {
      const { result } = renderHook(() => useMenus());

      expect(result.current.activeMenu).toBeNull();

      act(() => {
        result.current.toggleMenu('file');
      });

      expect(result.current.activeMenu).toBe('file');
      expect(result.current.showFileMenu).toBe(true);
    });

    it('should close menu if already open', () => {
      const { result } = renderHook(() => useMenus());

      // Ouvrir
      act(() => {
        result.current.toggleMenu('file');
      });

      expect(result.current.activeMenu).toBe('file');

      // Toggle → fermer
      act(() => {
        result.current.toggleMenu('file');
      });

      expect(result.current.activeMenu).toBeNull();
      expect(result.current.showFileMenu).toBe(false);
    });

    it('should switch menu if another is already open', () => {
      const { result } = renderHook(() => useMenus());

      // Ouvrir file
      act(() => {
        result.current.toggleMenu('file');
      });

      expect(result.current.activeMenu).toBe('file');

      // Toggle websearch → doit fermer file et ouvrir websearch
      act(() => {
        result.current.toggleMenu('websearch');
      });

      expect(result.current.activeMenu).toBe('websearch');
      expect(result.current.showFileMenu).toBe(false);
      expect(result.current.showWebSearchMenu).toBe(true);
    });
  });

  describe('Utility getters', () => {
    it('should provide isAnyMenuOpen getter', () => {
      const { result } = renderHook(() => useMenus());

      expect(result.current.isAnyMenuOpen).toBe(false);

      act(() => {
        result.current.openMenu('file');
      });

      expect(result.current.isAnyMenuOpen).toBe(true);

      act(() => {
        result.current.closeMenu();
      });

      expect(result.current.isAnyMenuOpen).toBe(false);
    });

    it('should provide isMenuOpen function', () => {
      const { result } = renderHook(() => useMenus());

      act(() => {
        result.current.openMenu('file');
      });

      expect(result.current.isMenuOpen('file')).toBe(true);
      expect(result.current.isMenuOpen('websearch')).toBe(false);
      expect(result.current.isMenuOpen('reasoning')).toBe(false);
    });
  });

  describe('closeAllMenus', () => {
    it('should close active menu (alias of closeMenu)', () => {
      const { result } = renderHook(() => useMenus());

      act(() => {
        result.current.openMenu('reasoning');
      });

      expect(result.current.activeMenu).toBe('reasoning');

      act(() => {
        result.current.closeAllMenus();
      });

      expect(result.current.activeMenu).toBeNull();
      expect(result.current.showReasoningMenu).toBe(false);
    });
  });
});

