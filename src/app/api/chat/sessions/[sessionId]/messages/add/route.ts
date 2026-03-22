import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { simpleLogger as logger } from '@/utils/logger';
import { createClient } from '@supabase/supabase-js';
import { streamTimelineSchema, toolResultSchema } from '@/utils/chatValidationSchemas';

/**
 * ✅ API: POST /api/chat/sessions/[sessionId]/messages/add
 * Ajoute un message atomiquement via HistoryManager
 * 
 * Sécurité:
 * - Vérifie auth token
 * - Vérifie ownership session
 * - Validation Zod stricte (0 any)
 * - Appel HistoryManager (SERVICE_ROLE, atomique)
 * 
 * @returns {ChatMessage} - Message sauvegardé avec sequence_number
 */

const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'tool', 'system']),
  content: z.string(),
  tool_calls: z.array(z.object({
    id: z.string(),
    type: z.literal('function'),
    function: z.object({
      name: z.string(),
      arguments: z.string()
    })
  })).optional(),
  tool_call_id: z.string().optional(),
  name: z.string().optional(),
  reasoning: z.string().optional(),
  stream_timeline: streamTimelineSchema.optional(), // ✅ Type strict
  tool_results: z.array(toolResultSchema).optional(), // ✅ Type strict
  // ✅ NOUVEAU : Support des attachments (images + notes)
  attachedImages: z.array(z.object({
    url: z.string(),
    fileName: z.string().optional()
  })).optional(),
  attachedNotes: z.array(z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    word_count: z.number().optional()
  })).optional(),
  // ✅ NOUVEAU : Metadata légère (mentions + prompts)
  mentions: z.array(z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    description: z.string().optional(),
    word_count: z.number().optional(),
    created_at: z.string().optional()
  })).optional(),
  prompts: z.array(z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    context: z.enum(['editor', 'chat', 'both']).optional(),
    agent_id: z.string().nullable().optional(),
    placeholderValues: z.record(z.string(), z.string()).optional()
  })).optional(),
  // ✅ NOUVEAU : Sélections du canvas
  canvasSelections: z.array(z.object({
    id: z.string().uuid(),
    text: z.string().min(1),
    noteId: z.string().uuid().optional(),
    noteSlug: z.string().optional(),
    noteTitle: z.string().optional(),
    startPos: z.number().int().nonnegative().optional(),
    endPos: z.number().int().nonnegative().optional(),
    timestamp: z.string()
  })).optional(),
  /** Idempotence + dédup bulle optimiste ↔ echo Realtime (assistant / user) */
  operation_id: z.string().uuid().optional()
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    
    // 1. Validation body
    const body = await req.json();
    const message = messageSchema.parse(body);
    
    logger.dev('[API /messages/add] 📥 Message reçu:', {
      role: message.role,
      hasStreamTimeline: !!message.stream_timeline,
      streamTimelineItems: message.stream_timeline?.items?.length || 0
    });

    // 2. Vérifier authentification
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Token manquant' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // 3. Vérifier ownership session
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { data: session, error: sessionError } = await userClient
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      logger.error('[API /messages/add] ❌ Session non trouvée ou accès refusé:', sessionError);
      return NextResponse.json(
        { success: false, error: 'Session non trouvée' },
        { status: 404 }
      );
    }

    // 4. Import dynamique HistoryManager (côté serveur uniquement)
    const { historyManager } = await import('@/services/chat/HistoryManager');

    // 5. Ajouter message atomiquement
    const savedMessage = await historyManager.addMessage(sessionId, message);

    // 🔥 Si 1er message → marquer conversation comme non-vide + update timestamp
    if (savedMessage.sequence_number === 1) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      
      await adminClient
        .from('chat_sessions')
        .update({ 
          is_empty: false,
          updated_at: new Date().toISOString() // ✅ Force refresh pour trigger sync
        })
        .eq('id', sessionId);
      
      logger.dev('[API /messages/add] ✅ Conversation marquée non-vide (apparaîtra dans sidebar)');

      // 🎯 AUTO-RENAME: Si 1er message user → générer titre via LLM (async non-bloquant)
      if (message.role === 'user') {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                        (req.headers.get('host') ? `${req.headers.get('x-forwarded-proto') || 'http'}://${req.headers.get('host')}` : 'http://localhost:3000');
        
        // Fire and forget (pas d'await) pour ne pas bloquer la réponse
        // Après génération, forcer refresh sessions côté client
        fetch(`${baseUrl}/api/chat/sessions/${sessionId}/generate-title`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify({
            userMessage: message.content,
            agentName: undefined // TODO: récupérer nom agent si dispo
          })
        })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            logger.dev('[API /messages/add] ✅ Auto-rename terminé', {
              sessionId,
              title: data.title
            });
            
            // ✅ Broadcast event pour refresh sidebar (custom event)
            // Le client écoutera cet event pour rafraîchir
          }
        })
        .catch(error => {
          // Échec silencieux (pas d'impact UX)
          logger.warn('[API /messages/add] ⚠️ Auto-rename failed (non-blocking)', {
            sessionId,
            error: error instanceof Error ? error.message : String(error)
          });
        });

        logger.dev('[API /messages/add] 🎯 Auto-rename démarré (async)', { sessionId });
      }
    }

    logger.dev('[API /messages/add] ✅ Message ajouté:', {
      sessionId,
      sequenceNumber: savedMessage.sequence_number,
      role: savedMessage.role
    });

    return NextResponse.json({
      success: true,
      data: {
        message: savedMessage
      }
    });

  } catch (error) {
    logger.error('[API /messages/add] ❌ Erreur:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Données invalides', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
