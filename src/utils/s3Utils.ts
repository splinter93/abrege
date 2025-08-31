/**
 * Utilitaires S3 centralisés pour éviter la duplication de code
 */

/**
 * Construit l'URL canonique S3 avec encodage correct
 * Utilisée par tous les endpoints qui ont besoin de construire des URLs S3
 */
export function buildS3ObjectUrl(bucket: string, region: string, key: string): string {
  // Encoder correctement la clé S3
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
}

/**
 * Valide qu'une clé S3 est valide
 */
export function validateS3Key(key: string): boolean {
  return typeof key === 'string' && key.length > 0 && !key.includes('..');
}

/**
 * Extrait le nom de fichier d'une clé S3
 */
export function extractFileNameFromS3Key(key: string): string {
  const parts = key.split('/');
  return parts[parts.length - 1] || 'unknown';
}
