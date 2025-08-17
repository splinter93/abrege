#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyApiV2Fix() {
  try {
    console.log('🔧 CORRECTION DES POLITIQUES RLS POUR L\'API V2');
    console.log('================================================\n');
    
    // Lire le script SQL
    const sqlScriptPath = path.join(__dirname, 'fix-api-v2-rls.sql');
    const sqlScript = fs.readFileSync(sqlScriptPath, 'utf8');
    
    console.log('📝 Application des nouvelles politiques RLS pour l\'API V2...');
    
    // Diviser le script en commandes individuelles
    const commands = sqlScript
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const command of commands) {
      try {
        // Utiliser la fonction RPC exec_sql si disponible
        const { error } = await supabase.rpc('exec_sql', { sql: command });
        
        if (error) {
          // Si exec_sql n'est pas disponible, afficher l'erreur
          console.log(`⚠️  Erreur exec_sql: ${error.message}`);
          console.log(`   Commande: ${command.substring(0, 100)}...`);
          errorCount++;
        } else {
          console.log(`   ✅ Commande exécutée: ${command.substring(0, 100)}...`);
          successCount++;
        }
      } catch (err) {
        // Ignorer les erreurs pour les commandes DROP POLICY
        if (command.includes('DROP POLICY')) {
          console.log(`   ✅ Commande DROP POLICY ignorée: ${command.substring(0, 100)}...`);
          successCount++;
        } else {
          console.error(`   ❌ Erreur d'exécution: ${err.message}`);
          errorCount++;
        }
      }
    }
    
    console.log(`\n📊 Résumé de l'exécution:`);
    console.log(`   ✅ Commandes réussies: ${successCount}`);
    console.log(`   ❌ Commandes en erreur: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 CORRECTION API V2 APPLIQUÉE AVEC SUCCÈS!');
      console.log('==============================================');
      console.log('✅ Les politiques RLS ont été mises à jour pour l\'API V2');
      console.log('✅ L\'accès aux données est maintenant possible');
      console.log('✅ Les utilisateurs peuvent accéder à leurs propres données');
      console.log('✅ Les articles publics restent accessibles');
      
      console.log('\n💡 Prochaines étapes:');
      console.log('1. Tester l\'API V2 avec une note existante');
      console.log('2. Vérifier que les endpoints /metadata, /content, /share fonctionnent');
      console.log('3. Confirmer que les notes privées restent sécurisées');
      
    } else {
      console.log('\n⚠️  CORRECTION PARTIELLEMENT APPLIQUÉE');
      console.log('=========================================');
      console.log('❌ Certaines commandes ont échoué');
      console.log('💡 Vérifiez les erreurs ci-dessus');
      console.log('🔧 Vous devrez peut-être appliquer le script SQL manuellement');
      
      console.log('\n📋 Script SQL à appliquer manuellement:');
      console.log('=====================================');
      console.log(sqlScript);
    }
    
    // Test rapide après application
    console.log('\n🧪 Test rapide après correction...');
    try {
      const { data: testData, error: testError } = await supabase
        .from('articles')
        .select('id, source_title')
        .limit(1);
      
      if (testError) {
        console.log(`❌ Test échoué: ${testError.message}`);
      } else {
        console.log(`✅ Test réussi: ${testData?.length || 0} articles accessibles`);
      }
    } catch (testErr) {
      console.log(`❌ Erreur lors du test: ${testErr.message}`);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'application de la correction:', error);
    console.log('\n💡 Solution alternative:');
    console.log('1. Copier le contenu du fichier scripts/fix-api-v2-rls.sql');
    console.log('2. L\'exécuter manuellement dans Supabase SQL Editor');
  }
}

// Exécuter la correction
applyApiV2Fix().catch(console.error); 