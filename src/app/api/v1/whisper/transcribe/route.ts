import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

/**
 * Route API pour la transcription audio avec Whisper via Groq
 * 
 * POST /api/v1/whisper/transcribe
 * 
 * Body (FormData):
 * - file: Fichier audio (m4a, mp3, wav, etc.)
 * - model: Modèle Whisper (whisper-large-v3-turbo par défaut)
 * - language: Langue du fichier audio (optionnel)
 * - prompt: Prompt pour guider la transcription (optionnel)
 * - response_format: Format de réponse (json, verbose_json, text)
 * - temperature: Température (0 par défaut)
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('[Whisper API] 🎤 Début de la transcription audio');
    
    // Log des headers pour diagnostiquer
    const contentType = request.headers.get('content-type');
    logger.debug('[Whisper API] 📋 Content-Type reçu:', { contentType });

    // Vérifier la méthode
    if (request.method !== 'POST') {
      return NextResponse.json(
        { error: 'Méthode non autorisée' },
        { status: 405 }
      );
    }

    // Vérifier le Content-Type
    if (!contentType || !contentType.includes('multipart/form-data')) {
      logger.error('[Whisper API] ❌ Content-Type invalide:', { contentType });
      return NextResponse.json(
        { error: 'Content-Type doit être multipart/form-data' },
        { status: 400 }
      );
    }

    // Récupérer les données du formulaire
    const formData = await request.formData();
    
    // Log des entrées du FormData pour diagnostiquer
    const formDataEntries = Array.from(formData.entries());
    logger.debug('[Whisper API] 📋 FormData reçu:', { 
      entries: formDataEntries.map(([key, value]) => ({ 
        key, 
        valueType: typeof value,
        isFile: value instanceof File,
        fileSize: value instanceof File ? value.size : null,
        fileType: value instanceof File ? value.type : null
      }))
    });
    
    const file = formData.get('file') as File;
    const model = formData.get('model') as string || 'whisper-large-v3-turbo';
    const language = formData.get('language') as string;
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

    logger.debug(`[Whisper API] 📁 Fichier reçu: ${file.name} (${(file.size / 1024).toFixed(2)}KB)`);

    // Préparer le FormData pour Groq
    const groqFormData = new FormData();
    groqFormData.append('file', file);
    groqFormData.append('model', model);
    groqFormData.append('temperature', temperature.toString());
    groqFormData.append('response_format', responseFormat);

    if (language) {
      groqFormData.append('language', language);
    }

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
      logger.error('[Whisper API] ❌ GROQ_API_KEY non configurée');
      return NextResponse.json(
        { error: 'Configuration API manquante' },
        { status: 500 }
      );
    }

    logger.debug(`[Whisper API] 🚀 Appel à Groq avec modèle: ${model}`);

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: groqFormData
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[Whisper API] ❌ Erreur Groq: ${response.status} - ${errorText}`);
      
      return NextResponse.json(
        { 
          error: 'Erreur lors de la transcription',
          details: errorText,
          status: response.status
        },
        { status: response.status }
      );
    }

    let result;
    
    // Gérer les différents formats de réponse
    if (responseFormat === 'text') {
      // Pour le format 'text', l'API retourne directement du texte
      const text = await response.text();
      result = { text: text.trim() };
      logger.debug('[Whisper API] 📄 Texte reçu:', { text: text.trim() });
    } else {
      // Pour les formats JSON, parser la réponse
      result = await response.json();
      logger.debug('[Whisper API] 📄 JSON reçu:', result);
    }
    
    logger.info('[Whisper API] ✅ Transcription réussie');
    
    // Retourner le résultat
    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        model: model,
        language: language,
        response_format: responseFormat,
        file_size: file.size,
        file_type: file.type
      }
    });

  } catch (error) {
    logger.error('[Whisper API] ❌ Erreur inattendue:', error);
    logger.error('[Whisper API] ❌ Stack trace:', { stack: error instanceof Error ? error.stack : 'Pas de stack trace' });
    
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
        stack: error instanceof Error ? error.stack : null
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
    endpoint: '/api/v1/whisper/transcribe',
    method: 'POST',
    description: 'Transcription audio avec Whisper via Groq',
    supported_models: [
      'whisper-large-v3-turbo',
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
    ]
  });
} 