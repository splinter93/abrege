import { NextRequest, NextResponse } from 'next/server';

/**
 * Endpoint de test pour diagnostiquer le problème OAuth ChatGPT
 * Simule exactement ce que ChatGPT envoie
 */
export async function POST(request: NextRequest) {
  console.log('🧪 [TEST-CHATGPT] ===== DÉBUT TEST SIMULATION CHATGPT =====');
  
  try {
    // 1. Capturer tous les détails de la requête
    console.log('🧪 [TEST-CHATGPT] URL:', request.url);
    console.log('🧪 [TEST-CHATGPT] Méthode:', request.method);
    
    // 2. Lister tous les headers
    console.log('🧪 [TEST-CHATGPT] Headers reçus:');
    const allHeaders: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      allHeaders[key] = value;
      console.log(`   ${key}: ${value}`);
    });
    
    console.log('🧪 [TEST-CHATGPT] Headers complets:', JSON.stringify(allHeaders, null, 2));
    
    // 3. Vérifier spécifiquement l'Authorization
    const authHeader = request.headers.get('authorization');
    console.log('🧪 [TEST-CHATGPT] Header Authorization:', authHeader ? `"${authHeader}"` : 'ABSENT');
    
    if (authHeader) {
      console.log('🧪 [TEST-CHATGPT] Type Authorization:', authHeader.startsWith('Bearer ') ? 'Bearer Token' : 'Autre format');
      console.log('🧪 [TEST-CHATGPT] Longueur token:', authHeader.replace('Bearer ', '').length);
      console.log('🧪 [TEST-CHATGPT] Token (premiers 50 caractères):', authHeader.replace('Bearer ', '').substring(0, 50) + '...');
    }
    
    // 4. Capturer le body complet
    const body = await request.json();
    console.log('🧪 [TEST-CHATGPT] Body complet reçu:', JSON.stringify(body, null, 2));
    
    // 5. Analyser la structure du body
    console.log('🧪 [TEST-CHATGPT] Analyse du body:');
    console.log('   - clientId présent:', 'clientId' in body);
    console.log('   - userId présent:', 'userId' in body);
    console.log('   - redirectUri présent:', 'redirectUri' in body);
    console.log('   - scopes présent:', 'scopes' in body);
    console.log('   - state présent:', 'state' in body);
    
    if ('clientId' in body) {
      console.log('   - clientId valeur:', body.clientId);
    }
    if ('userId' in body) {
      console.log('   - userId valeur:', body.userId);
    }
    if ('redirectUri' in body) {
      console.log('   - redirectUri valeur:', body.redirectUri);
    }
    if ('scopes' in body) {
      console.log('   - scopes valeur:', Array.isArray(body.scopes) ? body.scopes : 'Non-array');
    }
    
    // 6. Test de simulation de l'authentification
    console.log('🧪 [TEST-CHATGPT] Test de simulation de l\'authentification...');
    
    if (!authHeader) {
      console.log('🧪 [TEST-CHATGPT] ❌ PAS D\'AUTHENTIFICATION - Simulation de l\'erreur ChatGPT');
      return NextResponse.json({
        error: 'missing_authorization',
        message: 'Header Authorization manquant - c\'est le problème ChatGPT !',
        received_headers: Object.keys(allHeaders),
        expected_header: 'Authorization: Bearer <token>',
        body_structure: body
      }, { status: 401 });
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      console.log('🧪 [TEST-CHATGPT] ❌ FORMAT AUTHENTIFICATION INCORRECT');
      return NextResponse.json({
        error: 'invalid_authorization_format',
        message: 'Format Authorization incorrect - doit commencer par "Bearer "',
        received: authHeader,
        expected: 'Bearer <token>'
      }, { status: 401 });
    }
    
    // 7. Simulation réussie
    console.log('🧪 [TEST-CHATGPT] ✅ Simulation réussie - tous les paramètres sont présents');
    console.log('🧪 [TEST-CHATGPT] ===== FIN TEST SIMULATION CHATGPT =====');
    
    return NextResponse.json({
      success: true,
      message: 'Simulation ChatGPT réussie - tous les paramètres sont corrects',
      headers_received: Object.keys(allHeaders),
      authorization_present: !!authHeader,
      authorization_format: authHeader.startsWith('Bearer ') ? 'correct' : 'incorrect',
      body_valid: body && 'clientId' in body && 'userId' in body && 'redirectUri' in body && 'scopes' in body
    });
    
  } catch (error) {
    console.error('🧪 [TEST-CHATGPT] ❌ Erreur lors du test:', error);
    console.log('🧪 [TEST-CHATGPT] ===== FIN TEST SIMULATION CHATGPT (ERREUR) =====');
    
    return NextResponse.json({
      error: 'test_error',
      message: 'Erreur lors du test de simulation ChatGPT',
      error_details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

/**
 * Endpoint GET pour tester la configuration
 */
export async function GET() {
  return NextResponse.json({
    message: 'Endpoint de test OAuth ChatGPT',
    usage: 'POST avec le même body que ChatGPT pour diagnostiquer le problème',
    example: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer <your-supabase-token>'
      },
      body: {
        clientId: 'scrivia-custom-gpt',
        userId: 'your-user-id',
        redirectUri: 'https://chat.openai.com/aip/g-xxx/oauth/callback',
        scopes: ['notes:read', 'notes:write'],
        state: 'test-state'
      }
    }
  });
}
