// Utilitaires markdown TOC/slug pour API LLM-ready

/**
 * Transforme un texte en slug unique (kebab-case, sans accents, etc.)
 */
export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export type TOCItem = {
  level: number;
  title: string;
  line: number; // 1-based
  start: number;
};

export type TOCItemWithSlug = TOCItem & { slug: string };

/**
 * Extrait la table des matières d'un markdown (titres H1-H6)
 */
export function extractTOC(markdown: string): TOCItem[] {
  const lines = markdown.split('\n');
  const toc: TOCItem[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(#{1,6})\s+(.+)/);
    if (match) {
      toc.push({
        level: match[1].length,
        title: match[2].trim(),
        line: i + 1,
        start: line.indexOf(match[2])
      });
    }
  }
  return toc;
}

/**
 * Extrait la TOC avec slug unique pour chaque titre (gère les doublons)
 */
export function extractTOCWithSlugs(markdown: string): TOCItemWithSlug[] {
  const lines = markdown.split('\n');
  const toc: TOCItemWithSlug[] = [];
  const slugCount: Record<string, number> = {};
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(#{1,6})\s+(.+)/);
    if (match) {
      const baseSlug = slugify(match[2].trim());
      let slug = baseSlug;
      if (slugCount[baseSlug] !== undefined) {
        slug = `${baseSlug}-${++slugCount[baseSlug]}`;
      } else {
        slugCount[baseSlug] = 0;
      }
      toc.push({
        level: match[1].length,
        title: match[2].trim(),
        slug,
        line: i + 1,
        start: line.indexOf(match[2])
      });
    }
  }
  return toc;
}

/**
 * Ajoute du markdown à la fin ou au début d'une section (ciblée par titre ou slug)
 * Retourne le nouveau markdown (ou lève une erreur si section non trouvée)
 * position: 'start' | 'end' (default: 'end')
 */
export function appendToSection(markdown: string, section: string, text: string, position: 'start' | 'end' = 'end'): string {
  if (!section) {
    // Ajout global (début ou fin de la note)
    const trimmed = markdown.trim();
    if (position === 'start') {
      return text.trimEnd() + (trimmed ? '\n\n' + trimmed : '');
    } else {
    return (trimmed ? trimmed + '\n\n' : '') + text.trimStart();
    }
  }
  const toc = extractTOCWithSlugs(markdown);
  const sectionIdx = toc.findIndex(t => t.title === section || t.slug === section);
  if (sectionIdx === -1) throw new Error('Section non trouvée (titre ou slug inconnu)');
  const target = toc[sectionIdx];
  const lines = markdown.split('\n');
  const sectionStart = target.line - 1;
  let sectionEnd = lines.length;
  for (let i = target.line; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.+)/);
    if (match && match[1].length <= target.level) {
      sectionEnd = i;
      break;
    }
  }
  if (position === 'start') {
    // Insérer juste après le titre de la section
    const before = lines.slice(0, sectionStart + 1).join('\n');
    const after = lines.slice(sectionStart + 1, sectionEnd).join('\n');
    const rest = lines.slice(sectionEnd).join('\n');
    return (
      before + '\n' + text.trimEnd() + (after ? '\n' + after : '') + (rest ? '\n' + rest : '')
    );
  } else {
    // Insérer à la fin de la section (comportement actuel)
    const before = lines.slice(0, sectionEnd).join('\n');
    const after = lines.slice(sectionEnd).join('\n');
  return before + '\n' + text + (after ? '\n' + after : '');
  }
}

/**
 * Vide le contenu d'une section spécifique (remplace tout le contenu par une chaîne vide)
 * Retourne le nouveau markdown (ou lève une erreur si section non trouvée)
 */
export function clearSection(markdown: string, section: string): string {
  if (!section) {
    throw new Error('Section requise pour clearSection');
  }
  
  const toc = extractTOCWithSlugs(markdown);
  const sectionIdx = toc.findIndex(t => t.title === section || t.slug === section);
  if (sectionIdx === -1) throw new Error('Section non trouvée (titre ou slug inconnu)');
  
  const target = toc[sectionIdx];
  const lines = markdown.split('\n');
  const sectionStart = target.line - 1;
  let sectionEnd = lines.length;
  
  // Trouver la fin de la section (prochain titre de même niveau ou supérieur)
  for (let i = target.line; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.+)/);
    if (match && match[1].length <= target.level) {
      sectionEnd = i;
      break;
    }
  }
  
  // Reconstruire le markdown sans le contenu de la section
  const before = lines.slice(0, sectionStart + 1).join('\n');
  const after = lines.slice(sectionEnd).join('\n');
  
  return before + (after ? '\n' + after : '');
}

// Ajout d'un commentaire pour indiquer la nécessité d'un .d.ts si le problème persiste
// Si TS ne résout pas les types, créer src/utils/markdownTOC.d.ts
// declare module './markdownTOC'; 