import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

/**
 * Route API v2 pour la traduction audio avec Whisper via Groq
 * 
 * POST /api/v2/whisper/translate
 * 
 * Body (FormData):
 * - file: Fichier audio (m4a, mp3, wav, etc.)
 * - model: Modèle Whisper (whisper-large-v3 par défaut)
 * - prompt: Prompt pour guider la traduction (optionnel)
 * - response_format: Format de réponse (json, verbose_json, text)
 * - temperature: Température (0 par défaut)
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('[Whisper API v2] 🌍 Début de la traduction audio');

    // Vérifier la méthode
    if (request.method !== 'POST') {
      return NextResponse.json(
        { error: 'Méthode non autorisée' },
        { status: 405 }
      );
    }

    // Récupérer les données du formulaire
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const model = formData.get('model') as string || 'whisper-large-v3';
    const prompt = formData.get('prompt') as string;
    const responseFormat = formData.get('response_format') as string || 'verbose_json';
    const temperature = parseFloat(formData.get('temperature') as string || '0');

    // Validation du fichier
    if (!file) {
      return NextResponse.json(
        { error: 'Fichier audio requis' },
        { status: 400 }
      );
    }

    // Validation du type de fichier
    const allowedTypes = [
      'audio/m4a', 'audio/mp3', 'audio/wav', 'audio/flac', 
      'audio/ogg', 'audio/webm', 'audio/mpeg', 'audio/mpga'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Type de fichier non supporté: ${file.type}` },
        { status: 400 }
      );
    }

    // Validation de la taille (25MB max pour free tier)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `Fichier trop volumineux: ${(file.size / 1024 / 1024).toFixed(2)}MB (max: 25MB)` },
        { status: 400 }
      );
    }

    logger.debug(`[Whisper API v2] 📁 Fichier reçu: ${file.name} (${(file.size / 1024).toFixed(2)}KB)`);

    // Préparer le FormData pour Groq
    const groqFormData = new FormData();
    groqFormData.append('file', file);
    groqFormData.append('model', model);
    groqFormData.append('temperature', temperature.toString());
    groqFormData.append('response_format', responseFormat);

    if (prompt) {
      groqFormData.append('prompt', prompt);
    }

    // Ajouter les timestamps si verbose_json
    if (responseFormat === 'verbose_json') {
      groqFormData.append('timestamp_granularities[]', 'word');
      groqFormData.append('timestamp_granularities[]', 'segment');
    }

    // Appel à l'API Groq
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      logger.error('[Whisper API v2] ❌ GROQ_API_KEY non configurée');
      return NextResponse.json(
        { error: 'Configuration API manquante' },
        { status: 500 }
      );
    }

    logger.debug(`[Whisper API v2] 🚀 Appel à Groq avec modèle: ${model}`);

    const response = await fetch('https://api.groq.com/openai/v1/audio/translations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: groqFormData
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[Whisper API v2] ❌ Erreur Groq: ${response.status} - ${errorText}`);
      
      return NextResponse.json(
        { 
          error: 'Erreur lors de la traduction',
          details: errorText,
          status: response.status
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    
    logger.info('[Whisper API v2] ✅ Traduction réussie');
    
    // Retourner le résultat avec le format v2
    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        model: model,
        response_format: responseFormat,
        file_size: file.size,
        file_type: file.type,
        translation_to: 'english',
        api_version: 'v2'
      }
    });

  } catch (error) {
    logger.error('[Whisper API v2] ❌ Erreur inattendue:', error);
    
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Informations sur l'endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/v2/whisper/translate',
    method: 'POST',
    description: 'Traduction audio vers l\'anglais avec Whisper via Groq (API v2)',
    api_version: 'v2',
    supported_models: [
      'whisper-large-v3'
    ],
    supported_formats: [
      'json',
      'verbose_json', 
      'text'
    ],
    max_file_size: '25MB',
    supported_file_types: [
      'audio/m4a', 'audio/mp3', 'audio/wav', 'audio/flac',
      'audio/ogg', 'audio/webm', 'audio/mpeg', 'audio/mpga'
    ],
    translation_to: 'english',
    llm_compatible: false, // Endpoint humain uniquement
    notes: 'Cet endpoint est destiné à l\'usage humain via l\'interface web, pas pour les LLM'
  });
} 