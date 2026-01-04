/**
 * Utilitaire pour dumper le premier chunk audio en fichier WAV (debug)
 * Extrait de XAIVoiceProxyService.ts pour réduire la taille du fichier principal
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { logger, LogCategory } from '../../src/utils/logger';

/**
 * Dump le premier chunk audio reçu en fichier WAV dans /tmp
 * 
 * Utilisé pour debug : vérifier le format audio reçu du client
 * Ne dump que le premier chunk pour éviter spam de fichiers
 * 
 * @param connectionId - ID de la connexion (pour logging)
 * @param audioBase64 - Données audio en base64 (PCM16 mono 24000 Hz)
 */
export function dumpFirstAudioChunk(connectionId: string, audioBase64: string): void {
  try {
    // Décoder base64 -> Buffer
    const audioBuffer = Buffer.from(audioBase64, 'base64');

    // Créer header WAV (PCM16 mono 24000 Hz)
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const dataSize = audioBuffer.length;
    const fileSize = 36 + dataSize;

    const wavHeader = Buffer.alloc(44);
    // RIFF
    wavHeader.write('RIFF', 0);
    wavHeader.writeUInt32LE(fileSize, 4);
    wavHeader.write('WAVE', 8);
    // fmt chunk
    wavHeader.write('fmt ', 12);
    wavHeader.writeUInt32LE(16, 16); // fmt chunk size
    wavHeader.writeUInt16LE(1, 20); // audio format (PCM)
    wavHeader.writeUInt16LE(numChannels, 22);
    wavHeader.writeUInt32LE(sampleRate, 24);
    wavHeader.writeUInt32LE(sampleRate * numChannels * bitsPerSample / 8, 28); // byte rate
    wavHeader.writeUInt16LE(numChannels * bitsPerSample / 8, 32); // block align
    wavHeader.writeUInt16LE(bitsPerSample, 34);
    // data chunk
    wavHeader.write('data', 36);
    wavHeader.writeUInt32LE(dataSize, 40);

    // Concat header + data
    const wavBuffer = Buffer.concat([wavHeader, audioBuffer]);

    // Écrire fichier dans /tmp
    const timestamp = Date.now();
    const filename = `xai-debug-${timestamp}.wav`;
    const filepath = path.join(os.tmpdir(), filename);

    fs.writeFileSync(filepath, wavBuffer);
    logger.info(LogCategory.AUDIO, '[XAIVoiceProxyService] 💾 WAV dump créé', {
      connectionId,
      filepath,
      audioSize: audioBuffer.length,
      wavSize: wavBuffer.length
    });
  } catch (error) {
    logger.error(LogCategory.AUDIO, '[XAIVoiceProxyService] Erreur création WAV dump', undefined, error instanceof Error ? error : new Error(String(error)));
  }
}

