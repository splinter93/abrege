/**
 * Provider global pour le menu de commande
 * Intégré dans le layout principal pour être accessible partout
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md :
 * - Composant client isolé
 * - Gestion d'état propre
 */

"use client";

import React from 'react';
import { CommandPalette } from './CommandPalette';
import { useGlobalCommandPalette } from '@/hooks/useGlobalCommandPalette';

/**
 * Provider global pour le menu de commande
 */
export function CommandPaletteProvider() {
  const { isOpen, close } = useGlobalCommandPalette({
    enabled: true
  });

  return <CommandPalette isOpen={isOpen} onClose={close} />;
}




