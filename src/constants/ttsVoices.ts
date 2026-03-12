/**
 * Voix xAI TTS (Text-to-Speech)
 * @see https://docs.x.ai/model-capabilities/audio/voice
 */

export const XAI_TTS_VOICES = ['eve', 'ara', 'rex', 'sal', 'leo'] as const;
export type XAITTSVoiceId = (typeof XAI_TTS_VOICES)[number];

export const TTS_VOICE_OPTIONS: Array<{ value: XAITTSVoiceId; label: string }> = [
  { value: 'eve', label: 'Eve — Énergique, enthousiaste' },
  { value: 'ara', label: 'Ara — Chaleureuse, conversationnelle' },
  { value: 'rex', label: 'Rex — Claire, professionnelle' },
  { value: 'sal', label: 'Sal — Équilibrée, polyvalente' },
  { value: 'leo', label: 'Leo — Autoritaire, décidée' }
];

export function isValidTTSVoice(v: string): v is XAITTSVoiceId {
  return XAI_TTS_VOICES.includes(v.toLowerCase() as XAITTSVoiceId);
}

export function normalizeTTSVoice(v: string | undefined): XAITTSVoiceId {
  if (!v || !isValidTTSVoice(v)) return 'eve';
  return v.toLowerCase() as XAITTSVoiceId;
}

export const TTS_LANGUAGE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es-ES', label: 'Español (España)' },
  { value: 'es-MX', label: 'Español (México)' },
  { value: 'it', label: 'Italiano' },
  { value: 'pt-PT', label: 'Português (Portugal)' },
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'ru', label: 'Русский' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'ar-EG', label: 'العربية (مصر)' },
  { value: 'ar-SA', label: 'العربية (السعودية)' },
  { value: 'ar-AE', label: 'العربية (الإمارات)' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'bn', label: 'বাংলা' },
  { value: 'id', label: 'Bahasa Indonesia' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'vi', label: 'Tiếng Việt' },
];
