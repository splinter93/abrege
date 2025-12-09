import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/supabaseClient';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { logApi } from '@/utils/logger';
import { createClient } from '@supabase/supabase-js';

// ========================================
// SCHEMA DE VALIDATION
// ========================================

const finalizeSchema = z.object({
  fileId: z.string().uuid('ID de fichier invalide'),
  s3Key: z.string().min(1, 'Clé S3 requise'),
  etag: z.string().optional(), // ETag S3 pour validation
});

// ========================================
// HANDLER PRINCIPAL
// ========================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
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
    
    let finalizeData;
    try {
      const body = await request.json();
      finalizeData = finalizeSchema.parse(body);
    } catch (error) {
      const err = error as { message?: string };
      logApi.info(`❌ Validation des données échouée: ${err.message}`);
      return NextResponse.json(
        { error: `Données invalides: ${err.message ?? 'unknown error'}` }, 
        { status: 400 }
      );
    }

    // ========================================
    // 3. VÉRIFICATION DU FICHIER
    // ========================================
    
    // Récupérer le fichier depuis la base avec plus de flexibilité
    const { data: fileRecord, error: fetchError } = await supabase
      .from('files')
      .select('*')
      .eq('id', finalizeData.fileId)
      .or(`owner_id.eq.${userId},user_id.eq.${userId}`) // Vérifier soit owner_id soit user_id
      .single();

    if (fetchError || !fileRecord) {
      logApi.info(`❌ Fichier non trouvé ou accès refusé: ${finalizeData.fileId}`, { 
        userId,
        fileId: finalizeData.fileId,
        error: fetchError?.message
      });
      
      // Debug: essayer de récupérer le fichier sans restriction pour voir ce qui existe
      const { data: debugFile } = await supabase
        .from('files')
        .select('id, owner_id, user_id, status, filename')
        .eq('id', finalizeData.fileId)
        .single();
      
      if (debugFile) {
        logApi.info(`🔍 Debug - Fichier trouvé mais accès refusé:`, {
          fileId: finalizeData.fileId,
          owner_id: debugFile.owner_id,
          user_id: debugFile.user_id,
          status: debugFile.status,
          filename: debugFile.filename,
          requestingUserId: userId
        });
      }
      
      return NextResponse.json(
        { error: 'Fichier non trouvé ou accès refusé' }, 
        { status: 404 }
      );
    }

    // Vérifier que le fichier est en statut 'uploading'
    if (fileRecord.status !== 'uploading') {
      logApi.info(`❌ Fichier déjà finalisé ou dans un état invalide: ${fileRecord.status}`, { 
        fileId: finalizeData.fileId, 
        userId,
        currentStatus: fileRecord.status,
        filename: fileRecord.filename
      });
      return NextResponse.json(
        { error: 'Fichier déjà finalisé ou dans un état invalide' }, 
        { status: 400 }
      );
    }

    // Vérifier que la clé S3 correspond
    if (fileRecord.s3_key !== finalizeData.s3Key) {
      logApi.info(`❌ Clé S3 ne correspond pas: attendu ${fileRecord.s3_key}, reçu ${finalizeData.s3Key}`, { 
        fileId: finalizeData.fileId, 
        userId,
        storedS3Key: fileRecord.s3_key,
        receivedS3Key: finalizeData.s3Key
      });
      return NextResponse.json(
        { error: 'Clé S3 invalide' }, 
        { status: 400 }
      );
    }

    // ========================================
    // 4. FINALISATION
    // ========================================
    
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

    // Mettre à jour le statut du fichier
    const { data: updatedFile, error: updateError } = await userSupabase
      .from('files')
      .update({
        status: 'ready',
        updated_at: new Date().toISOString(),
        ...(finalizeData.etag && { etag: finalizeData.etag })
      })
      .eq('id', finalizeData.fileId)
      .select()
      .single();

    if (updateError) {
      logApi.info(`❌ Erreur lors de la finalisation: ${updateError.message}`, { 
        fileId: finalizeData.fileId, 
        userId 
      });
      return NextResponse.json(
        { error: `Erreur lors de la finalisation: ${updateError.message}` }, 
        { status: 500 }
      );
    }

    // ========================================
    // 5. AUDIT TRAIL
    // ========================================
    
    try {
      await supabase.from('file_events').insert({
        file_id: finalizeData.fileId,
        user_id: userId,
        event_type: 'upload_completed',
        request_id: fileRecord.request_id || 'finalize',
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        user_agent: request.headers.get('user-agent') || undefined,
        metadata: {
          s3Key: finalizeData.s3Key,
          etag: finalizeData.etag || null,
          operationType: 'upload_finalization'
        }
      });
    } catch (auditError) {
      // Log l'erreur mais ne pas faire échouer la finalisation
      const auditErr = auditError as { message?: string };
      logApi.info(`⚠️ Erreur audit trail: ${auditErr.message}`, { 
        fileId: finalizeData.fileId, 
        userId 
      });
    }

    // ========================================
    // 6. RÉPONSE SUCCÈS
    // ========================================
    
    const apiTime = Date.now() - startTime;
    
    logApi.info(`✅ Upload finalisé avec succès en ${apiTime}ms`, { 
      fileId: finalizeData.fileId, 
      userId,
      s3Key: finalizeData.s3Key,
      duration: apiTime
    });

    return NextResponse.json({
      success: true,
      file: updatedFile,
      message: 'Upload finalisé avec succès'
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    const err = error as { message?: string; stack?: string };
    // ========================================
    // 7. GESTION D'ERREURS GLOBALES
    // ========================================
    
    const apiTime = Date.now() - startTime;
    const errorMessage = err.message || 'Erreur inconnue';
    
    logApi.info(`❌ Erreur finalisation: ${errorMessage}`, { 
      duration: apiTime,
      error: errorMessage,
      stack: err.stack
    });

    return NextResponse.json(
      { 
        error: 'Erreur lors de la finalisation',
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
