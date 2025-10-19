import { useEffect } from 'react';
import { formatPathsInElement } from '@/utils/formatPaths';

/**
 * Hook pour formater automatiquement les paths dans un élément
 * @param elementRef - Référence vers l'élément à traiter
 * @param dependencies - Dépendances qui déclenchent le formatage
 */
export function usePathFormatting(
  elementRef: React.RefObject<HTMLElement>,
  dependencies: unknown[] = []
) {
  useEffect(() => {
    if (!elementRef.current) return;
    
    // Formater les paths dans l'élément
    formatPathsInElement(elementRef.current);
  }, dependencies);
}
