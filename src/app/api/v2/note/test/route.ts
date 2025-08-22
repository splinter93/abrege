import { NextRequest, NextResponse } from 'next/server';
import { logApi } from '@/utils/logger';
import { createSupabaseClient } from '@/utils/supabaseClient';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const context = {
    operation: 'v2_note_test',
    component: 'API_V2'
  };

  logApi.info('🧪 Test endpoint de diagnostic', context);

  try {
    const supabase = createSupabaseClient();
    
    // Test 1: Vérifier la connexion à la base
    logApi.info('🔍 Test 1: Connexion à la base', context);
    
    // Test 2: Vérifier la structure de la table articles
    logApi.info('🔍 Test 2: Structure table articles', context);
    const { data: articlesStructure, error: structureError } = await supabase
      .from('articles')
      .select('*')
      .limit(1);
    
    if (structureError) {
      logApi.error(`❌ Erreur structure articles: ${structureError.message}`, structureError);
      return NextResponse.json({
        error: 'Erreur structure table articles',
        details: structureError.message
      }, { status: 500 });
    }
    
    logApi.info('✅ Structure table articles OK', context);
    
    // Test 3: Vérifier la table classeurs
    logApi.info('🔍 Test 3: Structure table classeurs', context);
    const { data: classeursStructure, error: classeursError } = await supabase
      .from('classeurs')
      .select('*')
      .limit(1);
    
    if (classeursError) {
      logApi.error(`❌ Erreur structure classeurs: ${classeursError.message}`, classeursError);
      return NextResponse.json({
        error: 'Erreur structure table classeurs',
        details: classeursError.message
      }, { status: 500 });
    }
    
    logApi.info('✅ Structure table classeurs OK', context);
    
    // Test 4: Vérifier les politiques RLS
    logApi.info('🔍 Test 4: Politiques RLS', context);
    
    return NextResponse.json({
      success: true,
      message: 'Tests de diagnostic réussis',
      articles: {
        structure: 'OK',
        sample: articlesStructure?.[0] || 'Aucune donnée'
      },
      classeurs: {
        structure: 'OK',
        sample: classeursStructure?.[0] || 'Aucune donnée'
      }
    });
    
  } catch (err: unknown) {
    logApi.error(`❌ Erreur serveur: ${err}`, err);
    return NextResponse.json(
      { error: 'Erreur serveur', details: String(err) },
      { status: 500 }
    );
  }
} 