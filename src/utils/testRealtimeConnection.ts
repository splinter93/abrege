/**
 * 🧪 Test de Connexion Realtime
 * 
 * Utilitaires pour tester la connexion Realtime et diagnostiquer les problèmes
 */

import { supabase } from '@/supabaseClient';
import { realtimeEditorService } from '@/services/RealtimeEditorService';
import { logger } from '@/utils/logger';

export interface RealtimeTestResult {
  success: boolean;
  error?: string;
  details: {
    supabaseClient: boolean;
    authentication: boolean;
    realtimeEnabled: boolean;
    connection: boolean;
    events: boolean;
  };
}

/**
 * Teste la connexion Realtime complète
 */
export async function testRealtimeConnection(noteId: string, userId: string): Promise<RealtimeTestResult> {
  const result: RealtimeTestResult = {
    success: false,
    details: {
      supabaseClient: false,
      authentication: false,
      realtimeEnabled: false,
      connection: false,
      events: false
    }
  };

  try {
    // 1. Test du client Supabase
    if (!supabase || !supabase.channel) {
      result.error = 'Client Supabase non disponible';
      return result;
    }
    result.details.supabaseClient = true;

    // 2. Test de l'authentification
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      result.error = 'Session non authentifiée';
      return result;
    }
    result.details.authentication = true;

    // 3. Test de Realtime (création d'un canal de test)
    const testChannel = supabase.channel('test-realtime-connection');
    const subscribeResult = await testChannel.subscribe();
    
    if (subscribeResult.state === 'joined') {
      result.details.realtimeEnabled = true;
      await testChannel.unsubscribe();
    } else {
      result.error = 'Realtime non disponible';
      return result;
    }

    // 4. Test du service RealtimeEditor
    try {
      await realtimeEditorService.initialize({
        noteId,
        userId,
        debug: true
      });
      result.details.connection = true;
    } catch (error) {
      result.error = `Erreur de connexion RealtimeEditor: ${error instanceof Error ? error.message : String(error)}`;
      return result;
    }

    // 5. Test des événements (simulation)
    try {
      await realtimeEditorService.broadcast('test-event', { message: 'Test de connexion' });
      result.details.events = true;
    } catch (error) {
      result.error = `Erreur d'envoi d'événement: ${error instanceof Error ? error.message : String(error)}`;
      return result;
    }

    result.success = true;
    return result;

  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    return result;
  }
}

/**
 * Teste l'envoi d'un événement d'éditeur
 */
export async function testEditorEvent(noteId: string, userId: string, content: string): Promise<boolean> {
  try {
    await realtimeEditorService.broadcast('editor_update', {
      noteId,
      content,
      timestamp: Date.now(),
      source: 'test'
    });
    
    logger.info('[TestRealtime] ✅ Événement d\'éditeur envoyé avec succès');
    return true;
  } catch (error) {
    logger.error('[TestRealtime] ❌ Erreur envoi événement:', error);
    return false;
  }
}

/**
 * Simule une mise à jour de contenu depuis un LLM
 */
export async function simulateLLMUpdate(noteId: string, userId: string, newContent: string): Promise<boolean> {
  try {
    // Simuler un événement d'insertion de contenu
    await realtimeEditorService.broadcast('editor_insert', {
      noteId,
      selector: 'body',
      content: newContent,
      position: 0,
      timestamp: Date.now(),
      source: 'llm'
    });
    
    logger.info('[TestRealtime] ✅ Simulation LLM envoyée avec succès');
    return true;
  } catch (error) {
    logger.error('[TestRealtime] ❌ Erreur simulation LLM:', error);
    return false;
  }
}

/**
 * Affiche les résultats de test dans la console
 */
export function logTestResults(result: RealtimeTestResult): void {
  console.group('🧪 Test Realtime Connection');
  console.log('✅ Succès:', result.success);
  
  if (result.error) {
    console.error('❌ Erreur:', result.error);
  }
  
  console.log('📊 Détails:');
  Object.entries(result.details).forEach(([key, value]) => {
    console.log(`  ${value ? '✅' : '❌'} ${key}: ${value}`);
  });
  
  console.groupEnd();
}

/**
 * Fonction utilitaire pour tester rapidement la connexion
 */
export async function quickRealtimeTest(noteId: string, userId: string): Promise<void> {
  console.log('🧪 Démarrage du test Realtime...');
  
  const result = await testRealtimeConnection(noteId, userId);
  logTestResults(result);
  
  if (result.success) {
    console.log('✅ Test Realtime réussi ! Le système est opérationnel.');
  } else {
    console.error('❌ Test Realtime échoué. Vérifiez la configuration.');
  }
}
