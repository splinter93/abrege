#!/usr/bin/env node

// Charger les variables d'environnement depuis .env.local
require('dotenv').config({ path: '.env.local' });

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

async function checkFoldersStructure() {
  try {
    console.log('🔍 VÉRIFICATION DE LA STRUCTURE DE LA TABLE FOLDERS');
    console.log('===================================================');
    
    // 1. Vérifier la configuration
    console.log('\n📋 Configuration:');
    console.log('   URL Supabase:', supabaseUrl);
    console.log('   Service Role Key:', supabaseServiceKey ? `${supabaseServiceKey.substring(0, 20)}...` : '❌ Manquante');
    
    // 2. Tester la connexion
    console.log('\n🔌 Test de connexion...');
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .limit(0);
      
      if (error) {
        console.log('❌ Erreur de connexion:', error.message);
        return;
      }
      console.log('✅ Connexion Supabase OK');
    } catch (e) {
      console.log('❌ Erreur de connexion:', e.message);
      return;
    }
    
    // 3. Essayer de récupérer la structure via une requête vide
    console.log('\n📊 Structure de la table (méthode 1: select vide)...');
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .limit(0);
      
      if (error) {
        console.log('❌ Erreur récupération structure:', error.message);
      } else {
        console.log('✅ Structure accessible via select vide');
        console.log('   Type de data:', typeof data);
        console.log('   Data:', data);
        if (data && typeof data === 'object') {
          console.log('   Clés disponibles:', Object.keys(data));
        }
      }
    } catch (e) {
      console.log('❌ Erreur méthode 1:', e.message);
    }
    
    // 4. Essayer de récupérer une ligne existante
    console.log('\n📊 Structure de la table (méthode 2: première ligne)...');
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .limit(1);
      
      if (error) {
        console.log('❌ Erreur récupération première ligne:', error.message);
      } else {
        console.log('✅ Première ligne récupérée');
        if (data && data.length > 0) {
          const firstRow = data[0];
          console.log('   Colonnes disponibles:', Object.keys(firstRow));
          console.log('   Types des colonnes:');
          Object.entries(firstRow).forEach(([key, value]) => {
            console.log(`     - ${key}: ${typeof value} (${value})`);
          });
        } else {
          console.log('   Aucune donnée dans la table');
        }
      }
    } catch (e) {
      console.log('❌ Erreur méthode 2:', e.message);
    }
    
    // 5. Essayer d'insérer avec des colonnes minimales
    console.log('\n🧪 Test insertion avec colonnes minimales...');
    try {
      // Récupérer un utilisateur
      const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (usersError || !users.users.length) {
        console.log('⚠️ Aucun utilisateur trouvé pour le test');
      } else {
        const testUser = users.users[0];
        console.log(`👤 Utilisateur de test: ${testUser.email}`);
        
        // Essayer avec juste name et user_id
        const testFolder = {
          name: `Test Structure - ${new Date().toISOString()}`,
          user_id: testUser.id
        };
        
        console.log('📦 Données du dossier de test:', testFolder);
        
        const { data: newFolder, error: createError } = await supabase
          .from('folders')
          .insert([testFolder])
          .select('*')
          .single();
        
        if (createError) {
          console.log('❌ Erreur création dossier:', createError.message);
          
          if (createError.message.includes('column')) {
            console.log('\n🚨 PROBLÈME DE STRUCTURE DÉTECTÉ');
            console.log('==================================');
            console.log('La table folders n\'a pas les colonnes attendues.');
            console.log('');
            console.log('🔧 SOLUTIONS:');
            console.log('1. Vérifier la structure réelle de la table');
            console.log('2. Adapter le code à la vraie structure');
            console.log('3. Ou migrer la table vers la structure attendue');
          }
        } else {
          console.log(`✅ Création dossier OK:`, newFolder);
          
          // Nettoyer
          try {
            await supabase
              .from('folders')
              .delete()
              .eq('id', newFolder.id);
            console.log('🧹 Dossier de test supprimé');
          } catch (cleanupError) {
            console.log('⚠️ Impossible de supprimer:', cleanupError.message);
          }
        }
      }
    } catch (e) {
      console.log('❌ Erreur test insertion:', e.message);
    }
    
    // 6. Vérifier les migrations existantes
    console.log('\n📋 Vérification des migrations...');
    try {
      const { data: migrations, error: migrationsError } = await supabase
        .from('supabase_migrations.schema_migrations')
        .select('*')
        .order('version', { ascending: false })
        .limit(10);
      
      if (migrationsError) {
        console.log('⚠️ Impossible de récupérer les migrations:', migrationsError.message);
      } else {
        console.log('📊 Dernières migrations:');
        migrations.forEach(migration => {
          console.log(`   - ${migration.version}: ${migration.name}`);
        });
      }
    } catch (e) {
      console.log('⚠️ Impossible de vérifier les migrations:', e.message);
    }
    
    console.log('\n🎉 VÉRIFICATION STRUCTURE TERMINÉE');
    console.log('====================================');
    console.log('📋 Résumé:');
    console.log('   - Si structure OK: Adapter le code');
    console.log('   - Si colonnes manquantes: Créer une migration');
    console.log('   - Si erreur RLS: Désactiver RLS dans le dashboard');
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
    process.exit(1);
  }
}

// Exécuter le script
checkFoldersStructure().catch(console.error); 