require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyRLSFix() {
  try {
    console.log('🔧 Application du fix RLS...');
    
    // Lire le fichier de migration
    const migrationPath = path.join(__dirname, '../supabase/migrations/20241220_fix_rls_policies.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Contenu de la migration:');
    console.log(migrationSQL);
    
    // Exécuter les commandes SQL une par une
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0);
    
    for (const command of commands) {
      console.log(`🔨 Exécution: ${command.substring(0, 50)}...`);
      
      // Pour les commandes DROP POLICY, on peut les ignorer si elles échouent
      if (command.includes('DROP POLICY')) {
        try {
          await supabase.rpc('exec_sql', { sql: command });
        } catch (error) {
          console.log('⚠️ Commande DROP ignorée (probablement déjà supprimée)');
        }
      } else {
        const { error } = await supabase.rpc('exec_sql', { sql: command });
        if (error) {
          console.error('❌ Erreur exécution commande:', error);
          return;
        }
      }
    }
    
    console.log('✅ Fix RLS appliqué');
    
    // Test de création d'une note
    console.log('📝 Test création note...');
    const { data: newNote, error: createError } = await supabase
      .from('articles')
      .insert({
        source_title: 'Test RLS Fix',
        markdown_content: '# Test',
        user_id: '3223651c-5580-4471-affb-b3f4456bd729'
      })
      .select();
    
    if (createError) {
      console.log('❌ Erreur création note:', createError.message);
    } else {
      console.log('✅ Note créée:', newNote?.[0]?.id);
      
      // Supprimer la note de test
      if (newNote?.[0]?.id) {
        const { error: deleteError } = await supabase
          .from('articles')
          .delete()
          .eq('id', newNote[0].id);
        
        if (deleteError) {
          console.log('⚠️ Erreur suppression note test:', deleteError.message);
        } else {
          console.log('✅ Note test supprimée');
        }
      }
    }
    
    console.log('🎯 Fix RLS terminé avec succès');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

applyRLSFix(); 