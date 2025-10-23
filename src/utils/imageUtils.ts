/**
 * Utilitaires de validation et conversion d'images
 * Support pour Grok Vision API
 */

import { logger, LogCategory } from '@/utils/logger';
import type {
  ImageAttachment,
  ImageValidationResult,
  ImageValidationError,
  SupportedImageFormat,
  ImageUploadStats,
  MessageContent,
  MessageContentPart,
} from '@/types/image';
import { IMAGE_VALIDATION_LIMITS } from '@/types/image';

/**
 * Valide qu'un fichier est une image supportée
 * @param file - Le fichier à valider
 * @returns Résultat de validation avec erreur détaillée si invalide
 */
export function validateImageFile(file: File): ImageValidationResult {
  // Vérifier le type MIME
  const supportedFormats = IMAGE_VALIDATION_LIMITS.SUPPORTED_FORMATS as readonly string[];
  if (!supportedFormats.includes(file.type)) {
    return {
      valid: false,
      error: {
        type: 'invalid_format',
        message: `Format non supporté: ${file.type}. Formats acceptés: JPG, JPEG, PNG`,
        fileName: file.name,
        details: {
          actualFormat: file.type,
          supportedFormats: IMAGE_VALIDATION_LIMITS.SUPPORTED_FORMATS,
        },
      },
    };
  }

  // Vérifier la taille
  if (file.size > IMAGE_VALIDATION_LIMITS.MAX_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const maxSizeMB = (IMAGE_VALIDATION_LIMITS.MAX_SIZE_BYTES / (1024 * 1024)).toFixed(0);
    
    return {
      valid: false,
      error: {
        type: 'too_large',
        message: `Fichier trop volumineux: ${sizeMB} Mo. Taille maximale: ${maxSizeMB} Mo`,
        fileName: file.name,
        details: {
          actualSize: file.size,
          maxSize: IMAGE_VALIDATION_LIMITS.MAX_SIZE_BYTES,
        },
      },
    };
  }

  // Vérifier l'extension du nom de fichier
  const extension = file.name.toLowerCase().match(/\.(jpg|jpeg|png)$/);
  if (!extension) {
    return {
      valid: false,
      error: {
        type: 'invalid_format',
        message: `Extension de fichier invalide. Extensions acceptées: .jpg, .jpeg, .png`,
        fileName: file.name,
        details: {
          fileName: file.name,
        },
      },
    };
  }

  return { valid: true };
}

/**
 * Convertit un fichier en chaîne base64 avec data URI
 * @param file - Le fichier à convertir
 * @returns Promise qui résout avec la chaîne base64
 */
export async function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Échec de conversion en base64: résultat invalide'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error(`Erreur de lecture du fichier: ${reader.error?.message || 'Erreur inconnue'}`));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Crée un ImageAttachment à partir d'un fichier validé
 * @param file - Le fichier à convertir
 * @param detail - Niveau de détail pour le traitement
 * @returns Promise qui résout avec l'ImageAttachment
 */
