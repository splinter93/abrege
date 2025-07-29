require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyRLSPolicies() {
  try {
    console.log('🔧 Application des politiques RLS pour articles...');
    
    // 1. Activer RLS sur articles
    console.log('📝 Activation RLS sur articles...');
    const { error: enableError } = await supabase
      .rpc('exec_sql', { 
        sql: 'ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;' 
      });
    
    if (enableError) {
      console.log('⚠️ Erreur activation RLS:', enableError.message);
    } else {
      console.log('✅ RLS activé sur articles');
    }
    
    // 2. Supprimer les anciennes politiques
    console.log('🗑️ Suppression des anciennes politiques...');
    const policiesToDrop = [
      'DROP POLICY IF EXISTS "Allow user to select their own articles" ON public.articles;',
      'DROP POLICY IF EXISTS "Allow user to insert their own articles" ON public.articles;',
      'DROP POLICY IF EXISTS "Allow user to update their own articles" ON public.articles;',
      'DROP POLICY IF EXISTS "Allow user to delete their own articles" ON public.articles;'
    ];
    
    for (const policy of policiesToDrop) {
      const { error } = await supabase.rpc('exec_sql', { sql: policy });
      if (error) {
        console.log('⚠️ Erreur suppression politique:', error.message);
      }
    }
    
    // 3. Créer la politique SELECT (ouverte pour test)
    console.log('👁️ Création politique SELECT (ouverte)...');
    const { error: selectError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Allow all users to select articles"
        ON public.articles
        FOR SELECT
        USING (true);
      `
    });
    
    if (selectError) {
      console.log('⚠️ Erreur création politique SELECT:', selectError.message);
    } else {
      console.log('✅ Politique SELECT créée');
    }
    
    // 4. Créer la politique INSERT
    console.log('➕ Création politique INSERT...');
    const { error: insertError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Allow user to insert their own articles"
        ON public.articles
        FOR INSERT
        WITH CHECK (auth.uid() = user_id);
      `
    });
    
    if (insertError) {
      console.log('⚠️ Erreur création politique INSERT:', insertError.message);
    } else {
      console.log('✅ Politique INSERT créée');
    }
    
    // 5. Créer la politique UPDATE
    console.log('✏️ Création politique UPDATE...');
    const { error: updateError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Allow user to update their own articles"
        ON public.articles
        FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
      `
    });
    
    if (updateError) {
      console.log('⚠️ Erreur création politique UPDATE:', updateError.message);
    } else {
      console.log('✅ Politique UPDATE créée');
    }
    
    // 6. Créer la politique DELETE
    console.log('🗑️ Création politique DELETE...');
    const { error: deleteError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Allow user to delete their own articles"
        ON public.articles
        FOR DELETE
        USING (auth.uid() = user_id);
      `
    });
    
    if (deleteError) {
      console.log('⚠️ Erreur création politique DELETE:', deleteError.message);
    } else {
      console.log('✅ Politique DELETE créée');
    }
    
    console.log('🎉 Politiques RLS appliquées avec succès !');
    
    // Test d'accès
    console.log('🧪 Test d\'accès aux articles...');
    const { data, error: testError } = await supabase
      .from('articles')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.log('❌ Erreur test accès:', testError.message);
    } else {
      console.log('✅ Accès aux articles OK');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

applyRLSPolicies(); 