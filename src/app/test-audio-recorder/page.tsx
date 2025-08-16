'use client';

import { useState } from 'react';
import AudioRecorder from '@/components/chat/AudioRecorder';

export default function TestAudioRecorderPage() {
  const [transcribedText, setTranscribedText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [transcriptionHistory, setTranscriptionHistory] = useState<Array<{
    id: string;
    text: string;
    timestamp: string;
  }>>([]);

  const handleTranscriptionComplete = (text: string) => {
    setTranscribedText(text);
    setError(null);
    
    // Ajouter à l'historique
    const newTranscription = {
      id: Date.now().toString(),
      text,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setTranscriptionHistory(prev => [newTranscription, ...prev.slice(0, 9)]); // Garder les 10 derniers
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setTranscribedText('');
  };

  const clearHistory = () => {
    setTranscriptionHistory([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🎤 Test AudioRecorder - Enregistrement Vocal
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Section d'enregistrement */}
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Enregistrement Audio
                </h2>
                
                <div className="flex items-center justify-center mb-4">
                  <AudioRecorder
                    onTranscriptionComplete={handleTranscriptionComplete}
                    onError={handleError}
                    className="audio-recorder-standalone"
                  />
                </div>

                <div className="text-center text-sm text-gray-600">
                  <p>Cliquez sur le bouton pour commencer l'enregistrement</p>
                  <p className="mt-1">Cliquez à nouveau pour arrêter</p>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">📋 Instructions</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Cliquez sur le bouton microphone pour commencer</li>
                  <li>• Parlez clairement dans votre microphone</li>
                  <li>• Cliquez sur le bouton carré pour arrêter</li>
                  <li>• Le texte sera automatiquement transcrit</li>
                  <li>• Le texte s'insère dans la zone de saisie</li>
                </ul>
              </div>
            </div>

            {/* Section des résultats */}
            <div className="space-y-6">
              {/* Texte transcrit actuel */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Texte Transcrit
                </h2>
                
                {transcribedText ? (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-900 whitespace-pre-wrap">{transcribedText}</p>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-gray-500 text-center">
                    Aucun texte transcrit pour le moment
                  </div>
                )}
              </div>

              {/* Historique des transcriptions */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Historique
                  </h2>
                  {transcriptionHistory.length > 0 && (
                    <button
                      onClick={clearHistory}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Effacer
                    </button>
                  )}
                </div>
                
                {transcriptionHistory.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {transcriptionHistory.map((item) => (
                      <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <p className="text-gray-900 text-sm flex-1">{item.text}</p>
                          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                            {item.timestamp}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-gray-500 text-center">
                    Aucun historique
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Affichage des erreurs */}
          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Erreur</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Informations techniques */}
          <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              🔧 Informations Techniques
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Fonctionnalités</h3>
                <ul className="text-gray-700 space-y-1">
                  <li>• Enregistrement audio en temps réel</li>
                  <li>• Transcription via Whisper/Groq</li>
                  <li>• Gestion des erreurs</li>
                  <li>• Historique des transcriptions</li>
                  <li>• Interface responsive</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Spécifications</h3>
                <ul className="text-gray-700 space-y-1">
                  <li>• Format: WebM/Opus</li>
                  <li>• Modèle: whisper-large-v3-turbo</li>
                  <li>• Qualité: Écho annulé, bruit supprimé</li>
                  <li>• API: /api/v1/whisper/transcribe</li>
                  <li>• Support: Chrome, Firefox, Safari</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 