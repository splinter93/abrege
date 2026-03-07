import { NextRequest, NextResponse } from 'next/server';
import { logger, LogCategory } from '@/utils/logger';
import { SERVER_ENV } from '@/config/env.server';
import { isValidTTSVoice, type XAITTSVoiceId } from '@/constants/ttsVoices';

const XAI_TTS_URL = 'https://api.x.ai/v1/tts';
const MAX_TEXT_LENGTH = 4096;

/**
 * POST /api/ui/tts
 *
 * Proxy vers xAI Text-to-Speech API.
 * Body: { text: string, voice_id?: string }
 * Retourne les octets audio bruts (MP3).
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = SERVER_ENV.llm.xaiApiKey;
    if (!apiKey) {
      logger.warn(LogCategory.API, '[TTS] XAI_API_KEY non configurée');
      return NextResponse.json(
        { error: 'Configuration TTS manquante' },
        { status: 500 }
      );
    }

    let body: { text?: string; voice_id?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Body JSON invalide' },
        { status: 400 }
      );
    }

    const rawText = typeof body.text === 'string' ? body.text.trim() : '';
    if (!rawText) {
      return NextResponse.json(
        { error: 'Le champ "text" est requis et ne doit pas être vide' },
        { status: 400 }
      );
    }

    const text =
      rawText.length > MAX_TEXT_LENGTH - 20
        ? rawText.slice(0, MAX_TEXT_LENGTH - 20) + '...'
        : rawText;

    const voiceId: XAITTSVoiceId =
      typeof body.voice_id === 'string' && isValidTTSVoice(body.voice_id)
        ? (body.voice_id.toLowerCase() as XAITTSVoiceId)
        : 'eve';

    const payload = {
      text,
      voice_id: voiceId,
      output_format: {
        codec: 'mp3',
        sample_rate: 24000,
        bit_rate: 128000
      }
    };

    const response = await fetch(XAI_TTS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(LogCategory.API, `[TTS] Erreur xAI: ${response.status}`, { errorText });

      if (response.status === 401) {
        return NextResponse.json({ error: 'Clé API invalide' }, { status: 401 });
      }
      if (response.status === 429) {
        return NextResponse.json(
          { error: 'Limite de requêtes atteinte, réessayez plus tard' },
          { status: 429 }
        );
      }
      if (response.status >= 500) {
        return NextResponse.json(
          { error: 'Service TTS temporairement indisponible' },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { error: 'Erreur lors de la synthèse vocale', details: errorText },
        { status: response.status }
      );
    }

    const audioBytes = await response.arrayBuffer();
    return new NextResponse(audioBytes, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'private, max-age=3600'
      }
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(LogCategory.API, '[TTS] Erreur inattendue', undefined, err);
    return NextResponse.json(
      {
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
