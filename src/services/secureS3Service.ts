import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { z } from 'zod';
import { createHash } from 'crypto';
import { supabase } from '@/supabaseClient';
import { simpleLogger as logger } from '@/utils/logger';
import { SERVER_ENV } from '@/config/env.server';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface SecureUploadOptions {
  fileName: string;
  fileType: string;
  fileSize: number;
  userId: string;
  folderId?: string;
  notebookId?: string;
  requestId: string;
}

export interface SecureUploadResult {
  uploadUrl: string;
  key: string;
  requestId: string;
  expiresAt: Date;
  sha256: string;
}

export interface SecureDownloadResult {
  downloadUrl: string;
  expiresAt: Date;
  etag?: string;
}

export interface QuotaCheckResult {
  canUpload: boolean;
  currentUsage: number;
  quota: number;
  remainingBytes: number;
}

// ========================================
// CONFIGURATION ET VALIDATION
// ========================================

const s3ConfigSchema = z.object({
  region: z.string().min(1, 'AWS_REGION requis'),
  accessKeyId: z.string().min(1, 'AWS_ACCESS_KEY_ID requis'),
  secretAccessKey: z.string().min(1, 'AWS_SECRET_ACCESS_KEY requis'),
  bucket: z.string().min(1, 'AWS_S3_BUCKET requis'),
});

// Configuration centralisée des types de fichiers autorisés
export const ALLOWED_FILE_TYPES = [
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff',
  
  // Documents texte
  'text/plain', 'text/markdown', 'text/csv', 'text/html', 'text/css', 'text/javascript',
  
  // Documents Office et PDF
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  
  // Google Docs/Sheets (types MIME alternatifs)
  'application/vnd.google-apps.document',
  'application/vnd.google-apps.spreadsheet',
  'application/vnd.google-apps.presentation',
  
  // Autres formats de documents
  'application/json', 'application/xml', 'application/rtf',
  'application/vnd.oasis.opendocument.text', // .odt
  'application/vnd.oasis.opendocument.spreadsheet', // .ods
  'application/vnd.oasis.opendocument.presentation', // .odp
  
  // Archives
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
  'application/gzip', 'application/x-tar',
  
  // Fichiers de données
  'application/sql', 'application/x-sql',
  
  // Fallback pour types non reconnus
  'application/octet-stream'
];

const fileValidationSchema = z.object({
  maxSize: z.number().default(100 * 1024 * 1024), // 100MB par défaut
  allowedTypes: z.array(z.string()).default(ALLOWED_FILE_TYPES),
  maxUploadDuration: z.number().default(900), // 15 minutes
  maxDownloadDuration: z.number().default(300), // 5 minutes
});

// ========================================
// CLASSE PRINCIPALE
// ========================================

export class SecureS3Service {
  private client: S3Client;
  private bucket: string;
  private config: ReturnType<typeof validateS3Config>;
  private validation: ReturnType<typeof fileValidationSchema.parse>;

  constructor() {
    this.config = validateS3Config();
    this.validation = fileValidationSchema.parse({});
    
    this.client = new S3Client({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });
    this.bucket = this.config.bucket;
  }

  // ========================================
  // MÉTHODES PRINCIPALES
  // ========================================

  /**
   * Upload sécurisé avec validation complète
   */
  async secureUpload(options: SecureUploadOptions): Promise<SecureUploadResult> {
    const startTime = Date.now();
    
    try {
      // 1. Validation du fichier
      this.validateFile(options.fileType, options.fileSize);
      
      // 2. Vérification du quota utilisateur
      await this.checkUserQuota(options.userId, options.fileSize);
      
      // 3. Génération de la clé sécurisée
      const key = this.generateSecureKey(options);
      
      // 4. Calcul du hash SHA-256
      const sha256 = this.generateSHA256(options.fileName, options.userId);
      
      // 5. URL pré-signée courte
      const uploadUrl = await this.generatePresignedUploadUrl(key, options.fileType);
      
      const result: SecureUploadResult = {
        uploadUrl,
        key,
        requestId: options.requestId,
        expiresAt: new Date(Date.now() + this.validation.maxUploadDuration * 1000),
        sha256
      };

      const duration = Date.now() - startTime;
      logger.info(`🔒 Secure upload initié en ${duration}ms`, {
        userId: options.userId,
        requestId: options.requestId,
        fileSize: options.fileSize,
        key
      });

      return result;
    } catch (error) {
      const err = error as { message?: string };
      logger.error(`❌ Erreur upload sécurisé: ${err.message ?? String(error)}`, {
        userId: options.userId,
        requestId: options.requestId,
        error: err.message ?? String(error)
      });
      throw error;
    }
  }

  /**
   * URL de téléchargement sécurisée
   */
  async generateSecureDownloadUrl(key: string, userId: string): Promise<SecureDownloadResult> {
    try {
      // 1. Vérifier que l'utilisateur a accès au fichier
      await this.verifyFileAccess(key, userId);
      
      // 2. Générer l'URL pré-signée courte
      const downloadUrl = await this.generatePresignedDownloadUrl(key);
      
      // 3. Récupérer l'ETag pour validation
      const etag = await this.getObjectETag(key);
      
      const result: SecureDownloadResult = {
        downloadUrl,
        expiresAt: new Date(Date.now() + this.validation.maxDownloadDuration * 1000),
        etag
      };

      logger.info(`🔒 URL de téléchargement générée`, {
        userId,
        key,
        expiresAt: result.expiresAt
      });

      return result;
    } catch (error) {
      const err = error as { message?: string };
      logger.error(`❌ Erreur génération URL téléchargement: ${err.message ?? String(error)}`, {
        userId,
        key,
        error: err.message ?? String(error)
      });
      throw error;
    }
  }

