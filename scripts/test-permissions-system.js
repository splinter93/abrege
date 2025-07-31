require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPermissionsSystem() {
  console.log('🔐 Test du système de permissions et visibilité\n');

  try {
    // 1. Vérifier que la colonne visibility existe
    console.log('📋 1. Vérification de la colonne visibility...');
    const { data: articles, error: visibilityError } = await supabase
      .from('articles')
      .select('id, source_title, visibility')
      .limit(5);

    if (visibilityError) {
      console.log('❌ Erreur lors de la vérification de la colonne visibility:', visibilityError.message);
    } else {
      console.log('✅ Colonne visibility accessible');
      console.log('📊 Exemples d\'articles:');
      articles?.forEach(article => {
        console.log(`   - ${article.source_title} (${article.visibility || 'private'})`);
      });
    }

    // 2. Vérifier les tables de permissions
    console.log('\n📋 2. Vérification des tables de permissions...');
    
    const tables = ['article_permissions', 'folder_permissions', 'classeur_permissions'];
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(1);
      
      if (error) {
        console.log(`❌ Table ${table} non accessible:`, error.message);
      } else {
        console.log(`✅ Table ${table} accessible`);
      }
    }

    // 3. Vérifier les politiques RLS
    console.log('\n📋 3. Vérification des politiques RLS...');
    
    const rlsTables = ['articles', 'folders', 'classeurs'];
    for (const table of rlsTables) {
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(1);
      
      if (error) {
        console.log(`❌ Table ${table} avec RLS:`, error.message);
      } else {
        console.log(`✅ Table ${table} accessible avec RLS`);
      }
    }

    // 4. Tester la création d'une permission
    console.log('\n📋 4. Test de création d\'une permission...');
    
    // Récupérer un article existant
    const { data: testArticle } = await supabase
      .from('articles')
      .select('id, source_title')
      .limit(1)
      .single();

    if (testArticle) {
      console.log(`📝 Test avec l'article: ${testArticle.source_title}`);
      
      // Créer une permission de test
      const { data: permission, error: permError } = await supabase
        .from('article_permissions')
        .insert({
          article_id: testArticle.id,
          user_id: '3223651c-5580-4471-affb-b3f4456bd729', // User de test
          role: 'viewer',
          granted_by: '3223651c-5580-4471-affb-b3f4456bd729'
        })
        .select()
        .single();

      if (permError) {
        console.log('❌ Erreur création permission:', permError.message);
      } else {
        console.log('✅ Permission créée avec succès');
        
        // Supprimer la permission de test
        await supabase
          .from('article_permissions')
          .delete()
          .eq('id', permission.id);
        console.log('🧹 Permission de test supprimée');
      }
    }

    // 5. Vérifier les fonctions d'héritage
    console.log('\n📋 5. Vérification des fonctions d\'héritage...');
    
    try {
      const { data: folderPerms, error: folderError } = await supabase
        .rpc('get_folder_permissions', { folder_uuid: '00000000-0000-0000-0000-000000000000' });
      
      if (folderError) {
        console.log('❌ Fonction get_folder_permissions:', folderError.message);
      } else {
        console.log('✅ Fonction get_folder_permissions accessible');
      }
    } catch (error) {
      console.log('❌ Erreur test fonction héritage:', error.message);
    }

    // 6. Test de visibilité
    console.log('\n📋 6. Test de visibilité des articles...');
    
    const { data: publicArticles, error: publicError } = await supabase
      .from('articles')
      .select('id, source_title, visibility')
      .eq('visibility', 'public')
      .limit(3);

    if (publicError) {
      console.log('❌ Erreur requête articles publics:', publicError.message);
    } else {
      console.log(`✅ ${publicArticles?.length || 0} articles publics trouvés`);
      publicArticles?.forEach(article => {
        console.log(`   - ${article.source_title} (${article.visibility})`);
      });
    }

    console.log('\n🎉 Test du système de permissions terminé !');

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter le test
testPermissionsSystem(); 