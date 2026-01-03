import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/supabaseClient';
import { secureS3Service, generateRequestId, ALLOWED_FILE_TYPES } from '@/services/secureS3Service';
import type { SecureUploadResult } from '@/services/secureS3Service';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { logApi } from '@/utils/logger';
import { createClient } from '@supabase/supabase-js';
import { buildS3ObjectUrl } from '@/utils/s3Utils';

// ========================================
// SCHEMAS DE VALIDATION
// ========================================

const uploadSchema = z.object({
  // Cas 1: Upload de fichier local
  fileName: z.string().min(1, 'Nom de fichier requis').max(255, 'Nom de fichier trop long').optional(),
  fileType: z.string().min(1, 'Type de fichier requis').optional(),
  fileSize: z.number().int().min(0, 'Taille de fichier invalide').optional(),
  
  // Cas 2: URL externe
  externalUrl: z.string().url('URL externe invalide').optional(),
  
  // Métadonnées communes
  folderId: z.string().uuid().optional(),
  notebookId: z.string().uuid().optional(),
}).refine(
  (data) => {
    // Si on a une URL externe, c'est valide
    if (data.externalUrl) return true;
    
    // Si on a un fichier, tous les champs requis doivent être présents et valides
    if (data.fileName && data.fileType && data.fileSize !== undefined) {
      return data.fileSize > 0;
    }
    
    return false;
  },
  {
    message: 'Doit fournir soit une URL externe, soit un fichier complet avec taille > 0',
    path: ['fileName']
  }
);

// ========================================
// TYPES
// ========================================

interface UploadRequest {
  // Cas 1: Fichier local
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  
  // Cas 2: URL externe
  externalUrl?: string;
  
  // Métadonnées communes
  folderId?: string;
  notebookId?: string;
}

interface FileRecord {
  id: string;
  filename: string;
  mime_type: string;
  size: number;
  url?: string;
  folder_id?: string;
  classeur_id?: string;
  created_at: string;
}

interface UploadResponse {
  success: boolean;
  file: FileRecord;
  uploadUrl?: string; // Seulement pour les fichiers locaux
  expiresAt?: Date;   // Seulement pour les fichiers locaux
  requestId: string;
}

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

/**
 * Validation du Content-Type côté serveur
 * Utilise la configuration centralisée depuis secureS3Service
 */
function validateContentType(fileType: string): boolean {
  return ALLOWED_FILE_TYPES.includes(fileType);
}

/**
 * Validation d'URL externe
 */
function validateExternalUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    // Vérifier que c'est une URL HTTP/HTTPS valide
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}



/**
 * Audit trail pour les actions sur les fichiers
 */
async function logFileEvent(params: {
  fileId: string;
  userId: string;
  eventType: string;
  requestId: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await supabase.from('file_events').insert({
      file_id: params.fileId,
      user_id: params.userId,
      event_type: params.eventType,
      request_id: params.requestId,
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
      metadata: params.metadata || {}
    });
  } catch (error) {
    // Log l'erreur mais ne pas faire échouer l'upload
    const err = error as { message?: string };
    logApi.info(`⚠️ Erreur audit trail: ${err.message ?? 'unknown error'}`, {
      fileId: params.fileId,
      userId: params.userId,
      eventType: params.eventType,
      requestId: params.requestId
    });
  }
}

/**
 * Mise à jour de l'usage de stockage
 */
async function updateStorageUsage(userId: string): Promise<void> {
  try {
    await supabase.rpc('update_user_storage_usage', { user_uuid: userId });
  } catch (error) {
    const err = error as { message?: string };
    logApi.info(`⚠️ Erreur mise à jour usage: ${err.message ?? 'unknown error'}`, { userId });
  }
}

