import { NextRequest, NextResponse } from 'next/server';

// Stockage en mémoire pour les sessions de test
let testSessions: any[] = [];
let sessionCounter = 0;

// Clé pour localStorage
const STORAGE_KEY = 'chat_sessions_test';

// Fonction pour charger les sessions depuis localStorage (côté client uniquement)
function loadSessionsFromStorage() {
  // Cette fonction ne sera appelée que côté client
  // Le stockage côté serveur se fait en mémoire
}

// Fonction pour sauvegarder les sessions dans localStorage (côté client uniquement)
function saveSessionsToStorage() {
  // Cette fonction ne sera appelée que côté client
  // Le stockage côté serveur se fait en mémoire
}

// Les sessions sont stockées en mémoire côté serveur
// localStorage est géré côté client dans le composant

/**
 * Endpoint de test pour créer une session sans authentification
 * Usage: POST /api/v1/chat-sessions/test
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name = 'Test Session', initial_message, history_limit = 10 } = body;

    // Créer une session de test avec un ID unique
    const sessionId = `test-session-${++sessionCounter}`;
    const testUserId = '00000000-0000-0000-0000-000000000001';
    
    const newSession = {
      id: sessionId,
      user_id: testUserId,
      name,
      history_limit,
      thread: initial_message ? [
        {
          id: crypto.randomUUID(),
          role: 'user',
          content: initial_message,
          timestamp: new Date().toISOString()
        }
      ] : [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
      metadata: { test: true, created_via: 'test_endpoint' }
    };

    // Ajouter à la liste en mémoire
    testSessions.unshift(newSession);
    
    // Le stockage côté serveur se fait en mémoire uniquement

    console.log("[Test API] ✅ Session créée:", sessionId);

    return NextResponse.json({
      success: true,
      data: newSession,
      message: 'Session de test créée avec succès'
    });

  } catch (error) {
    console.error('[Test API] ❌ Erreur création session:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la session de test' },
      { status: 500 }
    );
  }
}

/**
 * Endpoint de test pour lister les sessions sans authentification
 * Usage: GET /api/v1/chat-sessions/test
 */
export async function GET() {
  try {
    const testUserId = '00000000-0000-0000-0000-000000000001';
    
    // Filtrer les sessions pour l'utilisateur de test
    const userSessions = testSessions.filter(session => session.user_id === testUserId);

    console.log("[Test API] ✅ Sessions récupérées:", userSessions.length);

    return NextResponse.json({
      success: true,
      data: userSessions,
      message: 'Sessions de test récupérées avec succès'
    });

  } catch (error) {
    console.error('[Test API] ❌ Erreur récupération sessions:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des sessions de test' },
      { status: 500 }
    );
  }
}

/**
 * Endpoint de test pour mettre à jour une session
 * Usage: PUT /api/v1/chat-sessions/test
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, updates } = body;

    // Trouver la session à mettre à jour
    const sessionIndex = testSessions.findIndex(session => session.id === sessionId);
    
    if (sessionIndex === -1) {
      return NextResponse.json(
        { error: 'Session non trouvée' },
        { status: 404 }
      );
    }

    // Mettre à jour la session
    testSessions[sessionIndex] = {
      ...testSessions[sessionIndex],
      ...updates,
      updated_at: new Date().toISOString()
    };

    // Le stockage côté serveur se fait en mémoire uniquement

    console.log("[Test API] ✅ Session mise à jour:", sessionId);

    return NextResponse.json({
      success: true,
      data: testSessions[sessionIndex],
      message: 'Session de test mise à jour avec succès'
    });

  } catch (error) {
    console.error('[Test API] ❌ Erreur mise à jour session:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la session de test' },
      { status: 500 }
    );
  }
} 