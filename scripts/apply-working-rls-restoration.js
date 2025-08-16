require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

// Client avec service role pour appliquer les migrations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyWorkingRLSRestoration() {
  try {
    console.log('🔧 RESTAURATION DES POLITIQUES RLS FONCTIONNELLES');
    console.log('==================================================\n');

    // 1. Lire la migration SQL
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250131_restore_working_rls.sql');
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Fichier de migration non trouvé:', migrationPath);
      return;
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📖 Migration chargée:', path.basename(migrationPath));

    // 2. Diviser en commandes SQL individuelles
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📝 ${commands.length} commandes SQL à exécuter\n`);

    // 3. Exécuter chaque commande
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      const commandNumber = i + 1;
      
      try {
        console.log(`[${commandNumber}/${commands.length}] Exécution...`);
        
        // Exécuter la commande SQL
        const { error } = await supabase.rpc('exec_sql', { sql: command });
        
        if (error) {
          console.log(`❌ [${commandNumber}] Erreur: ${error.message}`);
          errorCount++;
        } else {
          console.log(`✅ [${commandNumber}] Succès`);
          successCount++;
        }
      } catch (e) {
        console.log(`⚠️ [${commandNumber}] Commande ignorée (exec_sql non disponible): ${e.message}`);
        errorCount++;
      }
    }

    // 4. Résumé de l'exécution
    console.log('\n📊 RÉSUMÉ DE L\'EXÉCUTION');
    console.log('============================');
    console.log(`✅ Commandes réussies: ${successCount}`);
    console.log(`❌ Commandes échouées: ${errorCount}`);
    console.log(`📝 Total: ${commands.length}`);

    // 5. Test de la restauration
    console.log('\n🧪 TEST DE LA RESTAURATION RLS...');
    
    // Vérifier que la table articles est accessible
    const { data: articles, error: selectError } = await supabase
      .from('articles')
      .select('id, source_title')
      .limit(1);

    if (selectError) {
      console.log(`❌ Erreur accès articles: ${selectError.message}`);
    } else {
      console.log(`✅ Accès articles OK: ${articles?.length || 0} articles trouvés`);
    }

    // 6. Recommandations
    console.log('\n🎯 RECOMMANDATIONS');
    console.log('==================');
    
    if (errorCount > 0) {
      console.log('⚠️ Certaines commandes ont échoué');
      console.log('💡 Solution: Appliquer la migration manuellement via le Dashboard Supabase');
      console.log('   1. Allez sur https://supabase.com/dashboard');
      console.log('   2. Sélectionnez votre projet');
      console.log('   3. Database > SQL Editor');
      console.log('   4. Copiez-collez le contenu de: supabase/migrations/20250131_restore_working_rls.sql');
      console.log('   5. Exécutez la migration');
    } else {
      console.log('✅ Migration appliquée avec succès');
      console.log('🎉 Les politiques RLS sont maintenant restaurées et fonctionnelles');
      console.log('🧪 Testez la création de notes dans l\'application');
    }

    // 7. Test final de création de note
    console.log('\n🧪 TEST FINAL: Création de note...');
    
    try {
      // Récupérer un classeur et un utilisateur existants
      const { data: classeurs } = await supabase
        .from('classeurs')
        .select('id, name')
        .limit(1);

      const { data: users } = await supabase
        .from('users')
        .select('id, email')
        .limit(1);

      if (classeurs && users) {
        const testNote = {
          source_title: 'Test RLS Restored',
          markdown_content: 'Test après restauration RLS',
          html_content: 'Test après restauration RLS',
          user_id: users[0].id,
          classeur_id: classeurs[0].id,
          slug: `test-rls-restored-${Date.now()}`,
          position: 0
        };

        const { data: createdNote, error: createError } = await supabase
          .from('articles')
          .insert(testNote)
          .select()
          .single();

        if (createError) {
          console.log(`❌ Test de création échoué: ${createError.message}`);
        } else {
          console.log('✅ Test de création réussi !');
          console.log(`📋 Note créée: ${createdNote.id}`);
          
          // Nettoyer
          await supabase
            .from('articles')
            .delete()
            .eq('id', createdNote.id);
          console.log('🧹 Note de test supprimée');
        }
      }
    } catch (e) {
      console.log(`⚠️ Test final impossible: ${e.message}`);
    }

  } catch (error) {
    console.error('❌ Erreur lors de la restauration RLS:', error);
  }
}

applyWorkingRLSRestoration(); 