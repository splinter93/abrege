#!/usr/bin/env node

/**
 * 🔍 CHECK DATABASE NAME
 * 
 * Ce script vérifie directement dans la base de données
 * si le champ 'name' est bien sauvegardé dans les messages tool.
 */

const { createClient } = require('@supabase/supabase-js');

console.log('🔍 CHECKING DATABASE FOR NAME FIELD...\n');

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseName() {
  try {
    console.log('🔍 Récupération des sessions de chat...');
    
    // Récupérer toutes les sessions avec leur thread
    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select('id, thread, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Erreur récupération sessions:', error);
      return;
    }

    console.log(`✅ ${sessions.length} sessions trouvées\n`);

    // Analyser chaque session
    sessions.forEach((session, index) => {
      console.log(`📋 Session ${index + 1} (${session.id}):`);
      
      if (!session.thread || !Array.isArray(session.thread)) {
        console.log('   ❌ Pas de thread ou thread invalide');
        return;
      }

      const toolMessages = session.thread.filter(msg => msg.role === 'tool');
      console.log(`   📊 Messages tool: ${toolMessages.length}`);

      toolMessages.forEach((msg, msgIndex) => {
        console.log(`   🔧 Message tool ${msgIndex + 1}:`);
        console.log(`      Role: ${msg.role}`);
        console.log(`      Tool Call ID: ${msg.tool_call_id || '❌ MANQUE'}`);
        console.log(`      Name: ${msg.name || '❌ MANQUE'}`);
        console.log(`      Has Name: ${!!msg.name}`);
        console.log(`      Content: ${msg.content ? msg.content.substring(0, 50) + '...' : 'null'}`);
        console.log('');
      });

      if (toolMessages.length === 0) {
        console.log('   ℹ️  Aucun message tool trouvé');
      }
    });

    // Statistiques globales
    const allToolMessages = sessions
      .flatMap(s => s.thread || [])
      .filter(msg => msg.role === 'tool');

    console.log('📊 STATISTIQUES GLOBALES:');
    console.log(`   Total messages tool: ${allToolMessages.length}`);
    console.log(`   Messages avec name: ${allToolMessages.filter(m => m.name).length}`);
    console.log(`   Messages sans name: ${allToolMessages.filter(m => !m.name).length}`);
    console.log(`   Pourcentage avec name: ${allToolMessages.length > 0 ? Math.round((allToolMessages.filter(m => m.name).length / allToolMessages.length) * 100) : 0}%`);

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

checkDatabaseName(); 