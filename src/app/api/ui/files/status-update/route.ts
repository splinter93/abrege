import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/supabaseClient';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { logApi } from '@/utils/logger';
import { createClient } from '@supabase/supabase-js';

// ========================================
// SCHEMA DE VALIDATION
// ========================================

const statusUpdateSchema = z.object({
  fileId: z.string().uuid('ID de fichier invalide'),
  status: z.enum(['ready', 'uploading', 'error']),
});

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
    
    let updateData;
    try {
      const body = await request.json();
      updateData = statusUpdateSchema.parse(body);
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
    
    // Récupérer le fichier depuis la base
    const { data: fileRecord, error: fetchError } = await supabase
      .from('files')
      .select('id, owner_id, user_id, status, filename')
      .eq('id', updateData.fileId)
      .eq('owner_id', userId) // Vérifier que l'utilisateur est le propriétaire
      .single();

    if (fetchError || !fileRecord) {
      logApi.info(`❌ Fichier non trouvé ou accès refusé: ${updateData.fileId}`, { 
        userId,
        fileId: updateData.fileId,
        error: fetchError?.message
      });
      
      return NextResponse.json(
        { error: 'Fichier non trouvé ou accès refusé' }, 
        { status: 404 }
      );
    }

    // ========================================
    // 4. MISE À JOUR DU STATUT
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
        status: updateData.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', updateData.fileId)
      .select()
      .single();

    if (updateError) {
      logApi.info(`❌ Erreur lors de la mise à jour du statut: ${updateError.message}`, { 
        fileId: updateData.fileId, 
        userId 
      });
      return NextResponse.json(
        { error: `Erreur lors de la mise à jour: ${updateError.message}` }, 
        { status: 500 }
      );
    }

    // ========================================
    // 5. RÉPONSE SUCCÈS
    // ========================================
    
    logApi.info(`✅ Statut du fichier mis à jour avec succès: ${updateData.fileId} -> ${updateData.status}`, { 
      fileId: updateData.fileId, 
      userId,
      newStatus: updateData.status
    });

    return NextResponse.json({
      success: true,
      file: updatedFile,
      message: 'Statut mis à jour avec succès'
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
    
    logApi.info(`❌ Erreur mise à jour statut: ${errorMessage}`, { 
      error: errorMessage,
      stack: (err as { stack?: string }).stack
    });

    return NextResponse.json(
      { 
        error: 'Erreur lors de la mise à jour du statut',
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
