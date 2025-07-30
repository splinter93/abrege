require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyPositionMigration() {
  console.log('🚀 Application de la migration position pour les classeurs...');
  
  try {
    // 1. Vérifier si la colonne existe déjà
    console.log('📋 1. Vérification de la colonne position...');
    const { data: classeurs, error: selectError } = await supabase
      .from('classeurs')
      .select('id, name, position, created_at')
      .limit(1);
    
    if (selectError) {
      console.error('❌ Erreur vérification colonne:', selectError);
      return;
    }
    
    console.log('✅ Colonne position existe déjà');
    
    // 2. Mettre à jour les positions existantes si nécessaire
    console.log('📋 2. Mise à jour des positions existantes...');
    const { data: allClasseurs, error: allError } = await supabase
      .from('classeurs')
      .select('id, name, position, created_at')
      .order('created_at', { ascending: true });
    
    if (allError) {
      console.error('❌ Erreur récupération classeurs:', allError);
      return;
    }
    
    // Mettre à jour les positions basées sur created_at
    const updatePromises = allClasseurs.map(async (classeur, index) => {
      const { error: updateError } = await supabase
        .from('classeurs')
        .update({ position: index })
        .eq('id', classeur.id);
      
      if (updateError) {
        console.error(`❌ Erreur mise à jour classeur ${classeur.id}:`, updateError);
        return null;
      }
      
      return { id: classeur.id, name: classeur.name, position: index };
    });
    
    const results = await Promise.all(updatePromises);
    const successfulUpdates = results.filter(r => r !== null);
    
    console.log(`✅ ${successfulUpdates.length} positions mises à jour`);
    
    // 3. Vérifier le résultat final
    console.log('📋 3. Vérification du résultat final...');
    const { data: finalClasseurs, error: finalError } = await supabase
      .from('classeurs')
      .select('id, name, position, created_at')
      .order('position', { ascending: true });
    
    if (finalError) {
      console.error('❌ Erreur vérification finale:', finalError);
      return;
    }
    
    console.log('✅ Migration terminée avec succès !');
    console.log('📊 Classeurs avec positions:');
    finalClasseurs.forEach(classeur => {
      console.log(`  - ${classeur.name} (ID: ${classeur.id}) -> Position: ${classeur.position}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

applyPositionMigration(); 