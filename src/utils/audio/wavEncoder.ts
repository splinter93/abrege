/**
 * Utilitaire pour encoder des données PCM en fichiers WAV
 * Utilisé par XAIVoiceChat pour convertir les chunks audio PCM16 en format WAV jouable
 */

/**
 * Créer un fichier WAV depuis des données PCM
 * 
 * @param pcmData - Données PCM (Uint8Array)
 * @param sampleRate - Taux d'échantillonnage (ex: 24000)
 * @param channels - Nombre de canaux (1 = mono, 2 = stereo)
 * @param bitsPerSample - Bits par échantillon (16, 24, 32)
 * @returns Blob WAV jouable
 */
export function createWavFile(
  pcmData: Uint8Array,
  sampleRate: number,
  channels: number,
  bitsPerSample: number
): Blob {
  const length = pcmData.length;
  const buffer = new ArrayBuffer(44 + length);
  const view = new DataView(buffer);

  // WAV header helper
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length, true); // File size - 8
  writeString(8, 'WAVE');
  
  // fmt chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // audio format (PCM)
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * bitsPerSample / 8, true); // byte rate
  view.setUint16(32, channels * bitsPerSample / 8, true); // block align
  view.setUint16(34, bitsPerSample, true);
  
  // data chunk
  writeString(36, 'data');
  view.setUint32(40, length, true); // data size

  // PCM data
  const dataView = new Uint8Array(buffer, 44);
  dataView.set(pcmData);

  return new Blob([buffer], { type: 'audio/wav' });
}

