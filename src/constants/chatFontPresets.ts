/**
 * Presets de police pour le chat : family + taille + poids.
 * Chaque police est un package complet pour un rendu cohérent.
 */

export type ChatFontPresetId = 'figtree' | 'geist' | 'inter' | 'noto-sans' | 'manrope';

export interface ChatFontPreset {
  id: ChatFontPresetId;
  label: string;
  /** Stack font-family (avec fallbacks) */
  family: string;
  /** Taille de base en px (corps de texte) */
  sizeBase: string;
  /** Poids corps / paragraphes */
  weightNormal: number;
  /** Poids UI / labels (optionnel) */
  weightMedium: number;
  /** Poids strong / h4–h6 */
  weightSemibold: number;
  /** Poids h2 / h3 */
  weightBold: number;
  /** Poids h1 */
  weightExtrabold: number;
}

const FALLBACK_STACK = '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif';

export const CHAT_FONT_PRESETS: Record<ChatFontPresetId, ChatFontPreset> = {
  figtree: {
    id: 'figtree',
    label: 'Figtree',
    family: `'Figtree', 'Geist', ${FALLBACK_STACK}`,
    sizeBase: '16px',
    weightNormal: 425,
    weightMedium: 600,
    weightSemibold: 750,
    weightBold: 800,
    weightExtrabold: 800,
  },
  geist: {
    id: 'geist',
    label: 'Geist',
    family: `'Geist', ${FALLBACK_STACK}`,
    sizeBase: '16px',
    weightNormal: 425,
    weightMedium: 600,
    weightSemibold: 750,
    weightBold: 800,
    weightExtrabold: 800,
  },
  inter: {
    id: 'inter',
    label: 'Inter',
    family: `'Inter', ${FALLBACK_STACK}`,
    sizeBase: '16px',
    weightNormal: 400,
    weightMedium: 500,
    weightSemibold: 600,
    weightBold: 700,
    weightExtrabold: 800,
  },
  'noto-sans': {
    id: 'noto-sans',
    label: 'Noto Sans',
    family: `'Noto Sans', ${FALLBACK_STACK}`,
    sizeBase: '16px',
    weightNormal: 400,
    weightMedium: 500,
    weightSemibold: 600,
    weightBold: 700,
    weightExtrabold: 800,
  },
  manrope: {
    id: 'manrope',
    label: 'Manrope',
    family: `'Manrope', ${FALLBACK_STACK}`,
    sizeBase: '15px',
    weightNormal: 525,
    weightMedium: 600,
    weightSemibold: 750,
    weightBold: 800,
    weightExtrabold: 850,
  },
} as const;

export const CHAT_FONT_PRESET_IDS = Object.keys(CHAT_FONT_PRESETS) as ChatFontPresetId[];

/** Variables CSS appliquées par preset (noms utilisés sur document.documentElement) */
export const CHAT_FONT_CSS_VARS = [
  '--font-chat-base',
  '--chat-font-size-base',
  '--chat-text-base',
  '--chat-weight-normal',
  '--chat-weight-medium',
  '--chat-weight-semibold',
  '--chat-weight-bold',
  '--chat-weight-extrabold',
] as const;

/**
 * Applique un preset sur le document (root).
 * À appeler au changement de police et au chargement des préférences.
 */
export function applyChatFontPreset(presetId: ChatFontPresetId): void {
  if (typeof document === 'undefined') return;
  const preset = CHAT_FONT_PRESETS[presetId];
  if (!preset) return;

  const root = document.documentElement;
  root.style.setProperty('--font-chat-base', preset.family);
  root.style.setProperty('--chat-font-size-base', preset.sizeBase);
  root.style.setProperty('--chat-text-base', preset.sizeBase);
  root.style.setProperty('--chat-weight-normal', String(preset.weightNormal));
  root.style.setProperty('--chat-weight-medium', String(preset.weightMedium));
  root.style.setProperty('--chat-weight-semibold', String(preset.weightSemibold));
  root.style.setProperty('--chat-weight-bold', String(preset.weightBold));
  root.style.setProperty('--chat-weight-extrabold', String(preset.weightExtrabold));
}

/** Mapping label (FontSelector / UI) → preset id pour l’éditeur */
const FONT_LABEL_TO_PRESET_ID: Record<string, ChatFontPresetId> = {
  Figtree: 'figtree',
  Geist: 'geist',
  Inter: 'inter',
  'Noto Sans': 'noto-sans',
  Manrope: 'manrope',
};

/**
 * Retourne le preset id si le nom de police correspond à un preset, sinon null.
 */
export function getEditorPresetId(fontName: string): ChatFontPresetId | null {
  return FONT_LABEL_TO_PRESET_ID[fontName] ?? null;
}

/**
 * Applique un preset aux variables CSS de l’éditeur (family + taille + poids).
 * Utilisé quand l’utilisateur choisit une police preset dans l’éditeur.
 */
export function applyEditorFontPreset(presetId: ChatFontPresetId): void {
  if (typeof document === 'undefined') return;
  const preset = CHAT_FONT_PRESETS[presetId];
  if (!preset) return;

  const root = document.documentElement;
  root.style.setProperty('--editor-font-family-body', preset.family);
  root.style.setProperty('--editor-font-family-headings', preset.family);
  root.style.setProperty('--editor-body-size', preset.sizeBase);
  root.style.setProperty('--editor-body-weight', String(preset.weightNormal));
  root.style.setProperty('--editor-strong-weight', String(preset.weightBold));
  root.style.setProperty('--editor-h1-weight', String(preset.weightExtrabold));
  root.style.setProperty('--editor-h2-weight', String(preset.weightBold));
  root.style.setProperty('--editor-h3-weight', String(preset.weightBold));
  root.style.setProperty('--editor-h4-weight', String(preset.weightSemibold));
  root.style.setProperty('--editor-h5-weight', String(preset.weightMedium));
  root.style.setProperty('--editor-h6-weight', String(preset.weightMedium));
}
