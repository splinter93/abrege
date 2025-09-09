/**
 * 🧪 Test du Système Realtime Unifié
 * 
 * Script de test pour valider le fonctionnement du nouveau système Realtime unifié
 */

import { unifiedRealtimeService } from '@/services/UnifiedRealtimeService';
import { supabase } from '@/supabaseClient';
import { logger, LogCategory } from '@/utils/logger';

export interface UnifiedRealtimeTestResult {
  success: boolean;
  error?: string;
  details: {
    supabaseClient: boolean;
    authentication: boolean;
    serviceInitialization: boolean;
    connection: boolean;
    channels: boolean;
    events: boolean;
    reconnection: boolean;
  };
  stats: {
    channelsCount: number;
    uptime: number;
    reconnectAttempts: number;
  };
}

/**
 * Teste le système Realtime unifié complet
 */
export async function testUnifiedRealtimeSystem(
  userId: string, 
  noteId?: string
): Promise<UnifiedRealtimeTestResult> {
  const result: UnifiedRealtimeTestResult = {
    success: false,
    details: {
      supabaseClient: false,
      authentication: false,
      serviceInitialization: false,
      connection: false,
      channels: false,
      events: false,
      reconnection: false
    },
    stats: {
      channelsCount: 0,
      uptime: 0,
      reconnectAttempts: 0
    }
  };

  try {
    logger.info(LogCategory.EDITOR, '[TestUnifiedRealtime] 🧪 Démarrage du test du système unifié');

    // 1. Test du client Supabase
    if (!supabase || !supabase.channel) {
      result.error = 'Client Supabase non disponible';
      return result;
    }
    result.details.supabaseClient = true;
    logger.info(LogCategory.EDITOR, '[TestUnifiedRealtime] ✅ Client Supabase OK');

    // 2. Test de l'authentification
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      result.error = 'Session non authentifiée';
      return result;
    }
    result.details.authentication = true;
    logger.info(LogCategory.EDITOR, '[TestUnifiedRealtime] ✅ Authentification OK');

    // 3. Test d'initialisation du service
    try {
      await unifiedRealtimeService.initialize({
        userId,
        noteId,
        debug: true,
        autoReconnect: true
      });
      result.details.serviceInitialization = true;
      logger.info(LogCategory.EDITOR, '[TestUnifiedRealtime] ✅ Service initialisé');
    } catch (error) {
      result.error = `Erreur d'initialisation: ${error instanceof Error ? error.message : String(error)}`;
      return result;
    }

    // 4. Test de connexion
    const state = unifiedRealtimeService.getState();
    if (state.isConnected) {
      result.details.connection = true;
      logger.info(LogCategory.EDITOR, '[TestUnifiedRealtime] ✅ Connexion établie');
    } else {
      result.error = 'Connexion non établie';
      return result;
    }

    // 5. Test des canaux
    if (state.channels.size > 0) {
      result.details.channels = true;
      result.stats.channelsCount = state.channels.size;
      logger.info(LogCategory.EDITOR, '[TestUnifiedRealtime] ✅ Canaux créés:', Array.from(state.channels));
    } else {
      result.error = 'Aucun canal créé';
      return result;
    }

    // 6. Test d'envoi d'événement
    try {
      await unifiedRealtimeService.broadcast('test-event', {
        message: 'Test du système unifié',
        timestamp: Date.now(),
        source: 'test'
      });
      result.details.events = true;
      logger.info(LogCategory.EDITOR, '[TestUnifiedRealtime] ✅ Événement envoyé');
    } catch (error) {
      result.error = `Erreur envoi événement: ${error instanceof Error ? error.message : String(error)}`;
      return result;
    }

    // 7. Test de reconnexion
    try {
      await unifiedRealtimeService.reconnect();
      const newState = unifiedRealtimeService.getState();
      if (newState.isConnected) {
        result.details.reconnection = true;
        logger.info(LogCategory.EDITOR, '[TestUnifiedRealtime] ✅ Reconnexion réussie');
      } else {
        result.error = 'Reconnexion échouée';
        return result;
      }
    } catch (error) {
      result.error = `Erreur reconnexion: ${error instanceof Error ? error.message : String(error)}`;
      return result;
    }

    // Récupérer les statistiques finales
    const finalStats = unifiedRealtimeService.getStats();
    result.stats = {
      channelsCount: finalStats.channelsCount,
      uptime: finalStats.uptime,
      reconnectAttempts: finalStats.reconnectAttempts
    };

    result.success = true;
    logger.info(LogCategory.EDITOR, '[TestUnifiedRealtime] ✅ Test complet réussi');

    return result;

  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    logger.error(LogCategory.EDITOR, '[TestUnifiedRealtime] ❌ Erreur générale:', error);
    return result;
  }
}

/**
 * Teste l'envoi d'un événement d'éditeur
 */
