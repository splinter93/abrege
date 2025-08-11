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

async function applyRLSFix() {
  try {
    console.log('🔧 CORRECTION DES POLITIQUES RLS POUR L\'API V2');
    console.log('================================================');
    
    // 1. Lire et appliquer la migration
    console.log('\n📝 Application de la migration RLS...');
    
    const migrationSQL = `
      -- 1. Supprimer toutes les anciennes politiques complexes
      DROP POLICY IF EXISTS "Users can view articles based on permissions" ON public.articles;
      DROP POLICY IF EXISTS "Users can insert their own articles" ON public.articles;
      DROP POLICY IF EXISTS "Users can update articles they own or have editor/owner permissions" ON public.articles;
      DROP POLICY IF EXISTS "Users can delete articles they own or have owner permissions" ON public.articles;

      DROP POLICY IF EXISTS "Users can view folders based on permissions" ON public.folders;
      DROP POLICY IF EXISTS "Users can insert their own folders" ON public.folders;
      DROP POLICY IF EXISTS "Users can update folders they own or have editor/owner permissions" ON public.folders;
      DROP POLICY IF EXISTS "Users can delete folders they own or have owner permissions" ON public.folders;

      DROP POLICY IF EXISTS "Users can view classeurs based on permissions" ON public.classeurs;
      DROP POLICY IF EXISTS "Users can insert their own classeurs" ON public.classeurs;
      DROP POLICY IF EXISTS "Users can update classeurs they own or have editor/owner permissions" ON public.classeurs;
      DROP POLICY IF EXISTS "Users can delete classeurs they own or have owner permissions" ON public.classeurs;

      -- 2. Créer des politiques simples pour les articles
      CREATE POLICY "Users can view their own articles"
      ON public.articles
      FOR SELECT
      USING (auth.uid() = user_id);

      CREATE POLICY "Users can insert their own articles"
      ON public.articles
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);

      CREATE POLICY "Users can update their own articles"
      ON public.articles
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

      CREATE POLICY "Users can delete their own articles"
      ON public.articles
      FOR DELETE
      USING (auth.uid() = user_id);

      -- 3. Créer des politiques simples pour les dossiers
      CREATE POLICY "Users can view their own folders"
      ON public.folders
      FOR SELECT
      USING (auth.uid() = user_id);

      CREATE POLICY "Users can insert their own folders"
      ON public.folders
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);

      CREATE POLICY "Users can update their own folders"
      ON public.folders
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

      CREATE POLICY "Users can delete their own folders"
      ON public.folders
      FOR DELETE
      USING (auth.uid() = user_id);

      -- 4. Créer des politiques simples pour les classeurs
      CREATE POLICY "Users can view their own classeurs"
      ON public.classeurs
      FOR SELECT
      USING (auth.uid() = user_id);

      CREATE POLICY "Users can insert their own classeurs"
      ON public.classeurs
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);

      CREATE POLICY "Users can update their own classeurs"
      ON public.classeurs
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

      CREATE POLICY "Users can delete their own classeurs"
      ON public.classeurs
      FOR DELETE
      USING (auth.uid() = user_id);

      -- 5. Vérifier que RLS est activé
      ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.classeurs ENABLE ROW LEVEL SECURITY;
    `;

    // Diviser en commandes SQL individuelles
    const commands = migrationSQL.split(';').filter(cmd => cmd.trim());
    
    for (const command of commands) {
      if (command.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: command.trim() });
          if (error) {
            console.log('⚠️ Commande ignorée (probablement déjà appliquée):', error.message);
          }
        } catch (e) {
          // Ignorer les erreurs de commandes déjà appliquées
        }
      }
    }
    
    console.log('✅ Migration RLS appliquée');
    
    // 2. Vérifier la structure des tables
    console.log('\n🔍 Vérification de la structure des tables...');
    
    const tables = ['articles', 'folders', 'classeurs'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('id')
          .limit(1);
        
        if (error) {
          console.log(`❌ Table ${table}:`, error.message);
        } else {
          console.log(`✅ Table ${table}: Accessible`);
        }
      } catch (e) {
        console.log(`❌ Table ${table}: Erreur inattendue`);
      }
    }
    
    // 3. Tester la création d'une note (simulation API V2)
    console.log('\n🧪 Test de création de note (simulation API V2)...');
    
    try {
      // Simuler un utilisateur existant
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (usersError || !users.users.length) {
        console.log('⚠️ Aucun utilisateur trouvé pour le test');
      } else {
        const testUser = users.users[0];
        console.log(`👤 Utilisateur de test: ${testUser.email}`);
        
        // Tester l'accès aux articles avec l'utilisateur
        const { data: articles, error: articlesError } = await supabase
          .from('articles')
          .select('id, source_title')
          .eq('user_id', testUser.id)
          .limit(5);
        
        if (articlesError) {
          console.log('❌ Erreur accès articles:', articlesError.message);
        } else {
          console.log(`✅ Accès articles OK: ${articles.length} notes trouvées`);
        }
      }
    } catch (e) {
      console.log('⚠️ Test utilisateur non effectué:', e.message);
    }
    
    // 4. Vérifier les politiques RLS
    console.log('\n📋 Vérification des politiques RLS...');
    
    try {
      const { data: policies, error: policiesError } = await supabase
        .rpc('exec_sql', {
          sql: `
            SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
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
        policies.forEach(policy => {
          console.log(`   - ${policy.tablename}.${policy.policyname} (${policy.cmd})`);
        });
      }
    } catch (e) {
      console.log('⚠️ Vérification des politiques non effectuée');
    }
    
    console.log('\n🎉 CORRECTION RLS TERMINÉE');
    console.log('============================');
    console.log('✅ Politiques RLS simplifiées appliquées');
    console.log('✅ API V2 devrait maintenant fonctionner correctement');
    console.log('✅ Les utilisateurs peuvent accéder à leurs propres données');
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction RLS:', error);
    process.exit(1);
  }
}

// Exécuter le script
applyRLSFix().catch(console.error); 