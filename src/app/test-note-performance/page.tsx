'use client';

import React, { useState, useEffect } from 'react';
import { useOptimizedNoteLoader } from '@/hooks/useOptimizedNoteLoader';
import NotePreloader from '@/components/NotePreloader';
import { optimizedNoteService } from '@/services/optimizedNoteService';
import { supabase } from '@/supabaseClient';

export default function TestNotePerformancePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [testNoteId, setTestNoteId] = useState<string>('');
  const [performanceMetrics, setPerformanceMetrics] = useState<any>({});
  const [cacheStats, setCacheStats] = useState<any>({});
  const [testResults, setTestResults] = useState<Array<{test: string; time: string; error?: string}>>([]);

  // Récupérer l'utilisateur connecté
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setUserId(session.user.id);
      }
    };
    getCurrentUser();
  }, []);

  // Récupérer une note de test
  useEffect(() => {
    const getTestNote = async () => {
      if (!userId) return;
      
      try {
        const { data: notes } = await supabase
          .from('articles')
          .select('id')
          .eq('user_id', userId)
          .limit(1);
        
        if (notes && notes.length > 0) {
          setTestNoteId(notes[0].id);
        }
      } catch (error) {
        console.error('Erreur récupération note de test:', error);
      }
    };
    
    getTestNote();
  }, [userId]);

  // Test de performance avec le service optimisé
  const runPerformanceTest = async () => {
    if (!testNoteId || !userId) return;

    const results: Array<{test: string; time: string; error?: string}> = [];
    
    // Test 1 : Chargement direct (sans cache)
    const start1 = performance.now();
    try {
      await optimizedNoteService.getNoteMetadata(testNoteId, userId);
      const time1 = performance.now() - start1;
      results.push({ test: 'Métadonnées (sans cache)', time: time1.toFixed(2) });
    } catch (error) {
      results.push({ test: 'Métadonnées (sans cache)', time: 'Erreur', error: error.message });
    }

    // Test 2 : Chargement avec cache
    const start2 = performance.now();
    try {
      await optimizedNoteService.getNoteMetadata(testNoteId, userId);
      const time2 = performance.now() - start2;
      results.push({ test: 'Métadonnées (avec cache)', time: time2.toFixed(2) });
    } catch (error) {
      results.push({ test: 'Métadonnées (avec cache)', time: 'Erreur', error: error.message });
    }

    // Test 3 : Chargement du contenu
    const start3 = performance.now();
    try {
      const content = await optimizedNoteService.getNoteContent(testNoteId, userId);
      const time3 = performance.now() - start3;
      results.push({ test: 'Contenu complet', time: time3.toFixed(2) });
      
      // 🔍 DEBUG : Vérifier le contenu récupéré
      console.log('[Test] Contenu récupéré:', {
        id: content.id,
        markdownLength: content.markdown_content?.length || 0,
        htmlLength: content.html_content?.length || 0,
        markdownPreview: content.markdown_content?.substring(0, 100) + '...'
      });
    } catch (error) {
      results.push({ test: 'Contenu complet', time: 'Erreur', error: error.message });
    }

    // Test 4 : Note complète
    const start4 = performance.now();
    try {
      const completeNote = await optimizedNoteService.getNoteComplete(testNoteId, userId);
      const time4 = performance.now() - start4;
      results.push({ test: 'Note complète', time: time4.toFixed(2) });
      
      // 🔍 DEBUG : Vérifier la note complète
      console.log('[Test] Note complète récupérée:', {
        id: completeNote.id,
        title: completeNote.source_title,
        markdownLength: completeNote.markdown_content?.length || 0,
        htmlLength: completeNote.html_content?.length || 0
      });
    } catch (error) {
      results.push({ test: 'Note complète', time: 'Erreur', error: error.message });
    }

    setTestResults(results);
    
    // Mettre à jour les statistiques du cache
    setCacheStats(optimizedNoteService.getCacheStats());
  };

  // Test de préchargement
  const testPreloading = async () => {
    if (!userId) return;
    
    const start = performance.now();
    
    try {
      // Précharger plusieurs notes
      const { data: notes } = await supabase
        .from('articles')
        .select('id')
        .eq('user_id', userId)
        .limit(5);
      
      if (notes && notes.length > 0) {
        const preloadPromises = notes.map(note => 
          optimizedNoteService.getNoteMetadata(note.id, userId)
        );
        
        await Promise.all(preloadPromises);
        const time = performance.now() - start;
        
        setPerformanceMetrics(prev => ({
          ...prev,
          preloadTime: time.toFixed(2),
          preloadedNotes: notes.length
        }));
      }
    } catch (error) {
      console.error('Erreur préchargement:', error);
    }
  };

  // Nettoyer le cache
  const clearCache = () => {
    optimizedNoteService.invalidateAllCache();
    setCacheStats(optimizedNoteService.getCacheStats());
    setTestResults([]);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🧪 Test des Optimisations de Performance des Notes</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <h2>📊 État du Système</h2>
        <p><strong>Utilisateur:</strong> {userId ? 'Connecté' : 'Non connecté'}</p>
        <p><strong>Note de test:</strong> {testNoteId || 'Aucune'}</p>
        
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button 
            onClick={runPerformanceTest}
            disabled={!testNoteId || !userId}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            🚀 Lancer Test Performance
          </button>
          
          <button 
            onClick={testPreloading}
            disabled={!userId}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            📚 Test Préchargement
          </button>
          
          <button 
            onClick={clearCache}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            🗑️ Vider Cache
          </button>
        </div>
      </div>

      {/* Composant de préchargement invisible */}
      <NotePreloader 
        userId={userId || undefined}
        enabled={!!userId}
        maxNotes={10}
      />

      {/* Résultats des tests */}
      {testResults.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2>📈 Résultats des Tests</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {testResults.map((result, index) => (
              <div 
                key={index}
                style={{ 
                  padding: '1rem', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  backgroundColor: result.error ? '#fff3cd' : '#f8f9fa'
                }}
              >
                <strong>{result.test}:</strong> {result.error ? '❌ ' + result.error : '✅ ' + result.time + 'ms'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistiques du cache */}
      {Object.keys(cacheStats).length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2>💾 Statistiques du Cache</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center' }}>
              <h3>Cache Métadonnées</h3>
              <p style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{cacheStats.metadataCacheSize || 0}</p>
            </div>
            <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center' }}>
              <h3>Cache Contenu</h3>
              <p style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{cacheStats.contentCacheSize || 0}</p>
            </div>
            <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center' }}>
              <h3>Total Cache</h3>
              <p style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{cacheStats.totalCacheSize || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Métriques de performance */}
      {Object.keys(performanceMetrics).length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2>⚡ Métriques de Performance</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {Object.entries(performanceMetrics).map(([key, value]) => (
              <div key={key} style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center' }}>
                <h3>{key}</h3>
                <p style={{ fontSize: '1.5rem', margin: '0.5rem 0' }}>{String(value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#e9ecef', borderRadius: '4px' }}>
        <h3>📖 Instructions de Test</h3>
        <ol>
          <li>Connectez-vous à votre compte</li>
          <li>Cliquez sur "Lancer Test Performance" pour mesurer les temps de chargement</li>
          <li>Cliquez sur "Test Préchargement" pour tester le préchargement de plusieurs notes</li>
          <li>Observez l'impact du cache sur les performances</li>
          <li>Utilisez "Vider Cache" pour tester les performances sans cache</li>
        </ol>
      </div>
    </div>
  );
} 