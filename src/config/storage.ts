/**
 * Configuration centralisée des quotas de stockage
 * ==============================================
 * 
 * Ce fichier centralise toutes les limites de stockage pour faciliter
 * la modification et la maintenance.
 */

// ==========================================================================
// QUOTAS DE STOCKAGE PAR DÉFAUT
// ==========================================================================

export const STORAGE_CONFIG = {
  // Quota par défaut pour tous les utilisateurs (en octets)
  DEFAULT_QUOTA_BYTES: 1073741824, // 1 GB
  
  // Quotas par type d'utilisateur (si nécessaire)
  USER_TIERS: {
    FREE: 1073741824,        // 1 GB
    BASIC: 5368709120,       // 5 GB  
    PREMIUM: 21474836480,    // 20 GB
    ENTERPRISE: 107374182400 // 100 GB
  },
  
  // Limites par fichier
  FILE_LIMITS: {
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100 MB par fichier
    MAX_FILES_PER_UPLOAD: 10,          // 10 fichiers max par upload
    ALLOWED_MIME_TYPES: [
      'image/*',
      'application/pdf',
      'text/*',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]
  },
  
  // Seuils d'alerte (pourcentage du quota)
  ALERT_THRESHOLDS: {
    WARNING: 80,    // Avertissement à 80%
    CRITICAL: 95,   // Critique à 95%
    BLOCK: 100      // Blocage à 100%
  }
} as const;

// ==========================================================================
// FONCTIONS UTILITAIRES
// ==========================================================================

/**
 * Convertit des octets en format lisible
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Vérifie si un utilisateur peut uploader un fichier
 */
export function canUploadFile(currentUsage: number, fileSize: number, userQuota?: number): boolean {
  const quota = userQuota || STORAGE_CONFIG.DEFAULT_QUOTA_BYTES;
  return (currentUsage + fileSize) <= quota;
}

/**
 * Calcule le pourcentage d'utilisation
 */
export function calculateUsagePercentage(usedBytes: number, quotaBytes: number): number {
  return Math.round((usedBytes / quotaBytes) * 100);
}

/**
 * Détermine le niveau d'alerte basé sur l'utilisation
 */
export function getUsageAlertLevel(usedBytes: number, quotaBytes: number): 'safe' | 'warning' | 'critical' | 'blocked' {
  const percentage = calculateUsagePercentage(usedBytes, quotaBytes);
  
  if (percentage >= STORAGE_CONFIG.ALERT_THRESHOLDS.BLOCK) return 'blocked';
  if (percentage >= STORAGE_CONFIG.ALERT_THRESHOLDS.CRITICAL) return 'critical';
  if (percentage >= STORAGE_CONFIG.ALERT_THRESHOLDS.WARNING) return 'warning';
  return 'safe';
}

// ==========================================================================
// TYPES
// ==========================================================================

export type UserTier = keyof typeof STORAGE_CONFIG.USER_TIERS;
export type AlertLevel = ReturnType<typeof getUsageAlertLevel>;

export interface StorageQuota {
  usedBytes: number;
  quotaBytes: number;
  remainingBytes: number;
  usagePercentage: number;
  alertLevel: AlertLevel;
} 