/**
 * Types TypeScript stricts pour le support d'images dans le chat
 * Conforme à la spécification Grok Vision API
 * @see https://docs.x.ai/docs/guides/image-understanding
 */

/**
 * Niveau de détail pour le traitement de l'image par le modèle
 * - auto: Détermination automatique de la résolution (défaut)
 * - low: Résolution basse (plus rapide, moins coûteuse)
 * - high: Résolution haute (plus lente, plus coûteuse, plus de détails)
 */
export type ImageDetail = 'auto' | 'low' | 'high';

/**
 * Formats d'image supportés par Grok Vision
 */
export type SupportedImageFormat = 'image/jpeg' | 'image/jpg' | 'image/png';

/**
 * Limites de validation pour les images
 */
export const IMAGE_VALIDATION_LIMITS = {
  /**
   * Taille maximale par image: 20 Mo
   */
  MAX_SIZE_BYTES: 20 * 1024 * 1024,
  
  /**
   * Formats acceptés
   */
  SUPPORTED_FORMATS: ['image/jpeg', 'image/jpg', 'image/png'] as const,
  
  /**
   * Extensions de fichiers valides
   */
  SUPPORTED_EXTENSIONS: ['.jpg', '.jpeg', '.png'] as const,
} as const;

/**
 * Représentation d'une image attachée avant l'envoi
 * Contient à la fois les données de preview (URL object) et les données encodées (base64)
 */
export interface ImageAttachment {
  /**
   * Identifiant unique de l'attachement
   */
  id: string;
  
  /**
   * Fichier original
   */
  file: File;
  
  /**
   * URL de preview pour affichage dans l'UI (créée via URL.createObjectURL)
   * Doit être révoquée avec URL.revokeObjectURL lors du cleanup
   */
  previewUrl: string;
  
  /**
   * Image encodée en base64 avec le data URI scheme
   * Format: "data:image/jpeg;base64,/9j/4AAQ..."
   */
  base64: string;
  
  /**
   * Niveau de détail pour le traitement par le modèle
   * @default 'auto'
   */
  detail?: ImageDetail;
  
  /**
   * Nom du fichier original
   */
  fileName: string;
  
  /**
   * Type MIME du fichier
   */
  mimeType: SupportedImageFormat;
  
  /**
   * Taille du fichier en octets
   */
  size: number;
  
  /**
   * Timestamp de l'ajout
   */
  addedAt: number;
}

/**
 * Erreur de validation d'image
 */
export interface ImageValidationError {
  /**
   * Type d'erreur
   */
  type: 'invalid_format' | 'too_large' | 'corrupted' | 'unsupported';
  
  /**
   * Message d'erreur lisible
   */
  message: string;
  
  /**
   * Nom du fichier concerné
   */
  fileName: string;
  
  /**
   * Détails additionnels (taille, format, etc.)
   */
  details?: Record<string, unknown>;
}

/**
 * Résultat de validation d'un fichier
 */
export interface ImageValidationResult {
  /**
   * Le fichier est-il valide ?
   */
  valid: boolean;
  
  /**
   * Erreur si la validation échoue
   */
  error?: ImageValidationError;
}

/**
 * Contenu texte dans un message multi-modal
 */
export interface TextContent {
  type: 'text';
  text: string;
}

/**
 * Contenu image dans un message multi-modal
 * Conforme au format Grok Vision API
 */
export interface ImageUrlContent {
  type: 'image_url';
  image_url: {
    /**
     * URL de l'image (data URI base64 ou URL publique)
     */
    url: string;
    
    /**
     * Niveau de détail pour le traitement
     */
    detail?: ImageDetail;
  };
}

/**
 * Union des types de contenu possibles
 */
export type MessageContentPart = TextContent | ImageUrlContent;

/**
 * Contenu d'un message: soit string simple, soit array multi-modal
 */
export type MessageContent = string | MessageContentPart[];

/**
 * Statistiques d'upload d'images
 */
export interface ImageUploadStats {
  /**
   * Nombre d'images uploadées avec succès
   */
  successCount: number;
  
  /**
   * Nombre d'images rejetées
   */
  rejectedCount: number;
  
  /**
   * Taille totale en octets
   */
  totalSize: number;
  
  /**
   * Erreurs rencontrées
   */
  errors: ImageValidationError[];
}


