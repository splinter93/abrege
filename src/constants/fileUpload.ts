/**
 * Constantes partagées pour l'upload de fichiers
 * Centralise les valeurs utilisées dans plusieurs composants
 */

// ========================================
// LIMITES DE FICHIERS
// ========================================

export const FILE_SIZE_LIMITS = {
  MAX_IMAGE_SIZE: 8 * 1024 * 1024, // 8MB
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
} as const;

// ========================================
// TYPES MIME AUTORISÉS
// ========================================

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png', 
  'image/gif',
  'image/webp'
] as const;

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
] as const;

// ========================================
// VALEURS PAR DÉFAUT
// ========================================

export const DEFAULT_VALUES = {
  IMAGE_TYPE: 'image/jpeg',
  EXTERNAL_FILENAME: 'image_externe',
} as const;

// ========================================
// MESSAGES D'ERREUR
// ========================================

export const ERROR_MESSAGES = {
  FILE_TOO_LARGE: (maxSize: number) => `Fichier trop volumineux. Taille max: ${(maxSize / 1024 / 1024).toFixed(0)}MB`,
  INVALID_TYPE: (type: string, allowed: readonly string[]) => `Type non supporté (${type}). Formats acceptés: ${allowed.join(', ')}`,
  AUTHENTICATION_REQUIRED: 'Authentification requise',
  UPLOAD_FAILED: 'Erreur lors de l\'upload',
  INVALID_URL: 'URL générée invalide',
} as const;
