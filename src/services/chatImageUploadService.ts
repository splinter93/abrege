import { supabase } from '@/lib/supabase';
import { logger, LogCategory } from '@/utils/logger';

/**
 * Structure d'une image uploadée vers Supabase Storage
 */
export interface UploadedChatImage {
  url: string;          // URL publique Supabase
  fileName: string;     // Nom du fichier
  mimeType: string;     // Type MIME
  size: number;         // Taille en bytes
  uploadedAt: number;   // Timestamp
}

/**
 * Image à uploader (depuis le frontend)
 */
export interface ChatImageToUpload {
  base64: string;       // Data URI base64
  fileName: string;
  mimeType: string;
  size: number;
}

/**
 * Résultat de l'upload
 */
export interface UploadResult {
  success: boolean;
  images?: UploadedChatImage[];
  error?: string;
}

/**
 * Service d'upload des images de chat vers Supabase Storage
 * 
 * Organisation:
 * - Bucket: 'chat-images' (séparé de 'files')
 * - Path: {sessionId}/{timestamp}-{random}.{ext}
 */
export class ChatImageUploadService {
  private static instance: ChatImageUploadService;
  private readonly bucketName = 'chat-images';

  private constructor() {}

  static getInstance(): ChatImageUploadService {
    if (!ChatImageUploadService.instance) {
      ChatImageUploadService.instance = new ChatImageUploadService();
    }
    return ChatImageUploadService.instance;
  }

  /**
   * Upload une liste d'images vers Supabase Storage
   * 
   * @param images - Images à uploader (base64)
   * @param sessionId - ID de la session chat
   * @returns URLs publiques des images uploadées
   */
  async uploadImages(
    images: ChatImageToUpload[],
    sessionId: string
  ): Promise<UploadResult> {
    try {
      if (!images || images.length === 0) {
        return { success: true, images: [] };
      }

      logger.debug(LogCategory.API, `[ChatImageUpload] 📤 Upload de ${images.length} image(s) pour session ${sessionId}`);

      const uploadedImages: UploadedChatImage[] = [];

      for (const image of images) {
        try {
          const uploaded = await this.uploadSingleImage(image, sessionId);
          uploadedImages.push(uploaded);
        } catch (error) {
          logger.error(LogCategory.API, `[ChatImageUpload] ❌ Erreur upload image ${image.fileName}:`, error);
          // Continue avec les autres images
        }
      }

      if (uploadedImages.length === 0) {
        throw new Error('Aucune image n\'a pu être uploadée');
      }

      logger.debug(LogCategory.API, `[ChatImageUpload] ✅ ${uploadedImages.length}/${images.length} image(s) uploadée(s)`);

      return {
        success: true,
        images: uploadedImages
      };

    } catch (error) {
      logger.error(LogCategory.API, '[ChatImageUpload] ❌ Erreur globale upload:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur upload images'
      };
    }
  }

  /**
   * Upload une seule image vers Supabase Storage
   */
  private async uploadSingleImage(
    image: ChatImageToUpload,
    sessionId: string
  ): Promise<UploadedChatImage> {
    // Convertir base64 en Blob
    const blob = this.base64ToBlob(image.base64, image.mimeType);

    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const extension = this.getExtensionFromMimeType(image.mimeType);
    const fileName = `${timestamp}-${random}.${extension}`;
    const filePath = `${sessionId}/${fileName}`;

    // Upload vers Supabase Storage
    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .upload(filePath, blob, {
        contentType: image.mimeType,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw new Error(`Supabase upload error: ${error.message}`);
    }

    if (!data) {
      throw new Error('Upload réussi mais pas de data retournée');
    }

    // Obtenir l'URL publique
    const { data: { publicUrl } } = supabase.storage
      .from(this.bucketName)
      .getPublicUrl(filePath);

    return {
      url: publicUrl,
      fileName: image.fileName,
      mimeType: image.mimeType,
      size: image.size,
      uploadedAt: timestamp
    };
  }

  /**
   * Convertit un data URI base64 en Blob
   */
  private base64ToBlob(base64: string, mimeType: string): Blob {
    // Extraire le base64 pur (sans le préfixe data:image/...)
    const base64Data = base64.includes(',') 
      ? base64.split(',')[1] 
      : base64;

    // Décoder le base64
    const byteString = atob(base64Data);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);

    for (let i = 0; i < byteString.length; i++) {
      uint8Array[i] = byteString.charCodeAt(i);
    }

    return new Blob([arrayBuffer], { type: mimeType });
  }

  /**
   * Obtient l'extension de fichier depuis le MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg'
    };

    return mimeToExt[mimeType] || 'jpg';
  }

  /**
   * Vérifie si le bucket existe, sinon le crée
   * À appeler une fois au démarrage de l'app
   */
  async ensureBucketExists(): Promise<void> {
    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();

      if (listError) {
        logger.error(LogCategory.API, '[ChatImageUpload] ❌ Erreur liste buckets:', listError);
        return;
      }

      const bucketExists = buckets?.some(b => b.name === this.bucketName);

      if (!bucketExists) {
        logger.info(LogCategory.API, `[ChatImageUpload] 📦 Création du bucket '${this.bucketName}'...`);
        
        const { error: createError } = await supabase.storage.createBucket(this.bucketName, {
          public: true,
          fileSizeLimit: 10485760, // 10 Mo max
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        });

        if (createError) {
          logger.error(LogCategory.API, '[ChatImageUpload] ❌ Erreur création bucket:', createError);
        } else {
          logger.info(LogCategory.API, `[ChatImageUpload] ✅ Bucket '${this.bucketName}' créé`);
        }
      } else {
        logger.debug(LogCategory.API, `[ChatImageUpload] ✅ Bucket '${this.bucketName}' existe déjà`);
      }
    } catch (error) {
      logger.error(LogCategory.API, '[ChatImageUpload] ❌ Erreur ensureBucketExists:', error);
    }
  }
}

// Export de l'instance singleton
export const chatImageUploadService = ChatImageUploadService.getInstance();

