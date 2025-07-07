// Utilitaire robuste pour obtenir une instance lowlight compatible Next.js (client only)
// Gère ESM, CommonJS, SSR, et l'enregistrement dynamique des langages

import { lowlight } from 'lowlight/lib/common';
// Optionnel : enregistrer des langages custom ici si besoin
// import graphql from 'highlight.js/lib/languages/graphql';
// lowlight.registerLanguage('graphql', graphql);

if (!lowlight) {
  throw new Error('[lowlightInstance] Échec de l’importation de lowlight depuis lib/common');
}
if (typeof lowlight.highlight !== 'function') {
  throw new Error('[lowlightInstance] lowlight manque la méthode highlight()');
  }

console.log('[DEBUG] lowlight keys:', Object.keys(lowlight));

export default lowlight;