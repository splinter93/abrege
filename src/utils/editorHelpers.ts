/**
 * Utilitaires pour l'éditeur
 * Fonctions extraites de Editor.tsx pour améliorer la réutilisabilité et la testabilité
 */

/**
 * Fonction utilitaire debounce optimisée pour les performances
 * 
 * @description Retarde l'exécution d'une fonction jusqu'à ce qu'un délai se soit écoulé
 * depuis la dernière fois qu'elle a été appelée. Utile pour optimiser les performances
 * en évitant les appels trop fréquents (ex: sauvegarde automatique).
 * 
 * @param func - Fonction à débouncer
 * @param wait - Délai d'attente en millisecondes
 * @param immediate - Si true, exécute immédiatement au premier appel
 * @returns Fonction débouncée
 * 
 * @example
 * ```typescript
 * const debouncedSave = debounce((content: string) => {
 *   saveNote(content);
 * }, 500);
 * 
 * // Appeler plusieurs fois rapidement
 * debouncedSave('content 1'); // Pas exécuté
 * debouncedSave('content 2'); // Pas exécuté
 * debouncedSave('content 3'); // Exécuté après 500ms
 * ```
 */
export const debounce = <T extends (...args: unknown[]) => void>(
  func: T,
  wait: number,
  immediate = false
): T => {
  let timeout: NodeJS.Timeout | null = null;

  return ((...args: Parameters<T>) => {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) func(...args);
  }) as T;
};

/**
 * Nettoie le Markdown échappé par Tiptap
 * 
 * @description Tiptap échappe parfois certains caractères Markdown lors de la conversion.
 * Cette fonction nettoie ces échappements pour obtenir un Markdown propre et standard.
 * Utilisé principalement avant la sauvegarde du contenu.
 * 
 * @param markdown - Contenu Markdown potentiellement échappé
 * @returns Markdown nettoyé sans échappements inutiles
 * 
 * @example
 * ```typescript
 * const escaped = "\\*bold\\* text with \\~ and \\|";
 * const clean = cleanEscapedMarkdown(escaped);
 * // Result: "*bold* text with ~ and |"
 * ```
 */
export const cleanEscapedMarkdown = (markdown: string): string => {
  if (!markdown) return '';
  
  return markdown
    .replace(/\\\*/g, '*')           // Supprimer l'échappement des *
    .replace(/\\_/g, '_')            // Supprimer l'échappement des _
    .replace(/\\`/g, '`')            // Supprimer l'échappement des `
    .replace(/\\\[/g, '[')           // Supprimer l'échappement des [
    .replace(/\\\]/g, ']')           // Supprimer l'échappement des ]
    .replace(/\\\(/g, '(')           // Supprimer l'échappement des (
    .replace(/\\\)/g, ')')           // Supprimer l'échappement des )
    .replace(/\\>/g, '>')            // Supprimer l'échappement des >
    .replace(/\\-/g, '-')            // Supprimer l'échappement des -
    .replace(/\\\|/g, '|')           // Supprimer l'échappement des |
    .replace(/\\~/g, '~')            // Supprimer l'échappement des ~
    .replace(/≈/g, '~')              // Reconvertir ≈ en ~ (fix preprocessing)
    .replace(/\\=/g, '=')            // Supprimer l'échappement des =
    .replace(/\\#/g, '#');           // Supprimer l'échappement des #
    // ⚠️ NE PAS décoder les HTML entities (&lt; &gt; &amp;)
    // Sinon ça cause une boucle infinie avec EditorSyncManager
    // .replace(/&gt;/g, '>')        // ❌ DÉSACTIVÉ
    // .replace(/&lt;/g, '<')        // ❌ DÉSACTIVÉ  
    // .replace(/&amp;/g, '&');      // ❌ DÉSACTIVÉ
};

/**
 * Crée un hash simple d'une chaîne de caractères
 * Utilisé pour optimiser les comparaisons de contenu dans useMemo
 * 
 * @param str - Chaîne à hasher
 * @returns Hash numérique de la chaîne
 * 
 * @example
 * ```typescript
 * const hash1 = hashString('content');
 * const hash2 = hashString('content');
 * const hash3 = hashString('different');
 * 
 * console.log(hash1 === hash2); // true
 * console.log(hash1 === hash3); // false
 * ```
 */
export const hashString = (str: string): number => {
  if (!str) return 0;
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
};

/**
 * Extrait le markdown de l'éditeur de manière type-safe
 * 
 * @description Utilise un type guard pour vérifier que l'éditeur a le storage markdown
 * avant d'essayer d'extraire le contenu. Gère les erreurs et retourne une chaîne vide
 * si le markdown n'est pas disponible.
 * 
 * @param editor - Instance de l'éditeur Tiptap (accepte n'importe quel objet avec storage)
 * @returns Le markdown ou une chaîne vide si indisponible
 * 
 * @example
 * ```typescript
 * const markdown = getEditorMarkdown(editor);
 * if (markdown) {
 *   await saveNote(markdown);
 * }
 * ```
 */
export function getEditorMarkdown(editor: { storage?: unknown } | null): string {
  if (!editor) return '';
  
  try {
    // Type guard avec vérification runtime
    const storage = editor.storage as { markdown?: { getMarkdown?: () => string } } | undefined;
    if (storage?.markdown && typeof storage.markdown.getMarkdown === 'function') {
      return storage.markdown.getMarkdown() || '';
    }
    return '';
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      // Type-safe logging - pas de console.warn en production
      if (typeof error === 'object' && error !== null) {
        const errorMessage = 'message' in error ? String(error.message) : 'Unknown error';
        // Utiliser un logger si disponible, sinon ignorer silencieusement
        globalThis.console?.warn?.('Failed to get markdown from editor:', errorMessage);
      }
    }
    return '';
  }
}
