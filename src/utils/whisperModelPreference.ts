export const WHISPER_MODEL_PREF_KEY = 'chat-whisper-model-preference';

export const WHISPER_TRANSCRIBE_MODELS = [
  {
    value: 'whisper-large-v3-turbo',
    label: 'Whisper Large v3 Turbo',
    description: 'Plus rapide (défaut)',
  },
  {
    value: 'whisper-large-v3',
    label: 'Whisper Large v3',
    description: 'Qualité maximale',
  },
] as const;

export type WhisperTranscribeModelId =
  (typeof WHISPER_TRANSCRIBE_MODELS)[number]['value'];

export const WHISPER_TRANSCRIBE_DEFAULT: WhisperTranscribeModelId =
  'whisper-large-v3-turbo';

export function isWhisperTranscribeModelId(
  v: string
): v is WhisperTranscribeModelId {
  return WHISPER_TRANSCRIBE_MODELS.some((m) => m.value === v);
}

/**
 * Préférence modèle Whisper (transcription micro). Client uniquement.
 */
export function getWhisperTranscribeModel(): WhisperTranscribeModelId {
  if (typeof window === 'undefined') return WHISPER_TRANSCRIBE_DEFAULT;
  const saved = localStorage.getItem(WHISPER_MODEL_PREF_KEY);
  if (saved && isWhisperTranscribeModelId(saved)) return saved;
  return WHISPER_TRANSCRIBE_DEFAULT;
}

export function setWhisperTranscribeModel(value: string): void {
  if (!isWhisperTranscribeModelId(value)) return;
  localStorage.setItem(WHISPER_MODEL_PREF_KEY, value);
}
