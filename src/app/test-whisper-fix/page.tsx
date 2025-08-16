'use client';

import { useState } from 'react';
import { Mic, Square, Loader } from 'lucide-react';
import { logger } from '@/utils/logger';

export default function TestWhisperFix() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);

  const startRecording = async () => {
    try {
      logger.debug('[TestWhisper] 🎤 Démarrage de l\'enregistrement');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        setIsRecording(false);
        setIsProcessing(true);
        setDuration(0);
        
        // Arrêter le stream
        stream.getTracks().forEach(track => track.stop());
        
        // Traiter l'audio
        processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
      setTranscription('');

      // Timer simple
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setDuration(elapsed);
      }, 1000);

      // Stocker l'interval pour l'arrêter
      (mediaRecorder as any).interval = interval;

      logger.debug('[TestWhisper] ✅ Enregistrement démarré');

    } catch (error) {
      logger.error('[TestWhisper] ❌ Erreur lors du démarrage:', error);
      setError('Impossible d\'accéder au microphone. Vérifiez les permissions.');
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;

    logger.debug('[TestWhisper] 🛑 Arrêt de l\'enregistrement');
    setIsRecording(false);
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      logger.debug('[TestWhisper] 🎵 Traitement audio avec Whisper');
      logger.debug('[TestWhisper] 📁 Taille du fichier audio:', { size: audioBlob.size });
      
      // Validation du blob audio
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('Blob audio invalide ou vide');
      }
      
      if (!audioBlob.type.startsWith('audio/')) {
        logger.warn('[TestWhisper] ⚠️ Type de blob non-audio:', { type: audioBlob.type });
      }

      // Créer le FormData
      const formData = new FormData();
      
      // S'assurer que le blob a le bon type MIME
      const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
      formData.append('file', audioFile);
      formData.append('model', 'whisper-large-v3-turbo');
      formData.append('response_format', 'text');
      formData.append('temperature', '0');

      logger.debug('[TestWhisper] 🚀 Envoi vers /api/v1/whisper/transcribe');
      logger.debug('[TestWhisper] 📋 FormData créé:', { 
        fileSize: audioBlob.size, 
        fileType: audioBlob.type,
        formDataEntries: Array.from(formData.entries()).map(([key, value]) => ({ key, valueType: typeof value }))
      });

      // Appeler l'API Whisper
      const response = await fetch('/api/v2/whisper/transcribe', {
        method: 'POST',
        body: formData
      });

      logger.debug('[TestWhisper] 📡 Réponse reçue:', { status: response.status, statusText: response.statusText });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[TestWhisper] ❌ Erreur HTTP:', { status: response.status, error: errorText });
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      logger.debug('[TestWhisper] 📄 Résultat reçu:', result);
      
      if (result.success && result.data && result.data.text) {
        logger.debug('[TestWhisper] ✅ Transcription réussie:', result.data.text);
        setTranscription(result.data.text.trim());
        setError(null);
      } else {
        logger.error('[TestWhisper] ❌ Pas de texte dans la réponse:', result);
        throw new Error('Aucun texte transcrit dans la réponse');
      }

    } catch (error) {
      logger.error('[TestWhisper] ❌ Erreur lors de la transcription:', error);
      setError(error instanceof Error ? error.message : 'Erreur lors de la transcription');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMicClick = () => {
    if (isProcessing) return;

    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const getMicButtonState = () => {
    if (isProcessing) {
      return {
        icon: <Loader size={16} className="animate-spin" />,
        className: 'text-blue-500',
        title: 'Traitement en cours...'
      };
    }
    
    if (isRecording) {
      return {
        icon: <Square size={16} />,
        className: 'text-red-500',
        title: 'Cliquer pour arrêter'
      };
    }
    
    return {
      icon: <Mic size={16} />,
      className: 'text-gray-600',
      title: 'Cliquer pour enregistrer'
    };
  };

  const micButtonState = getMicButtonState();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Test Whisper - Correction</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Test de l'enregistrement audio</h2>
          
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={handleMicClick}
              disabled={isProcessing}
              className={`p-4 rounded-full border-2 border-gray-300 hover:border-gray-400 transition-colors ${micButtonState.className}`}
              title={micButtonState.title}
            >
              {micButtonState.icon}
            </button>
            
            <div className="flex-1">
              <div className="text-sm text-gray-600 mb-2">
                {isRecording ? 'Enregistrement en cours...' : 
                 isProcessing ? 'Traitement...' : 'Prêt à enregistrer'}
              </div>
              
              {isRecording && (
                <div className="text-lg font-mono text-gray-800">
                  {duration}s
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-red-500">🎤</span>
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          {transcription && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-green-800 mb-2">Transcription réussie :</h3>
              <p className="text-green-700">{transcription}</p>
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Instructions :</h3>
          <ol className="text-blue-700 text-sm space-y-1">
            <li>1. Cliquez sur le bouton microphone pour commencer l'enregistrement</li>
            <li>2. Parlez clairement pendant quelques secondes</li>
            <li>3. Cliquez sur le bouton carré pour arrêter l'enregistrement</li>
            <li>4. Attendez le traitement par Whisper</li>
            <li>5. Vérifiez que la transcription s'affiche</li>
          </ol>
        </div>

        <div className="mt-6 text-sm text-gray-600">
          <p><strong>Endpoint testé :</strong> /api/v2/whisper/transcribe</p>
          <p><strong>Modèle :</strong> whisper-large-v3-turbo</p>
          <p><strong>Format :</strong> text</p>
        </div>
      </div>
    </div>
  );
} 