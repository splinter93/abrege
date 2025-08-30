import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { simpleLogger as logger } from '@/utils/logger';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

logger.dev('[Chat Messages API] 🔧 Configuration:', {
  supabaseUrl: supabaseUrl ? '✅ Configuré' : '❌ Manquant',
  supabaseKey: supabaseKey ? '✅ Configuré' : '❌ Manquant'
});

if (!supabaseUrl || !supabaseKey) {
  logger.error('[Chat Messages API] ❌ Variables d\'environnement Supabase manquantes');
  throw new Error('Configuration Supabase manquante');
}

// Client avec service role pour les opérations admin
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

// Schéma de validation pour ajouter un message
const addMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string().nullable().optional(),
  timestamp: z.string().optional().default(() => new Date().toISOString()),
  // Support pour le reasoning
  reasoning: z.string().nullable().optional(),
  // Support pour les tool calls (format DeepSeek)
  tool_calls: z.array(z.object({
    id: z.string(),
    type: z.literal('function'),
    function: z.object({
      name: z.string(),
      arguments: z.string()
    })
  })).optional(),
  tool_call_id: z.string().optional(), // Pour les messages tool
  name: z.string().optional(), // 🔧 CORRECTION: Ajouter le name pour les messages tool
  // Support pour les tool results
  tool_results: z.array(z.object({
    tool_call_id: z.string(),
    name: z.string(),
    content: z.string(),
    success: z.boolean().optional()
  })).optional()
});

// 🔧 VALIDATION RENFORCÉE: Vérifier que les messages tool ont les champs requis
function validateToolMessage(message: any): boolean {
  if (message.role === 'tool') {
    if (!message.tool_call_id) {
      logger.warn('[Chat Messages API] ⚠️ Message tool sans tool_call_id:', message);
      return false;
    }
    if (!message.name && !message.tool_name) {
      logger.warn('[Chat Messages API] ⚠️ Message tool sans name:', message);
      return false;
    }
  }
  return true;
}