export async function createImageAttachment(
  file: File,
  detail: 'auto' | 'low' | 'high' = 'auto'
): Promise<ImageAttachment> {
  try {
    // Valider le fichier d'abord
    const validation = validateImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error?.message || 'Fichier invalide');
    }

    // Convertir en base64
    const base64 = await convertFileToBase64(file);
    
    // Créer l'URL de preview
    const previewUrl = URL.createObjectURL(file);
    
    // Générer un ID unique
    const id = `img-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    const attachment: ImageAttachment = {
      id,
      file,
      previewUrl,
      base64,
      detail,
      fileName: file.name,
      mimeType: file.type as SupportedImageFormat,
      size: file.size,
      addedAt: Date.now(),
    };
    
    logger.debug(LogCategory.EDITOR, '✅ Image attachée:', {
      id: attachment.id,
      fileName: attachment.fileName,
      size: `${(attachment.size / 1024).toFixed(2)} Ko`,
      detail: attachment.detail,
    });
    
    return attachment;
  } catch (error) {
    logger.error(LogCategory.EDITOR, '❌ Erreur création ImageAttachment:', error);
    throw error;
  }
}

/**
 * Traite plusieurs fichiers et retourne les attachments + statistiques
 * @param files - Les fichiers à traiter
 * @param detail - Niveau de détail pour le traitement
 * @returns Promise avec les attachments valides et les statistiques
 */
export async function processImageFiles(
  files: File[],
  detail: 'auto' | 'low' | 'high' = 'auto'
): Promise<{
  attachments: ImageAttachment[];
  stats: ImageUploadStats;
}> {
  const stats: ImageUploadStats = {
    successCount: 0,
    rejectedCount: 0,
    totalSize: 0,
    errors: [],
  };

  const attachments: ImageAttachment[] = [];

  for (const file of files) {
    const validation = validateImageFile(file);
    
    if (!validation.valid && validation.error) {
      stats.rejectedCount++;
      stats.errors.push(validation.error);
      logger.warn(LogCategory.EDITOR, `⚠️ Fichier rejeté: ${file.name}`, validation.error);
      continue;
    }

    try {
      const attachment = await createImageAttachment(file, detail);
      attachments.push(attachment);
      stats.successCount++;
      stats.totalSize += file.size;
    } catch (error) {
      stats.rejectedCount++;
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      const validationError: ImageValidationError = {
        type: 'corrupted',
        message: `Impossible de traiter le fichier: ${errorMessage}`,
        fileName: file.name,
        details: {
          error: errorMessage,
        },
      };
      
      stats.errors.push(validationError);
      logger.error(LogCategory.EDITOR, `❌ Erreur traitement fichier: ${file.name}`, error);
    }
  }

  logger.info(LogCategory.EDITOR, '📊 Résumé traitement images:', {
    total: files.length,
    success: stats.successCount,
    rejected: stats.rejectedCount,
    totalSizeKB: (stats.totalSize / 1024).toFixed(2),
  });

  return { attachments, stats };
}

/**
 * Révoque les URLs de preview pour libérer la mémoire
 * @param attachments - Les attachments dont on veut libérer les URLs
 */
export function revokeImageAttachments(attachments: ImageAttachment[]): void {
  for (const attachment of attachments) {
    try {
      URL.revokeObjectURL(attachment.previewUrl);
      logger.debug(LogCategory.EDITOR, `🧹 URL révoquée: ${attachment.id}`);
    } catch (error) {
      logger.warn(LogCategory.EDITOR, `⚠️ Impossible de révoquer URL: ${attachment.id}`, error);
    }
  }
}

/**
 * Construit le contenu d'un message avec texte et images
 * Format compatible avec Grok Vision API
 * @param text - Le texte du message
 * @param images - Les images attachées
 * @returns Contenu formaté (string si pas d'images, array sinon)
 */
export function buildMessageContent(
  text: string,
  images: ImageAttachment[]
): MessageContent {
  // Si pas d'images, retourner le texte simple
  if (images.length === 0) {
    return text;
  }

  // Construire le contenu multi-modal
  const content: MessageContentPart[] = [
    {
      type: 'text',
      text,
    },
  ];

  // Ajouter chaque image
  for (const image of images) {
    content.push({
      type: 'image_url',
      image_url: {
        url: image.base64,
        detail: image.detail || 'auto',
      },
    });
  }

  logger.debug(LogCategory.EDITOR, '📝 Message multi-modal construit:', {
    textLength: text.length,
    imageCount: images.length,
    totalParts: content.length,
  });

  return content;
}

/**
 * Extrait le texte d'un MessageContent (utile pour l'affichage)
 * @param content - Le contenu du message
 * @returns Le texte extrait
 */
export function extractTextFromContent(content: MessageContent): string {
  if (typeof content === 'string') {
    return content;
  }

  // Trouver la partie texte
  const textPart = content.find((part): part is MessageContentPart & { type: 'text' } => part.type === 'text');
  return textPart?.text || '';
}

/**
 * Compte le nombre d'images dans un MessageContent
 * @param content - Le contenu du message
 * @returns Le nombre d'images
 */
export function countImagesInContent(content: MessageContent): number {
  if (typeof content === 'string') {
    return 0;
  }

  return content.filter(part => part.type === 'image_url').length;
}

/**
 * Formate la taille d'un fichier en string lisible
 * @param bytes - La taille en octets
 * @returns String formatée (ex: "2.5 Mo", "350 Ko")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 octets';
  
  const k = 1024;
  const sizes = ['octets', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

