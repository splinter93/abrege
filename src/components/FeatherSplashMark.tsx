'use client';

import { useId } from 'react';
import { Feather } from 'lucide-react';

interface FeatherSplashMarkProps {
  /** Si true : plein écran noir + plume (chargement page publique). Si false : seulement le SVG + plume (à l’intérieur du conteneur splash avec fade). */
  fullBleed?: boolean;
}

/**
 * Plume + dégradé (même rendu que PWASplash), ids uniques pour éviter les collisions si plusieurs instances.
 */
export default function FeatherSplashMark({ fullBleed = true }: FeatherSplashMarkProps) {
  const uid = useId().replace(/:/g, '');
  const gradId = `feather-splash-grad-${uid}`;

  const mark = (
    <>
      <svg width={0} height={0} aria-hidden className="absolute">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="white" />
            <stop offset="1" stopColor="rgba(255,255,255,0.5)" />
          </linearGradient>
        </defs>
      </svg>
      <Feather
        className="h-[96px] w-[96px] shrink-0"
        stroke={`url(#${gradId})`}
        strokeWidth={1.75}
        aria-hidden
      />
    </>
  );

  if (!fullBleed) {
    return mark;
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99990,
      }}
    >
      {mark}
    </div>
  );
}
