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
 * @description Applique diverses transformations au Markdown pour corriger
 * les problèmes connus:
 * 1. Dé-échappe les entités HTML (sécurité bidirectionnelle serveur/client)
 * 2. Remplace les ~ dans les tables (fix bug LLM)
 * 
 * @param markdown - Le contenu Markdown brut depuis la DB
 * @returns Le Markdown prétraité et sécurisé pour Tiptap
 */
export function preprocessMarkdown(markdown: string): string {
  if (!markdown) return markdown;
  
  let processed = markdown;
  
  // 🔓 ÉTAPE 0 : Dé-échapper les entités HTML (DB → Éditeur)
  // Dé-échappement basique des entités HTML
  // Le HTML échappé côté serveur doit être dé-échappé côté client
  // pour que Tiptap puisse le gérer correctement
  const hasHtmlEntities = /&(?:lt|gt|amp|quot|#039);/i.test(processed);
  if (hasHtmlEntities) {
    processed = processed
      .replace(/&#039;/g, "'")   // Dé-échapper '
      .replace(/&quot;/g, '"')   // Dé-échapper "
      .replace(/&gt;/g, '>')     // Dé-échapper >
      .replace(/&lt;/g, '<')     // Dé-échapper <
      .replace(/&amp;/g, '&');   // Dé-échapper & en dernier
      
    if (process.env.NODE_ENV === 'development') {
      console.log('[markdownPreprocessor] 🔓 Entités HTML dé-échappées pour l\'éditeur');
    }
  }
  
  // 1. Remplacer les ~ par ≈ dans les tables (fix bug LLM)
  processed = replaceTildeInTables(processed);
  
  // Ici on peut ajouter d'autres prétraitements si nécessaire
  
  return processed;
}

export default preprocessMarkdown;

