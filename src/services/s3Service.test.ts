import { describe, it, expect, vi, beforeEach } from 'vitest';
import { S3Service } from './s3Service';

// Mock des modules AWS
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(),
  PutObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
  HeadObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(),
}));

// Mock des variables d'environnement
const mockEnv = {
  AWS_REGION: 'us-east-1',
  AWS_ACCESS_KEY_ID: 'test-access-key',
  AWS_SECRET_ACCESS_KEY: 'test-secret-key',
  AWS_S3_BUCKET: 'test-bucket',
};

describe('S3Service', () => {
  let s3Service: S3Service;

  beforeEach(() => {
    // Mock process.env
    vi.stubEnv('AWS_REGION', mockEnv.AWS_REGION);
    vi.stubEnv('AWS_ACCESS_KEY_ID', mockEnv.AWS_ACCESS_KEY_ID);
    vi.stubEnv('AWS_SECRET_ACCESS_KEY', mockEnv.AWS_SECRET_ACCESS_KEY);
    vi.stubEnv('AWS_S3_BUCKET', mockEnv.AWS_S3_BUCKET);

    s3Service = new S3Service();
  });

  describe('Configuration', () => {
    it('should throw error when AWS_REGION is missing', () => {
      vi.unstubAllEnvs();
      vi.stubEnv('AWS_ACCESS_KEY_ID', mockEnv.AWS_ACCESS_KEY_ID);
      vi.stubEnv('AWS_SECRET_ACCESS_KEY', mockEnv.AWS_SECRET_ACCESS_KEY);
      vi.stubEnv('AWS_S3_BUCKET', mockEnv.AWS_S3_BUCKET);

      expect(() => new S3Service()).toThrow('Configuration S3 invalide');
    });

    it('should throw error when AWS_ACCESS_KEY_ID is missing', () => {
      vi.unstubAllEnvs();
      vi.stubEnv('AWS_REGION', mockEnv.AWS_REGION);
      vi.stubEnv('AWS_SECRET_ACCESS_KEY', mockEnv.AWS_SECRET_ACCESS_KEY);
      vi.stubEnv('AWS_S3_BUCKET', mockEnv.AWS_S3_BUCKET);

      expect(() => new S3Service()).toThrow('Configuration S3 invalide');
    });

    it('should initialize correctly with valid configuration', () => {
      expect(s3Service).toBeInstanceOf(S3Service);
    });
  });

  describe('File validation', () => {
    it('should validate file size correctly', () => {
      const maxSize = 5 * 1024 * 1024; // 5MB
      
      // Test fichier valide
      expect(() => s3Service.validateFileSize(1024 * 1024)).not.toThrow();
      
      // Test fichier trop volumineux
      expect(() => s3Service.validateFileSize(maxSize + 1)).toThrow('Fichier trop volumineux');
    });

    it('should validate file type correctly', () => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      
      // Test types valides
      allowedTypes.forEach(type => {
        expect(() => s3Service.validateFileType(type)).not.toThrow();
      });
      
      // Test type invalide
      expect(() => s3Service.validateFileType('application/pdf')).toThrow('Type de fichier non supporté');
    });
  });

  describe('Key generation', () => {
    it('should generate unique keys', () => {
      const userId = 'test-user';
      const fileName = 'test-image.jpg';
      
      const key1 = s3Service.generateKey(userId, fileName);
      const key2 = s3Service.generateKey(userId, fileName);
      
      expect(key1).toContain(userId);
      expect(key1).toContain(fileName);
      expect(key1).not.toBe(key2); // Timestamps différents
    });

    it('should sanitize file names', () => {
      const userId = 'test-user';
      const fileName = 'test image (1).jpg';
      
      const key = s3Service.generateKey(userId, fileName);
      
      expect(key).toContain('test_image_1.jpg');
      expect(key).not.toContain(' ');
      expect(key).not.toContain('(');
      expect(key).not.toContain(')');
    });
  });

  describe('Error handling', () => {
    it('should handle S3 errors with proper context', () => {
      const mockError = new Error('S3 Error') as any;
      mockError.code = 'NoSuchBucket';
      mockError.statusCode = 404;
      mockError.requestId = 'test-request-id';

      const s3Error = (s3Service as any).handleS3Error(mockError, 'testOperation');
      
      expect(s3Error.message).toContain('Erreur S3 lors de testOperation');
      expect(s3Error.code).toBe('NoSuchBucket');
      expect(s3Error.statusCode).toBe(404);
      expect(s3Error.requestId).toBe('test-request-id');
    });
  });
}); 