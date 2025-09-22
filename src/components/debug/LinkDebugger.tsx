import React, { useEffect } from 'react';

/**
 * Composant de débogage pour vérifier les liens dans le markdown
 */
export const LinkDebugger: React.FC = () => {
  useEffect(() => {
    const debugLinks = () => {
      const links = document.querySelectorAll('.markdown-body a');
      console.log(`🔍 Debug: Found ${links.length} links in markdown`);
      
      links.forEach((link, index) => {
        const href = link.getAttribute('href');
        const text = link.textContent;
        console.log(`Link ${index + 1}:`, {
          href,
          text: text?.trim(),
          hasHref: !!href,
          isEmptyHref: href === '',
          isHashHref: href === '#',
          isValidHref: href && href !== '' && href !== '#'
        });
      });
    };

    // Déboguer immédiatement
    debugLinks();

    // Déboguer après un délai pour les liens chargés dynamiquement
    const timeout = setTimeout(debugLinks, 1000);

    // Ajouter un gestionnaire de clic pour tous les liens
    const handleLinkClick = (event: Event) => {
      const target = event.target as HTMLAnchorElement;
      if (target.tagName === 'A') {
        console.log('🔗 Link clicked:', {
          href: target.href,
          text: target.textContent?.trim(),
          event: event
        });
        
        // Forcer la navigation pour les liens externes
        if (target.href && !target.href.startsWith(window.location.origin)) {
          console.log('🚀 Opening external link:', target.href);
          
          // Vérifier que window.open est disponible (sécurité)
          if (typeof window.open === 'function') {
            window.open(target.href, '_blank', 'noopener,noreferrer');
            event.preventDefault();
            event.stopPropagation();
            return false;
          } else {
            console.warn('⚠️ window.open not available, falling back to default behavior');
          }
        }
      }
    };

    // Utiliser capture: true pour intercepter avant les autres gestionnaires
    document.addEventListener('click', handleLinkClick, true);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('click', handleLinkClick, true);
    };
  }, []);

  return null;
};

export default LinkDebugger;