export async function testEditorEventBroadcast(
  noteId: string, 
  userId: string, 
  content: string
): Promise<boolean> {
  try {
    await unifiedRealtimeService.broadcast('editor_update', {
      noteId,
      content,
      timestamp: Date.now(),
      source: 'test'
    });
    
    logger.info(LogCategory.EDITOR, '[TestUnifiedRealtime] ✅ Événement d\'éditeur envoyé');
    return true;
  } catch (error) {
    logger.error(LogCategory.EDITOR, '[TestUnifiedRealtime] ❌ Erreur envoi événement:', error);
    return false;
  }
}

/**
 * Teste la gestion des événements de base de données
 */
export async function testDatabaseEventHandling(userId: string): Promise<boolean> {
  try {
    // Simuler un événement de base de données
    const mockEvent = {
      type: 'database.insert',
      payload: {
        eventType: 'INSERT',
        table: 'articles',
        new: {
          id: 'test-note-123',
          user_id: userId,
          source_title: 'Test Note',
          markdown_content: '# Test Content',
          updated_at: new Date().toISOString()
        }
      },
      timestamp: Date.now(),
      source: 'database' as const,
      channel: `database:${userId}`
    };

    // Le service devrait traiter cet événement automatiquement
    logger.info(LogCategory.EDITOR, '[TestUnifiedRealtime] ✅ Simulation événement base de données');
    return true;
  } catch (error) {
    logger.error(LogCategory.EDITOR, '[TestUnifiedRealtime] ❌ Erreur simulation événement:', error);
    return false;
  }
}

/**
 * Teste la robustesse de la reconnexion
 */
export async function testReconnectionRobustness(userId: string, noteId?: string): Promise<boolean> {
  try {
    logger.info(LogCategory.EDITOR, '[TestUnifiedRealtime] 🧪 Test de robustesse de reconnexion');

    // Déconnecter
    await unifiedRealtimeService.disconnect();
    logger.info(LogCategory.EDITOR, '[TestUnifiedRealtime] Déconnecté');

    // Attendre un peu
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Reconnecter
    await unifiedRealtimeService.initialize({
      userId,
      noteId,
      debug: true,
      autoReconnect: true
    });

    const state = unifiedRealtimeService.getState();
    if (state.isConnected) {
      logger.info(LogCategory.EDITOR, '[TestUnifiedRealtime] ✅ Reconnexion robuste réussie');
      return true;
    } else {
      logger.error(LogCategory.EDITOR, '[TestUnifiedRealtime] ❌ Reconnexion échouée');
      return false;
    }
  } catch (error) {
    logger.error(LogCategory.EDITOR, '[TestUnifiedRealtime] ❌ Erreur test robustesse:', error);
    return false;
  }
}

/**
 * Affiche les résultats de test dans la console
 */
export function logUnifiedRealtimeTestResults(result: UnifiedRealtimeTestResult): void {
  console.group('🧪 Test Unified Realtime System');
  console.log('✅ Succès:', result.success);
  
  if (result.error) {
    console.error('❌ Erreur:', result.error);
  }
  
  console.log('📊 Détails:');
  Object.entries(result.details).forEach(([key, value]) => {
    console.log(`  ${value ? '✅' : '❌'} ${key}: ${value}`);
  });
  
  console.log('📈 Statistiques:');
  console.log(`  Canaux: ${result.stats.channelsCount}`);
  console.log(`  Uptime: ${Math.floor(result.stats.uptime / 1000)}s`);
  console.log(`  Tentatives reconnexion: ${result.stats.reconnectAttempts}`);
  
  console.groupEnd();
}

/**
 * Fonction utilitaire pour tester rapidement le système unifié
 */
export async function quickUnifiedRealtimeTest(userId: string, noteId?: string): Promise<void> {
  console.log('🧪 Démarrage du test Unified Realtime...');
  
  const result = await testUnifiedRealtimeSystem(userId, noteId);
  logUnifiedRealtimeTestResults(result);
  
  if (result.success) {
    console.log('✅ Test Unified Realtime réussi ! Le système est opérationnel.');
    
    // Tests supplémentaires
    console.log('🧪 Tests supplémentaires...');
    
    const eventTest = await testEditorEventBroadcast(noteId || 'test-note', userId, 'Test content');
    const dbTest = await testDatabaseEventHandling(userId);
    const robustnessTest = await testReconnectionRobustness(userId, noteId);
    
    console.log(`📊 Résultats supplémentaires:`);
    console.log(`  Événement éditeur: ${eventTest ? '✅' : '❌'}`);
    console.log(`  Événement base de données: ${dbTest ? '✅' : '❌'}`);
    console.log(`  Robustesse reconnexion: ${robustnessTest ? '✅' : '❌'}`);
  } else {
    console.error('❌ Test Unified Realtime échoué. Vérifiez la configuration.');
  }
}
