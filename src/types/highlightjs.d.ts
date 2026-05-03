/**
 * Compléments de typage pour lowlight / highlight.js.
 * Les modules `highlight.js/lib/languages/*` sont couverts par le wildcard
 * des types officiels de highlight.js (LanguageFn).
 */

declare module 'lowlight/lib/core' {
  import type { Root as HastRoot } from 'hast';
  export interface Lowlight {
    highlight: (language: string, value: string) => HastRoot;
  }
  const lowlight: Lowlight;
  export default lowlight;
}

declare module 'lowlight' {
  import type { Root as HastRoot } from 'hast';
  interface Lowlight {
    highlight: (language: string, value: string) => HastRoot;
    highlightAuto: (value: string) => { result: HastRoot; language: string };
    registerLanguage: (name: string, support: unknown) => void;
    registerAlias: (language: string, alias: string | string[]) => void;
    registered: (aliasOrLanguage: string) => boolean;
    listLanguages: () => string[];
  }
  const lowlight: Lowlight;
  export = lowlight;
}
