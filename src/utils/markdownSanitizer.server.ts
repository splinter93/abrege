/**
 * Sanitization du Markdown côté serveur
 * 
 * @description Fonctions pour nettoyer et sécuriser le contenu Markdown
 * avant de le sauvegarder en base de données. Empêche les injections HTML/XSS.
 * 
 * @author Scrivia Team
 * @version 1.0.0
 */

import { logApi } from './logger';

/**
 * Échappe automatiquement tout HTML brut dans le markdown
 * 
 * @description Fonction de sanitization OBLIGATOIRE avant toute sauvegarde en base.
 * Convertit le HTML brut en entités HTML pour empêcher l'interprétation.
 * 
 * **Règle** : Le markdown_content ne doit JAMAIS contenir de HTML brut (<div>, <span>, etc.)
 * Seulement du Markdown pur + HTML échappé (&lt;div&gt;, &lt;span&gt;, etc.)
 * 
 * @param content - Contenu markdown potentiellement avec HTML brut
 * @returns Contenu sécurisé avec HTML échappé
 * 
 * @example
 * ```ts
 * const unsafe = '# Title\n<script>alert("XSS")</script>';
 * const safe = sanitizeMarkdownContent(unsafe);
 * // Résultat : '# Title\n&lt;script&gt;alert("XSS")&lt;/script&gt;'
 * ```
 */
export function sanitizeMarkdownContent(content: string): string {
  if (!content) return content;

  // Détecter si des caractères HTML potentiellement dangereux sont présents
  // On échappe si on trouve des balises HTML OU des caractères dangereux isolés
  const hasHtmlChars = /<|>|&(?!(?:lt|gt|amp|quot|#039);)/.test(content);
  
  if (!hasHtmlChars) {
    // Pas de caractères HTML, retourner tel quel
    return content;
  }

  // ⚠️ HTML/caractères dangereux détectés → échapper automatiquement
  logApi.warn('⚠️ [SANITIZER] HTML brut détecté dans markdown_content, échappement automatique appliqué');
  
  // Échapper tous les caractères HTML (dans l'ordre correct: & en premier)
  return content
    .replace(/&/g, '&amp;')   // Échapper & en premier
    .replace(/</g, '&lt;')    // Échapper <
    .replace(/>/g, '&gt;')    // Échapper >
    .replace(/"/g, '&quot;')  // Échapper "
    .replace(/'/g, '&#039;'); // Échapper '
}

/**
 * Valide que le contenu est du Markdown sécurisé
 * 
 * @description Vérifie que le contenu ne contient pas de HTML dangereux.
 * Retourne false si du HTML brut est détecté (avant sanitization).
 * 
 * @param content - Contenu à valider
 * @returns true si sécurisé, false si HTML brut détecté
 */
export function isMarkdownSafe(content: string): boolean {
  if (!content) return true;

  // Patterns HTML dangereux
  const dangerousPatterns = [
    /<script[\s\S]*?<\/script>/gi,      // Scripts
    /<iframe[\s\S]*?<\/iframe>/gi,      // Iframes
    /on\w+\s*=\s*["'][^"']*["']/gi,     // Event handlers (onclick, onerror, etc.)
    /<style[\s\S]*?<\/style>/gi,        // Styles inline
    /<embed[\s\S]*?>/gi,                 // Embeds
    /<object[\s\S]*?<\/object>/gi,      // Objects
  ];

  return !dangerousPatterns.some(pattern => pattern.test(content));
}

/**
 * Nettoie et sécurise le markdown en une seule passe
 * 
 * @description Applique toutes les transformations de sécurité :
 * - Supprime les scripts, iframes, event handlers
 * - Échappe le HTML restant
 * - Normalise les sauts de ligne
 * 
 * @param content - Contenu brut
 * @returns Contenu sécurisé et nettoyé
 */
export function cleanAndSanitizeMarkdown(content: string): string {
  if (!content) return '';

  let cleaned = content;

  // 1. Supprimer les éléments dangereux
  cleaned = cleaned
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  // 2. Supprimer les event handlers
  cleaned = cleaned.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');

  // 3. Échapper tout le HTML restant
  cleaned = sanitizeMarkdownContent(cleaned);

  // 4. Normaliser les sauts de ligne
  cleaned = cleaned.replace(/\r\n/g, '\n');

  return cleaned;
}


