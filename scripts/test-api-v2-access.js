#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testApiV2Access() {
  try {
    console.log('🧪 TEST D\'ACCÈS API V2 APRÈS CORRECTION RLS');
    console.log('==============================================');
    
    // 1. Vérifier la configuration
    console.log('\n📋 Configuration:');
    console.log('   URL Supabase:', supabaseUrl);
    console.log('   Service Role Key:', supabaseServiceKey ? `${supabaseServiceKey.substring(0, 20)}...` : '❌ Manquante');
    
    // 2. Tester la connexion
    console.log('\n🔌 Test de connexion...');
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('count')
        .limit(1);
      
      if (error) {
        console.log('❌ Erreur de connexion:', error.message);
        return;
      }
      console.log('✅ Connexion Supabase OK');
    } catch (e) {
      console.log('❌ Erreur de connexion:', e.message);
      return;
    }
    
    // 3. Lister les utilisateurs
    console.log('\n👥 Récupération des utilisateurs...');
    try {
      const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (usersError) {
        console.log('❌ Erreur récupération utilisateurs:', usersError.message);
        return;
      }
      
      if (!users || users.length === 0) {
        console.log('⚠️ Aucun utilisateur trouvé');
        return;
      }
      
      console.log(`✅ ${users.length} utilisateur(s) trouvé(s)`);
      
      // Prendre le premier utilisateur pour les tests
      const testUser = users[0];
      console.log(`👤 Utilisateur de test: ${testUser.email} (${testUser.id})`);
      
      // 4. Tester l'accès aux articles
      console.log('\n📝 Test accès aux articles...');
      try {
        const { data: articles, error: articlesError } = await supabase
          .from('articles')
          .select('id, source_title, created_at')
          .eq('user_id', testUser.id)
          .limit(5);
        
        if (articlesError) {
          console.log('❌ Erreur accès articles:', articlesError.message);
        } else {
          console.log(`✅ Accès articles OK: ${articles.length} note(s) trouvée(s)`);
          articles.forEach(article => {
            console.log(`   - ${article.source_title} (${article.id})`);
          });
        }
      } catch (e) {
        console.log('❌ Erreur test articles:', e.message);
      }
      
      // 5. Tester l'accès aux dossiers
      console.log('\n📁 Test accès aux dossiers...');
      try {
        const { data: folders, error: foldersError } = await supabase
          .from('folders')
          .select('id, name, created_at')
          .eq('user_id', testUser.id)
          .limit(5);
        
        if (foldersError) {
          console.log('❌ Erreur accès dossiers:', foldersError.message);
        } else {
          console.log(`✅ Accès dossiers OK: ${folders.length} dossier(s) trouvé(s)`);
          folders.forEach(folder => {
            console.log(`   - ${folder.name} (${folder.id})`);
          });
        }
      } catch (e) {
        console.log('❌ Erreur test dossiers:', e.message);
      }
      
      // 6. Tester l'accès aux classeurs
      console.log('\n📚 Test accès aux classeurs...');
      try {
        const { data: classeurs, error: classeursError } = await supabase
          .from('classeurs')
          .select('id, name, created_at')
          .eq('user_id', testUser.id)
          .limit(5);
        
        if (classeursError) {
          console.log('❌ Erreur accès classeurs:', classeursError.message);
        } else {
          console.log(`✅ Accès classeurs OK: ${classeurs.length} classeur(s) trouvé(s)`);
          classeurs.forEach(classeur => {
            console.log(`   - ${classeur.name} (${classeur.id})`);
          });
        }
      } catch (e) {
        console.log('❌ Erreur test classeurs:', e.message);
      }
      
      // 7. Tester la création d'une note (simulation API V2)
      console.log('\n✏️ Test création de note (simulation API V2)...');
      try {
        const testNote = {
          source_title: `Test API V2 - ${new Date().toISOString()}`,
          user_id: testUser.id,
          markdown_content: '# Test API V2\n\nCette note est créée pour tester l\'accès API V2.',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { data: newNote, error: createError } = await supabase
          .from('articles')
          .insert([testNote])
          .select('id, source_title')
          .single();
        
        if (createError) {
          console.log('❌ Erreur création note:', createError.message);
        } else {
          console.log(`✅ Création note OK: ${newNote.source_title} (${newNote.id})`);
          
          // Nettoyer la note de test
          try {
            await supabase
              .from('articles')
              .delete()
              .eq('id', newNote.id);
            console.log('🧹 Note de test supprimée');
          } catch (cleanupError) {
            console.log('⚠️ Impossible de supprimer la note de test:', cleanupError.message);
          }
        }
      } catch (e) {
        console.log('❌ Erreur test création:', e.message);
      }
      
    } catch (e) {
      console.log('❌ Erreur récupération utilisateurs:', e.message);
    }
    
    // 8. Vérifier les politiques RLS
    console.log('\n📋 Vérification des politiques RLS...');
    try {
      const { data: policies, error: policiesError } = await supabase
        .rpc('exec_sql', {
          sql: `
            SELECT tablename, policyname, cmd, permissive
            FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename IN ('articles', 'folders', 'classeurs')
            ORDER BY tablename, policyname;
          `
        });
      
      if (policiesError) {
        console.log('⚠️ Impossible de récupérer les politiques:', policiesError.message);
      } else {
        console.log('📊 Politiques RLS actives:');
        const tablePolicies = {};
        
        policies.forEach(policy => {
          if (!tablePolicies[policy.tablename]) {
            tablePolicies[policy.tablename] = [];
          }
          tablePolicies[policy.tablename].push(policy);
        });
        
        Object.entries(tablePolicies).forEach(([table, tablePolicies]) => {
          console.log(`   📋 ${table}:`);
          tablePolicies.forEach(policy => {
            console.log(`      - ${policy.policyname} (${policy.cmd})`);
          });
        });
      }
    } catch (e) {
      console.log('⚠️ Vérification des politiques non effectuée');
    }
    
    console.log('\n🎉 TEST API V2 TERMINÉ');
    console.log('========================');
    console.log('✅ Si tous les tests sont OK, l\'API V2 devrait fonctionner');
    console.log('✅ Le LLM pourra maintenant créer/modifier les notes via l\'API V2');
    
  } catch (error) {
    console.error('❌ Erreur lors du test API V2:', error);
    process.exit(1);
  }
}

// Exécuter le script
testApiV2Access().catch(console.error); 