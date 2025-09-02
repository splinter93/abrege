// Utilitaire robuste pour obtenir une instance lowlight compatible Next.js (client only)
// Gère ESM, CommonJS, SSR, et l'enregistrement dynamique des langages

import { lowlight } from 'lowlight/lib/common';
import { simpleLogger } from '@/utils/logger';

// Import des langages à supporter
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import html from 'highlight.js/lib/languages/xml'; // html is in xml
import sql from 'highlight.js/lib/languages/sql';
import yaml from 'highlight.js/lib/languages/yaml';
import markdown from 'highlight.js/lib/languages/markdown';

// Enregistrement des langages
lowlight.registerLanguage('javascript', javascript);
lowlight.registerLanguage('js', javascript);
lowlight.registerLanguage('typescript', typescript);
lowlight.registerLanguage('ts', typescript);
lowlight.registerLanguage('json', json);
lowlight.registerLanguage('python', python);
lowlight.registerLanguage('py', python);
lowlight.registerLanguage('bash', bash);
lowlight.registerLanguage('shell', bash);
lowlight.registerLanguage('sh', bash);
lowlight.registerLanguage('css', css);
lowlight.registerLanguage('html', html);
lowlight.registerLanguage('xml', html);
lowlight.registerLanguage('sql', sql);
lowlight.registerLanguage('yaml', yaml);
lowlight.registerLanguage('yml', yaml);
lowlight.registerLanguage('markdown', markdown);
lowlight.registerLanguage('md', markdown);


if (!lowlight) {
  throw new Error('[lowlightInstance] Échec de l\'importation de lowlight depuis lib/common');
}
if (typeof lowlight.highlight !== 'function') {
  throw new Error('[lowlightInstance] lowlight manque la méthode highlight()');
}

// Utiliser la méthode correcte du nouveau simpleLogger
simpleLogger.dev('[DEBUG] lowlight keys:', Object.keys(lowlight));

export default lowlight;