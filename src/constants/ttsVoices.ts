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
