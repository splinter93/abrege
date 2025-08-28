import { NextRequest, NextResponse } from 'next/server';

/**
 * Endpoint de débogage pour analyser les requêtes ChatGPT
 * Capture tous les headers, body et métadonnées de la requête
 */
export async function GET(request: NextRequest) {
  return await debugRequest(request, 'GET');
}

export async function POST(request: NextRequest) {
  return await debugRequest(request, 'POST');
}

export async function PUT(request: NextRequest) {
  return await debugRequest(request, 'PUT');
}

export async function DELETE(request: NextRequest) {
  return await debugRequest(request, 'DELETE');
}

async function debugRequest(request: NextRequest, method: string) {
  console.log('🔍 [DEBUG-CHATGPT] ===== NOUVELLE REQUÊTE =====');
  console.log('🔍 [DEBUG-CHATGPT] Méthode:', method);
  console.log('🔍 [DEBUG-CHATGPT] URL complète:', request.url);
  console.log('🔍 [DEBUG-CHATGPT] Timestamp:', new Date().toISOString());
  
  // 🚨 ANALYSE COMPLÈTE DES HEADERS
  console.log('🔍 [DEBUG-CHATGPT] ===== ANALYSE DES HEADERS =====');
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
    console.log(`🔍 [DEBUG-CHATGPT] ${key}:`, value);
  });
  
  // 🚨 DÉTECTION DES HEADERS D'AUTHENTIFICATION
  const authHeaders = Object.entries(headers).filter(([key, value]) => 
    key.toLowerCase().includes('auth') || 
    key.toLowerCase().includes('token') ||
    key.toLowerCase().includes('bearer') ||
    key.toLowerCase().includes('authorization')
  );
  
  if (authHeaders.length > 0) {
    console.log('🔍 [DEBUG-CHATGPT] 🔐 HEADERS D\'AUTHENTIFICATION DÉTECTÉS:');
    authHeaders.forEach(([key, value]) => {
      console.log(`🔍 [DEBUG-CHATGPT]   ${key}: ${value}`);
    });
  } else {
    console.log('🔍 [DEBUG-CHATGPT] ❌ AUCUN HEADER D\'AUTHENTIFICATION DÉTECTÉ');
  }
  
  // 🚨 ANALYSE DU BODY
  let bodyData: any = null;
  let bodyText = '';
  
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      bodyText = await request.text();
      console.log('🔍 [DEBUG-CHATGPT] ===== ANALYSE DU BODY =====');
      console.log('🔍 [DEBUG-CHATGPT] Taille du body:', bodyText.length);
      console.log('🔍 [DEBUG-CHATGPT] Body brut:', bodyText);
      
      if (bodyText.trim()) {
        try {
          bodyData = JSON.parse(bodyText);
          console.log('🔍 [DEBUG-CHATGPT] Body JSON parsé:', JSON.stringify(bodyData, null, 2));
        } catch (parseError) {
          console.log('🔍 [DEBUG-CHATGPT] Body non-JSON, affichage brut');
        }
      }
    } catch (bodyError) {
      console.log('🔍 [DEBUG-CHATGPT] Erreur lecture body:', bodyError);
    }
  }
  
  // 🚨 ANALYSE DES PARAMÈTRES DE QUERY
  const url = new URL(request.url);
  const queryParams = Object.fromEntries(url.searchParams.entries());
  
  if (Object.keys(queryParams).length > 0) {
    console.log('🔍 [DEBUG-CHATGPT] ===== PARAMÈTRES DE QUERY =====');
    Object.entries(queryParams).forEach(([key, value]) => {
      console.log(`🔍 [DEBUG-CHATGPT] ${key}:`, value);
    });
  }
  
  // 🚨 DÉTECTION DES SIGNATURES CHATGPT
  const isChatGPTRequest = detectChatGPTRequest(headers, bodyData, queryParams);
  console.log('🔍 [DEBUG-CHATGPT] ===== DÉTECTION CHATGPT =====');
  console.log('🔍 [DEBUG-CHATGPT] Signature ChatGPT détectée:', isChatGPTRequest ? 'OUI' : 'NON');
  
  if (isChatGPTRequest) {
    console.log('🔍 [DEBUG-CHATGPT] 🎯 REQUÊTE CHATGPT IDENTIFIÉE !');
  }
  
  console.log('🔍 [DEBUG-CHATGPT] ===== FIN ANALYSE =====\n');
  
  // Retourner un résumé pour le client
  return NextResponse.json({
    debug: {
      method,
      url: request.url,
      timestamp: new Date().toISOString(),
      headers: Object.keys(headers),
      authHeaders: authHeaders.map(([key]) => key),
      bodySize: bodyText.length,
      hasBody: bodyText.length > 0,
      queryParams: Object.keys(queryParams),
      isChatGPTRequest,
      userAgent: headers['user-agent'] || 'Non spécifié',
      contentType: headers['content-type'] || 'Non spécifié'
    },
    message: 'Requête analysée avec succès. Vérifiez les logs du serveur pour plus de détails.'
  });
}

/**
 * Détecte si une requête provient de ChatGPT
 */
function detectChatGPTRequest(
  headers: Record<string, string>, 
  bodyData: any, 
  queryParams: Record<string, string>
): boolean {
  // Vérifier les headers spécifiques à ChatGPT
  const chatgptHeaders = [
    'x-chatgpt-version',
    'x-openai-version',
    'x-gpt-version',
    'openai-version',
    'chatgpt-version'
  ];
  
  const hasChatGPTHeader = chatgptHeaders.some(header => 
    Object.keys(headers).some(key => key.toLowerCase().includes(header.replace('x-', '')))
  );
  
  // Vérifier le User-Agent
  const userAgent = headers['user-agent'] || '';
  const hasChatGPTUserAgent = userAgent.toLowerCase().includes('chatgpt') || 
                              userAgent.toLowerCase().includes('openai') ||
                              userAgent.toLowerCase().includes('gpt');
  
  // Vérifier le body pour des signatures ChatGPT
  const hasChatGPTBody = bodyData && (
    bodyData.tool_calls !== undefined ||
    bodyData.tools !== undefined ||
    bodyData.model !== undefined ||
    bodyData.messages !== undefined
  );
  
  // Vérifier les paramètres de query
  const hasChatGPTQuery = Object.keys(queryParams).some(key => 
    key.toLowerCase().includes('chatgpt') || 
    key.toLowerCase().includes('openai') ||
    key.toLowerCase().includes('gpt')
  );
  
  return hasChatGPTHeader || hasChatGPTUserAgent || hasChatGPTBody || hasChatGPTQuery;
}
