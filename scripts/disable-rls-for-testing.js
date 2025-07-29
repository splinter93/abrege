require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  console.error('URL:', supabaseUrl);
  console.error('KEY:', supabaseKey ? 'PRESENT' : 'MISSING');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function disableRLS() {
  try {
    console.log('🔧 Désactivation de RLS pour les tests...');
    
    // Désactiver RLS sur articles
    const { error: articlesError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.articles DISABLE ROW LEVEL SECURITY;'
    });
    
    if (articlesError) {
      console.log('⚠️ Erreur articles:', articlesError.message);
    } else {
      console.log('✅ RLS désactivé sur articles');
    }
    
    // Désactiver RLS sur folders
    const { error: foldersError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.folders DISABLE ROW LEVEL SECURITY;'
    });
    
    if (foldersError) {
      console.log('⚠️ Erreur folders:', foldersError.message);
    } else {
      console.log('✅ RLS désactivé sur folders');
    }
    
    // Désactiver RLS sur classeurs
    const { error: classeursError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.classeurs DISABLE ROW LEVEL SECURITY;'
    });
    
    if (classeursError) {
      console.log('⚠️ Erreur classeurs:', classeursError.message);
    } else {
      console.log('✅ RLS désactivé sur classeurs');
    }
    
    console.log('🎉 RLS désactivé sur toutes les tables');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

disableRLS(); 