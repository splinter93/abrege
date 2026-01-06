/**
 * Validation des inputs chat côté client
 * 
 * Conforme GUIDE-EXCELLENCE-CODE.md :
 * - Validation avant envoi
 * - Messages d'erreur clairs
 * - Limites documentées
 * 
 * @module utils/chatValidation
 */

/**
 * Limites de validation pour le chat
 */
export const CHAT_LIMITS = {
  /**
   * Longueur maximale d'un message (en caractères)
   * Limite raisonnable pour éviter les timeouts et coûts excessifs
   */
  MAX_MESSAGE_LENGTH: 50000, // ~10k mots
  
  /**
   * Longueur minimale d'un message (après trim)
   * 0 = autorise messages vides si images présentes
   */
  MIN_MESSAGE_LENGTH: 0,
  
  /**
   * Nombre maximum d'images par message
   */
  MAX_IMAGES: 10,
  
  /**
   * Nombre maximum de notes attachées
   */
  MAX_NOTES: 20
} as const;

/**
 * Résultat de validation
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
}

/**
 * Valide un message avant envoi
 * 
 * @param message - Message à valider (peut être vide si images présentes)
 * @param imagesCount - Nombre d'images attachées
 * @param notesCount - Nombre de notes attachées
 * @returns Résultat de validation
 */
export function validateMessage(
  message: string,
  imagesCount: number = 0,
  notesCount: number = 0
): ValidationResult {
  const trimmedMessage = message.trim();
  
  // ✅ Vérifier longueur maximale
  if (message.length > CHAT_LIMITS.MAX_MESSAGE_LENGTH) {
    const messageLength = message.length;
    const maxLength = CHAT_LIMITS.MAX_MESSAGE_LENGTH;
    const excess = messageLength - maxLength;
    
    return {
      valid: false,
      error: `Message trop long (${messageLength.toLocaleString()} caractères)\n\nLimite : ${maxLength.toLocaleString()} caractères\nDépassement : ${excess.toLocaleString()} caractères\n\n💡 Conseil : Divisez votre message en plusieurs parties ou réduisez le contenu.`
    };
  }
  
  // ✅ Vérifier qu'il y a du contenu (message OU images)
  if (trimmedMessage.length === 0 && imagesCount === 0) {
    return {
      valid: false,
      error: 'Le message ne peut pas être vide.\n\n💡 Conseil : Écrivez un message ou ajoutez une image.'
    };
  }
  
  // ✅ Vérifier nombre d'images
  if (imagesCount > CHAT_LIMITS.MAX_IMAGES) {
    return {
      valid: false,
      error: `Trop d'images (${imagesCount})\n\nLimite : ${CHAT_LIMITS.MAX_IMAGES} images par message\n\n💡 Conseil : Réduisez le nombre d'images ou envoyez plusieurs messages.`
    };
  }
  
  // ✅ Vérifier nombre de notes
  if (notesCount > CHAT_LIMITS.MAX_NOTES) {
    return {
      valid: false,
      error: `Trop de notes attachées (${notesCount})\n\nLimite : ${CHAT_LIMITS.MAX_NOTES} notes par message\n\n💡 Conseil : Réduisez le nombre de notes ou envoyez plusieurs messages.`
    };
  }
  
  // ✅ Avertissement si message très long (mais valide)
  if (trimmedMessage.length > CHAT_LIMITS.MAX_MESSAGE_LENGTH * 0.8) {
    const remaining = CHAT_LIMITS.MAX_MESSAGE_LENGTH - trimmedMessage.length;
    return {
      valid: true,
      warning: `Message long (${trimmedMessage.length.toLocaleString()} caractères). Il reste ${remaining.toLocaleString()} caractères.`
    };
  }
  
  return { valid: true };
}

/**
 * Formate un nombre de caractères de manière lisible
 * 
 * @param count - Nombre de caractères
 * @returns String formatée (ex: "1 234" ou "50 000")
 */
export function formatCharacterCount(count: number): string {
  return count.toLocaleString('fr-FR');
}

/**
 * Calcule le pourcentage d'utilisation de la limite
 * 
 * @param current - Valeur actuelle
 * @param max - Valeur maximale
 * @returns Pourcentage (0-100)
 */
export function calculateUsagePercent(current: number, max: number): number {
  return Math.min(100, Math.round((current / max) * 100));
}