// ========================================
// HANDLER PRINCIPAL
// ========================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  try {
    // ========================================
    // 1. AUTHENTIFICATION
    // ========================================
    
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success || !authResult.userId) {
      logApi.info(`❌ Authentification échouée: ${authResult.error}`, { requestId });
      return NextResponse.json(
        { error: authResult.error || 'Authentification requise' }, 
        { status: authResult.status || 401 }
      );
    }

    const userId = authResult.userId;

    // ========================================
    // 2. EXTRACTION ET VALIDATION DES DONNÉES
    // ========================================
    
    let uploadData: UploadRequest;
    
    try {
      const body = await request.json();
      uploadData = uploadSchema.parse(body);
    } catch (error) {
    const err = error as { message?: string };
    logApi.info(`❌ Validation des données échouée: ${err.message}`, { 
        requestId, 
        userId 
      });
      return NextResponse.json(
      { error: `Données invalides: ${err.message ?? 'unknown error'}` }, 
        { status: 400 }
      );
    }

    // ========================================
    // 3. DÉTERMINATION DU TYPE D'OPÉRATION
    // ========================================
    
    const isFileUpload = uploadData.fileName && uploadData.fileType && uploadData.fileSize;
    const isExternalUrl = uploadData.externalUrl;

    if (!isFileUpload && !isExternalUrl) {
      return NextResponse.json(
        { error: 'Type d\'opération non reconnu' },
        { status: 400 }
      );
    }

    // ========================================
    // 4. TRAITEMENT SELON LE TYPE
    // ========================================
    
    let fileRecord: FileRecord | null = null;
    let s3Result: SecureUploadResult | null = null;

    if (isFileUpload) {
      // ========================================
      // CAS 1: UPLOAD DE FICHIER LOCAL
      // ========================================
      
      // Validation du Content-Type côté serveur
      if (!validateContentType(uploadData.fileType!)) {
        logApi.info(`❌ Type de fichier non autorisé: ${uploadData.fileType}`, { 
          requestId, 
          userId 
        });
        return NextResponse.json(
          { error: `Type de fichier non autorisé: ${uploadData.fileType}` }, 
          { status: 400 }
        );
      }

      // Validation de la taille maximale (100MB)
      const maxSize = 100 * 1024 * 1024;
      if (uploadData.fileSize! > maxSize) {
        logApi.info(`❌ Fichier trop volumineux: ${uploadData.fileSize} bytes`, { 
          requestId, 
          userId 
        });
        return NextResponse.json(
          { error: `Fichier trop volumineux (max: 100MB)` }, 
          { status: 500 }
        );
      }

      // Pour les fichiers locaux, on retourne l'URL pré-signée pour l'upload côté client
      // Le client devra ensuite faire l'upload vers S3 et appeler l'endpoint de finalisation
      s3Result = await secureS3Service.secureUpload({
        fileName: uploadData.fileName!,
        fileType: uploadData.fileType!,
        fileSize: uploadData.fileSize!,
        userId,
        folderId: uploadData.folderId,
        notebookId: uploadData.notebookId,
        requestId
      });

      // Construire l'URL publique S3 finale avec encodage correct
      const publicUrl = buildS3ObjectUrl(
        process.env.AWS_S3_BUCKET!,
        process.env.AWS_REGION!,
        s3Result.key
      );
      
      // Utiliser logger au lieu de console.log (peut exposer des infos sensibles)
      logApi.debug('🔗 [UPLOAD] URL S3 construite', {
        bucket: process.env.AWS_S3_BUCKET,
        region: process.env.AWS_REGION,
        key: s3Result.key,
        // Ne pas logger l'URL complète (peut contenir des infos sensibles)
        hasPublicUrl: !!publicUrl
      });

      // Créer un client Supabase avec le contexte d'authentification de l'utilisateur
      const authHeader = request.headers.get('Authorization');
      let userSupabase = supabase;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        userSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            global: {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          }
        );
      }
      
      // Enregistrement en base de données avec statut 'uploading'
      const { data: dbFileRecord, error: dbError } = await userSupabase
        .from('files')
        .insert({
          filename: uploadData.fileName,
          mime_type: uploadData.fileType,
          size: uploadData.fileSize,
          s3_key: s3Result.key,
          owner_id: userId,
          user_id: userId,
          folder_id: uploadData.folderId || null,
          status: 'uploading', // Statut temporaire en attendant l'upload S3
          request_id: requestId,
          sha256: s3Result.sha256,
          url: publicUrl,
          visibility_mode: 'inherit_note',
          storage_type: 's3' // Nouveau champ pour discriminer
        })
        .select()
        .single();

      if (dbError) {
        logApi.info(`❌ Erreur DB: ${dbError.message}`, { 
          requestId, 
          userId,
          key: s3Result.key
        });
        
        return NextResponse.json(
          { error: `Erreur base de données: ${dbError.message}` }, 
          { status: 500 }
        );
      }

      fileRecord = dbFileRecord;

    } else if (isExternalUrl) {
      // ========================================
      // CAS 2: URL EXTERNE
      // ========================================
      
      // Validation de l'URL externe
      if (!validateExternalUrl(uploadData.externalUrl!)) {
        logApi.info(`❌ URL externe invalide: ${uploadData.externalUrl}`, { 
          requestId, 
          userId 
        });
        return NextResponse.json(
          { error: 'URL externe invalide' }, 
          { status: 400 }
        );
      }

      // Créer un client Supabase avec le contexte d'authentification de l'utilisateur
      const authHeader = request.headers.get('Authorization');
      let userSupabase = supabase;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        userSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            global: {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          }
        );
      }
      
      // Fonction utilitaire pour extraire le filename de l'URL
      function extractFilenameFromUrl(url: string): string {
        try {
          const urlObj = new URL(url);
          const pathname = urlObj.pathname;
          const filename = pathname.split('/').pop();
          
          if (filename && filename.includes('.')) {
            return filename;
          }
          
          // Si pas de filename dans le path, utiliser le domaine
          // On évite Date.now() pour avoir un filename stable
          return `${urlObj.hostname}_image`;
        } catch {
          return `external_image`;
        }
      }
      
      const externalUrl = uploadData.externalUrl!;
      const storageType = 'external';
      
      // Vérifier si le fichier existe déjà par URL (plus fiable que filename)
      // car l'URL est l'identifiant réel du fichier externe
      const { data: existingFile, error: selectError } = await userSupabase
        .from('files')
        .select('*')
        .eq('user_id', userId)
        .eq('url', externalUrl)
        .eq('storage_type', storageType)
        .maybeSingle();

      if (selectError) {
        logApi.info(`❌ Erreur lors de la vérification du fichier existant: ${selectError.message}`, { 
          requestId, 
          userId,
          externalUrl: uploadData.externalUrl
        });
        
        return NextResponse.json(
          { error: `Erreur base de données: ${selectError.message}` }, 
          { status: 500 }
        );
      }

      // Si le fichier existe déjà, le retourner directement
      if (existingFile) {
        logApi.info(`✅ Fichier externe déjà existant, réutilisation`, { 
          requestId, 
          userId,
          fileId: existingFile.id,
          externalUrl: uploadData.externalUrl
        });
        
        fileRecord = existingFile as FileRecord;
      } else {
        // Générer le filename si pas fourni
        const filename = uploadData.fileName || extractFilenameFromUrl(externalUrl);
        
        // Enregistrement direct en base de données (pas d'upload S3)
        const { data: dbFileRecord, error: dbError } = await userSupabase
          .from('files')
          .insert({
            filename,
            mime_type: uploadData.fileType || 'image/jpeg',
            size: 0, // Taille 0 pour les URLs externes
            s3_key: null, // Pas de clé S3 pour les URLs externes
            owner_id: userId,
            user_id: userId,
            folder_id: uploadData.folderId || null,
            status: 'ready',
            request_id: requestId,
            sha256: null, // Pas de hash pour les URLs externes
            url: uploadData.externalUrl, // URL externe directe
            visibility_mode: 'inherit_note',
            storage_type: storageType
          })
          .select()
          .single();

        if (dbError) {
          logApi.info(`❌ Erreur DB pour URL externe: ${dbError.message}`, { 
            requestId, 
            userId,
            externalUrl: uploadData.externalUrl
          });
          
          return NextResponse.json(
            { error: `Erreur base de données: ${dbError.message}` }, 
            { status: 500 }
          );
        }

        fileRecord = dbFileRecord;
      }
    }

    // ========================================
    // 5. AUDIT TRAIL
    // ========================================
    
    if (!fileRecord) {
      throw new Error('File record not created');
    }

    await logFileEvent({
      fileId: fileRecord.id,
      userId,
      eventType: isFileUpload ? 'upload_initiated' : 'external_url_added',
      requestId,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      metadata: {
        fileName: uploadData.fileName || 'url_externe',
        fileSize: uploadData.fileSize || 0,
        fileType: uploadData.fileType || 'unknown',
        s3Key: s3Result?.key || null,
        externalUrl: uploadData.externalUrl || null,
        operationType: isFileUpload ? 'file_upload' : 'external_url'
      }
    });

    // ========================================
    // 6. MISE À JOUR USAGE STOCKAGE (seulement pour les vrais uploads)
    // ========================================
    
    if (isFileUpload) {
      await updateStorageUsage(userId);
    }

    // ========================================
    // 7. RÉPONSE SUCCÈS
    // ========================================
    
    const apiTime = Date.now() - startTime;
    const response: UploadResponse = {
      success: true,
      file: fileRecord,
      requestId,
      ...(isFileUpload && s3Result && {
        uploadUrl: s3Result.uploadUrl,
        expiresAt: s3Result.expiresAt
      })
    };

    logApi.info(`✅ ${isFileUpload ? 'Upload' : 'URL externe'} traité avec succès en ${apiTime}ms`, { 
      requestId, 
      userId,
      fileId: fileRecord.id,
      operationType: isFileUpload ? 'file_upload' : 'external_url',
      duration: apiTime
    });

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        ...(isFileUpload && s3Result && {
          'X-Upload-Expires-At': s3Result.expiresAt.toISOString()
        })
      }
    });

  } catch (error) {
    // ========================================
    // 8. GESTION D'ERREURS GLOBALES
    // ========================================
    const err = error as { message?: string; code?: string };
    
    const apiTime = Date.now() - startTime;
    const errorMessage = err.message || 'Erreur inconnue';
    
    logApi.info(`❌ Erreur upload: ${errorMessage}`, { 
      requestId, 
      duration: apiTime,
      error: errorMessage,
      stack: (err as { stack?: string }).stack
    });

    return NextResponse.json(
      { 
        error: 'Erreur lors de l\'upload',
        details: errorMessage,
        requestId
      }, 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId
        }
      }
    );
  }
}

// ========================================
// MÉTHODES HTTP SUPPORTÉES
// ========================================

export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
      'Access-Control-Max-Age': '86400',
    },
  });
}
