/**
 * Sanitization du Markdown côté client
 * 
 * @description Fonctions pour nettoyer et dé-échapper le contenu Markdown
 * quand on le charge depuis la base de données vers l'éditeur Tiptap.
 * Complément de markdownSanitizer.server.ts pour un cycle complet.
 * 
 * @author Scrivia Team
 * @version 1.0.0
 */

import { logger, LogCategory } from './logger';

/**
 * Dé-échappe les entités HTML en texte pur
 * 
 * @description Convertit les entités HTML (&lt;, &gt;, &amp;, etc.) en caractères normaux.
 * Utilisé UNIQUEMENT quand on charge du contenu depuis la DB vers l'éditeur Tiptap.
 * 
 * **Règle** : 
 * - Serveur → DB : HTML échappé (sanitizeMarkdownContent)
 * - DB → Éditeur : HTML dé-échappé (unescapeHtmlEntities)
 * - Éditeur → Serveur : Markdown pur (Tiptap gère)
 * 
 * @param content - Contenu avec entités HTML échappées
 * @returns Contenu avec entités décodées en texte pur
 * 
 * @example
 * ```ts
 * const escaped = '# Title\n&lt;script&gt;alert("XSS")&lt;/script&gt;';
 * const unescaped = unescapeHtmlEntities(escaped);
 * // Résultat : '# Title\n<script>alert("XSS")</script>'
 * // Note: Le texte sera affiché tel quel dans l'éditeur, pas exécuté
 * ```
 */
export function unescapeHtmlEntities(content: string): string {
  if (!content) return content;

  // Vérifier si des entités HTML sont présentes
  const hasHtmlEntities = /&(?:lt|gt|amp|quot|#039);/i.test(content);
  
  if (!hasHtmlEntities) {
    // Pas d'entités HTML, retourner tel quel
    return content;
  }

  if (process.env.NODE_ENV === 'development') {
    logger.debug(LogCategory.EDITOR, '🔓 [CLIENT-SANITIZER] Entités HTML détectées, dé-échappement appliqué');
  }

  // Dé-échapper les entités HTML dans l'ordre inverse de l'échappement
  // (Important: & en dernier pour éviter les doubles décodages)
  return content
    .replace(/&#039;/g, "'")   // Dé-échapper '
    .replace(/&quot;/g, '"')   // Dé-échapper "
    .replace(/&gt;/g, '>')     // Dé-échapper >
    .replace(/&lt;/g, '<')     // Dé-échapper <
    .replace(/&amp;/g, '&');   // Dé-échapper & en dernier
}

/**
 * Nettoie le contenu markdown pour Tiptap
 * 
 * @description Prépare le contenu pour l'éditeur Tiptap en:
 * 1. Dé-échappant les entités HTML
 * 2. Normalisant les sauts de ligne
 * 3. Supprimant les espaces en fin de ligne
 * 
 * @param content - Contenu brut depuis la DB
 * @returns Contenu propre pour Tiptap
 * 
 * @example
 * ```ts
 * const dbContent = prepareMarkdownForEditor(note.markdown_content);
 * editor.commands.setContent(dbContent);
 * ```
 */
export function prepareMarkdownForEditor(content: string): string {
  if (!content) return '';

  let cleaned = content;

  // 1. Dé-échapper les entités HTML
  cleaned = unescapeHtmlEntities(cleaned);

  // 2. Normaliser les sauts de ligne (CRLF → LF)
  cleaned = cleaned.replace(/\r\n/g, '\n');

  // 3. Supprimer les espaces en fin de ligne
  cleaned = cleaned.split('\n').map(line => line.trimEnd()).join('\n');

  // 4. S'assurer qu'il y a un saut de ligne final
  if (cleaned && !cleaned.endsWith('\n')) {
    cleaned += '\n';
  }

  return cleaned;
}

/**
 * Détecte si le contenu contient du HTML brut dangereux
 * 
 * @description Vérifie la présence de balises HTML potentiellement dangereuses.
 * Utilisé pour logger les warnings quand du HTML arrive dans l'éditeur.
 * 
 * @param content - Contenu à vérifier
 * @returns true si HTML dangereux détecté
 */
export function detectDangerousHtml(content: string): boolean {
  if (!content) return false;

  const dangerousPatterns = [
    /<script/i,                  // Scripts (même incomplets)
    /<iframe/i,                  // Iframes (même incomplets)
    /<embed/i,                   // Embeds (même incomplets)
    /<object/i,                  // Objects (même incomplets)
    /on\w+\s*=/i,                // Event handlers
    /<style/i,                   // Styles inline
    /<link/i,                    // Links externes
    /<base/i,                    // Base URLs
  ];

  return dangerousPatterns.some(pattern => pattern.test(content));
}

/**
 * Valide et nettoie le contenu avant de l'envoyer à Tiptap
 * 
 * @description Fonction de sécurité finale qui:
 * 1. Dé-échappe les entités HTML
 * 2. Détecte le HTML dangereux et log un warning
 * 3. Prépare le contenu pour l'éditeur
 * 
 * @param content - Contenu depuis la DB
 * @returns Contenu sécurisé pour Tiptap
 */
export function sanitizeForEditor(content: string): string {
  if (!content) return '';

  // Dé-échapper et préparer
  const prepared = prepareMarkdownForEditor(content);

  // Vérifier la présence de HTML dangereux APRÈS dé-échappement
  if (detectDangerousHtml(prepared)) {
    logger.warn(
      LogCategory.EDITOR,
      '⚠️ [CLIENT-SANITIZER] HTML potentiellement dangereux détecté dans le contenu. ' +
      'Ceci ne devrait pas arriver si la sanitization serveur fonctionne correctement.'
    );
    logger.debug(LogCategory.EDITOR, 'Extrait du contenu suspect:', prepared.substring(0, 200));
  }

  return prepared;
}

