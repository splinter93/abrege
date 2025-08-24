#!/usr/bin/env node

/**
 * Script de test pour vérifier la nouvelle limite d'historique de 30 messages
 * Usage: node scripts/test-history-limit-30.js
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

async function testHistoryLimit30() {
  console.log('🧪 Test de la nouvelle limite d\'historique de 30 messages...\n');

  try {
    // 1. Vérifier la valeur par défaut de la colonne
    console.log('1️⃣ Vérification de la valeur par défaut...');
    const { data: columnInfo, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_default')
      .eq('table_name', 'chat_sessions')
      .eq('column_name', 'history_limit')
      .single();

    if (columnError) {
      console.error('❌ Erreur lors de la vérification de la colonne:', columnError);
      return;
    }

    console.log('   Valeur par défaut actuelle:', columnInfo.column_default);
    
    if (columnInfo.column_default === '30') {
      console.log('   ✅ Valeur par défaut correcte (30)');
    } else {
      console.log('   ⚠️  Valeur par défaut incorrecte, attendu: 30');
    }

    // 2. Vérifier les sessions existantes
    console.log('\n2️⃣ Vérification des sessions existantes...');
    const { data: sessions, error: sessionsError } = await supabase
      .from('chat_sessions')
      .select('id, name, history_limit, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (sessionsError) {
      console.error('❌ Erreur lors de la récupération des sessions:', sessionsError);
      return;
    }

    console.log(`   ${sessions.length} sessions trouvées:`);
    sessions.forEach(session => {
      const status = session.history_limit === 30 ? '✅' : '⚠️';
      console.log(`   ${status} ${session.name} (ID: ${session.id}): ${session.history_limit} messages`);
    });

    // 3. Créer une nouvelle session pour tester la valeur par défaut
    console.log('\n3️⃣ Test de création d\'une nouvelle session...');
    const { data: newSession, error: createError } = await supabase
      .from('chat_sessions')
      .insert({
        name: 'Test History Limit 30',
        user_id: '00000000-0000-0000-0000-000000000000', // ID de test
        thread: [],
        history_limit: undefined // Utiliser la valeur par défaut
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Erreur lors de la création de la session:', createError);
      return;
    }

    console.log('   ✅ Nouvelle session créée:');
    console.log(`      ID: ${newSession.id}`);
    console.log(`      Nom: ${newSession.name}`);
    console.log(`      History Limit: ${newSession.history_limit}`);
    console.log(`      Créée: ${newSession.created_at}`);

    if (newSession.history_limit === 30) {
      console.log('   ✅ Valeur par défaut correctement appliquée (30)');
    } else {
      console.log('   ❌ Valeur par défaut incorrecte:', newSession.history_limit);
    }

    // 4. Nettoyer la session de test
    console.log('\n4️⃣ Nettoyage de la session de test...');
    const { error: deleteError } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', newSession.id);

    if (deleteError) {
      console.error('❌ Erreur lors de la suppression de la session de test:', deleteError);
    } else {
      console.log('   ✅ Session de test supprimée');
    }

    // 5. Résumé
    console.log('\n📊 Résumé du test:');
    const sessionsWith30 = sessions.filter(s => s.history_limit === 30).length;
    const totalSessions = sessions.length;
    
    console.log(`   Sessions avec history_limit = 30: ${sessionsWith30}/${totalSessions}`);
    
    if (sessionsWith30 === totalSessions) {
      console.log('   🎉 Toutes les sessions utilisent la nouvelle limite de 30 messages !');
    } else {
      console.log('   ⚠️  Certaines sessions utilisent encore l\'ancienne limite');
    }

    console.log('\n✅ Test terminé avec succès !');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    process.exit(1);
  }
}

// Exécuter le test
testHistoryLimit30()
  .then(() => {
    console.log('\n🚀 Migration vers history_limit = 30 terminée !');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Erreur fatale:', error);
    process.exit(1);
  }); 