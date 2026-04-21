import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';
import { z } from 'zod';

// Force Node.js runtime
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Schéma de validation pour POST
 */
const linkCallableSchema = z.object({
  callable_id: z.string().uuid('callable_id doit être un UUID valide'),
});

/**
 * GET /api/ui/agents/[agentId]/callables
 * Récupère tous les callables liés à un agent
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
): Promise<NextResponse> {
  try {
    const { agentId } = await params;

    if (!agentId) {
      return NextResponse.json(
        { success: false, error: 'Agent ID manquant' },
        { status: 400 }
      );
    }

    logger.dev(`[AgentCallables] 🔍 Récupération callables pour agent: ${agentId}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer les liens avec les informations des callables
    // Syntaxe Supabase : utiliser !callable_id pour spécifier explicitement la FK
    // car la colonne callable_id ne correspond pas exactement au nom de la table synesia_callables
    const { data: links, error } = await supabase
      .from('agent_callables')
      .select(`
        id,
        agent_id,
        callable_id,
        created_at,
        updated_at,
        synesia_callables!callable_id (
          id,
          name,
          type,
          description,
          slug,
          icon,
          group_name,
          auth,
          is_owner
        )
      `)
      .eq('agent_id', agentId);

    if (error) {
      logger.error('[AgentCallables] ❌ Erreur récupération callables:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Filtrer les callables null (ne devrait pas arriver avec la FK)
    const validLinks = (links || []).filter(
      (link: { synesia_callables: unknown }) => link.synesia_callables !== null
    );

    logger.dev(`[AgentCallables] ✅ ${validLinks.length} callables liés à l'agent ${agentId}`);

    return NextResponse.json({
      success: true,
      callables: validLinks,
    });

  } catch (error) {
    logger.error('[AgentCallables] ❌ Erreur:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ui/agents/[agentId]/callables
 * Lie un callable à un agent
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
): Promise<NextResponse> {
  try {
    const { agentId } = await params;
    const body = await request.json();

    // Validation
    const validated = linkCallableSchema.parse(body);
    const { callable_id } = validated;

    if (!agentId) {
      return NextResponse.json(
        { success: false, error: 'Agent ID manquant' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Vérifier que l'agent existe
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { success: false, error: 'Agent non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier que le callable existe
    const { data: callable, error: callableError } = await supabase
      .from('synesia_callables')
      .select('id, name')
      .eq('id', callable_id)
      .single();

    if (callableError || !callable) {
      return NextResponse.json(
        { success: false, error: 'Callable non trouvé. Synchronisez d\'abord les callables.' },
        { status: 404 }
      );
    }

    // Créer la liaison (la contrainte UNIQUE empêchera les doublons)
    const { data: link, error: linkError } = await supabase
      .from('agent_callables')
      .insert({
        agent_id: agentId,
        callable_id: callable_id,
      })
      .select()
      .single();

    if (linkError) {
      // Si c'est une erreur de contrainte unique, c'est OK
      if (linkError.code === '23505') {
        return NextResponse.json({
          success: true,
          message: 'Callable déjà lié à cet agent',
        });
      }

      logger.error('[AgentCallables] ❌ Erreur création lien:', linkError);
      return NextResponse.json(
        { success: false, error: linkError.message },
        { status: 500 }
      );
    }

    logger.info(`[AgentCallables] ✅ Callable ${callable.name} (${callable_id}) lié à l'agent ${agent.name} (${agentId})`);

    return NextResponse.json({
      success: true,
      link,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation échouée',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    logger.error('[AgentCallables] ❌ Erreur:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    );
  }
}