  /**
   * Suppression sécurisée d'un fichier
   */
  async secureDelete(key: string, userId: string): Promise<void> {
    try {
      // 1. Vérifier que l'utilisateur a accès au fichier
      await this.verifyFileAccess(key, userId);
      
      // 2. Supprimer de S3
      await this.deleteObject(key);
      
      logger.info(`🗑️ Fichier supprimé de S3`, {
        userId,
        key
      });
    } catch (error) {
      const err = error as { message?: string };
      logger.error(`❌ Erreur suppression S3: ${err.message ?? String(error)}`, {
        userId,
        key,
        error: err.message ?? String(error)
      });
      throw error;
    }
  }

  // ========================================
  // MÉTHODES DE VALIDATION
  // ========================================

  /**
   * Validation stricte du fichier
   */
  private validateFile(fileType: string, fileSize: number): void {
    // Vérification de la taille
    if (fileSize > this.validation.maxSize) {
      throw new Error(`Fichier trop volumineux: ${this.formatBytes(fileSize)} (max: ${this.formatBytes(this.validation.maxSize)})`);
    }
    
    // Vérification du type MIME
    if (!this.validation.allowedTypes.includes(fileType)) {
      throw new Error(`Type de fichier non autorisé: ${fileType}. Types autorisés: ${this.validation.allowedTypes.join(', ')}`);
    }
    
    // Vérification de la taille minimale
    if (fileSize <= 0) {
      throw new Error('Fichier vide ou invalide');
    }
  }

  /**
   * Vérification du quota utilisateur
   */
  private async checkUserQuota(userId: string, fileSize: number): Promise<void> {
    const { data, error } = await supabase
      .rpc('check_user_quota', { user_uuid: userId, file_size: fileSize });
    
    if (error) {
      logger.error(`❌ Erreur vérification quota: ${error.message}`, { userId });
      throw new Error('Erreur lors de la vérification du quota');
    }
    
    if (!data) {
      const quota = await this.getUserQuota(userId);
      throw new Error(`Quota de stockage dépassé. Utilisé: ${this.formatBytes(quota.currentUsage)}, Quota: ${this.formatBytes(quota.quota)}`);
    }
  }

  /**
   * Vérification de l'accès au fichier
   */
  private async verifyFileAccess(key: string, userId: string): Promise<void> {
    const { data: file, error } = await supabase
      .from('files')
      .select('user_id, deleted_at')
      .eq('s3_key', key)
      .single();
    
    if (error || !file) {
      throw new Error('Fichier non trouvé');
    }
    
    if (file.deleted_at) {
      throw new Error('Fichier supprimé');
    }
    
    if (file.user_id !== userId) {
      throw new Error('Accès non autorisé');
    }
  }

  // ========================================
  // MÉTHODES UTILITAIRES
  // ========================================

  /**
   * Génération de clé sécurisée
   */
  private generateSecureKey(options: SecureUploadOptions): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const safeFileName = options.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    return `${options.userId}/${timestamp}_${randomSuffix}_${safeFileName}`;
  }

  /**
   * Génération du hash SHA-256
   */
  private generateSHA256(fileName: string, userId: string): string {
    const content = `${fileName}_${userId}_${Date.now()}`;
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * URL pré-signée pour upload
   */
  private async generatePresignedUploadUrl(key: string, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      Metadata: {
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'abrege-secure-api',
      },
    });

    return await getSignedUrl(this.client, command, { 
      expiresIn: this.validation.maxUploadDuration 
    });
  }

  /**
   * URL pré-signée pour téléchargement
   */
  private async generatePresignedDownloadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return await getSignedUrl(this.client, command, { 
      expiresIn: this.validation.maxDownloadDuration 
    });
  }

  /**
   * Suppression d'objet S3
   */
  private async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  /**
   * Récupération de l'ETag d'un objet
   */
  private async getObjectETag(key: string): Promise<string | undefined> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);
      return response.ETag;
    } catch (error) {
      const err = error as { message?: string };
      logger.warn(`⚠️ Impossible de récupérer l'ETag pour ${key}: ${err.message ?? String(error)}`);
      return undefined;
    }
  }

  /**
   * Récupération du quota utilisateur
   */
  private async getUserQuota(userId: string): Promise<QuotaCheckResult> {
    const { data, error } = await supabase
      .from('storage_usage')
      .select('used_bytes, quota_bytes')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      throw new Error('Impossible de récupérer le quota utilisateur');
    }
    
    return {
      canUpload: data.used_bytes < data.quota_bytes,
      currentUsage: data.used_bytes,
      quota: data.quota_bytes,
      remainingBytes: data.quota_bytes - data.used_bytes
    };
  }

  /**
   * Formatage des bytes en format lisible
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

/**
 * Validation de la configuration S3
 */
function validateS3Config() {
  const config = {
    region: SERVER_ENV.aws.s3Region,
    accessKeyId: SERVER_ENV.aws.accessKeyId,
    secretAccessKey: SERVER_ENV.aws.secretAccessKey,
    bucket: SERVER_ENV.aws.s3BucketName,
  };

  const result = s3ConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Configuration S3 invalide: ${result.error.errors.map(e => e.message).join(', ')}`);
  }

  return result.data;
}

/**
 * Génération d'ID de requête unique
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

// Instance singleton
export const secureS3Service = new SecureS3Service(); 