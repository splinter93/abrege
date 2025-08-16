import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';

// Client Supabase admin pour accéder aux agents
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    logger.info('[Agents API] 🚀 Récupération des agents');

    const { data: agents, error } = await supabase
      .from('agents')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error) {
      logger.error('[Agents API] ❌ Erreur récupération agents:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des agents' },
        { status: 500 }
      );
    }

    logger.info(`[Agents API] ✅ ${agents?.length || 0} agents récupérés`);
    
    return NextResponse.json({
      success: true,
      agents: agents || []
    });

  } catch (error) {
    logger.error('[Agents API] ❌ Erreur fatale:', error);
    
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, model, system_instructions, provider = 'groq' } = body;

    logger.info('[Agents API] 🚀 Création d\'un nouvel agent');

    if (!name || !model || !system_instructions) {
      return NextResponse.json(
        { error: 'Paramètres manquants', required: ['name', 'model', 'system_instructions'] },
        { status: 400 }
      );
    }

    const { data: agent, error } = await supabase
      .from('agents')
      .insert({
        name,
        model,
        provider,
        system_instructions,
        is_active: true,
        priority: 1,
        temperature: 0.7,
        max_tokens: 8000
      })
      .select()
      .single();

    if (error) {
      logger.error('[Agents API] ❌ Erreur création agent:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la création de l\'agent' },
        { status: 500 }
      );
    }

    logger.info(`[Agents API] ✅ Agent créé: ${agent.name} (ID: ${agent.id})`);
    
    return NextResponse.json({
      success: true,
      agent
    });

  } catch (error) {
    logger.error('[Agents API] ❌ Erreur fatale:', error);
    
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
} 