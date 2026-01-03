/**
 * Service pour la conversion des URLs S3 canoniques en presigned URLs
 * 
 * Responsabilités :
 * - Détection des URLs S3 canoniques (pattern regex)
 * - Conversion en presigned URLs avec expiration configurable
 * - Gestion gracieuse des erreurs (fallback sur URL originale)
 * - Support des providers Groq et xAI uniquement
 * 
 * Standards :
 * - Max 150 lignes
 * - Types stricts (pas de `any`)
 * - Logging structuré (info pour succès, warn pour erreurs)
 */

import { simpleLogger as logger } from '@/utils/logger';

/**
 * Options pour la conversion des URLs S3
 */
export interface ConvertS3UrlsOptions {
  images: Array<{ url: string }>;
  provider: 'groq' | 'xai' | 'liminality';
  expiresIn?: number; // default: 86400 (24h)
}

/**
 * Pattern regex pour détecter les URLs S3 canoniques
 * Format: https://{bucket}.s3.{region}.amazonaws.com/{key}
 * Note: Ne match pas les query params (?key=value) ni les fragments (#section)
 */
const S3_CANONICAL_PATTERN = /^https:\/\/([^/]+)\.s3\.([^.]+)\.amazonaws\.com\/([^?#]+)/;

/**
 * Convertit les URLs S3 canoniques en presigned URLs pour les providers qui en ont besoin
 * 
 * @param options - Options de conversion (images, provider, expiration)
 * @returns Promise<void> (modifie les images en place)
 * 
 * @example
 * ```typescript
 * const images = [{ url: 'https://bucket.s3.region.amazonaws.com/key' }];
 * await convertS3UrlsToPresigned({
 *   images,
 *   provider: 'groq',
 *   expiresIn: 86400
 * });
 * // images[0].url est maintenant une presigned URL
 * ```
 */
export async function convertS3UrlsToPresigned(
  options: ConvertS3UrlsOptions
): Promise<void> {
  const { images, provider, expiresIn = 86400 } = options;

  // Skip si pas d'images ou provider ne nécessite pas de conversion
  if (!images || images.length === 0) {
    return;
  }

  if (provider !== 'groq' && provider !== 'xai') {
    // Liminality gère les images différemment (base64 ou URLs publiques)
    return;
  }

  // Lazy import pour éviter les dépendances circulaires
  const { s3Service } = await import('@/services/s3Service');

  let convertedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const image of images) {
    const originalUrl = image.url;

    // Skip si l'URL contient des query params ou fragments (non supportés)
    if (originalUrl.includes('?') || originalUrl.includes('#')) {
      skippedCount++;
      continue;
    }

    // Détecter si c'est une URL S3 canonique
    const match = originalUrl.match(S3_CANONICAL_PATTERN);

    if (!match) {
      // URL non-S3 (base64, external URL, etc.) → skip
      skippedCount++;
      continue;
    }

    // Extraire bucket, region, et key
    const [, bucket, region, key] = match;
    const decodedKey = decodeURIComponent(key);

    try {
      // Générer une presigned URL avec expiration configurable
      // Cela permet au provider de télécharger l'image même si le bucket n'est pas public
      const presignedUrl = await s3Service.generateGetUrl(decodedKey, expiresIn);
      image.url = presignedUrl;
      convertedCount++;

      logger.info('[S3ImageUrlService] 🔑 URL S3 convertie en presigned URL:', {
        provider,
        originalUrl: `https://${bucket}.s3.${region}.amazonaws.com/${key.substring(0, 50)}...`,
        key: decodedKey.substring(0, 50) + '...',
        expiresIn: `${expiresIn}s (${Math.round(expiresIn / 3600)}h)`
      });
    } catch (s3Error) {
      // Fallback gracieux : continuer avec l'URL originale
      // (peut-être que le bucket est public ou l'URL est déjà accessible)
      errorCount++;
      logger.warn('[S3ImageUrlService] ⚠️ Erreur génération presigned URL, utilisation URL originale:', {
        error: s3Error instanceof Error ? s3Error.message : String(s3Error),
        originalUrl: originalUrl.substring(0, 100),
        provider
      });
      // Continuer avec l'URL originale (pas de modification de image.url)
    }
  }

  // Log récapitulatif si conversions effectuées
  if (convertedCount > 0 || errorCount > 0) {
    logger.info('[S3ImageUrlService] ✅ Conversion terminée:', {
      provider,
      total: images.length,
      converted: convertedCount,
      skipped: skippedCount,
      errors: errorCount
    });
  }
}

