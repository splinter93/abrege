import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/supabaseClient';
import { secureS3Service, generateRequestId } from '@/services/secureS3Service';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { logApi } from '@/utils/logger';

// ========================================
// SCHEMAS DE VALIDATION
// ========================================

const uploadSchema = z.object({
  fileName: z.string().min(1, 'Nom de fichier requis').max(255, 'Nom de fichier trop long'),
  fileType: z.string().min(1, 'Type de fichier requis'),
  fileSize: z.number().int().positive('Taille de fichier invalide'),
  folderId: z.string().uuid().optional(),
  notebookId: z.string().uuid().optional(),
});

// ========================================
// TYPES
// ========================================

interface UploadRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
  folderId?: string;
  notebookId?: string;
}

interface UploadResponse {
  success: boolean;
  file: any;
  uploadUrl: string;
  expiresAt: Date;
  requestId: string;
}

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

/**
 * Validation du Content-Type côté serveur
 */
function validateContentType(fileType: string): boolean {
  const allowedTypes = [
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    // Documents
    'application/pdf', 'text/plain', 'text/markdown', 'application/json',
    // Archives
    'application/zip', 'application/x-rar-compressed',
    // Autres
    'application/octet-stream'
  ];
  
  return allowedTypes.includes(fileType);
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
  metadata?: Record<string, any>;
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
    logApi.info(`⚠️ Erreur audit trail: ${error.message}`, {
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
    logApi.info(`⚠️ Erreur mise à jour usage: ${error.message}`, { userId });
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
       logApi.info(`❌ Validation des données échouée: ${error.message}`, { 
         requestId, 
         userId 
       });
       return NextResponse.json(
         { error: `Données invalides: ${error.message}` }, 
         { status: 400 }
       );
     }

     // ========================================
     // 3. VALIDATION SÉCURITÉ SUPPLÉMENTAIRE
     // ========================================
     
     // Validation du Content-Type côté serveur
     if (!validateContentType(uploadData.fileType)) {
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
     if (uploadData.fileSize > maxSize) {
       logApi.info(`❌ Fichier trop volumineux: ${uploadData.fileSize} bytes`, { 
         requestId, 
         userId 
       });
       return NextResponse.json(
         { error: `Fichier trop volumineux (max: 100MB)` }, 
         { status: 400 }
       );
     }

     // ========================================
     // 4. UPLOAD SÉCURISÉ VERS S3
     // ========================================
     
     const s3Result = await secureS3Service.secureUpload({
       fileName: uploadData.fileName,
       fileType: uploadData.fileType,
       fileSize: uploadData.fileSize,
       userId,
       folderId: uploadData.folderId,
       notebookId: uploadData.notebookId,
       requestId
     });

     // ========================================
     // 5. ENREGISTREMENT EN BASE DE DONNÉES
     // ========================================
     
     const { data: fileRecord, error: dbError } = await supabase
       .from('files')
       .insert({
         filename: uploadData.fileName,
         original_name: uploadData.fileName,
         mime_type: uploadData.fileType,
         size_bytes: uploadData.fileSize,
         s3_key: s3Result.key,
         s3_bucket: process.env.AWS_S3_BUCKET,
         s3_region: process.env.AWS_REGION,
         user_id: userId,
         folder_id: uploadData.folderId || null,
         notebook_id: uploadData.notebookId || null,
         status: 'uploading',
         request_id: requestId,
         sha256: s3Result.sha256,
         url: '', // Sera mis à jour après upload complet
         created_at: new Date().toISOString(),
         updated_at: new Date().toISOString()
       })
       .select()
       .single();

     if (dbError) {
       // Rollback S3 en cas d'erreur DB
       logApi.info(`❌ Erreur DB, rollback S3: ${dbError.message}`, { 
         requestId, 
         userId,
         key: s3Result.key
       });
       
       try {
         await secureS3Service.secureDelete(s3Result.key, userId);
       } catch (rollbackError) {
         logApi.info(`⚠️ Erreur rollback S3: ${rollbackError.message}`, { 
           requestId, 
           userId,
           key: s3Result.key
         });
       }
       
       return NextResponse.json(
         { error: `Erreur base de données: ${dbError.message}` }, 
         { status: 500 }
       );
     }

     // ========================================
     // 6. AUDIT TRAIL
     // ========================================
     
     await logFileEvent({
       fileId: fileRecord.id,
       userId,
       eventType: 'upload_initiated',
       requestId,
       ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
       userAgent: request.headers.get('user-agent') || undefined,
       metadata: {
         fileName: uploadData.fileName,
         fileSize: uploadData.fileSize,
         fileType: uploadData.fileType,
         s3Key: s3Result.key
       }
     });

     // ========================================
     // 7. MISE À JOUR USAGE STOCKAGE
     // ========================================
     
     await updateStorageUsage(userId);

    // ========================================
    // 8. RÉPONSE SUCCÈS
    // ========================================
    
    const apiTime = Date.now() - startTime;
    const response: UploadResponse = {
      success: true,
      file: fileRecord,
      uploadUrl: s3Result.uploadUrl,
      expiresAt: s3Result.expiresAt,
      requestId
    };

         logApi.info(`✅ Upload initié avec succès en ${apiTime}ms`, { 
       requestId, 
       userId,
       fileId: fileRecord.id,
       fileSize: uploadData.fileSize,
       duration: apiTime
     });

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        'X-Upload-Expires-At': s3Result.expiresAt.toISOString()
      }
    });

  } catch (error: any) {
    // ========================================
    // 9. GESTION D'ERREURS GLOBALES
    // ========================================
    
    const apiTime = Date.now() - startTime;
    const errorMessage = error.message || 'Erreur inconnue';
    
    logApi.info(`❌ Erreur upload: ${errorMessage}`, { 
      requestId, 
      duration: apiTime,
      error: errorMessage,
      stack: error.stack
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
