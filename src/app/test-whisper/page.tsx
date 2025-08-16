'use client';

import { useState, useRef } from 'react';
import { logger } from '@/utils/logger';

interface TranscriptionResult {
  success: boolean;
  data: any;
  metadata: any;
}

export default function TestWhisperPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'transcribe' | 'translate'>('transcribe');
  const [model, setModel] = useState('whisper-large-v3-turbo');
  const [language, setLanguage] = useState('');
  const [prompt, setPrompt] = useState('');
  const [responseFormat, setResponseFormat] = useState('verbose_json');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      logger.debug(`[Test Whisper] 📁 Fichier sélectionné: ${file.name} (${(file.size / 1024).toFixed(2)}KB)`);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('model', model);
      formData.append('response_format', responseFormat);
      formData.append('temperature', '0');

      if (language) {
        formData.append('language', language);
      }

      if (prompt) {
        formData.append('prompt', prompt);
      }

      const endpoint = mode === 'transcribe' 
        ? '/api/v1/whisper/transcribe'
        : '/api/v1/whisper/translate';

      logger.debug(`[Test Whisper] 🚀 Appel à ${endpoint}`);

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Erreur ${response.status}`);
      }

      setResult(data);
      logger.info('[Test Whisper] ✅ Transcription/Traduction réussie');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      logger.error('[Test Whisper] ❌ Erreur:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🎤 Test Whisper - Transcription Audio
          </h1>

          {/* Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mode
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'transcribe' | 'translate')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="transcribe">🎤 Transcription</option>
                <option value="translate">🌍 Traduction (vers anglais)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modèle
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="whisper-large-v3-turbo">whisper-large-v3-turbo (rapide)</option>
                <option value="whisper-large-v3">whisper-large-v3 (précis)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Langue (optionnel)
              </label>
              <input
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="fr, en, es, de..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Format de réponse
              </label>
              <select
                value={responseFormat}
                onChange={(e) => setResponseFormat(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="verbose_json">verbose_json (avec timestamps)</option>
                <option value="json">json (simple)</option>
                <option value="text">text (texte uniquement)</option>
              </select>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prompt (optionnel)
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Contexte ou mots spécifiques à reconnaître..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isLoading}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '⏳ Traitement...' : '📁 Sélectionner un fichier audio'}
            </button>
            <p className="text-sm text-gray-500 mt-2">
              Formats supportés: m4a, mp3, wav, flac, ogg, webm (max 25MB)
            </p>
          </div>

          {/* Résultats */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <h3 className="text-red-800 font-medium">❌ Erreur</h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <h3 className="text-green-800 font-medium">✅ Succès</h3>
                <p className="text-green-700 mt-1">
                  {mode === 'transcribe' ? 'Transcription' : 'Traduction'} réussie !
                </p>
              </div>

              {/* Métadonnées */}
              <div className="bg-gray-50 rounded-md p-4">
                <h3 className="font-medium text-gray-900 mb-2">📊 Métadonnées</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Modèle:</span>
                    <p className="font-medium">{result.metadata.model}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Format:</span>
                    <p className="font-medium">{result.metadata.response_format}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Taille:</span>
                    <p className="font-medium">{(result.metadata.file_size / 1024).toFixed(2)}KB</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <p className="font-medium">{result.metadata.file_type}</p>
                  </div>
                </div>
              </div>

              {/* Résultat */}
              <div className="bg-white border border-gray-200 rounded-md p-4">
                <h3 className="font-medium text-gray-900 mb-2">
                  {responseFormat === 'text' ? '📝 Texte' : '📄 Résultat JSON'}
                </h3>
                <div className="bg-gray-50 rounded-md p-4 max-h-96 overflow-y-auto">
                  {responseFormat === 'text' ? (
                    <p className="whitespace-pre-wrap">{result.data.text}</p>
                  ) : (
                    <pre className="text-sm overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  )}
                </div>
              </div>

              {/* Bouton reset */}
              <div className="text-center">
                <button
                  onClick={handleReset}
                  className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700"
                >
                  🔄 Nouveau test
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 