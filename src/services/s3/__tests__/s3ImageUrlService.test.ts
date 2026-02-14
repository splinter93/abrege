/**
 * Tests unitaires pour S3ImageUrlService
 * 
 * Vérifie :
 * - Conversion URL S3 canonique → presigned URL
 * - URL non-S3 → pas de modification
 * - Erreur S3 → fallback sur URL originale
 * - Provider non-Groq/xAI → pas de conversion
 * - Cas limites (URLs vides, base64, externes)
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md:
 * - Tests isolés avec mocks
 * - Couverture scénarios critiques
 * - Assertions explicites
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { convertS3UrlsToPresigned } from '../s3ImageUrlService';

// Mock s3Service
vi.mock('@/services/s3Service', () => ({
  s3Service: {
    generateGetUrl: vi.fn()
  }
}));

describe('S3ImageUrlService', () => {
  let s3Service: { generateGetUrl: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await import('@/services/s3Service');
    s3Service = module.s3Service;
  });

  describe('convertS3UrlsToPresigned', () => {
    it('devrait convertir une URL S3 canonique en presigned URL (Groq)', async () => {
      const images = [
        { url: 'https://bucket.s3.eu-west-3.amazonaws.com/path/to/image.jpg' }
      ];
      const presignedUrl = 'https://bucket.s3.eu-west-3.amazonaws.com/path/to/image.jpg?X-Amz-Algorithm=...';

      s3Service.generateGetUrl.mockResolvedValueOnce(presignedUrl);

      await convertS3UrlsToPresigned({
        images,
        provider: 'groq',
        expiresIn: 86400
      });

      expect(images[0].url).toBe(presignedUrl);
      expect(s3Service.generateGetUrl).toHaveBeenCalledWith('path/to/image.jpg', 86400);
    });

    it('devrait convertir une URL S3 canonique en presigned URL (xAI)', async () => {
      const images = [
        { url: 'https://scrivia.s3.eu-west-3.amazonaws.com/files/user123/image.png' }
      ];
      const presignedUrl = 'https://scrivia.s3.eu-west-3.amazonaws.com/files/user123/image.png?X-Amz-Algorithm=...';

      s3Service.generateGetUrl.mockResolvedValueOnce(presignedUrl);

      await convertS3UrlsToPresigned({
        images,
        provider: 'xai',
        expiresIn: 3600
      });

      expect(images[0].url).toBe(presignedUrl);
      expect(s3Service.generateGetUrl).toHaveBeenCalledWith('files/user123/image.png', 3600);
    });

    it('devrait décoder les clés URL encodées', async () => {
      const encodedKey = encodeURIComponent('path/to file.jpg');
      const images = [
        { url: `https://bucket.s3.region.amazonaws.com/${encodedKey}` }
      ];
      const presignedUrl = 'https://bucket.s3.region.amazonaws.com/path/to%20file.jpg?X-Amz-Algorithm=...';

      s3Service.generateGetUrl.mockResolvedValueOnce(presignedUrl);

      await convertS3UrlsToPresigned({
        images,
        provider: 'groq'
      });

      expect(s3Service.generateGetUrl).toHaveBeenCalledWith('path/to file.jpg', 86400);
    });

    it('ne devrait pas modifier les URLs non-S3 (base64)', async () => {
      const originalUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const images = [{ url: originalUrl }];

      await convertS3UrlsToPresigned({
        images,
        provider: 'groq'
      });

      expect(images[0].url).toBe(originalUrl);
      expect(s3Service.generateGetUrl).not.toHaveBeenCalled();
    });

    it('ne devrait pas modifier les URLs externes (Unsplash)', async () => {
      const originalUrl = 'https://images.unsplash.com/photo-1234567890';
      const images = [{ url: originalUrl }];

      await convertS3UrlsToPresigned({
        images,
        provider: 'groq'
      });

      expect(images[0].url).toBe(originalUrl);
      expect(s3Service.generateGetUrl).not.toHaveBeenCalled();
    });

    it('devrait convertir les URLs S3 pour provider Liminality (serveur Synesia doit pouvoir GET)', async () => {
      const originalUrl = 'https://bucket.s3.region.amazonaws.com/image.jpg';
      const presignedUrl = 'https://bucket.s3.region.amazonaws.com/image.jpg?X-Amz-Algorithm=...';
      const images = [{ url: originalUrl }];

      s3Service.generateGetUrl.mockResolvedValueOnce(presignedUrl);

      await convertS3UrlsToPresigned({
        images,
        provider: 'liminality'
      });

      expect(images[0].url).toBe(presignedUrl);
      expect(s3Service.generateGetUrl).toHaveBeenCalled();
    });

    it('devrait gérer les erreurs S3 gracieusement (fallback sur URL originale)', async () => {
      const originalUrl = 'https://bucket.s3.region.amazonaws.com/image.jpg';
      const images = [{ url: originalUrl }];

      s3Service.generateGetUrl.mockRejectedValueOnce(new Error('S3 access denied'));

      await convertS3UrlsToPresigned({
        images,
        provider: 'groq'
      });

      // URL originale préservée en cas d'erreur
      expect(images[0].url).toBe(originalUrl);
      expect(s3Service.generateGetUrl).toHaveBeenCalled();
    });

    it('devrait convertir plusieurs URLs S3 dans un batch', async () => {
      const images = [
        { url: 'https://bucket.s3.region.amazonaws.com/image1.jpg' },
        { url: 'https://bucket.s3.region.amazonaws.com/image2.jpg' },
        { url: 'data:image/png;base64,...' } // Non-S3, doit être skip
      ];

      const presigned1 = 'https://bucket.s3.region.amazonaws.com/image1.jpg?X-Amz-Algorithm=...';
      const presigned2 = 'https://bucket.s3.region.amazonaws.com/image2.jpg?X-Amz-Algorithm=...';

      s3Service.generateGetUrl
        .mockResolvedValueOnce(presigned1)
        .mockResolvedValueOnce(presigned2);

      await convertS3UrlsToPresigned({
        images,
        provider: 'groq'
      });

      expect(images[0].url).toBe(presigned1);
      expect(images[1].url).toBe(presigned2);
      expect(images[2].url).toBe('data:image/png;base64,...'); // Non modifié
      expect(s3Service.generateGetUrl).toHaveBeenCalledTimes(2);
    });

    it('devrait utiliser expiration par défaut (86400s) si non spécifiée', async () => {
      const images = [
        { url: 'https://bucket.s3.region.amazonaws.com/image.jpg' }
      ];
      const presignedUrl = 'https://bucket.s3.region.amazonaws.com/image.jpg?X-Amz-Algorithm=...';

      s3Service.generateGetUrl.mockResolvedValueOnce(presignedUrl);

      await convertS3UrlsToPresigned({
        images,
        provider: 'groq'
        // expiresIn non spécifié
      });

      expect(s3Service.generateGetUrl).toHaveBeenCalledWith('image.jpg', 86400);
    });

    it('devrait gérer un tableau vide d\'images', async () => {
      const images: Array<{ url: string }> = [];

      await convertS3UrlsToPresigned({
        images,
        provider: 'groq'
      });

      expect(s3Service.generateGetUrl).not.toHaveBeenCalled();
    });

    it('devrait gérer les URLs S3 avec query parameters', async () => {
      // Cas limite : URL S3 avec query params (ne devrait pas matcher le pattern)
      const originalUrl = 'https://bucket.s3.region.amazonaws.com/image.jpg?version=123';
      const images = [{ url: originalUrl }];

      await convertS3UrlsToPresigned({
        images,
        provider: 'groq'
      });

      // Ne devrait pas matcher le pattern (query params non supportés)
      // Le pattern regex ne match pas car il s'arrête avant le '?'
      expect(images.length).toBe(1);
      expect(images[0]?.url).toBe(originalUrl);
      expect(s3Service.generateGetUrl).not.toHaveBeenCalled();
    });

    it('devrait gérer les URLs S3 avec fragments', async () => {
      // Cas limite : URL S3 avec fragment (ne devrait pas matcher le pattern)
      const originalUrl = 'https://bucket.s3.region.amazonaws.com/image.jpg#section';
      const images = [{ url: originalUrl }];

      await convertS3UrlsToPresigned({
        images,
        provider: 'groq'
      });

      // Ne devrait pas matcher le pattern (fragments non supportés)
      // Le pattern regex ne match pas car il s'arrête avant le '#'
      expect(images.length).toBe(1);
      expect(images[0]?.url).toBe(originalUrl);
      expect(s3Service.generateGetUrl).not.toHaveBeenCalled();
    });
  });
});

