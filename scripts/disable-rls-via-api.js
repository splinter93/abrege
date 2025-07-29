require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function disableRLSViaAPI() {
  try {
    console.log('🔧 Tentative de désactivation de RLS via API...');
    
    // Essayer de désactiver RLS via une requête SQL directe
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('⚠️ Erreur lors de l\'accès à articles:', error.message);
      
      // Si c'est une erreur RLS, on peut essayer de contourner
      if (error.message.includes('RLS') || error.message.includes('policy')) {
        console.log('🔍 Problème RLS détecté - Tentative de contournement...');
        
        // Essayer d'utiliser une requête SQL brute
        const { data: sqlData, error: sqlError } = await supabase
          .rpc('sql', { query: 'ALTER TABLE public.articles DISABLE ROW LEVEL SECURITY;' });
        
        if (sqlError) {
          console.log('⚠️ Erreur SQL:', sqlError.message);
        } else {
          console.log('✅ RLS désactivé via SQL');
        }
      }
    } else {
      console.log('✅ Accès aux articles OK');
    }
    
    // Tester l'accès aux autres tables
    const { data: foldersData, error: foldersError } = await supabase
      .from('folders')
      .select('*')
      .limit(1);
    
    if (foldersError) {
      console.log('⚠️ Erreur lors de l\'accès à folders:', foldersError.message);
    } else {
      console.log('✅ Accès aux folders OK');
    }
    
    const { data: classeursData, error: classeursError } = await supabase
      .from('classeurs')
      .select('*')
      .limit(1);
    
    if (classeursError) {
      console.log('⚠️ Erreur lors de l\'accès à classeurs:', classeursError.message);
    } else {
      console.log('✅ Accès aux classeurs OK');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

disableRLSViaAPI(); 