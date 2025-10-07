/**
 * Préprocesseur Markdown pour échapper les caractères problématiques
 * avant le parsing par Tiptap
 */

/**
 * Remplace les ~ isolés par ≈ dans les cellules de table pour éviter le bug du strikethrough
 * Le caractère ≈ ressemble visuellement au ~ mais n'est pas parsé par Markdown
 * 
 * @param markdown - Le contenu Markdown brut
 * @returns Le Markdown avec les ~ remplacés par ≈ dans les tables
 */
export function replaceTildeInTables(markdown: string): string {
  if (!markdown) return markdown;

  // Regex pour détecter les tables Markdown
  // Une table commence par | et a une ligne de séparation avec des ---
  const tableRegex = /(\|[^\n]+\|\n\|[-:\s|]+\|\n(?:\|[^\n]+\|\n)*)/g;
  
  return markdown.replace(tableRegex, (tableMatch) => {
    // Dans chaque cellule de table, remplacer les ~ isolés (pas ~~) par ≈
    return tableMatch.replace(/~(?!~)/g, '≈');
  });
}

/**
 * Prétraitement complet du Markdown avant insertion dans l'éditeur
 * 
 * @param markdown - Le contenu Markdown brut
 * @returns Le Markdown prétraité et sécurisé
 */
export function preprocessMarkdown(markdown: string): string {
  if (!markdown) return markdown;
  
  let processed = markdown;
  
  // 1. Remplacer les ~ par ≈ dans les tables (fix bug LLM)
  processed = replaceTildeInTables(processed);
  
  // Ici on peut ajouter d'autres prétraitements si nécessaire
  
  return processed;
}

export default preprocessMarkdown;

