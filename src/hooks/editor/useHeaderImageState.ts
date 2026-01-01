/**
 * useHeaderImageState - Hook pour l'état de l'image d'en-tête
 * 
 * Responsabilités:
 * - Gestion de l'URL de l'image
 * - Offset, blur, overlay
 * - Titre dans l'image
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { logger, LogCategory } from '@/utils/logger';
import { DEFAULT_HEADER_IMAGE_CONFIG } from '@/utils/editorConstants';

export interface HeaderImageState {
  url: string | null;
  offset: number;
  blur: number;
  overlay: number;
  titleInImage: boolean;
}

export interface UseHeaderImageStateOptions {
  initialHeaderImage?: string | null;
  initialHeaderOffset?: number;
  initialHeaderBlur?: number;
  initialHeaderOverlay?: number;
  initialTitleInImage?: boolean;
}

export interface UseHeaderImageStateReturn {
  headerImage: HeaderImageState;
  setHeaderImageUrl: (url: string | null) => void;
  setHeaderImageOffset: (offset: number) => void;
  setHeaderImageBlur: (blur: number) => void;
  setHeaderImageOverlay: (overlay: number) => void;
  setHeaderTitleInImage: (titleInImage: boolean) => void;
}

/**
 * Hook pour gérer l'état de l'image d'en-tête
 */
export function useHeaderImageState(options: UseHeaderImageStateOptions = {}): UseHeaderImageStateReturn {
  const [headerImageUrl, setHeaderImageUrlState] = useState<string | null>(
    options.initialHeaderImage || null
  );
  
  const setHeaderImageUrl = useCallback((value: string | null, meta?: { source?: string }) => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug(LogCategory.EDITOR, '[useHeaderImageState] setHeaderImageUrl', {
        previous: headerImageUrl,
        next: value,
        source: meta?.source ?? 'unknown'
      });
    }
    setHeaderImageUrlState(value);
  }, [headerImageUrl]);
  
  // Ref pour tracker la dernière valeur reçue (évite re-set inutiles)
  const prevHeaderImageRef = useRef<string | null>(options.initialHeaderImage || null);
  
  // Sync headerImageUrl quand initialHeaderImage change (ex: auto-save, switch canva)
  // IMPORTANT : Compare avec ref pour éviter flicker si valeur identique
  useEffect(() => {
    const newValue = options.initialHeaderImage ?? null;
    if (newValue !== prevHeaderImageRef.current) {
      prevHeaderImageRef.current = newValue;
      setHeaderImageUrl(newValue, { source: 'initialHeaderImageEffect' });
    }
  }, [options.initialHeaderImage, setHeaderImageUrl]);
  
  const [headerOffset, setHeaderOffset] = useState(
    options.initialHeaderOffset ?? DEFAULT_HEADER_IMAGE_CONFIG.offset
  );
  const [headerBlur, setHeaderBlur] = useState(
    options.initialHeaderBlur ?? DEFAULT_HEADER_IMAGE_CONFIG.blur
  );
  const [headerOverlay, setHeaderOverlay] = useState(
    options.initialHeaderOverlay ?? DEFAULT_HEADER_IMAGE_CONFIG.overlay
  );
  const [titleInImage, setTitleInImage] = useState(
    options.initialTitleInImage ?? DEFAULT_HEADER_IMAGE_CONFIG.titleInImage
  );

  return {
    headerImage: {
      url: headerImageUrl,
      offset: headerOffset,
      blur: headerBlur,
      overlay: headerOverlay,
      titleInImage,
    },
    setHeaderImageUrl,
    setHeaderImageOffset: setHeaderOffset,
    setHeaderImageBlur: setHeaderBlur,
    setHeaderImageOverlay: setHeaderOverlay,
    setHeaderTitleInImage: setTitleInImage,
  };
}

