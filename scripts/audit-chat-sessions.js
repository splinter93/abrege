const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function auditChatSessions() {
  console.log('🔍 AUDIT DU SYSTÈME DE CONVERSATIONS');
  console.log('=====================================\n');

  try {
    // 1. Statistiques générales
    console.log('📊 STATISTIQUES GÉNÉRALES:');
    const { data: stats, error: statsError } = await supabase
      .from('chat_sessions')
      .select('is_active, created_at')
      .order('created_at', { ascending: false });

    if (statsError) {
      console.error('❌ Erreur récupération stats:', statsError);
      return;
    }

    const total = stats.length;
    const active = stats.filter(s => s.is_active).length;
    const inactive = total - active;

    console.log(`   Total sessions: ${total}`);
    console.log(`   Sessions actives: ${active}`);
    console.log(`   Sessions inactives: ${inactive}`);
    console.log(`   Taux d'activité: ${((active / total) * 100).toFixed(1)}%\n`);

    // 2. Sessions actives détaillées
    console.log('✅ SESSIONS ACTIVES:');
    const { data: activeSessions, error: activeError } = await supabase
      .from('chat_sessions')
      .select('id, name, created_at, updated_at, user_id, thread')
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    if (activeError) {
      console.error('❌ Erreur récupération sessions actives:', activeError);
      return;
    }

    activeSessions.forEach((session, index) => {
      const threadLength = session.thread ? session.thread.length : 0;
      const lastUpdate = new Date(session.updated_at).toLocaleString('fr-FR');
      console.log(`   ${index + 1}. ${session.name} (${session.id.substring(0, 8)}...)`);
      console.log(`      Messages: ${threadLength} | Dernière activité: ${lastUpdate}`);
    });

    // 3. Sessions inactives récentes
    console.log('\n🗑️ SESSIONS INACTIVES (5 plus récentes):');
    const { data: inactiveSessions, error: inactiveError } = await supabase
      .from('chat_sessions')
      .select('id, name, created_at, updated_at, user_id')
      .eq('is_active', false)
      .order('updated_at', { ascending: false })
      .limit(5);

    if (inactiveError) {
      console.error('❌ Erreur récupération sessions inactives:', inactiveError);
      return;
    }

    inactiveSessions.forEach((session, index) => {
      const lastUpdate = new Date(session.updated_at).toLocaleString('fr-FR');
      console.log(`   ${index + 1}. ${session.name} (${session.id.substring(0, 8)}...)`);
      console.log(`      Désactivée le: ${lastUpdate}`);
    });

    // 4. Analyse des utilisateurs
    console.log('\n👥 ANALYSE PAR UTILISATEUR:');
    const { data: userStats, error: userError } = await supabase
      .from('chat_sessions')
      .select('user_id, is_active');

    if (userError) {
      console.error('❌ Erreur analyse utilisateurs:', userError);
      return;
    }

    const userMap = {};
    userStats.forEach(session => {
      if (!userMap[session.user_id]) {
        userMap[session.user_id] = { active: 0, inactive: 0 };
      }
      if (session.is_active) {
        userMap[session.user_id].active++;
      } else {
        userMap[session.user_id].inactive++;
      }
    });

    Object.entries(userMap).forEach(([userId, stats]) => {
      console.log(`   Utilisateur ${userId.substring(0, 8)}...:`);
      console.log(`      Actives: ${stats.active} | Inactives: ${stats.inactive}`);
    });

    // 5. Recommandations
    console.log('\n💡 RECOMMANDATIONS:');
    if (inactive > active * 2) {
      console.log('   ⚠️  Trop de sessions inactives - considérer un nettoyage');
    }
    if (active > 10) {
      console.log('   ⚠️  Beaucoup de sessions actives - vérifier la logique de suppression');
    }
    
    const oldInactive = inactiveSessions.filter(s => {
      const daysSinceUpdate = (Date.now() - new Date(s.updated_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate > 30;
    });
    
    if (oldInactive.length > 0) {
      console.log(`   🧹 ${oldInactive.length} sessions inactives depuis plus de 30 jours`);
    }

    console.log('\n✅ Audit terminé');

  } catch (error) {
    console.error('❌ Erreur audit:', error);
  }
}

async function cleanupOldSessions() {
  console.log('\n🧹 NETTOYAGE DES SESSIONS ANCIENNES');
  console.log('====================================\n');

  try {
    // Supprimer définitivement les sessions inactives de plus de 30 jours
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: oldSessions, error: fetchError } = await supabase
      .from('chat_sessions')
      .select('id, name, updated_at')
      .eq('is_active', false)
      .lt('updated_at', thirtyDaysAgo.toISOString());

    if (fetchError) {
      console.error('❌ Erreur récupération anciennes sessions:', fetchError);
      return;
    }

    if (oldSessions.length === 0) {
      console.log('✅ Aucune session ancienne à nettoyer');
      return;
    }

    console.log(`🗑️  Suppression de ${oldSessions.length} sessions anciennes:`);
    oldSessions.forEach(session => {
      const lastUpdate = new Date(session.updated_at).toLocaleString('fr-FR');
      console.log(`   - ${session.name} (désactivée le ${lastUpdate})`);
    });

    const { error: deleteError } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('is_active', false)
      .lt('updated_at', thirtyDaysAgo.toISOString());

    if (deleteError) {
      console.error('❌ Erreur suppression:', deleteError);
      return;
    }

    console.log('✅ Nettoyage terminé');

  } catch (error) {
    console.error('❌ Erreur nettoyage:', error);
  }
}

// Exécution
async function main() {
  await auditChatSessions();
  
  // Demander confirmation pour le nettoyage
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('\n🧹 Voulez-vous nettoyer les sessions anciennes ? (y/N): ', async (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      await cleanupOldSessions();
    } else {
      console.log('⏭️  Nettoyage ignoré');
    }
    rl.close();
  });
}

main().catch(console.error); 