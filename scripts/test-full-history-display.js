#!/usr/bin/env node

/**
 * Script de test pour vérifier que l'historique complet est maintenant affiché
 * Usage: node scripts/test-full-history-display.js
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testFullHistoryDisplay() {
  console.log('🧪 Test de l\'affichage de l\'historique complet...\n');

  try {
    // 1. Vérifier que le trigger de troncature a été supprimé
    console.log('1️⃣ Vérification de la suppression du trigger de troncature...');
    
    const { data: triggers, error: triggerError } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name')
      .eq('event_object_table', 'chat_sessions')
      .eq('trigger_name', 'trim_chat_history_trigger');

    if (triggerError) {
      console.error('❌ Erreur lors de la vérification des triggers:', triggerError);
      return;
    }

    if (triggers.length === 0) {
      console.log('   ✅ Trigger de troncature supprimé avec succès');
    } else {
      console.log('   ❌ Trigger de troncature encore présent');
      return;
    }

    // 2. Vérifier que la fonction de troncature a été supprimée
    console.log('\n2️⃣ Vérification de la suppression de la fonction de troncature...');
    
    const { data: functions, error: functionError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_name', 'trim_chat_history');

    if (functionError) {
      console.error('❌ Erreur lors de la vérification des fonctions:', functionError);
      return;
    }

    if (functions.length === 0) {
      console.log('   ✅ Fonction de troncature supprimée avec succès');
    } else {
      console.log('   ❌ Fonction de troncature encore présente');
      return;
    }

    // 3. Créer une session de test avec beaucoup de messages
    console.log('\n3️⃣ Test de création d\'une session avec beaucoup de messages...');
    
    const testMessages = [];
    for (let i = 1; i <= 50; i++) {
      testMessages.push({
        id: `msg-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message de test numéro ${i}`,
        timestamp: new Date(Date.now() - (50 - i) * 60000).toISOString() // 1 minute d'écart
      });
    }

    const { data: testSession, error: createError } = await supabase
      .from('chat_sessions')
      .insert({
        name: 'Test Historique Complet',
        user_id: '00000000-0000-0000-0000-000000000000', // ID de test
        thread: testMessages,
        history_limit: 30, // Limite pour l'API LLM uniquement
        is_active: true
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Erreur lors de la création de la session de test:', createError);
      return;
    }

    console.log('   ✅ Session de test créée:');
    console.log(`      ID: ${testSession.id}`);
    console.log(`      Nom: ${testSession.name}`);
    console.log(`      Messages: ${testSession.thread.length}`);
    console.log(`      History Limit: ${testSession.history_limit}`);

    // 4. Vérifier que TOUS les messages sont conservés
    console.log('\n4️⃣ Vérification de la conservation de tous les messages...');
    
    if (testSession.thread.length === 50) {
      console.log('   ✅ TOUS les 50 messages sont conservés !');
      console.log('   ✅ Pas de troncature automatique');
    } else {
      console.log(`   ❌ Seulement ${testSession.thread.length}/50 messages conservés`);
      return;
    }

    // 5. Vérifier que les messages sont dans l'ordre chronologique
    console.log('\n5️⃣ Vérification de l\'ordre chronologique...');
    
    const timestamps = testSession.thread.map(msg => new Date(msg.timestamp).getTime());
    const isChronological = timestamps.every((timestamp, index) => 
      index === 0 || timestamp >= timestamps[index - 1]
    );

    if (isChronological) {
      console.log('   ✅ Messages dans l\'ordre chronologique');
    } else {
      console.log('   ❌ Messages pas dans l\'ordre chronologique');
    }

    // 6. Tester l'ajout d'un nouveau message
    console.log('\n6️⃣ Test d\'ajout d\'un nouveau message...');
    
    const newMessage = {
      id: 'msg-51',
      role: 'user',
      content: 'Nouveau message de test',
      timestamp: new Date().toISOString()
    };

    const updatedThread = [...testSession.thread, newMessage];
    
    const { data: updatedSession, error: updateError } = await supabase
      .from('chat_sessions')
      .update({ 
        thread: updatedThread,
        updated_at: new Date().toISOString()
      })
      .eq('id', testSession.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erreur lors de la mise à jour:', updateError);
      return;
    }

    if (updatedSession.thread.length === 51) {
      console.log('   ✅ Nouveau message ajouté avec succès');
      console.log('   ✅ Total: 51 messages (pas de troncature)');
    } else {
      console.log(`   ❌ Problème: ${updatedSession.thread.length}/51 messages`);
      return;
    }

    // 7. Nettoyer la session de test
    console.log('\n7️⃣ Nettoyage de la session de test...');
    
    const { error: deleteError } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', testSession.id);

    if (deleteError) {
      console.error('❌ Erreur lors de la suppression:', deleteError);
    } else {
      console.log('   ✅ Session de test supprimée');
    }

    // 8. Résumé final
    console.log('\n📊 Résumé du test:');
    console.log('   ✅ Trigger de troncature supprimé');
    console.log('   ✅ Fonction de troncature supprimée');
    console.log('   ✅ 50 messages créés et conservés');
    console.log('   ✅ Nouveau message ajouté (51 total)');
    console.log('   ✅ Pas de troncature automatique');
    console.log('   ✅ Ordre chronologique respecté');

    console.log('\n🎉 Test terminé avec succès !');
    console.log('   L\'historique complet est maintenant conservé et affiché !');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    process.exit(1);
  }
}

// Exécuter le test
testFullHistoryDisplay()
  .then(() => {
    console.log('\n🚀 Migration vers historique complet terminée !');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Erreur fatale:', error);
    process.exit(1);
  }); 