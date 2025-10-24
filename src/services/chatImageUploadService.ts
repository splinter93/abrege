import { logger, LogCategory } from '@/utils/logger';

/**
 * Structure d'une image uploadée vers S3
 */
export interface UploadedChatImage {
  url: string;          // URL publique S3
  fileName: string;     // Nom du fichier original
  mimeType: string;     // Type MIME
  size: number;         // Taille en bytes
  uploadedAt: number;   // Timestamp
  key?: string;         // Clé S3 (optionnel)
}

/**
 * Image à uploader (depuis le frontend)
 */
export interface ChatImageToUpload {
  file: File;           // Fichier original
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
 * Service d'upload des images de chat vers S3
 * 
 * Flow:
 * 1. Appel /api/ui/chat-images → Presigned URL S3
 * 2. Upload direct vers S3 (contourne limite Vercel)
 * 3. Retourne URL publique S3
 * 
 * Organisation S3:
 * - Path: chat-images/{userId}/{sessionId}/{timestamp}-{random}.{ext}
 */
export class ChatImageUploadService {
  private static instance: ChatImageUploadService;
  private readonly apiEndpoint = '/api/ui/chat-images';

  private constructor() {}

  static getInstance(): ChatImageUploadService {
    if (!ChatImageUploadService.instance) {
      ChatImageUploadService.instance = new ChatImageUploadService();
    }
    return ChatImageUploadService.instance;
  }

  /**
   * Upload une liste d'images vers S3 via l'API backend
   * 
   * @param images - Images à uploader (File objects)
   * @param sessionId - ID de la session chat
   * @returns URLs publiques S3 des images uploadées
   */
  async uploadImages(
    images: ChatImageToUpload[],
    sessionId: string
  ): Promise<UploadResult> {
    try {
      if (!images || images.length === 0) {
        return { success: true, images: [] };
      }

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
   * Upload une seule image vers S3 via l'API backend
   */
  private async uploadSingleImage(
    image: ChatImageToUpload,
    sessionId: string
  ): Promise<UploadedChatImage> {
    const startTime = Date.now();

    // 1. Récupérer le token d'authentification depuis le client Supabase
    const { supabase } = await import('@/supabaseClient');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.access_token) {
      throw new Error('Session Supabase non disponible');
    }
    
    const token = session.access_token;
    
    // 2. Demander une presigned URL à l'API avec le token en header
    
    const presignResponse = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // ✅ Token en header (contourne pb cookies)
      },
      body: JSON.stringify({
        file_name: image.fileName,
        file_type: image.mimeType,
        file_size: image.size,
        session_id: sessionId,
      }),
    });

    if (!presignResponse.ok) {
      const error = await presignResponse.json();
      throw new Error(error.error || `Erreur API: ${presignResponse.status}`);
    }

    const { upload_url, key, public_url } = await presignResponse.json();

    // 2. Upload direct vers S3 (contourne limite Vercel 4.5 Mo)
    const uploadResponse = await fetch(upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': image.mimeType },
      body: image.file,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Erreur upload S3: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    return {
      url: public_url,
      fileName: image.fileName,
      mimeType: image.mimeType,
      size: image.size,
      uploadedAt: Date.now(),
      key: key,
    };
  }
}

// Export de l'instance singleton
export const chatImageUploadService = ChatImageUploadService.getInstance();

