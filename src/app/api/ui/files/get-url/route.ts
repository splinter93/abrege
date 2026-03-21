import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/supabaseClient';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { logApi } from '@/utils/logger';
import { buildS3ObjectUrl } from '@/utils/s3Utils';

// ========================================
// SCHEMA DE VALIDATION
// ========================================

const getUrlSchema = z.object({
  fileId: z.string().uuid('ID de fichier invalide'),
});

// ========================================
// FONCTIONS UTILITAIRES
// ========================================



// ========================================
// HANDLER PRINCIPAL
// ========================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // ========================================
    // 1. AUTHENTIFICATION
    // ========================================
    
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.success || !authResult.userId) {
      logApi.info(`❌ Authentification échouée: ${authResult.error}`);
      return NextResponse.json(
        { error: authResult.error || 'Authentification requise' }, 
        { status: authResult.status || 401 }
      );
    }

    const userId = authResult.userId;

    // ========================================
    // 2. VALIDATION DES DONNÉES
    // ========================================
    
    let requestData;
    try {
      const body = await request.json();
      requestData = getUrlSchema.parse(body);
    } catch (error) {
      const err = error as { message?: string };
      logApi.info(`❌ Validation des données échouée: ${err.message}`);
      return NextResponse.json(
        { error: `Données invalides: ${err.message ?? 'unknown error'}` }, 
        { status: 400 }
      );
    }

    // ========================================
    // 3. RÉCUPÉRATION DU FICHIER
    // ========================================
    
    // Récupérer le fichier depuis la base
    const { data: fileRecord, error: fetchError } = await supabase
      .from('files')
      .select('id, owner_id, user_id, s3_key, url, filename, status, storage_type')
      .eq('id', requestData.fileId)
      .eq('owner_id', userId) // Vérifier que l'utilisateur est le propriétaire
      .single();

    if (fetchError || !fileRecord) {
      logApi.info(`❌ Fichier non trouvé ou accès refusé: ${requestData.fileId}`, { 
        userId,
        fileId: requestData.fileId,
        error: fetchError?.message
      });
      
      return NextResponse.json(
        { error: 'Fichier non trouvé ou accès refusé' }, 
        { status: 404 }
      );
    }

    // ========================================
    // 4. CONSTRUCTION DE L'URL
    // ========================================
    
    let publicUrl: string;
    
    if (fileRecord.storage_type === 's3' && fileRecord.s3_key) {
      // Construire l'URL S3 avec la même logique que buildS3ObjectUrl
      const bucket = process.env.AWS_S3_BUCKET;
      const region = process.env.AWS_REGION;
      
      if (bucket && region) {
        publicUrl = buildS3ObjectUrl(bucket, region, fileRecord.s3_key);
        logApi.debug('🔗 [GET-URL] URL S3 construite', {
          bucket,
          region,
          key: fileRecord.s3_key,
          publicUrl
        });
      } else {
        logApi.info(`❌ Variables d'environnement S3 manquantes`, { 
          fileId: requestData.fileId,
          userId 
        });
        return NextResponse.json(
          { error: 'Configuration S3 manquante' }, 
          { status: 500 }
        );
      }
    } else if (fileRecord.storage_type === 'external') {
      // URL externe, utiliser directement l'URL de la base
      publicUrl = fileRecord.url;
      logApi.debug('🔗 [GET-URL] URL externe utilisée', { publicUrl });
    } else {
      // Fallback pour compatibilité
      publicUrl = fileRecord.url;
      logApi.debug('⚠️ [GET-URL] Fallback vers URL de la base', { publicUrl });
    }

    // ========================================
    // 5. RÉPONSE SUCCÈS
    // ========================================
    
    logApi.info(`✅ URL récupérée avec succès: ${requestData.fileId}`, { 
      fileId: requestData.fileId, 
      userId,
      publicUrl
    });

    return NextResponse.json({
      success: true,
      url: publicUrl,
      file: fileRecord
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    // ========================================
    const err = error as { message?: string };
    // 6. GESTION D'ERREURS GLOBALES
    // ========================================
    
    const errorMessage = err.message || 'Erreur inconnue';
    
    logApi.info(`❌ Erreur récupération URL: ${errorMessage}`, { 
      error: errorMessage,
      stack: (err as { stack?: string }).stack
    });

    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération de l\'URL',
        details: errorMessage
      }, 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
