import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { z } from 'zod';
import { simpleLogger as logger } from '@/utils/logger';

// Configuration validation
const s3ConfigSchema = z.object({
  region: z.string().min(1, 'AWS_REGION requis'),
  accessKeyId: z.string().min(1, 'AWS_ACCESS_KEY_ID requis'),
  secretAccessKey: z.string().min(1, 'AWS_SECRET_ACCESS_KEY requis'),
  bucket: z.string().min(1, 'AWS_S3_BUCKET requis'),
});

// Validation des variables d'environnement
const validateS3Config = () => {
  const config = {
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    bucket: process.env.AWS_S3_BUCKET,
  };

  const result = s3ConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Configuration S3 invalide: ${result.error.errors.map(e => e.message).join(', ')}`);
  }

  return result.data;
};

// Types pour la gestion d'erreurs
export interface S3Error extends Error {
  code?: string;
  statusCode?: number;
  requestId?: string;
}

export interface UploadOptions {
  fileName: string;
  fileType: string;
  maxSize?: number; // en bytes
  allowedTypes?: string[];
  expiresIn?: number; // secondes
}

export interface S3UploadResult {
  url: string;
  publicUrl: string;
  key: string;
}

import crypto from 'node:crypto';

export class S3Service {
  private client: S3Client;
  private bucket: string;
  private config: ReturnType<typeof validateS3Config>;

  constructor() {
    this.config = validateS3Config();
    this.client = new S3Client({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });
    this.bucket = this.config.bucket;
  }

  /**
   * Génère une URL pré-signée pour l'upload
   */
  async generateUploadUrl(options: UploadOptions): Promise<S3UploadResult> {
    try {
      // Validation des types de fichiers
      if (options.allowedTypes && !options.allowedTypes.includes(options.fileType)) {
        throw new Error(`Type de fichier non autorisé: ${options.fileType}`);
      }

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: options.fileName,
        ContentType: options.fileType,
        // Métadonnées pour le tracking
        Metadata: {
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'abrege-api',
        },
      });

      const expiresIn = typeof options.expiresIn === 'number' ? options.expiresIn : 900; // défaut 15 minutes
      const url = await getSignedUrl(this.client, command, { expiresIn });
      const publicUrl = url.split('?')[0];

      return {
        url,
        publicUrl,
        key: options.fileName,
      };
    } catch (error) {
      throw this.handleS3Error(error, 'generateUploadUrl');
    }
  }

  /**
   * Génère une URL pré-signée pour un GET (lecture)
   */
  async generateGetUrl(key: string, ttlSeconds: number = 120): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      return await getSignedUrl(this.client, command, { expiresIn: ttlSeconds });
    } catch (error) {
      throw this.handleS3Error(error, 'generateGetUrl');
    }
  }

  /**
   * Construit l'URL canonique (non signée) de l'objet S3
   */
  getObjectUrl(key: string): string {
    const encodedKey = key.split('/').map(encodeURIComponent).join('/');
    return `https://${this.bucket}.s3.${this.config.region}.amazonaws.com/${encodedKey}`;
  }

  /**
   * Récupère les métadonnées d'un objet (HEAD)
   */
  async getHeadObject(key: string): Promise<{ contentType?: string; contentLength?: number; etag?: string }> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      const res = await this.client.send(command);
      const etag = (res.ETag || '').replace(/"/g, '');
      return {
        contentType: res.ContentType || undefined,
        contentLength: typeof res.ContentLength === 'number' ? res.ContentLength : undefined,
        etag,
      };
    } catch (error) {
      throw this.handleS3Error(error, 'getHeadObject');
    }
  }

  /**
   * Vérifie si un fichier existe
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw this.handleS3Error(error, 'fileExists');
    }
  }

  /**
   * Supprime un fichier
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
    } catch (error) {
      throw this.handleS3Error(error, 'deleteFile');
    }
  }

  /**
   * Génère une clé structurée et unique pour un fichier
   */
  generateStructuredKey(userId: string, originalName: string): string {
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const base = originalName.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
    const extMatch = base.match(/\.[a-z0-9]{1,8}$/);
    const ext = extMatch ? extMatch[0] : '';
    const nameOnly = ext ? base.slice(0, -ext.length) : base;
    const random = crypto.randomUUID();
    return `${userId}/${yyyy}/${mm}/${dd}/${random}-${nameOnly}${ext}`;
  }

  /**
   * Gestion centralisée des erreurs S3
   */
  private handleS3Error(error: any, operation: string): S3Error {
    const s3Error: S3Error = new Error(`Erreur S3 lors de ${operation}: ${error.message}`);
    s3Error.code = error.code;
    s3Error.statusCode = error.statusCode;
    s3Error.requestId = error.requestId;

    // Log détaillé pour le debugging
    logger.error(`S3 Error [${operation}]:`, {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      requestId: error.requestId,
      stack: error.stack,
    });

    return s3Error;
  }

  /**
   * Valide la taille d'un fichier
   */
  validateFileSize(fileSize: number, maxSize: number = 5 * 1024 * 1024): void {
    if (fileSize > maxSize) {
      throw new Error(`Fichier trop volumineux. Taille max: ${Math.round(maxSize / 1024 / 1024)}MB`);
    }
  }

  /**
   * Valide le type MIME d'un fichier
   */
  validateFileType(fileType: string, allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']): void {
    if (!allowedTypes.includes(fileType)) {
      throw new Error(`Type de fichier non supporté: ${fileType}. Types autorisés: ${allowedTypes.join(', ')}`);
    }
  }
}

// Instance singleton
export const s3Service = new S3Service(); 