// POST /api/ui/chat-sessions/[id]/messages - Ajouter un message à une session
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    logger.dev('[Chat Messages API] 📝 Ajout de message à la session:', id);
    
    // Récupérer l'utilisateur depuis l'en-tête d'autorisation
    const authHeader = request.headers.get('authorization');
    let userId: string;
    let userToken: string;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Token JWT fourni
      userToken = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(userToken);
      
      if (authError || !user) {
        logger.error('[Chat Messages API] ❌ Erreur auth:', authError);
        return NextResponse.json(
          { error: 'Token invalide ou expiré' },
          { status: 401 }
        );
      }
      userId = user.id;
    } else {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      );
    }

    const sessionId = id;
    const body = await request.json();
    
    // 🔧 NOUVEAU: Log détaillé pour debug
    logger.dev('[Chat Messages API] 📋 Body reçu:', JSON.stringify(body, null, 2));
    
    try {
      const validatedData = addMessageSchema.parse(body);
      logger.dev('[Chat Messages API] ✅ Validation réussie:', validatedData);
    } catch (validationError) {
      logger.error('[Chat Messages API] ❌ Erreur validation:', validationError);
      logger.error('[Chat Messages API] ❌ Body problématique:', JSON.stringify(body, null, 2));
      return NextResponse.json(
        { error: 'Données invalides', details: validationError instanceof Error ? validationError.message : 'Erreur de validation' },
        { status: 400 }
      );
    }
    
    const validatedData = addMessageSchema.parse(body);

    // Créer le nouveau message
    const newMessage = {
      id: crypto.randomUUID(),
      role: validatedData.role,
      content: validatedData.content,
      timestamp: validatedData.timestamp,
      reasoning: validatedData.reasoning,
      tool_calls: validatedData.tool_calls,
      tool_call_id: validatedData.tool_call_id,
      name: validatedData.name, // 🔧 CORRECTION: Inclure le name pour les messages tool
      tool_results: validatedData.tool_results
    };

    // 🔧 NOUVEAU: Log détaillé du message créé
    logger.dev('[Chat Messages API] 📝 Message créé:', {
      id: newMessage.id,
      role: newMessage.role,
      hasContent: !!newMessage.content,
      hasReasoning: !!newMessage.reasoning,
      hasToolCalls: !!newMessage.tool_calls,
      hasToolResults: !!newMessage.tool_results,
      toolCallsCount: newMessage.tool_calls?.length || 0,
      toolResultsCount: newMessage.tool_results?.length || 0
    });

    // Validation du message avec le schéma
    const validationResult = addMessageSchema.safeParse(newMessage);
    if (!validationResult.success) {
      logger.error('[Chat Messages API] ❌ Validation échouée:', validationResult.error);
      return NextResponse.json(
        { error: 'Message invalide', details: validationResult.error },
        { status: 400 }
      );
    }

    // 🔧 VALIDATION RENFORCÉE: Vérifier les messages tool
    if (!validateToolMessage(newMessage)) {
      logger.error('[Chat Messages API] ❌ Message tool invalide:', newMessage);
      return NextResponse.json(
        { error: 'Message tool invalide - tool_call_id et name requis' },
        { status: 400 }
      );
    }

    // Créer un client avec le contexte d'authentification de l'utilisateur
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!anonKey) {
      throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY manquante');
    }
    
    const userClient = createClient(supabaseUrl!, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    });

    // Récupérer la session actuelle avec le contexte utilisateur
    logger.dev('[Chat Messages API] 🔍 Recherche session:', sessionId);
    const { data: currentSession, error: fetchError } = await userClient
      .from('chat_sessions')
      .select('thread, history_limit')
      .eq('id', sessionId)
      .single();

    if (fetchError) {
      logger.error('[Chat Messages API] ❌ Erreur récupération session:', {
        error: fetchError,
        sessionId,
        userId,
        hasToken: !!userToken
      });
      
      if (fetchError.code === 'PGRST116') {
        logger.error('[Chat Messages API] ❌ Session non trouvée:', sessionId);
        return NextResponse.json(
          { error: 'Session non trouvée' },
          { status: 404 }
        );
      }
      
      logger.error('[Chat Messages API] ❌ Erreur récupération session:', fetchError);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération de la session' },
        { status: 500 }
      );
    }

    // 🔧 NOUVEAU: Vérifier que la session existe et appartient à l'utilisateur
    if (!currentSession) {
      logger.error('[Chat Messages API] ❌ Session non trouvée dans la DB:', sessionId);
      return NextResponse.json(
        { error: 'Session non trouvée' },
        { status: 404 }
      );
    }

    logger.dev('[Chat Messages API] ✅ Session trouvée:', {
      sessionId,
      threadLength: currentSession.thread?.length || 0,
      historyLimit: currentSession.history_limit
    });

    // Ajouter le nouveau message au thread
    const currentThread = currentSession.thread || [];
    const updatedThread = [...currentThread, newMessage];

    // ✅ NOUVEAU: Garder TOUS les messages pour l'utilisateur
    // La limitation history_limit est uniquement pour l'API LLM, pas pour la persistance
    const historyLimit = currentSession.history_limit || 30;
    
    // Trier par timestamp PUIS garder TOUS les messages (pas de limitation)
    const sortedFullThread = updatedThread
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    // ✅ Pas de .slice(-historyLimit) - on garde TOUT !

    logger.dev('[Chat Messages API] 💾 Mise à jour du thread...', {
      ancienThread: currentThread.length,
      nouveauThread: updatedThread.length,
      threadComplet: sortedFullThread.length,
      limite: historyLimit,
      trié: '✅ Par timestamp',
      note: '✅ TOUS les messages conservés (pas de limitation)'
    });

    // Mettre à jour la session avec le nouveau thread trié et COMPLET
    const { data: updatedSession, error: updateError } = await userClient
      .from('chat_sessions')
      .update({ 
        thread: sortedFullThread,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) {
      logger.error('[Chat Messages API] ❌ Erreur mise à jour session:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de la session' },
        { status: 500 }
      );
    }

    logger.dev('[Chat Messages API] ✅ Message ajouté avec succès');

    return NextResponse.json({
      success: true,
      data: {
        session: updatedSession,
        message: newMessage
      }
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('[Chat Messages API] ❌ Erreur validation:', error.errors);
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('[Chat Messages API] ❌ Erreur serveur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}

// GET /api/ui/chat-sessions/[id]/messages - Récupérer les messages d'une session
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    // Récupérer l'utilisateur depuis l'en-tête d'autorisation
    const authHeader = request.headers.get('authorization');
    let userToken: string;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      userToken = authHeader.substring(7);
    } else {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      );
    }

    // Créer un client avec le contexte d'authentification de l'utilisateur
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!anonKey) {
      throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY manquante');
    }
    
    const userClient = createClient(supabaseUrl!, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    });

    const sessionId = id;

    // Récupérer la session avec son thread
    const { data: session, error } = await userClient
      .from('chat_sessions')
      .select('thread')
      .eq('id', sessionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Session non trouvée' },
          { status: 404 }
        );
      }
      
      logger.error('Erreur lors de la récupération des messages:', error);
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération des messages' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        messages: session.thread || []
      }
    });

  } catch (error) {
    logger.error('Erreur serveur:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
} 