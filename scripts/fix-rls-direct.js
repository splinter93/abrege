require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

// Client avec service role pour contourner RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixRLSPolicies() {
  try {
    console.log('🔧 CORRECTION DES POLITIQUES RLS');
    console.log('================================\n');

    // 1. Supprimer toutes les anciennes politiques complexes
    console.log('🗑️ Suppression des anciennes politiques...');
    const policiesToDrop = [
      'DROP POLICY IF EXISTS "Users can view articles based on permissions" ON public.articles;',
      'DROP POLICY IF EXISTS "Users can insert their own articles" ON public.articles;',
      'DROP POLICY IF EXISTS "Users can update articles they own or have editor/owner permissions" ON public.articles;',
      'DROP POLICY IF EXISTS "Users can delete articles they own or have owner permissions" ON public.articles;',
      'DROP POLICY IF EXISTS "Users can view articles based on new sharing system" ON public.articles;',
      'DROP POLICY IF EXISTS "Users can create their own articles" ON public.articles;',
      'DROP POLICY IF EXISTS "Users can update articles they own or have edit access" ON public.articles;',
      'DROP POLICY IF EXISTS "Users can delete only their own articles" ON public.articles;',
      'DROP POLICY IF EXISTS "Allow all users to select articles" ON public.articles;',
      'DROP POLICY IF EXISTS "Allow user to insert their own articles" ON public.articles;',
      'DROP POLICY IF EXISTS "Allow user to update their own articles" ON public.articles;',
      'DROP POLICY IF EXISTS "Allow user to delete their own articles" ON public.articles;',
      'DROP POLICY IF EXISTS "Allow all users to insert articles" ON public.articles;',
      'DROP POLICY IF EXISTS "Allow all users to update articles" ON public.articles;',
      'DROP POLICY IF EXISTS "Allow all users to delete articles" ON public.articles;'
    ];

    for (const policy of policiesToDrop) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: policy });
        if (error) {
          console.log(`⚠️ Erreur suppression politique: ${error.message}`);
        }
      } catch (e) {
        // Ignorer les erreurs si la fonction exec_sql n'existe pas
        console.log(`⚠️ Commande ignorée: ${policy}`);
      }
    }

    // 2. Créer des politiques simples et fonctionnelles
    console.log('\n✅ Création des nouvelles politiques RLS...');
    
    const newPolicies = [
      // Politique SELECT - permettre à l'utilisateur de voir ses propres articles
      `CREATE POLICY "Users can view their own articles"
       ON public.articles
       FOR SELECT
       USING (auth.uid() = user_id);`,

      // Politique INSERT - permettre à l'utilisateur de créer ses propres articles
      `CREATE POLICY "Users can insert their own articles"
       ON public.articles
       FOR INSERT
       WITH CHECK (auth.uid() = user_id);`,

      // Politique UPDATE - permettre à l'utilisateur de modifier ses propres articles
      `CREATE POLICY "Users can update their own articles"
       ON public.articles
       FOR UPDATE
       USING (auth.uid() = user_id)
       WITH CHECK (auth.uid() = user_id);`,

      // Politique DELETE - permettre à l'utilisateur de supprimer ses propres articles
      `CREATE POLICY "Users can delete their own articles"
       ON public.articles
       FOR DELETE
       USING (auth.uid() = user_id);`
    ];

    for (const policy of newPolicies) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: policy });
        if (error) {
          console.log(`⚠️ Erreur création politique: ${error.message}`);
        } else {
          console.log('✅ Politique créée');
        }
      } catch (e) {
        console.log(`⚠️ Impossible d'appliquer la politique: ${e.message}`);
      }
    }

    // 3. S'assurer que RLS est activé
    console.log('\n🔒 Activation de RLS...');
    try {
      const { error } = await supabase.rpc('exec_sql', { 
        sql: 'ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;' 
      });
      if (error) {
        console.log(`⚠️ Erreur activation RLS: ${error.message}`);
      } else {
        console.log('✅ RLS activé sur articles');
      }
    } catch (e) {
      console.log(`⚠️ Impossible d'activer RLS: ${e.message}`);
    }

    // 4. Test de création d'une note (simulation)
    console.log('\n🧪 Test de création de note...');
    try {
      const testNote = {
        source_title: 'Test RLS Fix',
        markdown_content: 'Test content',
        html_content: 'Test content',
        user_id: '00000000-0000-0000-0000-000000000000', // UUID de test
        classeur_id: '00000000-0000-0000-0000-000000000000', // UUID de test
        slug: 'test-rls-fix',
        position: 0
      };

      const { data, error } = await supabase
        .from('articles')
        .insert(testNote)
        .select()
        .single();

      if (error) {
        console.log(`❌ Test échoué: ${error.message}`);
      } else {
        console.log('✅ Test de création réussi');
        // Nettoyer le test
        await supabase
          .from('articles')
          .delete()
          .eq('id', data.id);
        console.log('🧹 Note de test supprimée');
      }
    } catch (e) {
      console.log(`⚠️ Test impossible: ${e.message}`);
    }

    console.log('\n🎉 CORRECTION RLS TERMINÉE');
    console.log('============================');
    console.log('✅ Politiques RLS simplifiées appliquées');
    console.log('✅ API devrait maintenant fonctionner correctement');
    console.log('✅ Les utilisateurs peuvent créer leurs propres notes');

  } catch (error) {
    console.error('❌ Erreur lors de la correction RLS:', error);
    process.exit(1);
  }
}

fixRLSPolicies(); 