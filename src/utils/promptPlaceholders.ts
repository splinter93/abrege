/**
 * Utilities for parsing prompt placeholders.
 * Placeholders follow the `{placeholder}` syntax.
 * The reserved placeholder `{selection}` is ignored by default.
 */

const PLACEHOLDER_REGEX = /\{([\p{L}\p{N}_]+)\}/gu;

/** Reserved placeholder identifiers that should not be exposed to users. */
export const RESERVED_PLACEHOLDERS = new Set<string>(['selection']);

export interface ParsedPlaceholder {
  /** Placeholder identifier without braces, e.g. `title`. */
  name: string;
  /** Indicates whether the placeholder is part of the reserved list. */
  isReserved: boolean;
}

export interface ParsePromptPlaceholderOptions {
  /**
   * When true, the returned list keeps reserved placeholders instead of filtering them out.
   * Defaults to false.
   */
  includeReserved?: boolean;
}

/**
 * Extract placeholders from a template string.
 * - Placeholders are delimited with `{placeholder}`.
 * - Duplicate placeholders are returned once.
 * - Reserved placeholders are filtered unless `includeReserved` is provided.
 *
 * @param template Prompt template to inspect.
 * @param options Parsing options.
 * @returns Array of parsed placeholders.
 */
export function parsePromptPlaceholders(
  template: string,
  options: ParsePromptPlaceholderOptions = {}
): ParsedPlaceholder[] {
  if (!template || typeof template !== 'string') {
    return [];
  }

  PLACEHOLDER_REGEX.lastIndex = 0;

  const includeReserved = options.includeReserved ?? false;
  const unique = new Map<string, ParsedPlaceholder>();
  let match: RegExpExecArray | null = PLACEHOLDER_REGEX.exec(template);

  while (match) {
    const name = match[1];
    const isReserved = RESERVED_PLACEHOLDERS.has(name);

    if (!unique.has(name)) {
      if (includeReserved || !isReserved) {
        unique.set(name, { name, isReserved });
      } else {
        // Store placeholder internally to prevent repeated checks when includeReserved=false.
        unique.set(name, { name, isReserved: true });
      }
    }

    match = PLACEHOLDER_REGEX.exec(template);
  }

  // Only output entries that meet includeReserved flag
  return Array.from(unique.values()).filter((placeholder) => {
    if (includeReserved) {
      return true;
    }
    return !placeholder.isReserved;
  });
}

/**
 * Helper determining whether a template contains any non-reserved placeholders.
 *
 * @param template Prompt template to inspect.
 * @returns True if a user-defined placeholder exists.
 */
export function hasPromptPlaceholders(template: string): boolean {
  return parsePromptPlaceholders(template).length > 0;
}

/**
 * Filtre la liste des prompts en ne conservant que ceux réellement présents
 * dans le message utilisateur.
 * - On recherche la séquence exacte `/{slug}`.
 * - On autorise que la commande soit suivie d'une ponctuation, d'un espace ou de la fin de chaîne.
 */
export function filterPromptsInMessage<T extends { slug: string }>(
  message: string,
  prompts: T[]
): T[] {
  if (!message || !prompts || prompts.length === 0) {
    return [];
  }

  const normalizedMessage = message.normalize();
  return prompts.filter((prompt) => {
    const slugPattern = `/${prompt.slug}`;
    if (!slugPattern) {
      return false;
    }
    let searchIndex = normalizedMessage.indexOf(slugPattern);
    while (searchIndex !== -1) {
      const beforeChar = searchIndex > 0 ? normalizedMessage[searchIndex - 1] : undefined;
      const afterChar = normalizedMessage[searchIndex + slugPattern.length];
      const beforeIsBoundary =
        beforeChar === undefined || !/[\p{L}\p{N}_]/u.test(beforeChar);
      const afterIsBoundary =
        afterChar === undefined || !/[\p{L}\p{N}_]/u.test(afterChar);
      if (beforeIsBoundary && afterIsBoundary) {
        return true;
      }
      searchIndex = normalizedMessage.indexOf(slugPattern, searchIndex + 1);
    }
    return false;
  });
}


