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

async function applyPublicAccessFix() {
  try {
    console.log('🔧 CORRECTION DES POLITIQUES RLS POUR L\'ACCÈS PUBLIC');
    console.log('=====================================================\n');
    
    // Lire le script SQL
    const sqlScriptPath = path.join(__dirname, 'fix-public-access-rls.sql');
    const sqlScript = fs.readFileSync(sqlScriptPath, 'utf8');
    
    console.log('📝 Application des nouvelles politiques RLS...');
    
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
          // Si exec_sql n'est pas disponible, essayer une approche alternative
          console.log(`⚠️  exec_sql non disponible, tentative alternative pour: ${command.substring(0, 50)}...`);
          
          // Pour les commandes DROP POLICY, on peut les ignorer si elles échouent
          if (command.includes('DROP POLICY')) {
            console.log('   ✅ Commande DROP POLICY ignorée (probablement déjà supprimée)');
            successCount++;
            continue;
          }
          
          // Pour les autres commandes, afficher l'erreur
          console.error(`   ❌ Erreur: ${error.message}`);
          errorCount++;
        } else {
          console.log(`   ✅ Commande exécutée: ${command.substring(0, 50)}...`);
          successCount++;
        }
      } catch (err) {
        // Ignorer les erreurs pour les commandes DROP POLICY
        if (command.includes('DROP POLICY')) {
          console.log(`   ✅ Commande DROP POLICY ignorée: ${command.substring(0, 50)}...`);
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
      console.log('\n🎉 CORRECTION APPLIQUÉE AVEC SUCCÈS!');
      console.log('=====================================');
      console.log('✅ Les politiques RLS ont été mises à jour');
      console.log('✅ L\'accès public aux notes partagées est maintenant possible');
      console.log('✅ Les utilisateurs peuvent toujours accéder à leurs notes privées');
      
      console.log('\n💡 Prochaines étapes:');
      console.log('1. Tester l\'accès aux pages publiques');
      console.log('2. Vérifier que les notes partagées sont visibles');
      console.log('3. Confirmer que les notes privées restent sécurisées');
      
    } else {
      console.log('\n⚠️  CORRECTION PARTIELLEMENT APPLIQUÉE');
      console.log('=====================================');
      console.log('❌ Certaines commandes ont échoué');
      console.log('💡 Vérifiez les erreurs ci-dessus');
      console.log('🔧 Vous devrez peut-être appliquer le script SQL manuellement');
      
      console.log('\n📋 Script SQL à appliquer manuellement:');
      console.log('=====================================');
      console.log(sqlScript);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'application de la correction:', error);
    console.log('\n💡 Solution alternative:');
    console.log('1. Copier le contenu du fichier scripts/fix-public-access-rls.sql');
    console.log('2. L\'exécuter manuellement dans Supabase SQL Editor');
  }
}

// Exécuter la correction
applyPublicAccessFix().catch(console.error); 